CREATE TABLE `admin_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text NOT NULL,
	`action` text NOT NULL,
	`target_id` text,
	`detail` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_audit_log_created_at_idx` ON `admin_audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `guest_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`label` text NOT NULL,
	`expires_at` text NOT NULL,
	`max_uses` integer DEFAULT 1 NOT NULL,
	`used_count` integer DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guest_invites_token_hash_idx` ON `guest_invites` (`token_hash`);--> statement-breakpoint
CREATE INDEX `guest_invites_room_idx` ON `guest_invites` (`room_id`,`revoked_at`,`expires_at`);--> statement-breakpoint
CREATE TABLE `guest_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`invite_id` text NOT NULL,
	`room_id` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`expires_at` text NOT NULL,
	`last_seen_at` text,
	`revoked_at` text,
	FOREIGN KEY (`invite_id`) REFERENCES `guest_invites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guest_sessions_token_hash_idx` ON `guest_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `guest_sessions_room_idx` ON `guest_sessions` (`room_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`visibility` text DEFAULT 'link' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rooms_status_created_at_idx` ON `rooms` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`userId`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer NOT NULL,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`authzSub` text,
	`username` text,
	`isAdmin` integer,
	`groups` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);