import { describe, expect, it } from "vite-plus/test";
import { comment } from "../../schema/message";
import { partyMessageSchema } from "./partyCollection";

const validComment = {
  id: "2f1e0f8e-6a0d-4f3b-9f5a-1c2d3e4f5a6b",
  createdAt: "2026-01-01T00:00:00.000Z",
  content: "hello",
  user: "alice",
  isOptimistic: false,
};

describe("partyMessageSchema", () => {
  const schema = partyMessageSchema(comment);

  it("accepts sync messages", () => {
    const result = schema.safeParse({ type: "sync", data: [validComment] });
    expect(result.success).toBe(true);
  });

  it("accepts transaction messages", () => {
    const result = schema.safeParse({
      type: "transaction",
      transactionId: "3e4d5c6b-7a89-4f0e-8d1c-2b3a4f5e6d7c",
      mutations: [
        {
          type: "insert",
          id: validComment.id,
          data: validComment,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts ack messages", () => {
    const result = schema.safeParse({
      type: "ack",
      transactionId: "3e4d5c6b-7a89-4f0e-8d1c-2b3a4f5e6d7c",
      id: "2f1e0f8e-6a0d-4f3b-9f5a-1c2d3e4f5a6b",
    });
    expect(result.success).toBe(true);
  });

  it("rejects malformed or out-of-range comments", () => {
    const result = schema.safeParse({
      type: "sync",
      data: [{ ...validComment, content: "x".repeat(101) }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown message types", () => {
    const result = schema.safeParse({ type: "unknown" });
    expect(result.success).toBe(false);
  });
});
