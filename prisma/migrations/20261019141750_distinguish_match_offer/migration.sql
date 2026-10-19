-- AlterTable
ALTER TABLE `Match` MODIFY `status` ENUM('OFFERED', 'PENDING', 'ACCEPTED', 'DECLINED') NOT NULL DEFAULT 'OFFERED';

-- Existing pending rows were offers awaiting the spinner's decision.
UPDATE `Match` SET `status` = 'OFFERED' WHERE `status` = 'PENDING';

-- Existing accepted rows only represent the spinner's acceptance; the recipient still needs to respond.
UPDATE `Match` SET `status` = 'PENDING' WHERE `status` = 'ACCEPTED';
