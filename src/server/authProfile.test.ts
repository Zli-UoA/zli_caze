import { describe, expect, it } from "vite-plus/test";
import { isOAuthCallbackPath, stripProtectedUserFields } from "./authProfile";

const profile = {
  name: "Member",
  authzSub: "authz-sub",
  username: "member",
  isAdmin: true,
  groups: '["zli-officers"]',
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

describe("isOAuthCallbackPath", () => {
  it("recognizes callback endpoint paths", () => {
    expect(isOAuthCallbackPath("/callback/:id")).toBe(true);
    expect(isOAuthCallbackPath("/callback/authz")).toBe(true);
    expect(isOAuthCallbackPath("/oauth2/callback/authz")).toBe(true);
    expect(isOAuthCallbackPath("/update-user")).toBe(false);
  });
});
