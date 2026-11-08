const jstFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatJst = (value: string | Date): string =>
  jstFormatter.format(typeof value === "string" ? new Date(value) : value);
