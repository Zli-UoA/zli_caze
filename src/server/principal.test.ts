import { describe, expect, it } from "vite-plus/test";
import { commentAuthor } from "./principal";
import type { GuestPrincipal, MemberPrincipal } from "./types";

const member: MemberPrincipal = {
  type: "member",
  userId: "user-1",
  name: "Member",
  image: "https://avater.zliusercontent.com/avatars/2f1e0f8e-6a0d-4f3b-9f5a-1c2d3e4f5a6b.png",
  isAdmin: false,
};

const guest: GuestPrincipal = {
  type: "guest",
  sessionId: "guest-session-1",
  inviteId: "invite-1",
  roomId: "room-1",
  name: "Guest",
  image: null,
};

describe("commentAuthor", () => {
  it("stamps the member's AuthZ avatar", () => {
    expect(commentAuthor(member)).toMatchObject({
      authorId: "user-1",
      authorType: "member",
      authorImage: member.image,
    });
  });

  it("never gives guests an avatar", () => {
    expect(commentAuthor(guest).authorImage).toBeNull();
  });
});
