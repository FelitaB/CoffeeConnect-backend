# Backend for CoffeeConnect
CoffeeConnect pairs colleagues up for casual coffee chats based on shared passions. Add your profile, select your interests, and press Spin to find your best match. 

## Requirements
- Node.js 20.x and npm
- MySQL 8.x running locally
- A MySQL account allowed to create and alter the `CoffeeConnect` database

## Automatic Setup (macOS)

From the backend repository root, run:

```bash
bash scripts/setup-macos.sh
```

The script installs missing Node.js (22 LTS) and MySQL dependencies using [Homebrew](https://brew.sh), starts Homebrew-managed MySQL if needed, installs npm dependencies, creates `.env` only if missing, creates the configured local database if needed, and applies Prisma migrations and generates the client. Install Homebrew first if you need the script to install dependencies.

The default connection uses passwordless MySQL as `root`. For another account, password, port, or database name, create `.env` from `.env.example` and edit `DATABASE_URL` before running setup. Existing `.env` files are preserved. Only local MySQL connections are supported by this script. If credentials fail, update `.env` and rerun it.

To also seed demonstration data and start the API:

```bash
bash scripts/setup-macos.sh --seed --start
```

`--seed` creates or reuses `.venv`, installs the seeding requirements (and Python via Homebrew if missing), and runs the three seed scripts in order. Omit `--start` to finish without starting the server. Setup can also be invoked with `npm run setup:macos -- --seed --start` once npm is installed.

## Run Locally

1. Install dependencies from the repository root:

   ```bash
   npm install
   ```

2. Create the development database in MySQL:

   For a Homebrew MySQL installation where `root` has no password:

   ```bash
   mysql -u root
   ```

   If your MySQL account has a password, use:

   ```bash
   mysql -u root -p
   ```

   At the MySQL prompt, run:

   ```sql
   CREATE DATABASE `CoffeeConnect`;
   EXIT;
   ```

   Use your local MySQL username in place of `root` if needed.

3. Create your local environment file and set the MySQL connection string:

   ```bash
   cp .env.example .env
   ```

   The copied `.env.example` defaults to passwordless local MySQL. If your account uses a password, replace `DATABASE_URL` in `.env` with the password-protected example shown in `.env.example`. Replace `root` if needed and URL-encode special characters in the password. The database name must match the database you created (`CoffeeConnect` by default).

4. Apply the checked-in Prisma migrations and generate the client:

   ```bash
   npx prisma migrate deploy --config prisma7.config.ts
   npx prisma generate --config prisma7.config.ts
   ```

   Migrations create the application tables. They do not insert sample records; the project does not currently define a Prisma seed command.

5. Start the API:

   ```bash
   npm run dev
   ```

   The server listens on `http://localhost:5000`

## Seed Demonstration Data
To populate the local database with demonstration employees and interests, create the Python virtual environment and install the seeding dependencies from the backend repository root:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r scripts/requirements.txt
```

Then run the seed scripts:

```bash
.venv/bin/python scripts/seed_people.py
.venv/bin/python scripts/seed_interests.py
.venv/bin/python scripts/seed_person_interests.py
```

`seed_people.py` adds the employees from `userData/coffeeConnectUserDB.csv`. `seed_interests.py` fills the `Interest` table. `seed_person_interests.py` is for local demos: it assigns synthetic interests to people so each has 3-10 interests. It is safe to re-run and does not remove existing links.

## API Documentation
The API endpoint usage is documented fully [here](docs/API.md).

## Call History

The `feature/21-add-users-past-call-history` branch adds an optional `Match.completed_at` column via
`prisma/migrations/20261020120000_add_match_completion/migration.sql`. Existing rows
remain unchanged apart from the new null column; no calls are assumed to have happened.
The feature requires this migration before its endpoints are used.

### Update An Existing Local Database

Each developer must run these steps against their own local MySQL database after
obtaining the corresponding backend and frontend code. Updating one developer's
local database does not update anyone else's. Git branches do not isolate databases:
check the target before applying a migration, and coordinate any shared environment.

1. Stop your running backend, open a terminal in the backend repository, and install
   the dependencies:

   ```bash
   npm install
   ```

2. Check that `DATABASE_URL` in your existing `.env` points to your intended local
   database, normally `CoffeeConnect` at `localhost:3306`. Keep your own MySQL
   credentials; do not overwrite `.env` with a colleague's file or commit it to Git.

3. Back up that database before proceeding. In MySQL Workbench, use **Server > Data
   Export**, select the intended schema, choose **Dump Structure and Data**, and
   export to a self-contained file in a private location outside the repositories.
   Confirm the export succeeds. Backups can contain personal data and password hashes;
   do not commit or share them casually. If the backup fails, stop here.

4. Check pending migrations:

   ```bash
   npx prisma migrate status --config prisma7.config.ts
   ```

   For an otherwise up-to-date database, the only pending migration should be
   `20261020120000_add_match_completion`. If unexpected migrations, failed migrations,
   or schema-history errors are reported, stop and review them with the team.
   If the schema is already up to date, no migration needs applying.

5. Apply the reviewed migration and regenerate the Prisma client:

   ```bash
   npx prisma migrate deploy --config prisma7.config.ts
   npx prisma generate --config prisma7.config.ts
   ```

   `migrate deploy` applies **all pending migrations**, not just the completion
   migration. Proceed only after reviewing step 4. The completion migration adds a
   nullable date column; existing matches stay uncompleted and existing data is kept.

6. Verify the schema and restart the API:

   ```bash
   npx prisma migrate status --config prisma7.config.ts
   npm run dev
   ```

   The status should report that the schema is up to date. Keep the API running at
   `http://localhost:5000` and follow the frontend README to open `/meetups`.

Do not reset, drop, recreate, or reseed an existing database for this update. Fresh
installations should instead follow **Run Locally** and **Seed Demonstration Data**
above. A shared deployment requires a coordinated migration by its database owner.

`prisma generate` updates local client code only; it does not apply migrations.
Completion is manually confirmed by either participant, without calendar scheduling
or Teams call-log access. Completed pairs stay excluded from spins and retain their
existing weekly match count. This workflow uses Match records, not the separate Chat API.

Run the database-independent regression tests with `npm test` and check backend types
with `npx tsc --noEmit`. Tests inject repositories or database doubles and do not
connect to or modify the configured database.