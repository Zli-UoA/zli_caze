import { Room } from "../../../durable-objects/room";
import { defineHandler } from "void";

export const GET = defineHandler(async (c) => {
  const roomId = c.req.param("roomId");
  if (roomId == null) return new Response("Missing roomId", { status: 400 });

  const request = new Request(c.req.raw);
  request.headers.set("x-partykit-room", roomId);
  return Room.get(roomId).fetch(request);
});
