import { createStreamsHandler } from "@durable-streams/server-cloudflare";

export const streamsHandler = createStreamsHandler({ cors: false });
