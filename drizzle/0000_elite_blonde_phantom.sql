CREATE TABLE `files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`filename` text NOT NULL,
	`path` text NOT NULL,
	`uploaded_at` integer DEFAULT (strftime('%s','now') * 1000)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_title` text NOT NULL,
	`cv_file_id` integer NOT NULL,
	`report_file_id` integer NOT NULL,
	`status` text DEFAULT 'queued',
	`error` text
);
--> statement-breakpoint
CREATE TABLE `results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`cv_match_rate` integer,
	`cv_feedback` text,
	`project_score` integer,
	`project_feedback` text,
	`overall_summary` text,
	`started_at` integer,
	`finished_at` integer,
	`total_ms` real
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_results_jobId` ON `results` (`job_id`);--> statement-breakpoint
CREATE TABLE `vectors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`doc_id` text NOT NULL,
	`source` text NOT NULL,
	`embedding` text NOT NULL,
	`text` text NOT NULL
);
