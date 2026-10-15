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

   Edit `DATABASE_URL` in `.env` to use your MySQL username and password. URL-encode special characters in the password. The database name must match the database you created (`CoffeeConnect` by default).

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

## Demonstration Requirements
For the sake of the demonstration of CoffeeConnect, this is intended to be an internal tool that is deployed for use to all employees, so we must seed the databases with fake data of employees in order to show off the tool and a real-world demo.

We do this, you must run the following commands
```bash
.venv/bin/python scripts/seed_people.py
.venv/bin/python scripts/seed_interests.py
```

## API Documentation
The API endpoint usage is documented fully [here](docs/API.md).