CREATE TABLE `post_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`body` text NOT NULL,
	`author` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_post_comments_post_id` ON `post_comments` (`post_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`format` text DEFAULT 'Reel' NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`scheduled_at` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`tone` text DEFAULT 'sea' NOT NULL,
	`assignee` text DEFAULT 'Malta team' NOT NULL,
	`media_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_posts`("id", "title", "caption", "format", "status", "scheduled_at", "location", "tone", "assignee", "media_id", "created_at") SELECT "id", "title", "caption", "format", "status", "scheduled_at", "location", "tone", "assignee", "media_id", "created_at" FROM `posts`;--> statement-breakpoint
DROP TABLE `posts`;--> statement-breakpoint
ALTER TABLE `__new_posts` RENAME TO `posts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_posts_scheduled_at` ON `posts` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `idx_posts_status` ON `posts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_posts_media_id` ON `posts` (`media_id`);--> statement-breakpoint
PRAGMA optimize;
