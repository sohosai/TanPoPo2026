CREATE TABLE `crowd_area_minutes` (
	`minute` integer NOT NULL,
	`area_id` text NOT NULL,
	`devices` integer NOT NULL,
	PRIMARY KEY(`minute`, `area_id`)
);
--> statement-breakpoint
CREATE TABLE `location_points` (
	`device_hash` text NOT NULL,
	`measured_at` integer NOT NULL,
	`received_at` integer NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`accuracy` real NOT NULL,
	`altitude` real,
	`altitude_accuracy` real,
	`heading` real,
	`speed` real,
	`is_primary` integer NOT NULL,
	PRIMARY KEY(`device_hash`, `measured_at`)
);
--> statement-breakpoint
CREATE INDEX `location_points_measured_at` ON `location_points` (`measured_at`);