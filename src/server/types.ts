import type { rooms } from "@schema";

export type Room = typeof rooms.$inferSelect;

export type MemberPrincipal = {
  type: "member";
  userId: string;
  authzSub: string;
  name: string;
  isAdmin: boolean;
};

export type GuestPrincipal = {
  type: "guest";
  sessionId: string;
  inviteId: string;
  roomId: string;
  name: string;
};

export type Principal = MemberPrincipal | GuestPrincipal;

export type RoomVisibility = "link" | "members";
export type RoomStatus = "active" | "archived";
