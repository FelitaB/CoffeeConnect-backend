-- Development seed data only. The user-interest assignments are synthetic.
-- Run after selecting the coffeeconnect database and creating the core tables.

START TRANSACTION;

INSERT INTO Interests (name)
SELECT topic.name
FROM (
    SELECT 'Coffee and cafes' AS name
    UNION ALL SELECT 'Cooking and food'
    UNION ALL SELECT 'Books and reading'
    UNION ALL SELECT 'Hiking and outdoors'
    UNION ALL SELECT 'Travel'
    UNION ALL SELECT 'Music and live events'
    UNION ALL SELECT 'Photography'
    UNION ALL SELECT 'Board games'
    UNION ALL SELECT 'Fitness and running'
    UNION ALL SELECT 'Technology'
    UNION ALL SELECT 'Art and design'
    UNION ALL SELECT 'Gardening'
    UNION ALL SELECT 'Video Games'
    UNION ALL SELECT 'Movies and TV'
    UNION ALL SELECT 'Podcasts'
    UNION ALL SELECT 'Sports'
    UNION ALL SELECT 'Cycling'
    UNION ALL SELECT 'Volunteering'
    UNION ALL SELECT 'Languages'
    UNION ALL SELECT 'History'
    UNION ALL SELECT 'Personal finance'
    UNION ALL SELECT 'Entrepreneurship'
    UNION ALL SELECT 'Mindfulness'
    UNION ALL SELECT 'Pets'
) AS topic
WHERE NOT EXISTS (
    SELECT 1
    FROM Interests AS existing
    WHERE existing.name = topic.name
);

INSERT IGNORE INTO UserInterests (userID, interestID)
SELECT ranked.userID, ranked.interestID
FROM (
    SELECT
        users.userID,
        interests.interestID,
        COALESCE(user_interest_counts.link_count, 0) AS current_count,
        3 + MOD(CRC32(CONCAT(users.userID, ':interest-count')), 8) AS target_count,
        ROW_NUMBER() OVER (
            PARTITION BY users.userID
            ORDER BY CRC32(CONCAT(users.userID, ':', interests.name)), interests.name
        ) AS preference_rank
    FROM Users AS users
    CROSS JOIN Interests AS interests
    LEFT JOIN (
        SELECT userID, COUNT(*) AS link_count
        FROM UserInterests
        GROUP BY userID
    ) AS user_interest_counts ON user_interest_counts.userID = users.userID
    WHERE NOT EXISTS (
        SELECT 1
        FROM UserInterests AS existing
        WHERE existing.userID = users.userID
          AND existing.interestID = interests.interestID
    )
) AS ranked
WHERE ranked.current_count < ranked.target_count
  AND ranked.preference_rank <= ranked.target_count - ranked.current_count;

COMMIT;
