ALTER TABLE `teachingMaterials` ADD `analysisStatus` varchar(32) DEFAULT 'uploaded' NOT NULL;--> statement-breakpoint
ALTER TABLE `teachingMaterials` ADD `analysisStage` varchar(64);--> statement-breakpoint
ALTER TABLE `teachingMaterials` ADD `analysisError` text;