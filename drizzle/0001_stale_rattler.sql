ALTER TABLE `jobs` ADD `started_at` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `finished_at` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `total_ms` real;--> statement-breakpoint
ALTER TABLE `results` DROP COLUMN `started_at`;--> statement-breakpoint
ALTER TABLE `results` DROP COLUMN `finished_at`;--> statement-breakpoint
ALTER TABLE `results` DROP COLUMN `total_ms`;