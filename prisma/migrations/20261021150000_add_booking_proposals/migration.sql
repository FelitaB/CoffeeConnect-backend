CREATE TABLE `Booking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `match_id` INTEGER NOT NULL,
    `status` ENUM('PROPOSED', 'CONFIRMED') NOT NULL DEFAULT 'PROPOSED',
    `scheduled_at` DATETIME(3) NULL,
    `confirmed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Booking_match_id_key`(`match_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BookingProposal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `proposed_by` INTEGER NOT NULL,
    `status` ENUM('OPEN', 'ACCEPTED', 'SUPERSEDED') NOT NULL DEFAULT 'OPEN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BookingProposal_booking_id_status_idx`(`booking_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BookingSlot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `proposal_id` INTEGER NOT NULL,
    `starts_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BookingSlot_proposal_id_starts_at_key`(`proposal_id`, `starts_at`),
    INDEX `BookingSlot_starts_at_idx`(`starts_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Booking` ADD CONSTRAINT `Booking_match_id_fkey`
    FOREIGN KEY (`match_id`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BookingProposal` ADD CONSTRAINT `BookingProposal_booking_id_fkey`
    FOREIGN KEY (`booking_id`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BookingProposal` ADD CONSTRAINT `BookingProposal_proposed_by_fkey`
    FOREIGN KEY (`proposed_by`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BookingSlot` ADD CONSTRAINT `BookingSlot_proposal_id_fkey`
    FOREIGN KEY (`proposal_id`) REFERENCES `BookingProposal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;