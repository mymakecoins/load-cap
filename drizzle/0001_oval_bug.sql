CREATE TABLE `allocation_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`allocationId` int,
	`employeeId` int NOT NULL,
	`projectId` int NOT NULL,
	`allocatedHours` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`action` enum('created','updated','deleted') NOT NULL,
	`changedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `allocation_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`projectId` int NOT NULL,
	`allocatedHours` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`company` varchar(255),
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`type` enum('frontend','mobile','backend','qa','manager') NOT NULL,
	`monthlyCapacityHours` int NOT NULL DEFAULT 160,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`clientId` int NOT NULL,
	`type` enum('sustentacao','escopo_fechado','squad_gerenciada') NOT NULL,
	`managerId` int,
	`startDate` timestamp,
	`plannedEndDate` timestamp,
	`actualEndDate` timestamp,
	`plannedProgress` int DEFAULT 0,
	`actualProgress` int DEFAULT 0,
	`status` enum('planejamento','em_andamento','concluido','pausado') NOT NULL DEFAULT 'planejamento',
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','coordinator','manager','developer') NOT NULL DEFAULT 'user';