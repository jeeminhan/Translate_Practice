CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`segment_id` text NOT NULL,
	`user_translation` text NOT NULL,
	`score` integer NOT NULL,
	`feedback_json` text NOT NULL,
	`feedback_mode` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`segment_id`) REFERENCES `segments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `segments` (
	`id` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`position` integer NOT NULL,
	`start_time` real NOT NULL,
	`end_time` real NOT NULL,
	`japanese_text` text NOT NULL,
	`english_ref` text,
	`has_english_ref` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`segments_done` integer DEFAULT 0 NOT NULL,
	`avg_score` real,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`source_type` text NOT NULL,
	`source_url` text,
	`file_path` text,
	`direction` text DEFAULT 'jp_to_en' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vocabulary` (
	`id` text PRIMARY KEY NOT NULL,
	`word` text NOT NULL,
	`reading` text NOT NULL,
	`meaning` text NOT NULL,
	`segment_id` text,
	`context_sentence` text NOT NULL,
	`familiarity` text DEFAULT 'new' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`segment_id`) REFERENCES `segments`(`id`) ON UPDATE no action ON DELETE set null
);
