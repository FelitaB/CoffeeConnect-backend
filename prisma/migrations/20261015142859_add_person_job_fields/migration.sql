/*
  Warnings:

  - Added the required column `job_capability` to the `Person` table without a default value. This is not possible if the table is not empty.
  - Added the required column `job_go_to_market` to the `Person` table without a default value. This is not possible if the table is not empty.
  - Added the required column `job_role` to the `Person` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Person` ADD COLUMN `job_capability` VARCHAR(191) NOT NULL,
    ADD COLUMN `job_go_to_market` VARCHAR(191) NOT NULL,
    ADD COLUMN `job_role` ENUM('ANA', 'CON', 'CAN', 'SNC', 'PCN', 'MCN', 'DIR', 'IDP', 'APP', 'APA', 'CDR', 'PAR', 'SPR') NOT NULL;
