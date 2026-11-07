import type { DefaultAuthEnv } from "@durable-streams/server-cloudflare";
import { db, desc, eq, like, or } from "void/db";
import type { CloudContext } from "void";
import { adminAuditLog, rooms } from "@schema";
import { streamsHandler } from "./streams";
import type { Room, RoomVisibility } from "./types";

const ROOM_ID = /^[A-Za-z0-9_-]{1,64}$/;

export const listRooms = async (search?: string): Promise<Room[]> => {
  const term = search?.trim();
  const base = db.select().from(rooms);
  const filtered =
    term != null && term !== ""
      ? base.where(or(like(rooms.id, `%${term}%`), like(rooms.title, `%${term}%`)))
      : base;

  return filtered.orderBy(desc(rooms.createdAt)).limit(100);
};

export const getRoom = async (id: string): Promise<Room | null> => {
  const [room] = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return room ?? null;
};

export const ensureRoomStream = async (c: CloudContext, roomId: string): Promise<void> => {
  const url = new URL(`/streams/${encodeURIComponent(roomId)}`, c.req.url);
  const response = await streamsHandler(
    new Request(url, {
      method: "PUT",
      headers: { "content-type": "application/json" },
    }),
    c.env as unknown as DefaultAuthEnv,
  );

  if (!response.ok && response.status !== 409) {
    throw new Error(`ルームのストリーム作成に失敗しました (${response.status})`);
  }
};

export const createRoom = async (
  c: CloudContext,
  input: {
    id?: string;
    title: string;
    visibility: RoomVisibility;
    createdBy: string;
  },
): Promise<Room> => {
  const title = input.title.trim();
  if (title.length === 0 || title.length > 100) {
    throw new Error("ルーム名は1〜100文字で入力してください");
  }

  const id = input.id?.trim() || crypto.randomUUID();
  if (!ROOM_ID.test(id)) {
    throw new Error("ルームIDは英数字・_・-の1〜64文字で入力してください");
  }

  if ((await getRoom(id)) != null) {
    throw new Error("同じルームIDがすでに存在します");
  }

  const visibility: RoomVisibility = input.visibility === "members" ? "members" : "link";
  const timestamp = new Date().toISOString();

  await db.insert(rooms).values({
    id,
    title,
    status: "active",
    visibility,
    createdBy: input.createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  try {
    await ensureRoomStream(c, id);
  } catch (error) {
    await db.delete(rooms).where(eq(rooms.id, id));
    throw error;
  }

  const room = await getRoom(id);
  if (room == null) throw new Error("ルームの作成に失敗しました");
  return room;
};

export const updateRoomVisibility = async (
  roomId: string,
  visibility: RoomVisibility,
): Promise<void> => {
  await db
    .update(rooms)
    .set({
      visibility: visibility === "members" ? "members" : "link",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(rooms.id, roomId));
};

export const recordAdminAction = async (input: {
  actorUserId: string;
  action: string;
  targetId?: string;
  detail?: string;
}): Promise<void> => {
  await db.insert(adminAuditLog).values({
    id: crypto.randomUUID(),
    actorUserId: input.actorUserId,
    action: input.action,
    targetId: input.targetId ?? null,
    detail: input.detail ?? null,
    createdAt: new Date().toISOString(),
  });
};
