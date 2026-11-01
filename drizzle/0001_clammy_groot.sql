CREATE TABLE `app_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(160) NOT NULL,
	`role` enum('rider','caregiver','driver','dispatcher','admin','clinic_intake') NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`phone` varchar(32),
	`organization` varchar(160),
	`isDemo` varchar(8) NOT NULL DEFAULT 'true',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp,
	CONSTRAINT `app_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_accounts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `app_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `app_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_sessions_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `booking_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`actorAccountId` int NOT NULL,
	`previousStatus` varchar(40),
	`newStatus` varchar(40) NOT NULL,
	`note` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `booking_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(32) NOT NULL,
	`passengerId` int NOT NULL,
	`requestedByAccountId` int NOT NULL,
	`assignedDriverAccountId` int,
	`pickup` varchar(255) NOT NULL,
	`destination` varchar(255) NOT NULL,
	`scheduledDate` varchar(32) NOT NULL,
	`scheduledTime` varchar(32) NOT NULL,
	`rideType` varchar(80) NOT NULL,
	`status` enum('requested','assigned','driver_en_route','driver_arrived','passenger_picked_up','in_progress','completed','cancelled','exception') NOT NULL DEFAULT 'requested',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookings_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `document_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerAccountId` int NOT NULL,
	`category` varchar(80) NOT NULL,
	`objectKey` varchar(512) NOT NULL,
	`contentType` varchar(160) NOT NULL,
	`status` varchar(40) NOT NULL DEFAULT 'uploaded',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `document_records_objectKey_unique` UNIQUE(`objectKey`)
);
--> statement-breakpoint
CREATE TABLE `driver_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`driverAccountId` int NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`source` varchar(24) NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `driver_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `driver_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`onboardingStatus` enum('draft','submitted','under_review','approved','rejected','suspended') NOT NULL,
	`phone` varchar(32),
	`vehicleMake` varchar(80),
	`vehicleModel` varchar(80),
	`vehicleColor` varchar(40),
	`licensePlate` varchar(32),
	`licenseState` varchar(8),
	`photoUrl` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `driver_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `driver_profiles_accountId_unique` UNIQUE(`accountId`)
);
--> statement-breakpoint
CREATE TABLE `passengers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int,
	`name` varchar(160) NOT NULL,
	`phone` varchar(32),
	`address` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passengers_id` PRIMARY KEY(`id`)
);
