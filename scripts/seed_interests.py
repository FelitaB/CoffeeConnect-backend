"""Seed the Interest table and assign synthetic interests to every person.

Development seed data only: the person-interest assignments are synthetic.
Run after seed_people.py (from the repository root):
    .venv/bin/python scripts/seed_interests.py

Safe to re-run: existing interests and links are kept. Each person ends up with
3-10 interests, chosen deterministically from a CRC32 hash of their id.
"""

from collections import defaultdict
from zlib import crc32

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

MIN_INTERESTS = 3
MAX_INTERESTS = 10


def target_count(person_id: int) -> int:
    spread = MAX_INTERESTS - MIN_INTERESTS + 1
    return MIN_INTERESTS + crc32(f"{person_id}:interest-count".encode()) % spread


def preference_key(person_id: int, name: str) -> tuple[int, str]:
    return crc32(f"{person_id}:{name}".encode()), name


def pick_new_links(person_ids: list[int], interests: dict[str, int], existing: dict[int, set[int]]) -> list[tuple[int, int]]:
    links: list[tuple[int, int]] = []
    for person_id in person_ids:
        current = existing.get(person_id, set())
        missing = target_count(person_id) - len(current)
        if missing <= 0:
            continue

        candidates = sorted(
            (name for name, interest_id in interests.items() if interest_id not in current),
            key=lambda name: preference_key(person_id, name),
        )
        # Join table columns: A = Interest.id, B = Person.id
        links.extend((interests[name], person_id) for name in candidates[:missing])
    return links


def main() -> None:
    connection = connect(load_database_url())
    try:
        with connection.cursor() as cursor:
            cursor.executemany("INSERT IGNORE INTO Interest (name) VALUES (%s)", INTERESTS)
            new_interests = cursor.rowcount

            cursor.execute("SELECT id, name FROM Interest")
            interests = {name: interest_id for interest_id, name in cursor.fetchall()}

            cursor.execute("SELECT id FROM Person ORDER BY id")
            person_ids = [person_id for (person_id,) in cursor.fetchall()]

            cursor.execute("SELECT A, B FROM _InterestToPerson")
            existing: dict[int, set[int]] = defaultdict(set)
            for interest_id, person_id in cursor.fetchall():
                existing[person_id].add(interest_id)

            links = pick_new_links(person_ids, interests, existing)
            cursor.executemany("INSERT IGNORE INTO _InterestToPerson (A, B) VALUES (%s, %s)", links)
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    print(f"Added {new_interests} interests ({len(interests)} total).")
    print(f"Added {len(links)} interest links across {len(person_ids)} people.")


if __name__ == "__main__":
    main()
