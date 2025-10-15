import { partyCollectionOptions } from "@/lib/partyCollection";
import { createCollection } from "@tanstack/react-db";
import PartySocket from "partysocket";
import * as schema from "src/schema/message";

export const createCommentsCollection = (roomId: string) =>
  createCollection(
    partyCollectionOptions({
      schema: schema.comment,
      getKey: (item) => item.id,
      ws: new PartySocket({
        host: window.location.host,
        party: "room",
        room: roomId,
      }),
      startSync: true,
    }),
  );
