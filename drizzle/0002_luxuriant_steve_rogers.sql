CREATE TABLE `app_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientAccountId` int NOT NULL,
	`bookingId` int,
	`type` varchar(80) NOT NULL,
	`channel` varchar(40) NOT NULL DEFAULT 'in_app',
	`status` varchar(40) NOT NULL DEFAULT 'delivered',
	`title` varchar(160) NOT NULL,
	`body` varchar(500) NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `app_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `driver_profiles` ADD `verificationStatus` enum('not_started','pending','under_review','verified','rejected','provider_unconfigured') DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE `driver_profiles` ADD `verificationProvider` varchar(80);--> statement-breakpoint
ALTER TABLE `driver_profiles` ADD `verificationReference` varchar(160);--> statement-breakpoint
ALTER TABLE `driver_profiles` ADD `verificationSubmittedAt` timestamp;--> statement-breakpoint
ALTER TABLE `driver_profiles` ADD `verificationReviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `driver_profiles` ADD `verificationReviewNote` varchar(500);