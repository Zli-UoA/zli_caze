import { defineEnv, string, url } from "void/env";

export default defineEnv({
  // AuthZ OIDC provider. The production issuer is account.zli.works/api/auth.
  AUTHZ_ISSUER: url().default("https://account.zli.works/api/auth"),
  AUTHZ_CLIENT_ID: string(),
  AUTHZ_CLIENT_SECRET: string(),

  // Optional override for redirect/Origin checks behind a proxy.
  PUBLIC_ORIGIN: url().optional(),

  // AuthZ group whose members may manage Caze rooms.
  CAZE_ADMIN_GROUP: string().default("zli-officers"),

  // Development-only login bypass. Never enable this in production.
  CAZE_DEV_AUTH: string().optional(),
});
