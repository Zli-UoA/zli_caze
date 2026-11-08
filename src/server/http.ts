import { HTTPException } from "hono/http-exception";
import type { CloudContext } from "void";
import { env } from "void/env";

export const requestOrigin = (c: CloudContext): string =>
  (env.PUBLIC_ORIGIN ?? new URL(c.req.url).origin).replace(/\/$/, "");

export const isSecureRequest = (c: CloudContext): boolean =>
  requestOrigin(c).startsWith("https://");

export const safeNext = (value: string | undefined | null): string => {
  if (value == null || value === "") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  // oxlint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(value) || /%2f|%5c/i.test(value)) return "/";
  return value;
};

export const redirectTo = (c: CloudContext, url: string): never => {
  // Use Hono's redirect response so headers set on the context (for example
  // Set-Cookie from a guest login) are preserved.
  throw new HTTPException(302, { res: c.redirect(url, 302) });
};

export const hasValidOrigin = (c: CloudContext): boolean => {
  const origin = c.req.header("origin");
  if (origin == null || origin === "") return true;
  return origin === requestOrigin(c);
};

export const requireSameOrigin = (c: CloudContext): void => {
  if (!hasValidOrigin(c)) {
    throw new HTTPException(403, { message: "Invalid origin" });
  }
};
