import { describe, expect, it } from "vite-plus/test";
import {
  isOAuthCallbackPath,
  normalizeProfileImage,
  stripProtectedUserFields,
} from "./authProfile";

const profile = {
  name: "Member",
  authzSub: "authz-sub",
  username: "member",
  isAdmin: true,
  groups: '["zli-officers"]',
  image: "https://avater.zliusercontent.com/avatars/2f1e0f8e-6a0d-4f3b-9f5a-1c2d3e4f5a6b.png",
};

describe("stripProtectedUserFields", () => {
  it("keeps AuthZ profile fields from the OAuth callback", () => {
    expect(stripProtectedUserFields(profile, "/callback/authz")).toEqual(profile);
    expect(stripProtectedUserFields(profile, "/oauth2/callback/authz")).toEqual(profile);
  });

  it("overwrites protected fields with undefined for ordinary updates", () => {
    const result = stripProtectedUserFields({ ...profile, plan: "free" }, "/update-user");
    expect(result.isAdmin).toBeUndefined();
    expect(result.groups).toBeUndefined();
    expect(result.authzSub).toBeUndefined();
    expect(result.username).toBeUndefined();
    expect(result.name).toBeUndefined();
    expect(result.image).toBeUndefined();
    expect(result.plan).toBe("free");
  });

  it("also strips fields when the path is unknown", () => {
    const result = stripProtectedUserFields(profile, "");
    expect(result.isAdmin).toBeUndefined();
    expect(result.name).toBeUndefined();
  });

  it("survives Better Auth's merge with the original payload", () => {
    const original = { isAdmin: false, name: "Member" };
    const merged = {
      ...original,
      ...stripProtectedUserFields({ isAdmin: true, name: "Admin" }, "/update-user"),
    };
    expect(merged.isAdmin).toBeUndefined();
    expect(merged.name).toBeUndefined();
  });
});

describe("normalizeProfileImage", () => {
  it("accepts http(s) avatar URLs", () => {
    expect(normalizeProfileImage("https://avater.zliusercontent.com/avatars/a.png")).toBe(
      "https://avater.zliusercontent.com/avatars/a.png",
    );
    expect(normalizeProfileImage("http://localhost:5173/api/avatars/a")).toBe(
      "http://localhost:5173/api/avatars/a",
    );
  });

  it("rejects missing, oversized, and non-http URLs", () => {
    expect(normalizeProfileImage(undefined)).toBe("");
    expect(normalizeProfileImage("")).toBe("");
    expect(normalizeProfileImage("javascript:alert(1)")).toBe("");
    expect(normalizeProfileImage("ftp://example.com/a.png")).toBe("");
    expect(normalizeProfileImage(`https://example.com/${"a".repeat(2048)}`)).toBe("");
  });
});

describe("isOAuthCallbackPath", () => {
  it("recognizes callback endpoint paths", () => {
    expect(isOAuthCallbackPath("/callback/:id")).toBe(true);
    expect(isOAuthCallbackPath("/callback/authz")).toBe(true);
    expect(isOAuthCallbackPath("/oauth2/callback/authz")).toBe(true);
    expect(isOAuthCallbackPath("/update-user")).toBe(false);
  });
});
