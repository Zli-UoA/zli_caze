import type { DefaultAuthEnv } from "@durable-streams/server-cloudflare";
import {
  forwardHeaders,
  isJsonContentType,
  isRoomPath,
  readTextWithLimit,
} from "@/lib/streamProxy";
import { parseCommentEvent } from "@/lib/streamEvent";
import { requireSameOrigin } from "@/server/http";
import { canPostComment, canViewRoom } from "@/server/permissions";
import { commentAuthor, getContextPrincipal } from "@/server/principal";
import { getRoom } from "@/server/rooms";
import { streamsHandler } from "@/server/streams";
import { defineHandler } from "void";

const roomIdFromPath = (path: string): string => path.slice("/streams/".length);

const roomForPath = async (path: string) => {
  if (!isRoomPath(path)) return null;
  return getRoom(roomIdFromPath(path));
};

export const GET = defineHandler(async (c) => {
  const room = await roomForPath(c.req.path);
  if (room == null) return new Response("Not found", { status: 404 });

  const principal = await getContextPrincipal(c);
  if (!canViewRoom(principal, room)) return new Response("Forbidden", { status: 403 });

  return streamsHandler(c.req.raw, c.env as unknown as DefaultAuthEnv);
});

export const OPTIONS = defineHandler((c) => {
  if (!isRoomPath(c.req.path)) return new Response("Not found", { status: 404 });
  return streamsHandler(c.req.raw, c.env as unknown as DefaultAuthEnv);
});

export const POST = defineHandler(async (c) => {
  requireSameOrigin(c);

  const room = await roomForPath(c.req.path);
  if (room == null) return new Response("Not found", { status: 404 });
  if (!isJsonContentType(c.req.header("content-type") ?? null)) {
    return new Response("Unsupported media type", { status: 415 });
  }

  const principal = await getContextPrincipal(c);
  if (principal == null) return new Response("Unauthorized", { status: 401 });
  if (!canPostComment(principal, room)) return new Response("Forbidden", { status: 403 });

  const bodyResult = await readTextWithLimit(c.req.raw);
  if (!bodyResult.ok) {
    return new Response("Payload too large", { status: 413 });
  }

  const result = parseCommentEvent(bodyResult.text);
  if (!result.ok) {
    return c.text(result.reason, { status: 400 });
  }

  // Never trust author fields or timestamps from the client.
  const event = {
    ...result.event,
    value: {
      ...result.event.value,
      ...commentAuthor(principal),
      createdAt: new Date().toISOString(),
      isOptimistic: false,
    },
  };
  const body = JSON.stringify(result.wrapped ? [event] : event);

  return streamsHandler(
    new Request(c.req.raw.url, {
      method: "POST",
      headers: forwardHeaders(c.req.raw.headers),
      body,
    }),
    c.env as unknown as DefaultAuthEnv,
  );
});
