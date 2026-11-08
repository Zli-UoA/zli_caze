import { sql } from "void/db";
import { index, integer, sqliteTable, text, uniqueIndex } from "void/schema-d1";

export const rooms = sqliteTable(
  "rooms",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    status: text("status").notNull().default("active"),
    visibility: text("visibility").notNull().default("link"),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("rooms_status_created_at_idx").on(table.status, table.createdAt)],
);

export const guestInvites = sqliteTable(
  "guest_invites",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    label: text("label").notNull(),
    expiresAt: text("expires_at").notNull(),
    maxUses: integer("max_uses").notNull().default(1),
    usedCount: integer("used_count").notNull().default(0),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    revokedAt: text("revoked_at"),
  },
  (table) => [
    uniqueIndex("guest_invites_token_hash_idx").on(table.tokenHash),
    index("guest_invites_room_idx").on(table.roomId, table.revokedAt, table.expiresAt),
  ],
);

export const guestSessions = sqliteTable(
  "guest_sessions",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull(),
    inviteId: text("invite_id")
      .notNull()
      .references(() => guestInvites.id, { onDelete: "cascade" }),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    expiresAt: text("expires_at").notNull(),
    lastSeenAt: text("last_seen_at"),
    revokedAt: text("revoked_at"),
  },
  (table) => [
    uniqueIndex("guest_sessions_token_hash_idx").on(table.tokenHash),
    index("guest_sessions_room_idx").on(table.roomId, table.expiresAt),
    index("guest_sessions_invite_idx").on(table.inviteId),
  ],
);

export const adminAuditLog = sqliteTable(
  "admin_audit_log",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").notNull(),
    action: text("action").notNull(),
    targetId: text("target_id"),
    detail: text("detail"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("admin_audit_log_created_at_idx").on(table.createdAt)],
);
