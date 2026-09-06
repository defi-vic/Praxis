CREATE TABLE `studentProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`classId` varchar(128) NOT NULL,
	`concept` varchar(160) NOT NULL,
	`masteryScore` int NOT NULL,
	`confidenceScore` int NOT NULL,
	`misconceptions` json NOT NULL,
	`strengths` json NOT NULL,
	`preferredExplanationStyle` varchar(120) NOT NULL,
	`recommendedStrategy` text NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `studentProgress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherId` int NOT NULL,
	`classId` varchar(128) NOT NULL,
	`name` varchar(120) NOT NULL,
	`isDemo` boolean NOT NULL DEFAULT true,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `students_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `twinInteractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherId` int NOT NULL,
	`studentId` int,
	`concept` varchar(160) NOT NULL,
	`teacherRequest` text NOT NULL,
	`generatedResponse` json NOT NULL,
	`studentAnswer` text,
	`learningSignal` json,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `twinInteractions_id` PRIMARY KEY(`id`)
);
