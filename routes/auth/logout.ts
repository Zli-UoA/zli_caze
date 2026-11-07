import { defineHandler } from "void";
import { clearDevUser } from "@/server/devAuth";
import { clearGuestSession } from "@/server/guest";
import { requireSameOrigin } from "@/server/http";

export const POST = defineHandler(async (c) => {
  requireSameOrigin(c);
  await clearGuestSession(c);
  clearDevUser(c);
  return c.body(null, 204);
});
