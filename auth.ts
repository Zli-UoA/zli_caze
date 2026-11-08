import { genericOAuth } from "better-auth/plugins";
import { defineAuth } from "void/auth";
import { stripProtectedUserFields } from "./src/server/authProfile";
import { installDiscoveryCache } from "./src/server/discoveryCache";
import { sanitizeDisplayName } from "./src/server/displayName";

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

export default defineAuth(({ defaults, env, request }) => {
  const issuer = asString(env.AUTHZ_ISSUER, "https://account.zli.works/api/auth").replace(
    /\/$/,
    "",
  );
  const adminGroup = asString(env.CAZE_ADMIN_GROUP, "zli-officers");
  const publicOrigin = asString(env.PUBLIC_ORIGIN);
  const origin = publicOrigin !== "" ? new URL(publicOrigin).origin : new URL(request.url).origin;
  const discoveryUrl = `${issuer}/.well-known/openid-configuration`;
  installDiscoveryCache(discoveryUrl);

  return {
    ...defaults,
    baseURL: origin,
    trustedOrigins: [origin],
    advanced: {
      ...defaults.advanced,
      useSecureCookies: origin.startsWith("https://"),
    },
    account: {
      ...defaults.account,
      encryptOAuthTokens: true,
      accountLinking: {
        ...defaults.account?.accountLinking,
        enabled: false,
        disableImplicitLinking: true,
      },
    },
    // AuthZ is the only sign-in method. Do not expose password or email login.
    emailAndPassword: { enabled: false },
    user: {
      ...defaults.user,
      additionalFields: {
        ...defaults.user?.additionalFields,
        // These fields are written from the verified AuthZ profile. The
        // database hook below removes them from ordinary update-user calls
        // so a client cannot grant itself admin access.
        authzSub: { type: "string", required: false, input: true, returned: false },
        username: { type: "string", required: false, input: true, returned: false },
        isAdmin: { type: "boolean", required: false, defaultValue: false, input: true },
        groups: { type: "string", required: false, input: true, returned: false },
      },
    },
    databaseHooks: {
      ...defaults.databaseHooks,
      user: {
        ...defaults.databaseHooks?.user,
        update: {
          ...defaults.databaseHooks?.user?.update,
          before: async (user, context) => {
            const path = context?.path ?? "";
            const next = stripProtectedUserFields(user, path);
            if (next === user) return;
            return { data: next };
          },
        },
      },
    },
    plugins: [
      ...(defaults.plugins ?? []),
      genericOAuth({
        config: [
          {
            providerId: "authz",
            name: "AuthZ",
            discoveryUrl,
            clientId: asString(env.AUTHZ_CLIENT_ID),
            clientSecret: asString(env.AUTHZ_CLIENT_SECRET),
            tokenEndpointAuth: { method: "client_secret_basic" },
            postLogoutRedirectURI: `${origin}/`,
            scopes: ["openid", "profile", "email", "groups"],
            pkce: true,
            requireIdTokenVerification: true,
            overrideUserInfo: true,
            mapProfileToUser: (profile) => {
              const subject =
                typeof profile.sub === "string" ? profile.sub : String(profile.sub ?? "");
              const rawGroups = profile.groups;
              const groups = Array.isArray(rawGroups)
                ? rawGroups.map(String)
                : typeof rawGroups === "string"
                  ? rawGroups.split(/[\s,]+/).filter(Boolean)
                  : [];
              const email =
                typeof profile.email === "string" && profile.email !== ""
                  ? profile.email
                  : `${subject}@user.zli.works`;
              const username = sanitizeDisplayName(
                typeof profile.preferred_username === "string"
                  ? profile.preferred_username
                  : subject,
                subject,
              );
              const name = sanitizeDisplayName(
                typeof profile.name === "string" ? profile.name : username,
                username,
              );

              return {
                authzSub: subject,
                name,
                username,
                email,
                isAdmin: groups.includes(adminGroup),
                groups: JSON.stringify(groups),
              };
            },
          },
        ],
      }),
    ],
  };
});
