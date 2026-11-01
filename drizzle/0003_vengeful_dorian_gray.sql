CREATE TABLE `vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerAccountId` int NOT NULL,
	`make` varchar(80) NOT NULL,
	`model` varchar(80) NOT NULL,
	`color` varchar(40) NOT NULL,
	`licensePlate` varchar(32) NOT NULL,
	`licenseState` varchar(8) NOT NULL,
	`mobilityReady` varchar(8) NOT NULL DEFAULT 'false',
	`status` enum('active','maintenance','retired') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicles_licensePlate_unique` UNIQUE(`licensePlate`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `assignedVehicleId` int;