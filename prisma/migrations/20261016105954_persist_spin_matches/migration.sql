-- CreateTable
CREATE TABLE `Match` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `person_id` INTEGER NOT NULL,
    `match_id` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'DECLINED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `matched_at` DATETIME(3) NULL,

    INDEX `Match_person_id_status_idx`(`person_id`, `status`),
    INDEX `Match_match_id_status_idx`(`match_id`, `status`),
    INDEX `Match_status_matched_at_idx`(`status`, `matched_at`),
    UNIQUE INDEX `Match_person_id_match_id_key`(`person_id`, `match_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
