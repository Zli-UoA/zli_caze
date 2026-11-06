const ROOM_PATH = /^\/streams\/[A-Za-z0-9_-]{1,64}$/;
export const MAX_COMMENT_BODY_BYTES = 64 * 1024;

export const isRoomPath = (path: string): boolean => ROOM_PATH.test(path);

export const isJsonContentType = (value: string | null): boolean =>
  value?.split(";")[0]?.trim().toLowerCase() === "application/json";

const ALLOWED_HEADERS = new Set(["content-type", "accept", "authorization"]);

/** Only forward safe request headers; Stream-* controls can close/expire streams. */
export const forwardHeaders = (headers: Headers): Headers => {
  const forwarded = new Headers();
  for (const [name, value] of headers) {
    if (ALLOWED_HEADERS.has(name.toLowerCase())) {
      forwarded.set(name, value);
    }
  }
  return forwarded;
};

export type LimitedBody = { ok: true; text: string } | { ok: false; tooLarge: boolean };

/** Read a UTF-8 body without trusting an upstream limit. */
export const readTextWithLimit = async (
  request: Request,
  limit = MAX_COMMENT_BODY_BYTES,
): Promise<LimitedBody> => {
  const declared = request.headers.get("content-length");
  if (declared != null && Number(declared) > limit) {
    return { ok: false, tooLarge: true };
  }
  if (request.body == null) return { ok: true, text: "" };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > limit) {
        return { ok: false, tooLarge: true };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, text };
  } finally {
    await reader.cancel().catch(() => {});
  }
};

/** Check for a non-empty body without buffering it all. */
export const hasNonEmptyBody = async (request: Request): Promise<boolean> => {
  const declared = request.headers.get("content-length");
  if (declared != null) return Number(declared) > 0;
  if (request.body == null) return false;

  const reader = request.body.getReader();
  try {
    const { done, value } = await reader.read();
    return !done && value.byteLength > 0;
  } finally {
    await reader.cancel().catch(() => {});
  }
};
