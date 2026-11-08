// oxlint-disable-next-line no-control-regex
const CONTROL_OR_BIDI = /[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g;

export const sanitizeDisplayName = (value: string, fallback = ""): string => {
  const normalized = value.replace(CONTROL_OR_BIDI, "").trim();
  return (normalized || fallback).slice(0, 100);
};

export const normalizeGuestName = (value: string): string | null => {
  const normalized = value.replace(CONTROL_OR_BIDI, "").trim();
  if (normalized.length < 1 || normalized.length > 30) return null;
  return normalized;
};
