CREATE TABLE `oauth_states` (
	`state` text PRIMARY KEY NOT NULL,
	`nonce` text NOT NULL,
	`redirect` text NOT NULL,
	`expires_at` integer NOT NULL
);
