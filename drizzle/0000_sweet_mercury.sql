CREATE TABLE `creators` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`handle` text DEFAULT '' NOT NULL,
	`specialties` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'Prospect' NOT NULL,
	`instagram` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`next_action` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_creators_status` ON `creators` (`status`);--> statement-breakpoint
CREATE TABLE `ideas` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'Idea' NOT NULL,
	`title` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`color` text DEFAULT 'coral' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ideas_kind` ON `ideas` (`kind`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`mime_type` text NOT NULL,
	`object_key` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`used_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_media_assets_status` ON `media_assets` (`status`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`format` text DEFAULT 'Reel' NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`scheduled_at` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`tone` text DEFAULT 'sea' NOT NULL,
	`assignee` text DEFAULT 'Malta team' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_posts_scheduled_at` ON `posts` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `idx_posts_status` ON `posts` (`status`);
--> statement-breakpoint
PRAGMA optimize;
