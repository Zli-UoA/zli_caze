import { and, eq, gt, isNull, lt, or, sql } from "void/db";
import { db } from "void/db";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { CloudContext } from "void";
import { guestInvites, guestSessions, rooms } from "@schema";
import { isSecureRequest } from "./http";
import type { GuestPrincipal } from "./types";

const GUEST_COOKIE = "caze_guest";
const SECURE_GUEST_COOKIE = "__Host-caze_guest";
const GUEST_SESSION_HOURS = 12;

const guestCookieName = (c: CloudContext): string =>
  isSecureRequest(c) ? SECURE_GUEST_COOKIE : GUEST_COOKIE;

const guestCookieOptions = (c: CloudContext) => ({
  path: "/",
  httpOnly: true,
  secure: isSecureRequest(c),
  sameSite: "Lax" as const,
});

const base64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const randomToken = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
};

export const hashGuestToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return base64Url(new Uint8Array(digest));
};

const now = () => new Date().toISOString();

const isUsableInvite = (invite: typeof guestInvites.$inferSelect): boolean =>
  invite.revokedAt == null &&
  invite.expiresAt > now() &&
  (invite.maxUses === 0 || invite.usedCount < invite.maxUses);

export type GuestInviteWithRoom = {
  invite: typeof guestInvites.$inferSelect;
  room: typeof rooms.$inferSelect;
};

export const peekGuestInvite = async (token: string): Promise<GuestInviteWithRoom | null> => {
  const tokenHash = await hashGuestToken(token);
  const [invite] = await db
    .select()
    .from(guestInvites)
    .where(eq(guestInvites.tokenHash, tokenHash))
    .limit(1);
  if (invite == null || !isUsableInvite(invite)) return null;

  const [room] = await db.select().from(rooms).where(eq(rooms.id, invite.roomId)).limit(1);
  if (room == null || room.status === "archived") return null;

  return { invite, room };
};

export type RedeemResult =
  | { ok: true; roomId: string }
  | { ok: false; reason: "invalid" | "exhausted" | "invalid-name" };

export const redeemGuestInvite = async (
  c: CloudContext,
  token: string,
  displayName: string,
): Promise<RedeemResult> => {
  const name = displayName.trim();
  if (name.length === 0 || name.length > 30) return { ok: false, reason: "invalid-name" };

  const found = await peekGuestInvite(token);
  if (found == null) return { ok: false, reason: "invalid" };

  const claimed = await db
    .update(guestInvites)
    .set({ usedCount: sql`${guestInvites.usedCount} + 1` })
    .where(
      and(
        eq(guestInvites.id, found.invite.id),
        isNull(guestInvites.revokedAt),
        gt(guestInvites.expiresAt, now()),
        or(eq(guestInvites.maxUses, 0), lt(guestInvites.usedCount, guestInvites.maxUses)),
      ),
    )
    .returning({ id: guestInvites.id });

  if (claimed.length === 0) return { ok: false, reason: "exhausted" };

  const sessionToken = randomToken();
  const tokenHash = await hashGuestToken(sessionToken);
  const expiresAt = new Date(
    Math.min(Date.parse(found.invite.expiresAt), Date.now() + GUEST_SESSION_HOURS * 60 * 60 * 1000),
  ).toISOString();

  try {
    await db.insert(guestSessions).values({
      id: crypto.randomUUID(),
      tokenHash,
      inviteId: found.invite.id,
      roomId: found.room.id,
      displayName: name,
      createdAt: now(),
      expiresAt,
    });
  } catch (error) {
    await db
      .update(guestInvites)
      .set({ usedCount: sql`max(${guestInvites.usedCount} - 1, 0)` })
      .where(eq(guestInvites.id, found.invite.id));
    throw error;
  }

  setCookie(c, guestCookieName(c), sessionToken, {
    ...guestCookieOptions(c),
    maxAge: Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)),
  });

  return { ok: true, roomId: found.room.id };
};

export const getGuestSession = async (c: CloudContext): Promise<GuestPrincipal | null> => {
  const token = getCookie(c, guestCookieName(c));
  if (token == null || token === "") return null;

  const tokenHash = await hashGuestToken(token);
  const [session] = await db
    .select()
    .from(guestSessions)
    .where(eq(guestSessions.tokenHash, tokenHash))
    .limit(1);
  if (session == null || session.revokedAt != null || session.expiresAt <= now()) return null;

  const [invite] = await db
    .select()
    .from(guestInvites)
    .where(eq(guestInvites.id, session.inviteId))
    .limit(1);
  if (invite == null || invite.revokedAt != null || invite.expiresAt <= now()) return null;

  const [room] = await db.select().from(rooms).where(eq(rooms.id, session.roomId)).limit(1);
  if (room == null || room.status === "archived") return null;

  return {
    type: "guest",
    sessionId: session.id,
    inviteId: session.inviteId,
    roomId: session.roomId,
    name: session.displayName,
  };
};

export const clearGuestSession = async (c: CloudContext): Promise<void> => {
  const token = getCookie(c, guestCookieName(c));
  if (token != null && token !== "") {
    const tokenHash = await hashGuestToken(token);
    await db.delete(guestSessions).where(eq(guestSessions.tokenHash, tokenHash));
  }
  deleteCookie(c, guestCookieName(c), {
    path: "/",
    secure: isSecureRequest(c),
  });
};

export const createGuestInvite = async (
  c: CloudContext,
  input: {
    roomId: string;
    label: string;
    expiresAt: string;
    maxUses: number;
    createdBy: string;
  },
): Promise<string> => {
  const token = randomToken();
  const tokenHash = await hashGuestToken(token);
  await db.insert(guestInvites).values({
    id: crypto.randomUUID(),
    roomId: input.roomId,
    tokenHash,
    label: input.label,
    expiresAt: input.expiresAt,
    maxUses: input.maxUses,
    createdBy: input.createdBy,
    createdAt: now(),
  });
  return token;
};

export type GuestInviteSummary = Pick<
  typeof guestInvites.$inferSelect,
  "id" | "label" | "expiresAt" | "maxUses" | "usedCount" | "createdAt" | "revokedAt"
>;

export const listGuestInvites = async (roomId: string): Promise<GuestInviteSummary[]> =>
  db
    .select({
      id: guestInvites.id,
      label: guestInvites.label,
      expiresAt: guestInvites.expiresAt,
      maxUses: guestInvites.maxUses,
      usedCount: guestInvites.usedCount,
      createdAt: guestInvites.createdAt,
      revokedAt: guestInvites.revokedAt,
    })
    .from(guestInvites)
    .where(eq(guestInvites.roomId, roomId))
    .orderBy(guestInvites.createdAt);

export const revokeGuestInvite = async (inviteId: string): Promise<void> => {
  await db.update(guestInvites).set({ revokedAt: now() }).where(eq(guestInvites.id, inviteId));
  await db.delete(guestSessions).where(eq(guestSessions.inviteId, inviteId));
};
