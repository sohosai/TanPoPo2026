-- SQLite は既定値の無い NOT NULL 列を ADD COLUMN できないため、テーブルを作り直す。
-- 投票先の企画を記録していなかった旧形式の票は、shop_id を空文字にして残す。
CREATE TABLE `__new_grandprix_stage_votes` (
	`vote_id` text NOT NULL,
	`stage` text NOT NULL,
	`shop_id` text NOT NULL,
	PRIMARY KEY(`vote_id`, `stage`),
	FOREIGN KEY (`vote_id`) REFERENCES `grandprix_votes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_grandprix_stage_votes` (`vote_id`, `stage`, `shop_id`) SELECT `vote_id`, `stage`, '' FROM `grandprix_stage_votes`;
--> statement-breakpoint
DROP TABLE `grandprix_stage_votes`;
--> statement-breakpoint
ALTER TABLE `__new_grandprix_stage_votes` RENAME TO `grandprix_stage_votes`;
