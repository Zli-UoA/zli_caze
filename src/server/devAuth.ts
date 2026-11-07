import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { CloudContext } from "void";
import { env } from "void/env";
import type { MemberPrincipal } from "./types";

const DEV_COOKIE = "caze_dev_user";

export const isDevAuthEnabled = (): boolean => import.meta.env.DEV && env.CAZE_DEV_AUTH === "1";

export const setDevUser = (c: CloudContext, input: { name: string; isAdmin: boolean }): void => {
  setCookie(c, DEV_COOKIE, JSON.stringify(input), {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  });
};

export const getDevUser = (c: CloudContext): MemberPrincipal | null => {
  if (!isDevAuthEnabled()) return null;
  const raw = getCookie(c, DEV_COOKIE);
  if (raw == null || raw === "") return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as {
      name?: unknown;
      isAdmin?: unknown;
    };
    const name = typeof parsed.name === "string" ? parsed.name : "Dev User";
    return {
      type: "member",
      userId: `dev:${name}`,
      name,
      isAdmin: parsed.isAdmin === true,
    };
  } catch {
    return null;
  }
};

export const clearDevUser = (c: CloudContext): void => {
  deleteCookie(c, DEV_COOKIE, { path: "/" });
};
