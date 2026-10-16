"""Seed the Interest table with the fixed list of interests.

Only creates Interest rows: it does not link interests to any person. People
choose their own interests when they complete registration.
Run from the repository root:
    .venv/bin/python scripts/seed_interests.py

Safe to re-run: existing interests are kept. On an empty table, IDs follow the
order of INTERESTS (1 = "Coffee and cafes"), which the frontend relies on.
"""

from seed_people import connect, load_database_url

INTERESTS = [
    "Coffee and cafes",
    "Cooking and food",
    "Books and reading",
    "Hiking and outdoors",
    "Travel",
    "Music and live events",
    "Photography",
    "Board games",
    "Fitness and running",
    "Technology",
    "Art and design",
    "Gardening",
    "Video Games",
    "Movies and TV",
    "Podcasts",
    "Sports",
    "Cycling",
    "Volunteering",
    "Languages",
    "History",
    "Personal finance",
    "Entrepreneurship",
    "Mindfulness",
    "Pets",
]


def main() -> None:
    connection = connect(load_database_url())
    try:
        with connection.cursor() as cursor:
            cursor.executemany("INSERT IGNORE INTO Interest (name) VALUES (%s)", INTERESTS)
            new_interests = cursor.rowcount

            cursor.execute("SELECT COUNT(*) FROM Interest")
            (total,) = cursor.fetchone()
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    print(f"Added {new_interests} interests ({total} total).")


if __name__ == "__main__":
    main()
