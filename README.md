# Backend for CoffeeConnect
CoffeeConnect pairs colleagues up for casual coffee chats based on shared passions. Add your profile, select your interests, and press Spin to find your best match. 

## Requirements
- Node.js 20.x and npm
- MySQL 8.x running locally
- A MySQL account allowed to create and alter the `CoffeeConnect` database

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
   npx prisma migrate deploy
   npx prisma generate
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
```

`seed_people.py` adds the employees from `userData/coffeeConnectUserDB.csv`. `seed_interests.py` only fills the `Interest` table; it doesn't give anyone interests. People pick their own when they complete registration.

## API Documentation
The API endpoint usage is documented fully [here](docs/API.md).