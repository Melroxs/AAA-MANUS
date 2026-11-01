CREATE TABLE `caregiver_authorizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caregiverAccountId` int NOT NULL,
	`passengerId` int NOT NULL,
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `caregiver_authorizations_id` PRIMARY KEY(`id`)
);
