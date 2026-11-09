import { describe, expect, it } from "vite-plus/test";
import {
  isOAuthCallbackPath,
  isProtectedOnlyUpdate,
  normalizeProfileImage,
  stripProtectedUserFields,
} from "./authProfile";

const authzIssuer = "https://account.zli.works/api/auth";
const avatarId = "2f1e0f8e-6a0d-4f3b-9f5a-1c2d3e4f5a6b";

const profile = {
  name: "Member",
  authzSub: "authz-sub",
  username: "member",
  isAdmin: true,
  groups: '["zli-officers"]',
  image: `https://avater.zliusercontent.com/avatars/${avatarId}.png`,
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
  it("accepts the production CDN and the AuthZ dev avatar path", () => {
    expect(
      normalizeProfileImage(
        `https://avater.zliusercontent.com/avatars/${avatarId}.png`,
        authzIssuer,
      ),
    ).toBe(`https://avater.zliusercontent.com/avatars/${avatarId}.png`);
    expect(
      normalizeProfileImage(
        `http://localhost:5173/api/avatars/${avatarId}`,
        "http://localhost:5173/api/auth",
      ),
    ).toBe(`http://localhost:5173/api/avatars/${avatarId}`);
  });

  it("rejects missing, oversized, and non-http URLs", () => {
    expect(normalizeProfileImage(undefined, authzIssuer)).toBe("");
    expect(normalizeProfileImage("", authzIssuer)).toBe("");
    expect(normalizeProfileImage("javascript:alert(1)", authzIssuer)).toBe("");
    expect(normalizeProfileImage("ftp://example.com/a.png", authzIssuer)).toBe("");
    expect(normalizeProfileImage(`https://example.com/${"a".repeat(2048)}`, authzIssuer)).toBe("");
    expect(normalizeProfileImage("http://example.com/a.png", authzIssuer)).toBe("");
    expect(normalizeProfileImage("https://user:pass@example.com/a.png", authzIssuer)).toBe("");
  });

  it("rejects untrusted hosts, paths, and extra URL components", () => {
    expect(normalizeProfileImage(`https://example.com/avatars/${avatarId}.png`, authzIssuer)).toBe(
      "",
    );
    expect(
      normalizeProfileImage(`https://avater.zliusercontent.com/avatars/other.png`, authzIssuer),
    ).toBe("");
    expect(
      normalizeProfileImage(
        `https://avater.zliusercontent.com/avatars/${avatarId}.png?track=1`,
        authzIssuer,
      ),
    ).toBe("");
    expect(
      normalizeProfileImage(
        `https://avater.zliusercontent.com/avatars/${avatarId}.png#fragment`,
        authzIssuer,
      ),
    ).toBe("");
    expect(
      normalizeProfileImage(
        `http://localhost:5173/api/avatars/${avatarId}`,
        "https://account.zli.works/api/auth",
      ),
    ).toBe("");
  });
});

describe("isProtectedOnlyUpdate", () => {
  it("detects requests containing only AuthZ-owned fields", () => {
    expect(isProtectedOnlyUpdate({})).toBe(true);
    expect(isProtectedOnlyUpdate({ name: undefined, image: undefined })).toBe(true);
    expect(isProtectedOnlyUpdate({ image: "https://example.com/a.png" })).toBe(true);
    expect(isProtectedOnlyUpdate({ name: "Member", email: "member@example.com" })).toBe(false);
  });
});

describe("isOAuthCallbackPath", () => {
  it("recognizes callback endpoint paths", () => {
    expect(isOAuthCallbackPath("/callback/:id")).toBe(true);
    expect(isOAuthCallbackPath("/callback/authz")).toBe(true);
    expect(isOAuthCallbackPath("/oauth2/callback/authz")).toBe(true);
    expect(isOAuthCallbackPath("/update-user")).toBe(false);
    expect(isOAuthCallbackPath("/callback/other")).toBe(false);
    expect(isOAuthCallbackPath("/callback/../update-user")).toBe(false);
  });
});
