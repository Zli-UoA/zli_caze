import { describe, expect, it } from "vite-plus/test";
import {
  canCreateRoom,
  canListRooms,
  canManageGuestInvites,
  canPostComment,
  canViewRoom,
} from "./permissions";
import type { GuestPrincipal, MemberPrincipal, Room } from "./types";

const room = (overrides: Partial<Room> = {}): Room => ({
  id: "room-1",
  title: "Room 1",
  status: "active",
  visibility: "link",
  createdBy: "user-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const member: MemberPrincipal = {
  type: "member",
  userId: "user-1",
  name: "Member",
  isAdmin: false,
};

const admin: MemberPrincipal = { ...member, userId: "admin-1", name: "Admin", isAdmin: true };

const guest: GuestPrincipal = {
  type: "guest",
  sessionId: "guest-session-1",
  inviteId: "invite-1",
  roomId: "room-1",
  name: "Guest",
};

describe("canViewRoom", () => {
  it("allows anonymous users only for link rooms", () => {
    expect(canViewRoom(null, room({ visibility: "link" }))).toBe(true);
    expect(canViewRoom(null, room({ visibility: "members" }))).toBe(false);
  });

  it("allows members and admins to view any active or archived room", () => {
    expect(canViewRoom(member, room({ visibility: "members" }))).toBe(true);
    expect(canViewRoom(admin, room({ visibility: "members" }))).toBe(true);
    expect(canViewRoom(member, room({ status: "archived" }))).toBe(true);
  });

  it("scopes guests to their invited room", () => {
    expect(canViewRoom(guest, room({ id: "room-1", visibility: "members" }))).toBe(true);
    expect(canViewRoom(guest, room({ id: "room-2", visibility: "link" }))).toBe(false);
  });

  it("rejects missing rooms and unknown statuses", () => {
    expect(canViewRoom(null, null)).toBe(false);
    expect(canViewRoom(member, room({ status: "error" }))).toBe(false);
  });
});

describe("canPostComment", () => {
  it("requires authentication", () => {
    expect(canPostComment(null, room())).toBe(false);
  });

  it("allows members in active rooms only", () => {
    expect(canPostComment(member, room())).toBe(true);
    expect(canPostComment(member, room({ status: "archived" }))).toBe(false);
  });

  it("scopes guests to their invited room", () => {
    expect(canPostComment(guest, room({ id: "room-1" }))).toBe(true);
    expect(canPostComment(guest, room({ id: "room-2" }))).toBe(false);
    expect(canPostComment(guest, room({ id: "room-1", status: "archived" }))).toBe(false);
  });
});

describe("admin capabilities", () => {
  it("requires a member in the admin group", () => {
    expect(canListRooms(null)).toBe(false);
    expect(canListRooms(member)).toBe(false);
    expect(canListRooms(guest)).toBe(false);
    expect(canListRooms(admin)).toBe(true);
    expect(canCreateRoom(admin)).toBe(true);
    expect(canManageGuestInvites(admin, room())).toBe(true);
    expect(canManageGuestInvites(member, room())).toBe(false);
  });
});
