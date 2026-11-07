import { describe, expect, it } from "vite-plus/test";
import { commentsState } from "./comments";

const comment = {
  id: "2f1e0f8e-6a0d-4f3b-9f5a-1c2d3e4f5a6b",
  createdAt: "2026-01-01T00:00:00.000Z",
  content: "hello",
  user: "alice",
  authorId: "user-1",
  authorType: "member" as const,
  isOptimistic: false,
};

describe("commentsState", () => {
  it("builds insert change events with the comment primary key", () => {
    const event = commentsState.comments.insert({
      value: comment,
      headers: { txid: "tx-1" },
    });

    expect(event.type).toBe("comment");
    expect(event.key).toBe(comment.id);
    expect(event.value).toEqual(comment);
    expect(event.headers.operation).toBe("insert");
    expect(event.headers.txid).toBe("tx-1");
  });

  it("builds delete change events", () => {
    const event = commentsState.comments.delete({ key: comment.id });
    expect(event.type).toBe("comment");
    expect(event.key).toBe(comment.id);
    expect(event.headers.operation).toBe("delete");
  });
});
