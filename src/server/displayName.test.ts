import { describe, expect, it } from "vite-plus/test";
import { normalizeGuestName, sanitizeDisplayName } from "./displayName";

describe("sanitizeDisplayName", () => {
  it("trims and removes control/bidi characters", () => {
    expect(sanitizeDisplayName("  Alice\u0000\u202E  ")).toBe("Alice");
  });

  it("uses the fallback for an empty name", () => {
    expect(sanitizeDisplayName("\u0000", "Member")).toBe("Member");
  });

  it("caps the name at 100 characters", () => {
    expect(sanitizeDisplayName("a".repeat(150))).toHaveLength(100);
  });
});

describe("normalizeGuestName", () => {
  it("accepts a normal display name", () => {
    expect(normalizeGuestName(" Guest One ")).toBe("Guest One");
  });

  it("rejects empty, oversized, and all-control names", () => {
    expect(normalizeGuestName("")).toBeNull();
    expect(normalizeGuestName("a".repeat(31))).toBeNull();
    expect(normalizeGuestName("\u0000\u202E")).toBeNull();
  });

  it("removes control characters before validating length", () => {
    expect(normalizeGuestName("Guest\nOne")).toBe("GuestOne");
  });
});
