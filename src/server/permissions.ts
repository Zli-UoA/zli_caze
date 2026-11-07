import type { Principal, Room } from "./types";

const isReadable = (room: Room) => room.status === "active" || room.status === "archived";

export const canViewRoom = (principal: Principal | null, room: Room | null): boolean => {
  if (room == null || !isReadable(room)) return false;
  if (principal == null) return room.visibility === "link";
  if (principal.type === "guest") return principal.roomId === room.id;
  return true;
};

export const canPostComment = (principal: Principal | null, room: Room | null): boolean => {
  if (room == null || room.status !== "active") return false;
  if (principal == null) return false;
  if (principal.type === "guest") return principal.roomId === room.id;
  return true;
};

export const canListRooms = (principal: Principal | null): boolean =>
  principal?.type === "member" && principal.isAdmin;

export const canCreateRoom = (principal: Principal | null): boolean =>
  principal?.type === "member" && principal.isAdmin;

export const canManageRoom = (principal: Principal | null, _room: Room | null): boolean =>
  principal?.type === "member" && principal.isAdmin;

export const canManageGuestInvites = (principal: Principal | null, room: Room | null): boolean =>
  canManageRoom(principal, room);
