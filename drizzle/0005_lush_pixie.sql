CREATE TABLE `app_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(120) NOT NULL,
	`settingValue` text NOT NULL,
	`updatedByAccountId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `serviceType` varchar(40) DEFAULT 'ambulatory' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `tripDirection` varchar(20) DEFAULT 'one_way' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `accessibilityNeeds` varchar(255);--> statement-breakpoint
ALTER TABLE `bookings` ADD `wheelchairRequired` varchar(8) DEFAULT 'false' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `stretcherRequired` varchar(8) DEFAULT 'false' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `additionalAttendants` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `assistanceInstructions` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `estimatedFareCents` int;--> statement-breakpoint
ALTER TABLE `bookings` ADD `fareStatus` varchar(40) DEFAULT 'indicative' NOT NULL;