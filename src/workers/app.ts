import { type PartyMessage, partyMessageSchema } from "@/lib/partyCollection";
import {
  type Connection,
  Server,
  type WSMessage,
  routePartykitRequest,
} from "partyserver";
import { createRequestHandler } from "react-router";
import * as schema from "../schema/message";

export class Room extends Server {
  static options = { hibernate: true };
  async onMessage(connection: Connection, message: WSMessage) {
    if (typeof message !== "string") return;
    const partyMessage = partyMessageSchema(schema.comment).safeParse(
      JSON.parse(message),
    );

    if (!partyMessage.success) {
      return;
    }

    const roomId = connection.server;

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
        if (partyMessage.data.mutations != null) {
          for (const mutation of partyMessage.data.mutations) {
            switch (mutation.type) {
              case "insert":
              case "update": {
                await this.ctx.storage.put(
                  `${roomId}:${mutation.data.id}`,
                  mutation.data,
                );
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
        }

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
      prefix: roomId,
    });

    const comments = [...commentMap.values()];
    return comments;
  }
}

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    return (
      // @ts-expect-error
      (await routePartykitRequest(request, env)) ??
      (await requestHandler(request, {
        cloudflare: { env, ctx },
      }))
    );
  },
} satisfies ExportedHandler<Env>;
