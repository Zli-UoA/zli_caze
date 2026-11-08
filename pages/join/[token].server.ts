import { HTTPException } from "hono/http-exception";
import { defineHandler, type InferProps } from "void";
import { ValidationError } from "void/handler";
import { z } from "zod";
import { redirectTo, requireSameOrigin } from "@/server/http";
import { peekGuestInvite, redeemGuestInvite } from "@/server/guest";
import { getContextPrincipal } from "@/server/principal";

const joinSchema = z.object({
  displayName: z.string().trim().min(1).max(30),
});

export const loader = defineHandler(async (c) => {
  const token = c.req.param("token");
  if (token == null || token === "") {
    throw new HTTPException(404, { message: "招待リンクが無効です" });
  }
  const found = await peekGuestInvite(token);
  const principal = await getContextPrincipal(c);

  return {
    token,
    invite:
      found == null
        ? null
        : {
            label: found.invite.label,
            expiresAt: found.invite.expiresAt,
            maxUses: found.invite.maxUses,
            usedCount: found.invite.usedCount,
            room: {
              id: found.room.id,
              title: found.room.title,
              visibility: found.room.visibility,
            },
          },
    principal,
  };
});

export const action = defineHandler.withValidator({
  body: joinSchema,
})(async (c, { body }) => {
  requireSameOrigin(c);
  const token = c.req.param("token");
  if (token == null || token === "") {
    throw new HTTPException(404, { message: "招待リンクが無効です" });
  }
  const found = await peekGuestInvite(token);
  if (found == null) {
    throw new HTTPException(404, { message: "招待リンクが無効か期限切れです" });
  }

  const principal = await getContextPrincipal(c);
  if (principal?.type === "member") {
    redirectTo(c, `/room/${encodeURIComponent(found.room.id)}`);
  }

  const result = await redeemGuestInvite(c, token, body.displayName);
  if (!result.ok) {
    if (result.reason === "invalid-name") {
      throw new ValidationError({ displayName: "表示名は1〜30文字で入力してください" });
    }
    throw new HTTPException(404, { message: "招待リンクが無効か期限切れです" });
  }

  redirectTo(c, `/room/${encodeURIComponent(result.roomId)}`);
});

export type Props = InferProps<typeof loader>;
