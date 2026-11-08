import { HTTPException } from "hono/http-exception";
import { defineHandler, type InferProps } from "void";
import { ValidationError } from "void/handler";
import { z } from "zod";
import { redirectTo, requireSameOrigin } from "@/server/http";
import { getContextPrincipal, requireAdmin, requireAdminPage } from "@/server/principal";
import { createRoom, recordAdminAction } from "@/server/rooms";
import type { Room } from "@/server/types";

const createRoomSchema = z.object({
  title: z.string().trim().min(1).max(100),
  id: z.string().trim().max(64).optional(),
  visibility: z.enum(["link", "members"]).default("link"),
});

export const loader = defineHandler(async (c) => {
  await requireAdminPage(c);
  return {};
});

export const action = defineHandler.withValidator({
  body: createRoomSchema,
})(async (c, { body }) => {
  requireSameOrigin(c);
  const principal = requireAdmin(await getContextPrincipal(c));

  let room: Room;
  try {
    room = await createRoom(c, {
      title: body.title,
      id: body.id?.trim() === "" ? undefined : body.id,
      visibility: body.visibility,
      createdBy: principal.userId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ルームの作成に失敗しました";
    if (message.includes("ルーム名")) throw new ValidationError({ title: message });
    if (message.includes("ルームID")) throw new ValidationError({ id: message });
    throw new HTTPException(400, { message });
  }

  await recordAdminAction({
    actorUserId: principal.userId,
    action: "room.create",
    targetId: room.id,
    detail: room.title,
  });

  redirectTo(c, `/admin/rooms/${encodeURIComponent(room.id)}`);
});

export type Props = InferProps<typeof loader>;
