import { defineMiddleware } from "void";
import { getPrincipal } from "../src/server/principal";
import type { Principal } from "../src/server/types";

declare module "void" {
  interface CloudContextVariables {
    principal: Principal | null;
    shared: { principal: Principal | null };
  }
}

const STATIC_PREFIXES = ["/assets/", "/favicon", "/logo", "/apple-touch-icon"];

const isStaticAsset = (path: string): boolean =>
  STATIC_PREFIXES.some((prefix) => path.startsWith(prefix));

export default defineMiddleware(async (c, next) => {
  const path = c.req.path;

  c.header("X-Frame-Options", "DENY");
  c.header("Content-Security-Policy", "frame-ancestors 'none'");

  if (path.startsWith("/api/auth/") || isStaticAsset(path)) {
    c.set("principal", null);
    c.set("shared", { principal: null });
    return next();
  }

  if (
    path.startsWith("/admin") ||
    path.startsWith("/room") ||
    path.startsWith("/join") ||
    path.startsWith("/streams")
  ) {
    c.header("Cache-Control", "private, no-store");
    c.header("Vary", "Cookie");
  }

  if (path.startsWith("/admin") || path.startsWith("/join")) {
    c.header("Referrer-Policy", "no-referrer");
    c.header("X-Robots-Tag", "noindex");
  }

  const principal = await getPrincipal(c);
  c.set("principal", principal);
  c.set("shared", { principal });
  await next();
});
