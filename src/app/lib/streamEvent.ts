import type { ChangeEvent } from "@durable-streams/state";
import { commentDraft, type CommentDraft } from "src/schema/message";

export type CommentEventResult =
  | { ok: true; event: ChangeEvent<CommentDraft>; wrapped: boolean }
  | { ok: false; reason: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Validate a state event before it is appended to a room stream.
 * The stream consumer aborts the whole room if one event is malformed, so
 * rejecting early is required to keep a room alive.
 *
 * Author fields are deliberately not read from the client here. The stream
 * route stamps them from the authenticated principal before forwarding.
 */
export const parseCommentEvent = (raw: string): CommentEventResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "Body must be valid JSON" };
  }

  // @durable-streams/client wraps JSON-mode appends in a one-element array.
  const wrapped = Array.isArray(parsed);
  const parsedArray = wrapped ? (parsed as unknown[]) : null;
  if (parsedArray !== null && parsedArray.length !== 1) {
    return { ok: false, reason: "Only one event may be appended at a time" };
  }

  const parsedEvent = parsedArray !== null ? parsedArray[0] : parsed;
  if (!isObject(parsedEvent)) {
    return { ok: false, reason: "Body must be a state event" };
  }
  if (parsedEvent.type !== "comment") {
    return { ok: false, reason: "Unsupported event type" };
  }
  if (!isObject(parsedEvent.headers) || parsedEvent.headers.operation !== "insert") {
    return { ok: false, reason: "Only insert events are accepted" };
  }

  const result = commentDraft.safeParse(parsedEvent.value);
  if (!result.success) {
    return { ok: false, reason: "Comment does not match the schema" };
  }
  if (parsedEvent.key !== result.data.id) {
    return { ok: false, reason: "Event key must match the comment id" };
  }

  const txid = parsedEvent.headers.txid;
  return {
    ok: true,
    wrapped,
    event: {
      type: "comment",
      key: result.data.id,
      value: {
        ...result.data,
        isOptimistic: false,
        createdAt: new Date().toISOString(),
      },
      headers: {
        operation: "insert",
        ...(typeof txid === "string" ? { txid } : {}),
      } as ChangeEvent<CommentDraft>["headers"],
    },
  };
};
