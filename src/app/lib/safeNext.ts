/** Keep a post-login redirect on this origin. */
export const safeNextPath = (value: string | null | undefined): string => {
  if (value == null || value === "") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
};
