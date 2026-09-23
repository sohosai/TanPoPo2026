CREATE TABLE `grandprix_draws` (
	`id` varchar(36) NOT NULL,
	`vote_id` varchar(36) NOT NULL,
	`result` enum('win','lose') NOT NULL,
	`drawn_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `grandprix_draws_id` PRIMARY KEY(`id`),
	CONSTRAINT `grandprix_draws_vote_id_unique` UNIQUE(`vote_id`)
);
--> statement-breakpoint
CREATE TABLE `grandprix_general_votes` (
	`vote_id` varchar(36) NOT NULL,
	`shop_id` varchar(64) NOT NULL,
	CONSTRAINT `grandprix_general_votes_vote_id_shop_id_pk` PRIMARY KEY(`vote_id`,`shop_id`)
);
--> statement-breakpoint
CREATE TABLE `grandprix_stage_votes` (
	`vote_id` varchar(36) NOT NULL,
	`stage` enum('1a','united','kaikan') NOT NULL,
	CONSTRAINT `grandprix_stage_votes_vote_id_stage_pk` PRIMARY KEY(`vote_id`,`stage`)
);
--> statement-breakpoint
CREATE TABLE `grandprix_votes` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`submitted_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `grandprix_votes_id` PRIMARY KEY(`id`),
	CONSTRAINT `grandprix_votes_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `questionnaire_responses` (
	`id` varchar(36) NOT NULL,
	`submission_id` varchar(36) NOT NULL,
	`person_index` int NOT NULL,
	`answers` json NOT NULL,
	CONSTRAINT `questionnaire_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questionnaire_submissions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`headcount` int NOT NULL,
	`submitted_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questionnaire_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questionnaire_tickets` (
	`id` varchar(36) NOT NULL,
	`response_id` varchar(36) NOT NULL,
	`status` enum('unused','used') NOT NULL DEFAULT 'unused',
	`used_at` timestamp,
	CONSTRAINT `questionnaire_tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `questionnaire_tickets_response_id_unique` UNIQUE(`response_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`line_user_id` varchar(64) NOT NULL,
	`display_name` varchar(255),
	`is_tsukuba_student` boolean,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_line_user_id_unique` UNIQUE(`line_user_id`)
);
--> statement-breakpoint
ALTER TABLE `grandprix_draws` ADD CONSTRAINT `grandprix_draws_vote_id_grandprix_votes_id_fk` FOREIGN KEY (`vote_id`) REFERENCES `grandprix_votes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grandprix_general_votes` ADD CONSTRAINT `grandprix_general_votes_vote_id_grandprix_votes_id_fk` FOREIGN KEY (`vote_id`) REFERENCES `grandprix_votes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grandprix_stage_votes` ADD CONSTRAINT `grandprix_stage_votes_vote_id_grandprix_votes_id_fk` FOREIGN KEY (`vote_id`) REFERENCES `grandprix_votes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grandprix_votes` ADD CONSTRAINT `grandprix_votes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questionnaire_responses` ADD CONSTRAINT `questionnaire_responses_submission_id_fk` FOREIGN KEY (`submission_id`) REFERENCES `questionnaire_submissions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questionnaire_submissions` ADD CONSTRAINT `questionnaire_submissions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questionnaire_tickets` ADD CONSTRAINT `questionnaire_tickets_response_id_fk` FOREIGN KEY (`response_id`) REFERENCES `questionnaire_responses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;