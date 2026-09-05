CREATE TABLE `teachingAnalyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teachingMaterialId` int NOT NULL,
	`teacherId` int NOT NULL,
	`analysisJson` json NOT NULL,
	`observationCount` int NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `teachingAnalyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teachingDna` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherId` int NOT NULL,
	`explanationStyle` json NOT NULL,
	`analogyUsage` json NOT NULL,
	`exampleUsage` json NOT NULL,
	`questioningStyle` json NOT NULL,
	`conceptProgression` json NOT NULL,
	`feedbackStyle` json NOT NULL,
	`tone` json NOT NULL,
	`visualPreference` json NOT NULL,
	`confidence` varchar(32) NOT NULL,
	`sourceCount` int NOT NULL DEFAULT 0,
	`rawAnalysis` json NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `teachingDna_id` PRIMARY KEY(`id`),
	CONSTRAINT `teachingDna_teacherId_unique` UNIQUE(`teacherId`)
);
--> statement-breakpoint
CREATE TABLE `teachingDnaEvidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teachingDnaId` int NOT NULL,
	`teachingMaterialId` int NOT NULL,
	`dimension` varchar(128) NOT NULL,
	`score` int NOT NULL,
	`confidence` int NOT NULL,
	`explanation` text NOT NULL,
	`evidenceExcerpt` text NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `teachingDnaEvidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teachingMaterials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherId` int NOT NULL,
	`classId` varchar(128),
	`title` varchar(255) NOT NULL,
	`type` varchar(32) NOT NULL,
	`content` text NOT NULL,
	`fileUrl` varchar(512),
	`isDemo` boolean NOT NULL DEFAULT false,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `teachingMaterials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
