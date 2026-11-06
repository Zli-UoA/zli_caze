import { createStreamsHandler, type DefaultAuthEnv } from "@durable-streams/server-cloudflare";
import { defineHandler } from "void";

const handler = createStreamsHandler();

const streams = defineHandler((c) => handler(c.req.raw, c.env as unknown as DefaultAuthEnv));

export const GET = streams;
export const POST = streams;
export const PUT = streams;
export const DELETE = streams;
export const OPTIONS = streams;
