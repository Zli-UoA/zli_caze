import { HTTPException } from "hono/http-exception";
import { defineHandler, type InferProps } from "void";
import { canPostComment, canViewRoom } from "@/server/permissions";
import { getContextPrincipal } from "@/server/principal";
import { getRoom } from "@/server/rooms";

export const ssr = false;

export const loader = defineHandler(async (c) => {
  const roomId = c.req.param("roomId");
  if (roomId == null || roomId === "") {
    throw new HTTPException(404, { message: "ルームが見つかりません" });
  }
  const room = await getRoom(roomId);
  if (room == null) {
    throw new HTTPException(404, { message: "ルームが見つかりません" });
  }

  const principal = await getContextPrincipal(c);
  if (!canViewRoom(principal, room)) {
    if (principal == null) {
      const url = new URL(c.req.url);
      const next = `${url.pathname}${url.search}`;
      throw new HTTPException(302, {
        res: new Response(null, {
          status: 302,
          headers: { Location: `/login?next=${encodeURIComponent(next)}` },
        }),
      });
    }
    throw new HTTPException(403, { message: "このルームを閲覧する権限がありません" });
  }

  return {
    roomId,
    room,
    principal,
    canPost: canPostComment(principal, room),
  };
});

export type Props = InferProps<typeof loader> & { roomId: string };
