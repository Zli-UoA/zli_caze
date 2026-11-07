import { HTTPException } from "hono/http-exception";
import type { CloudContext } from "void";
import { getUser } from "void/auth";
import { getDevUser } from "./devAuth";
import { getGuestSession } from "./guest";
import { redirectTo } from "./http";
import type { Principal } from "./types";

export const getPrincipal = async (c: CloudContext): Promise<Principal | null> => {
  const devUser = getDevUser(c);
  if (devUser != null) return devUser;

  const user = getUser() ?? c.get("user") ?? null;
  if (user != null) {
    return {
      type: "member",
      userId: user.id,
      name: user.name,
      isAdmin: user.isAdmin === true,
    };
  }

  return getGuestSession(c);
};

export const getContextPrincipal = async (c: CloudContext): Promise<Principal | null> => {
  const cached = c.get("principal");
  if (cached !== undefined) return cached;
  return getPrincipal(c);
};

export const requireMember = (principal: Principal | null) => {
  if (principal == null) {
    throw new HTTPException(401, { message: "ログインが必要です" });
  }
  return principal;
};

export const requireAdmin = (principal: Principal | null) => {
  if (principal == null) {
    throw new HTTPException(401, { message: "ログインが必要です" });
  }
  if (principal.type !== "member" || !principal.isAdmin) {
    throw new HTTPException(403, { message: "管理者権限が必要です" });
  }
  return principal;
};

export const requireAdminPage = async (c: CloudContext) => {
  const principal = await getContextPrincipal(c);
  if (principal == null) {
    const url = new URL(c.req.url);
    redirectTo(c, `/login?next=${encodeURIComponent(`${url.pathname}${url.search}`)}`);
  }
  return requireAdmin(principal);
};

export const commentAuthor = (
  principal: Principal,
): { user: string; authorId: string; authorType: "member" | "guest" | "admin" } => {
  if (principal.type === "guest") {
    return {
      user: principal.name,
      authorId: principal.sessionId,
      authorType: "guest",
    };
  }
  return {
    user: principal.name,
    authorId: principal.userId,
    authorType: principal.isAdmin ? "admin" : "member",
  };
};
