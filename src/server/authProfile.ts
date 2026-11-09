export const PROTECTED_USER_FIELDS = [
  "name",
  "authzSub",
  "username",
  "isAdmin",
  "groups",
  "image",
] as const;

const PROTECTED_USER_FIELD_SET = new Set<string>(PROTECTED_USER_FIELDS);

export const isOAuthCallbackPath = (path: string): boolean =>
  path === "/callback/:id" ||
  path === "/callback/authz" ||
  path === "/oauth2/callback/:id" ||
  path === "/oauth2/callback/authz";

/** AuthZ's production image host. Dev builds use the AuthZ origin instead. */
const AVATAR_PUBLIC_ORIGIN = "https://avater.zliusercontent.com";
const AVATAR_ID = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const PUBLIC_AVATAR_PATH = new RegExp(`^/avatars/${AVATAR_ID}\\.png$`);
const PROVIDER_AVATAR_PATH = new RegExp(`^/api/avatars/${AVATAR_ID}$`);

const originOf = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

/**
 * AuthZ shares the profile icon as the OIDC `picture` claim. Only accept the
 * production CDN path or the AuthZ origin's dev avatar path. An empty string
 * means the user has no icon and clears any previously stored image on the
 * next sign-in. Restricting the host also neutralizes arbitrary image URLs
 * saved before `image` became a protected field.
 */
export const normalizeProfileImage = (value: unknown, authzIssuer: string): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > 2048) return "";

  try {
    const url = new URL(trimmed);
    if (url.username !== "" || url.password !== "") return "";
    if (url.search !== "" || url.hash !== "") return "";

    const authzOrigin = originOf(authzIssuer);
    const isPublicAvatar =
      url.origin === AVATAR_PUBLIC_ORIGIN && PUBLIC_AVATAR_PATH.test(url.pathname);
    const isProviderAvatar =
      authzOrigin != null && url.origin === authzOrigin && PROVIDER_AVATAR_PATH.test(url.pathname);
    if (!isPublicAvatar && !isProviderAvatar) return "";

    const normalized = url.toString();
    return normalized.length <= 2048 ? normalized : "";
  } catch {
    return "";
  }
};

/**
 * `/update-user` may contain only AuthZ-owned fields. Treat that as a no-op
 * instead of passing an all-undefined update to Drizzle, which throws
 * "No values to set" and turns a blocked request into a 500.
 */
export const isProtectedOnlyUpdate = (user: Record<string, unknown>): boolean => {
  const provided = Object.keys(user).filter((key) => user[key] !== undefined);
  return provided.every((key) => PROTECTED_USER_FIELD_SET.has(key));
};

/**
 * AuthZ profile fields may only be written from the verified OAuth callback.
 * Ordinary update-user requests must not be able to set isAdmin, groups, or an
 * arbitrary image URL.
 */
export const stripProtectedUserFields = (
  user: Record<string, unknown>,
  path: string,
): Record<string, unknown> => {
  if (isOAuthCallbackPath(path)) return user;

  // Better Auth merges the hook result into the original update payload.
  // Deleting a key is not enough; overwrite protected fields with undefined so
  // the adapter skips them instead of retaining the client-supplied value.
  const next = { ...user };
  for (const field of PROTECTED_USER_FIELDS) {
    if (field in next) next[field] = undefined;
  }
  return next;
};
