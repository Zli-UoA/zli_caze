import { type PartyMessage, partyMessageSchema } from "@/lib/partyCollection";
import { type Connection, Server, type WSMessage } from "partyserver";
import * as schema from "../src/schema/message";
import { defineDurableObject } from "void/durable";

class RoomObject extends Server {
  static options = { hibernate: true };
  async onMessage(connection: Connection, message: WSMessage) {
    if (typeof message !== "string") return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }

    const partyMessage = partyMessageSchema(schema.comment).safeParse(parsed);

    if (!partyMessage.success) {
      return;
    }

    const roomId = this.name;

    switch (partyMessage.data.type) {
      case "sync": {
        connection.send(
          JSON.stringify({
            type: "sync",
            data: await this.getComments(roomId),
          } satisfies Extract<PartyMessage<schema.Comment>, { type: "sync" }>),
        );
        break;
      }
      case "transaction": {
        const mutations = partyMessage.data.mutations;

        for (const mutation of mutations) {
          switch (mutation.type) {
            case "insert":
            case "update": {
              mutation.data = {
                ...mutation.data,
                isOptimistic: false,
                ...(mutation.type === "insert" ? { createdAt: new Date().toISOString() } : {}),
              };

              await this.ctx.storage.put(`${roomId}:${mutation.data.id}`, mutation.data);
              break;
            }

            case "delete": {
              await this.ctx.storage.delete(`${roomId}:${mutation.data.id}`);
              break;
            }

            default: {
              const _exhaustiveCheck: never = mutation.type;
            }
          }
        }

        partyMessage.data.mutations = mutations;

        this.broadcast(JSON.stringify(partyMessage.data));

        connection.send(
          JSON.stringify({
            type: "ack",
            transactionId: partyMessage.data.transactionId,
            id: crypto.randomUUID(),
          } satisfies Extract<PartyMessage<schema.Comment>, { type: "ack" }>),
        );
        break;
      }
      case "ack": {
        break;
      }
      default: {
        const _exhaustiveCheck: never = partyMessage.data;
      }
    }
  }
  async getComments(roomId: string) {
    const commentMap = await this.ctx.storage.list<schema.Comment>({
      prefix: `${roomId}:`,
    });

    const comments = [...commentMap.values()];
    return comments;
  }
}

export const Room = defineDurableObject({
  name: "room",
  class: RoomObject,
});

export default Room;
