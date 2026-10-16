"""Seed the Person table from userData/coffeeConnectUserDB.csv.

Usage (from the repository root):
    python3 -m venv .venv
    .venv/bin/pip install -r scripts/requirements.txt
    .venv/bin/python scripts/seed_people.py

Reads DATABASE_URL from the environment or from .env. Safe to re-run: rows are
upserted by id. Rows whose email already appeared earlier in the CSV are skipped
because Person.email is unique.
"""

import csv
import os
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

import pymysql

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "userData" / "coffeeConnectUserDB.csv"

LOCATIONS = {"London": "LONDON", "Belfast": "BELFAST", "Manchester": "MANCHESTER"}
JOB_ROLES = {"ANA", "CON", "CAN", "SNC", "PCN", "MCN", "DIR", "IDP", "APP", "APA", "CDR", "PAR", "SPR"}
# Keep in sync with JOB_CAPABILITIES / JOB_GO_TO_MARKETS in src/services/people.service.ts
JOB_CAPABILITIES = {
    "Advanced Data Analytics", "Architecture", "Backend Engineering", "Biomedical Devices",
    "Data Engineering", "Delivery & Transformation", "DevOps", "Digital Design",
    "Experience Design", "Frontend Engineering", "Human Factors", "Network Technology",
    "Physics", "Process & Automation", "Product & Strategy", "Quality Assurance & Test",
    "Research Operations", "Simulation & Modelling", "Software & AI Enabled Systems",
}
JOB_GO_TO_MARKETS = {
    "Consumer & Manufacturing", "Defence & Security", "Energy & Utilities", "Financial Services",
    "Government & Public Sector", "Health", "Life Sciences", "Transport",
}

UPSERT_SQL = """
INSERT INTO Person
    (id, first_name, last_name, email, location, job_role, job_capability, job_go_to_market, updated_at)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(3))
ON DUPLICATE KEY UPDATE
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    email = VALUES(email),
    location = VALUES(location),
    job_role = VALUES(job_role),
    job_capability = VALUES(job_capability),
    job_go_to_market = VALUES(job_go_to_market),
    updated_at = NOW(3)
"""


def load_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    env_file = ROOT / ".env"
    if not url and env_file.exists():
        for line in env_file.read_text().splitlines():
            key, sep, value = line.strip().partition("=")
            if sep and key.strip() == "DATABASE_URL":
                url = value.strip().strip('"').strip("'")
    if not url:
        sys.exit("DATABASE_URL is not set (environment or .env)")
    return url


def connect(url: str) -> pymysql.connections.Connection:
    parsed = urlparse(url)
    if parsed.scheme not in ("mysql", "mariadb"):
        sys.exit(f"Unsupported DATABASE_URL scheme: {parsed.scheme}")
    return pymysql.connect(
        host=parsed.hostname or "localhost",
        port=parsed.port or 3306,
        user=unquote(parsed.username or ""),
        password=unquote(parsed.password or ""),
        database=parsed.path.lstrip("/"),
        charset="utf8mb4",
        autocommit=False,
    )


def parse_row(line_no: int, row: dict[str, str]) -> tuple:
    errors = []
    person_id = row["userID"].strip()
    if not (person_id.isdigit() and len(person_id) == 5):
        errors.append(f"userID {person_id!r} is not 5 digits")
    location = LOCATIONS.get(row["office"].strip())
    if location is None:
        errors.append(f"unknown office {row['office']!r}")
    if row["role"].strip() not in JOB_ROLES:
        errors.append(f"unknown role {row['role']!r}")
    if row["jobCapability"].strip() not in JOB_CAPABILITIES:
        errors.append(f"unknown jobCapability {row['jobCapability']!r}")
    if row["goToMarket"].strip() not in JOB_GO_TO_MARKETS:
        errors.append(f"unknown goToMarket {row['goToMarket']!r}")
    if errors:
        raise ValueError(f"line {line_no}: " + "; ".join(errors))

    return (
        int(person_id),
        row["firstName"].strip(),
        row["surname"].strip(),
        row["email"].strip().lower(),
        location,
        row["role"].strip(),
        row["jobCapability"].strip(),
        row["goToMarket"].strip(),
    )


def read_people() -> list[tuple]:
    people: list[tuple] = []
    seen_emails: dict[str, int] = {}
    errors: list[str] = []

    with CSV_PATH.open(newline="", encoding="utf-8-sig") as f:
        for line_no, row in enumerate(csv.DictReader(f), start=2):
            try:
                person = parse_row(line_no, row)
            except ValueError as error:
                errors.append(str(error))
                continue

            email = person[3]
            if email in seen_emails:
                print(f"Skipping line {line_no} (id {person[0]}): {email} already used by id {seen_emails[email]}")
                continue
            seen_emails[email] = person[0]
            people.append(person)

    if errors:
        sys.exit("Invalid rows in CSV:\n  " + "\n  ".join(errors))
    return people


def main() -> None:
    people = read_people()
    connection = connect(load_database_url())
    try:
        with connection.cursor() as cursor:
            cursor.executemany(UPSERT_SQL, people)
            cursor.execute("SELECT COUNT(*) FROM Person")
            (total,) = cursor.fetchone()
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    print(f"Upserted {len(people)} people from {CSV_PATH.name}. Person table now has {total} rows.")


if __name__ == "__main__":
    main()
