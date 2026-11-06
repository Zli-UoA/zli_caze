const ROOM_PATH = /^\/streams\/[A-Za-z0-9_-]{1,64}$/;

export const isRoomPath = (path: string): boolean => ROOM_PATH.test(path);

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
