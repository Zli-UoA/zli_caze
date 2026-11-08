import { describe, expect, it } from "vite-plus/test";
import { parseCommentEvent } from "./streamEvent";

const comment = {
  id: "2f1e0f8e-6a0d-4f3b-9f5a-1c2d3e4f5a6b",
  createdAt: "2026-01-01T00:00:00.000Z",
  content: "hello",
  user: "alice",
  isOptimistic: true,
};

const event = {
  type: "comment",
  key: comment.id,
  value: comment,
  headers: { operation: "insert", txid: "tx-1" },
};

describe("parseCommentEvent", () => {
  it("accepts a valid insert event and server-stamps it", () => {
    const result = parseCommentEvent(JSON.stringify(event));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.event.value?.isOptimistic).toBe(false);
    expect(result.event.value?.createdAt).not.toBe(comment.createdAt);
    expect(result.event.headers.txid).toBe("tx-1");
  });

  it("rejects malformed JSON", () => {
    expect(parseCommentEvent("{").ok).toBe(false);
  });

  it("accepts the one-element array envelope used by the client", () => {
    const result = parseCommentEvent(JSON.stringify([event]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.wrapped).toBe(true);
  });

  it("rejects arrays with zero or multiple events", () => {
    expect(parseCommentEvent(JSON.stringify([])).ok).toBe(false);
    expect(parseCommentEvent(JSON.stringify([event, event])).ok).toBe(false);
  });

  it("rejects unknown types", () => {
    expect(parseCommentEvent(JSON.stringify({ ...event, type: "other" })).ok).toBe(false);
  });

  it("rejects non-insert operations", () => {
    expect(
      parseCommentEvent(
        JSON.stringify({ ...event, headers: { operation: "delete", txid: "tx-1" } }),
      ).ok,
    ).toBe(false);
  });

  it("rejects schema-invalid comments", () => {
    expect(
      parseCommentEvent(
        JSON.stringify({
          ...event,
          value: { ...comment, content: "x".repeat(101) },
        }),
      ).ok,
    ).toBe(false);
  });

  it("rejects a key that does not match the comment id", () => {
    expect(parseCommentEvent(JSON.stringify({ ...event, key: "other" })).ok).toBe(false);
  });

  it("does not trust client-supplied author fields", () => {
    const result = parseCommentEvent(
      JSON.stringify({
        ...event,
        value: { ...comment, authorId: "someone-else", authorType: "admin" },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event.value).not.toHaveProperty("authorId");
    expect(result.event.value).not.toHaveProperty("authorType");
  });
});
