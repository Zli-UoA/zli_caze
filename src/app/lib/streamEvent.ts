import type { ChangeEvent } from "@durable-streams/state";
import { comment, type Comment } from "src/schema/message";

export type CommentEventResult =
  | { ok: true; event: ChangeEvent<Comment> }
  | { ok: false; reason: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Validate a state event before it is appended to a room stream.
 * The stream consumer aborts the whole room if one event is malformed, so
 * rejecting early is required to keep a room alive.
 */
export const parseCommentEvent = (raw: string): CommentEventResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "Body must be valid JSON" };
  }

  if (!isObject(parsed)) {
    return { ok: false, reason: "Body must be a single state event" };
  }
  if (parsed.type !== "comment") {
    return { ok: false, reason: "Unsupported event type" };
  }
  if (!isObject(parsed.headers) || parsed.headers.operation !== "insert") {
    return { ok: false, reason: "Only insert events are accepted" };
  }

  const result = comment.safeParse(parsed.value);
  if (!result.success) {
    return { ok: false, reason: "Comment does not match the schema" };
  }
  if (parsed.key !== result.data.id) {
    return { ok: false, reason: "Event key must match the comment id" };
  }

  return {
    ok: true,
    event: {
      type: "comment",
      key: result.data.id,
      value: {
        ...result.data,
        isOptimistic: false,
        createdAt: new Date().toISOString(),
      },
      headers: { ...parsed.headers, operation: "insert" } as ChangeEvent<Comment>["headers"],
    },
  };
};
