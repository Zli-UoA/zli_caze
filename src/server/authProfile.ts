export const PROTECTED_USER_FIELDS = ["authzSub", "username", "isAdmin", "groups"] as const;

export const isOAuthCallbackPath = (path: string): boolean =>
  path === "/callback/:id" || path.startsWith("/callback/") || path.startsWith("/oauth2/callback/");

/**
 * AuthZ profile fields may only be written from the verified OAuth callback.
 * Ordinary update-user requests must not be able to set isAdmin or groups.
 */
export const stripProtectedUserFields = <T extends Record<string, unknown>>(
  user: T,
  path: string,
): T => {
  if (isOAuthCallbackPath(path)) return user;

  const next = { ...user };
  for (const field of PROTECTED_USER_FIELDS) delete next[field];
  return next;
};
