import { genericOAuth } from "better-auth/plugins";
import { defineAuth } from "void/auth";

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

export default defineAuth(({ defaults, env }) => {
  const issuer = asString(env.AUTHZ_ISSUER, "https://account.zli.works/api/auth").replace(
    /\/$/,
    "",
  );
  const adminGroup = asString(env.CAZE_ADMIN_GROUP, "zli-officers");
  const publicOrigin = asString(env.PUBLIC_ORIGIN).replace(/\/$/, "");

  return {
    ...defaults,
    // AuthZ is the only sign-in method. Do not expose password or email login.
    emailAndPassword: { enabled: false },
    user: {
      ...defaults.user,
      additionalFields: {
        ...defaults.user?.additionalFields,
        authzSub: { type: "string", required: false, input: false },
        username: { type: "string", required: false, input: false },
        isAdmin: { type: "boolean", required: false, defaultValue: false, input: false },
        groups: { type: "string", required: false, input: false },
      },
    },
    plugins: [
      ...(defaults.plugins ?? []),
      genericOAuth({
        config: [
          {
            providerId: "authz",
            name: "AuthZ",
            discoveryUrl: `${issuer}/.well-known/openid-configuration`,
            clientId: asString(env.AUTHZ_CLIENT_ID),
            clientSecret: asString(env.AUTHZ_CLIENT_SECRET),
            tokenEndpointAuth: { method: "client_secret_post" },
            ...(publicOrigin !== "" ? { postLogoutRedirectURI: `${publicOrigin}/` } : {}),
            scopes: ["openid", "profile", "email", "groups"],
            pkce: true,
            requireIdTokenVerification: true,
            overrideUserInfo: true,
            mapProfileToUser: (profile) => {
              const subject =
                typeof profile.sub === "string" ? profile.sub : String(profile.sub ?? "");
              const groups = Array.isArray(profile.groups) ? profile.groups.map(String) : [];
              const email =
                typeof profile.email === "string" && profile.email !== ""
                  ? profile.email
                  : `${subject}@user.zli.works`;
              const name =
                typeof profile.name === "string"
                  ? profile.name
                  : typeof profile.preferred_username === "string"
                    ? profile.preferred_username
                    : subject;
              const username =
                typeof profile.preferred_username === "string"
                  ? profile.preferred_username
                  : subject;

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
