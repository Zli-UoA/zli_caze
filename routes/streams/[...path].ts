import { createStreamsHandler, type DefaultAuthEnv } from "@durable-streams/server-cloudflare";
import { parseCommentEvent } from "@/lib/streamEvent";
import { defineHandler } from "void";

const handler = createStreamsHandler({ cors: false });
const roomPath = /^\/streams\/[A-Za-z0-9_-]{1,64}$/;

const streams = defineHandler((c) => {
  if (!roomPath.test(c.req.path)) {
    return new Response("Not found", { status: 404 });
  }
  return handler(c.req.raw, c.env as unknown as DefaultAuthEnv);
});

export const GET = streams;
export const PUT = streams;
export const OPTIONS = streams;

export const POST = defineHandler(async (c) => {
  if (!roomPath.test(c.req.path)) {
    return new Response("Not found", { status: 404 });
  }

  const raw = await c.req.text();
  const result = parseCommentEvent(raw);
  if (!result.ok) {
    return c.text(result.reason, { status: 400 });
  }

  return handler(
    new Request(c.req.raw.url, {
      method: "POST",
      headers: c.req.raw.headers,
      body: JSON.stringify(result.event),
    }),
    c.env as unknown as DefaultAuthEnv,
  );
});
