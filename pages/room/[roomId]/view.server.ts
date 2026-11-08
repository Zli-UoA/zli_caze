import { HTTPException } from "hono/http-exception";
import { defineHandler, type InferProps } from "void";
import { htmlErrorResponse } from "@/server/errorPage";
import { canViewRoom } from "@/server/permissions";
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
    throw new HTTPException(404, {
      res: htmlErrorResponse(
        404,
        "ルームが見つかりません",
        "以前のルームは移行されていません。管理者に新しいルームIDを確認してください。",
      ),
    });
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
    throw new HTTPException(403, {
      res: htmlErrorResponse(
        403,
        "このルームには参加できません",
        "招待されたルーム以外は閲覧できません。ゲストをログアウトすると、リンク閲覧が可能なルームは匿名で閲覧できます。",
      ),
    });
  }

  return { roomId };
});

export type Props = InferProps<typeof loader> & { roomId: string };
