import { defineHandler } from "void";
import { clearDevUser } from "@/server/devAuth";
import { clearGuestSession } from "@/server/guest";
import { requireSameOrigin } from "@/server/http";

type AuthInstance = {
  api: {
    signOut: (input: { headers: Headers }) => Promise<unknown>;
  };
};

export const POST = defineHandler(async (c) => {
  requireSameOrigin(c);

  // Clear guest/dev cookies even if the Better Auth sign-out below fails.
  await clearGuestSession(c);
  clearDevUser(c);

  const auth = c.get("__voidAuth") as AuthInstance | undefined;
  if (auth != null) {
    try {
      await auth.api.signOut({ headers: c.req.raw.headers });
    } catch (error) {
      console.error("Better Auth sign-out failed", error);
    }
  }

  return c.body(null, 204);
});
