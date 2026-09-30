CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room` text NOT NULL,
	`booked_by` text NOT NULL,
	`day` text NOT NULL,
	`start_hour` integer NOT NULL,
	`end_hour` integer NOT NULL,
	`purpose` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
