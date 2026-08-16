CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'cash' NOT NULL,
	`initial_balance` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`color` text,
	`icon` text,
	`is_default` integer DEFAULT false NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_categories_name_type` ON `categories` (`name`,`type`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`category_id` integer,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text,
	`date` integer NOT NULL,
	`date_key` text NOT NULL,
	`transfer_group_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "ck_tx_amount_positive" CHECK("transactions"."amount" > 0),
	CONSTRAINT "ck_tx_date_key_shape" CHECK(length("transactions"."date_key") = 10),
	CONSTRAINT "ck_tx_transfer_consistency" CHECK(("transactions"."type" IN ('income','expense') AND "transactions"."transfer_group_id" IS NULL)
          OR ("transactions"."type" IN ('transfer_in','transfer_out')
              AND "transactions"."transfer_group_id" IS NOT NULL
              AND "transactions"."category_id" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `idx_tx_date_key` ON `transactions` (`date_key`);--> statement-breakpoint
CREATE INDEX `idx_tx_account_date` ON `transactions` (`account_id`,`date_key`);--> statement-breakpoint
CREATE INDEX `idx_tx_category` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_tx_transfer_group` ON `transactions` (`transfer_group_id`);