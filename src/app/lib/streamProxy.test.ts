import { describe, expect, it } from "vite-plus/test";
import { forwardHeaders, isRoomPath } from "./streamProxy";

describe("isRoomPath", () => {
  it("accepts simple room ids", () => {
    expect(isRoomPath("/streams/room-1_A")).toBe(true);
  });

  it("rejects traversal, nested paths and empty ids", () => {
    expect(isRoomPath("/streams/..")).toBe(false);
    expect(isRoomPath("/streams/room/extra")).toBe(false);
    expect(isRoomPath("/streams/")).toBe(false);
    expect(isRoomPath(`/streams/${"x".repeat(65)}`)).toBe(false);
  });
});

describe("forwardHeaders", () => {
  it("only keeps safe headers", () => {
    const headers = new Headers({
      "content-type": "application/json",
      accept: "application/json",
      "stream-closed": "true",
      "stream-seq": "1",
      "producer-id": "p",
      "stream-ttl": "60",
    });
    const forwarded = forwardHeaders(headers);
    expect(forwarded.get("content-type")).toBe("application/json");
    expect(forwarded.get("accept")).toBe("application/json");
    expect(forwarded.get("stream-closed")).toBeNull();
    expect(forwarded.get("stream-seq")).toBeNull();
    expect(forwarded.get("producer-id")).toBeNull();
    expect(forwarded.get("stream-ttl")).toBeNull();
  });
});
