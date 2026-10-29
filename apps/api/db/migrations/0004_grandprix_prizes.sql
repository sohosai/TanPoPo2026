CREATE TABLE `grandprix_prizes` (
	`id` integer PRIMARY KEY NOT NULL,
	`vote_id` text,
	FOREIGN KEY (`vote_id`) REFERENCES `grandprix_votes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grandprix_prizes_vote_id_unique` ON `grandprix_prizes` (`vote_id`);--> statement-breakpoint
-- 景品は全部で5個。日ごとに取れる枠は apps/api/trpc/routers/grandprix.ts の PRIZE_LIMITS で決める。
INSERT INTO `grandprix_prizes` (`id`) VALUES (1), (2), (3), (4), (5);
--> statement-breakpoint
-- 枠を取っていない投票に当たりを記録できないよう、どの書き込み経路でも DB 側で拒む。
CREATE TRIGGER `grandprix_draws_win_requires_prize`
BEFORE INSERT ON `grandprix_draws`
WHEN NEW.`result` = 'win'
	AND NOT EXISTS (SELECT 1 FROM `grandprix_prizes` WHERE `vote_id` = NEW.`vote_id`)
BEGIN
	SELECT RAISE(ABORT, 'grandprix win without prize');
END;
