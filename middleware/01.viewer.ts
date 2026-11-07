import { defineMiddleware } from "void";
import { getPrincipal } from "../src/server/principal";
import type { Principal } from "../src/server/types";

declare module "void" {
  interface CloudContextVariables {
    principal: Principal | null;
    shared: { principal: Principal | null };
  }
}

export default defineMiddleware(async (c, next) => {
  if (c.req.path.startsWith("/api/auth/")) {
    c.set("principal", null);
    c.set("shared", { principal: null });
    return next();
  }

  const principal = await getPrincipal(c);
  c.set("principal", principal);
  c.set("shared", { principal });
  await next();
});
