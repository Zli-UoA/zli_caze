import { createStreamsHandler, type DefaultAuthEnv } from "@durable-streams/server-cloudflare";
import {
  forwardHeaders,
  hasNonEmptyBody,
  isJsonContentType,
  isRoomPath,
  readTextWithLimit,
} from "@/lib/streamProxy";
import { parseCommentEvent } from "@/lib/streamEvent";
import { defineHandler } from "void";

const handler = createStreamsHandler({ cors: false });

const streams = defineHandler((c) => {
  if (!isRoomPath(c.req.path)) {
    return new Response("Not found", { status: 404 });
  }
  return handler(c.req.raw, c.env as unknown as DefaultAuthEnv);
});

export const GET = streams;
export const OPTIONS = streams;

export const PUT = defineHandler(async (c) => {
  if (!isRoomPath(c.req.path)) {
    return new Response("Not found", { status: 404 });
  }
  if (!isJsonContentType(c.req.header("content-type") ?? null)) {
    return new Response("Unsupported media type", { status: 415 });
  }

  // Allow stream creation only; disallow seeding unvalidated initial events.
  if (await hasNonEmptyBody(c.req.raw)) {
    return new Response("Initial stream payloads are not accepted", { status: 400 });
  }

  return handler(
    new Request(c.req.raw.url, {
      method: "PUT",
      headers: forwardHeaders(c.req.raw.headers),
    }),
    c.env as unknown as DefaultAuthEnv,
  );
});

export const POST = defineHandler(async (c) => {
  if (!isRoomPath(c.req.path)) {
    return new Response("Not found", { status: 404 });
  }

  const bodyResult = await readTextWithLimit(c.req.raw);
  if (!bodyResult.ok) {
    return new Response("Payload too large", { status: 413 });
  }

  const result = parseCommentEvent(bodyResult.text);
  if (!result.ok) {
    return c.text(result.reason, { status: 400 });
  }

  const body = JSON.stringify(result.wrapped ? [result.event] : result.event);
  return handler(
    new Request(c.req.raw.url, {
      method: "POST",
      headers: forwardHeaders(c.req.raw.headers),
      body,
    }),
    c.env as unknown as DefaultAuthEnv,
  );
});
