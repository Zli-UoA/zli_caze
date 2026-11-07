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

  it("removes AuthZ profile fields from ordinary updates", () => {
    const result = stripProtectedUserFields(profile, "/update-user");
    expect(result).toEqual({ name: "Member" });
  });

  it("also strips fields when the path is unknown", () => {
    expect(stripProtectedUserFields(profile, "")).toEqual({ name: "Member" });
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
