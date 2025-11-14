CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`allocationCreated` boolean NOT NULL DEFAULT true,
	`allocationUpdated` boolean NOT NULL DEFAULT true,
	`allocationDeleted` boolean NOT NULL DEFAULT true,
	`allocationReverted` boolean NOT NULL DEFAULT true,
	`emailNotifications` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('allocation_created','allocation_updated','allocation_deleted','allocation_reverted') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`relatedAllocationId` int,
	`relatedProjectId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`actionUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
