ALTER TABLE `allocation_history` MODIFY COLUMN `action` enum('created','updated','deleted','reverted_creation','reverted_update','reverted_deletion') NOT NULL;--> statement-breakpoint
ALTER TABLE `allocation_history` ADD `previousAllocatedHours` int;--> statement-breakpoint
ALTER TABLE `allocation_history` ADD `previousAllocatedPercentage` decimal(5,2);--> statement-breakpoint
ALTER TABLE `allocation_history` ADD `previousEndDate` timestamp;--> statement-breakpoint
ALTER TABLE `allocation_history` ADD `revertedHistoryId` int;