import { describe, expect, it } from "vite-plus/test";
import { safeNext } from "./http";

describe("safeNext", () => {
  it("keeps same-origin paths", () => {
    expect(safeNext("/")).toBe("/");
    expect(safeNext("/room/abc?x=1")).toBe("/room/abc?x=1");
  });

  it("rejects absolute and protocol-relative redirects", () => {
    expect(safeNext("https://evil.example/")).toBe("/");
    expect(safeNext("//evil.example/")).toBe("/");
    expect(safeNext("/\\evil.example/")).toBe("/");
    expect(safeNext("/%2f%2fevil.example")).toBe("/");
    expect(safeNext("/\u0000evil")).toBe("/");
    expect(safeNext("")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});
