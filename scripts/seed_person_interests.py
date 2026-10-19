"""Assign synthetic interests to demo people.

Run after seed_people.py and seed_interests.py:
    .venv/bin/python scripts/seed_person_interests.py

Safe to re-run: existing links are kept and missing links are added until each
person has a deterministic total between 3 and 10 interests.
"""

from collections import defaultdict
from zlib import crc32

from seed_interests import INTERESTS
from seed_people import connect, load_database_url

MIN_INTERESTS = 3
MAX_INTERESTS = 10


def target_count(person_id: int) -> int:
    return MIN_INTERESTS + crc32(f"{person_id}:interest-count".encode()) % (
        MAX_INTERESTS - MIN_INTERESTS + 1
    )


def preference_key(person_id: int, interest_id: int) -> tuple[int, int]:
    return crc32(f"{person_id}:{interest_id}".encode()), interest_id


def main() -> None:
    connection = connect(load_database_url())
    try:
        with connection.cursor() as cursor:
            cursor.executemany("INSERT IGNORE INTO Interest (name) VALUES (%s)", [(name,) for name in INTERESTS])
            cursor.execute("SELECT id FROM Person ORDER BY id")
            person_ids = [person_id for (person_id,) in cursor.fetchall()]

            cursor.execute("SELECT id FROM Interest")
            interest_ids = [interest_id for (interest_id,) in cursor.fetchall()]

            cursor.execute("SELECT B, A FROM _InterestToPerson")
            existing: dict[int, set[int]] = defaultdict(set)
            for person_id, interest_id in cursor.fetchall():
                existing[person_id].add(interest_id)

            over_limit = [person_id for person_id in person_ids if len(existing[person_id]) > MAX_INTERESTS]
            if over_limit:
                sample = ", ".join(str(person_id) for person_id in over_limit[:10])
                raise ValueError(f"People already have more than {MAX_INTERESTS} interests: {sample}")

            links: list[tuple[int, int]] = []
            for person_id in person_ids:
                current = existing[person_id]
                target = max(MIN_INTERESTS, target_count(person_id), len(current))
                available = sorted(
                    (interest_id for interest_id in interest_ids if interest_id not in current),
                    key=lambda interest_id: preference_key(person_id, interest_id),
                )
                links.extend((interest_id, person_id) for interest_id in available[:target - len(current)])

            cursor.executemany(
                "INSERT IGNORE INTO _InterestToPerson (A, B) VALUES (%s, %s)",
                links,
            )
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    print(f"Added {len(links)} synthetic interest links across {len(person_ids)} people.")


if __name__ == "__main__":
    main()