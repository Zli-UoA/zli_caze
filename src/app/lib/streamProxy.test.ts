import { describe, expect, it } from "vite-plus/test";
import {
  forwardHeaders,
  hasNonEmptyBody,
  isJsonContentType,
  isRoomPath,
  readTextWithLimit,
} from "./streamProxy";

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
      authorization: "Bearer token",
      "stream-closed": "true",
      "stream-seq": "1",
      "stream-forked-from": "/streams/source",
      "producer-id": "p",
      "stream-ttl": "60",
    });
    const forwarded = forwardHeaders(headers);
    expect(forwarded.get("content-type")).toBe("application/json");
    expect(forwarded.get("accept")).toBe("application/json");
    expect(forwarded.get("authorization")).toBeNull();
    expect(forwarded.get("stream-closed")).toBeNull();
    expect(forwarded.get("stream-seq")).toBeNull();
    expect(forwarded.get("stream-forked-from")).toBeNull();
    expect(forwarded.get("producer-id")).toBeNull();
    expect(forwarded.get("stream-ttl")).toBeNull();
  });
});

describe("content type and body guards", () => {
  it("accepts application/json with parameters only", () => {
    expect(isJsonContentType("application/json")).toBe(true);
    expect(isJsonContentType("Application/JSON; charset=utf-8")).toBe(true);
    expect(isJsonContentType("application/jsonx")).toBe(false);
    expect(isJsonContentType(null)).toBe(false);
  });

  it("reads small bodies and rejects oversized bodies", async () => {
    const small = new Request("http://local", { method: "POST", body: "hello" });
    expect(await readTextWithLimit(small, 10)).toEqual({ ok: true, text: "hello" });

    const large = new Request("http://local", { method: "POST", body: "0123456789A" });
    expect(await readTextWithLimit(large, 10)).toEqual({ ok: false, tooLarge: true });
  });

  it("detects empty and non-empty bodies", async () => {
    expect(await hasNonEmptyBody(new Request("http://local", { method: "PUT" }))).toBe(false);
    expect(await hasNonEmptyBody(new Request("http://local", { method: "PUT", body: "x" }))).toBe(
      true,
    );
  });
});
