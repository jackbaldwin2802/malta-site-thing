ALTER TABLE `posts` ADD `media_id` text;--> statement-breakpoint
CREATE INDEX `idx_posts_media_id` ON `posts` (`media_id`);--> statement-breakpoint
PRAGMA optimize;
