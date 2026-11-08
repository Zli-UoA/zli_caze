/** Keep a post-login redirect on this origin. */
export const safeNextPath = (value: string | null | undefined): string => {
  if (value == null || value === "") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  // oxlint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(value) || /%2f|%5c/i.test(value)) return "/";
  return value;
};
