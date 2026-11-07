import { HTTPException } from "hono/http-exception";
import { defineHandler, type InferProps } from "void";
import { z } from "zod";
import { requestOrigin, redirectTo } from "@/server/http";
import { createGuestInvite, listGuestInvites, revokeGuestInvite } from "@/server/guest";
import { getContextPrincipal, requireAdmin, requireAdminPage } from "@/server/principal";
import { getRoom, recordAdminAction, updateRoomVisibility } from "@/server/rooms";

const inviteSchema = z.object({
  label: z.string().trim().min(1).max(100),
  expiresInHours: z.number().int().min(1).max(168).default(24),
  maxUses: z.number().int().min(0).max(1000).default(0),
});

const revokeSchema = z.object({
  inviteId: z.string().min(1),
});

const visibilitySchema = z.object({
  visibility: z.enum(["link", "members"]),
});

export const loader = defineHandler(async (c) => {
  await requireAdminPage(c);

  const roomId = c.req.param("roomId");
  if (roomId == null || roomId === "") {
    throw new HTTPException(404, { message: "ルームが見つかりません" });
  }
  const room = await getRoom(roomId);
  if (room == null) throw new HTTPException(404, { message: "ルームが見つかりません" });

  return {
    room,
    invites: await listGuestInvites(roomId),
    inviteToken: c.req.query("invite") ?? null,
    origin: requestOrigin(c),
  };
});

export const actions = {
  invite: defineHandler.withValidator({ body: inviteSchema })(async (c, { body }) => {
    const principal = requireAdmin(await getContextPrincipal(c));
    const roomId = c.req.param("roomId");
    if (roomId == null || roomId === "") {
      throw new HTTPException(404, { message: "ルームが見つかりません" });
    }
    const room = await getRoom(roomId);
    if (room == null) throw new HTTPException(404, { message: "ルームが見つかりません" });

    const token = await createGuestInvite(c, {
      roomId,
      label: body.label,
      expiresAt: new Date(Date.now() + body.expiresInHours * 60 * 60 * 1000).toISOString(),
      maxUses: body.maxUses,
      createdBy: principal.userId,
    });

    await recordAdminAction({
      actorUserId: principal.userId,
      action: "invite.create",
      targetId: roomId,
      detail: body.label,
    });

    redirectTo(c, `/admin/rooms/${encodeURIComponent(roomId)}?invite=${encodeURIComponent(token)}`);
  }),

  revoke: defineHandler.withValidator({ body: revokeSchema })(async (c, { body }) => {
    const principal = requireAdmin(await getContextPrincipal(c));
    const roomId = c.req.param("roomId");
    if (roomId == null || roomId === "") {
      throw new HTTPException(404, { message: "ルームが見つかりません" });
    }

    await revokeGuestInvite(body.inviteId);
    await recordAdminAction({
      actorUserId: principal.userId,
      action: "invite.revoke",
      targetId: body.inviteId,
    });

    redirectTo(c, `/admin/rooms/${encodeURIComponent(roomId)}`);
  }),

  visibility: defineHandler.withValidator({ body: visibilitySchema })(async (c, { body }) => {
    const principal = requireAdmin(await getContextPrincipal(c));
    const roomId = c.req.param("roomId");
    if (roomId == null || roomId === "") {
      throw new HTTPException(404, { message: "ルームが見つかりません" });
    }
    const room = await getRoom(roomId);
    if (room == null) throw new HTTPException(404, { message: "ルームが見つかりません" });

    await updateRoomVisibility(roomId, body.visibility);
    await recordAdminAction({
      actorUserId: principal.userId,
      action: "room.visibility",
      targetId: roomId,
      detail: body.visibility,
    });

    redirectTo(c, `/admin/rooms/${encodeURIComponent(roomId)}`);
  }),
};

export type Props = InferProps<typeof loader>;
