import { createStreamsHandler } from "@durable-streams/server-cloudflare";

export const streamsHandler = createStreamsHandler({
  cors: false,
  // Keep the handler's auth-active cache policy (no-store) while the route
  // performs the real room authorization before calling it.
  auth: () => undefined,
});
