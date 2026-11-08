export const PROTECTED_USER_FIELDS = ["name", "authzSub", "username", "isAdmin", "groups"] as const;

export const isOAuthCallbackPath = (path: string): boolean =>
  path === "/callback/:id" || path.startsWith("/callback/") || path.startsWith("/oauth2/callback/");

/**
 * AuthZ profile fields may only be written from the verified OAuth callback.
 * Ordinary update-user requests must not be able to set isAdmin or groups.
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
