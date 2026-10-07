CREATE TABLE `grandprix_draws` (
	`id` text PRIMARY KEY NOT NULL,
	`vote_id` text NOT NULL,
	`result` text NOT NULL,
	`drawn_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`vote_id`) REFERENCES `grandprix_votes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grandprix_draws_vote_id_unique` ON `grandprix_draws` (`vote_id`);--> statement-breakpoint
CREATE TABLE `grandprix_general_votes` (
	`vote_id` text NOT NULL,
	`shop_id` text NOT NULL,
	PRIMARY KEY(`vote_id`, `shop_id`),
	FOREIGN KEY (`vote_id`) REFERENCES `grandprix_votes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `grandprix_stage_votes` (
	`vote_id` text NOT NULL,
	`stage` text NOT NULL,
	PRIMARY KEY(`vote_id`, `stage`),
	FOREIGN KEY (`vote_id`) REFERENCES `grandprix_votes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `grandprix_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`submitted_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grandprix_votes_user_id_unique` ON `grandprix_votes` (`user_id`);--> statement-breakpoint
CREATE TABLE `questionnaire_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`person_index` integer NOT NULL,
	`answers` text NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `questionnaire_submissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `questionnaire_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`headcount` integer NOT NULL,
	`submitted_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `questionnaire_submissions_user_id_unique` ON `questionnaire_submissions` (`user_id`);--> statement-breakpoint
CREATE TABLE `questionnaire_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`response_id` text NOT NULL,
	`status` text DEFAULT 'unused' NOT NULL,
	`used_at` integer,
	FOREIGN KEY (`response_id`) REFERENCES `questionnaire_responses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `questionnaire_tickets_response_id_unique` ON `questionnaire_tickets` (`response_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`line_user_id` text NOT NULL,
	`display_name` text,
	`is_tsukuba_student` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_line_user_id_unique` ON `users` (`line_user_id`);