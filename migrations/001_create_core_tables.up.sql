CREATE TABLE IF NOT EXISTS Users (
    userID INT NOT NULL,
    firstName VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    office VARCHAR(100),
    role VARCHAR(100),
    jobCapability VARCHAR(100),
    goToMarket VARCHAR(100),
    dateJoined DATE,
    dateEnded DATE,
    PRIMARY KEY (userID),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Interests (
    interestID BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (interestID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS UserInterests (
    userID INT NOT NULL,
    interestID BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (userID, interestID),
    KEY idx_userinterests_interestID (interestID),
    CONSTRAINT fk_userinterests_user
        FOREIGN KEY (userID) REFERENCES Users (userID) ON DELETE CASCADE,
    CONSTRAINT fk_userinterests_interest
        FOREIGN KEY (interestID) REFERENCES Interests (interestID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
