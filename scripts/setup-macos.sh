#!/bin/bash
set -euo pipefail

usage() {
  printf '%s\n' \
    'Usage: bash scripts/setup-macos.sh [--seed] [--start]' \
    '  --seed   Install Python dependencies and seed demonstration data.' \
    '  --start  Start the API after setup.' \
    '  --help   Show this help.'
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

seed=false
start=false
for argument in "$@"; do
  case "$argument" in
    --seed) seed=true ;;
    --start) start=true ;;
    --help|-h) usage; exit 0 ;;
    *) usage >&2; fail "Unknown option: $argument" ;;
  esac
done

[[ "$(uname -s)" == Darwin ]] || fail 'This script supports macOS only.'
cd "$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

for brew_directory in /opt/homebrew/bin /usr/local/bin; do
  if [[ -x "$brew_directory/brew" ]]; then
    export PATH="$brew_directory:$PATH"
    break
  fi
done

require_brew() {
  command -v brew >/dev/null 2>&1 || fail 'Install Homebrew from https://brew.sh, then rerun this script.'
}

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1 || \
  ! node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit((major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major >= 24 ? 0 : 1)'; then
  require_brew
  brew install node@22
  export PATH="$(brew --prefix node@22)/bin:$PATH"
fi

mysql_formula=''
if command -v brew >/dev/null 2>&1; then
  for formula in mysql@8.4 mysql@8.0 mysql; do
    if brew list --versions "$formula" >/dev/null 2>&1; then
      mysql_formula="$formula"
      export PATH="$(brew --prefix "$formula")/bin:$PATH"
      break
    fi
  done
fi

if ! command -v mysql >/dev/null 2>&1; then
  require_brew
  brew install mysql@8.4
  mysql_formula=mysql@8.4
  export PATH="$(brew --prefix "$mysql_formula")/bin:$PATH"
fi

if [[ -n "$mysql_formula" ]] && ! mysqladmin ping --host=127.0.0.1 --silent >/dev/null 2>&1; then
  brew services start "$mysql_formula"
fi

npm install

if [[ ! -e .env ]]; then
  cp .env.example .env
  printf '%s\n' 'Created .env from .env.example (passwordless local MySQL by default).'
else
  printf '%s\n' 'Keeping existing .env.'
fi

node <<'NODE'
const { spawnSync } = require('node:child_process');
require('dotenv').config({ quiet: true });

async function setupDatabase() {
  const databaseUrl = new URL(process.env.DATABASE_URL);
  if (databaseUrl.protocol !== 'mysql:' || !['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname)) {
    throw new Error('DATABASE_URL must point to a local MySQL server.');
  }
  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
  if (!databaseName || databaseName.includes('\0')) {
    throw new Error('DATABASE_URL must include a valid database name.');
  }
  const mysqlArguments = [
    '--protocol=TCP',
    '--connect-timeout=5',
    '--host', databaseUrl.hostname.replace(/^\[|\]$/g, ''),
    '--port', databaseUrl.port || '3306',
    '--user', decodeURIComponent(databaseUrl.username),
    '--execute', `CREATE DATABASE IF NOT EXISTS \`${databaseName.replace(/`/g, '``')}\`;`,
  ];
  let result;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    result = spawnSync('mysql', mysqlArguments, {
      encoding: 'utf8',
      env: { ...process.env, MYSQL_PWD: decodeURIComponent(databaseUrl.password) },
    });
    if (result.status === 0) return;
    if (!/ERROR 200[23]/.test(result.stderr || '') || attempt === 9) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Could not create the database. Check that MySQL is running and the credentials in .env have CREATE permission.');
}

setupDatabase().catch(error => {
  console.error(`Database setup failed: ${error.message}`);
  process.exitCode = 1;
});
NODE

npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts

if [[ "$seed" == true ]]; then
  if ! command -v python3 >/dev/null 2>&1; then
    require_brew
    brew install python
  fi
  if [[ ! -x .venv/bin/python ]]; then
    python3 -m venv .venv
  fi
  .venv/bin/python -m pip install -r scripts/requirements.txt
  .venv/bin/python scripts/seed_people.py
  .venv/bin/python scripts/seed_interests.py
  .venv/bin/python scripts/seed_person_interests.py
fi

printf '%s\n' 'Backend setup complete.'
if [[ "$start" == true ]]; then
  exec npm run dev
fi
printf '%s\n' 'Run npm run dev to start the API at http://localhost:5000.'