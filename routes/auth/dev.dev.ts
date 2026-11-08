import { defineHandler } from "void";
import { env } from "void/env";
import { setDevUser } from "@/server/devAuth";
import { redirectTo, safeNext } from "@/server/http";

export const GET = defineHandler((c) => {
  if (!import.meta.env.DEV || env.CAZE_DEV_AUTH !== "1") {
    return c.text("Not found", 404);
  }

  const name = c.req.query("name")?.trim() || "Dev User";
  setDevUser(c, {
    name: name.slice(0, 100),
    isAdmin: c.req.query("admin") === "1",
  });

  redirectTo(c, safeNext(c.req.query("next")));
});
