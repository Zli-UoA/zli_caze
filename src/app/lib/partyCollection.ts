import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  BaseCollectionConfig,
  CollectionConfig,
  DeleteMutationFnParams,
  InferSchemaOutput,
  InsertMutationFnParams,
  SyncConfig,
  UpdateMutationFnParams,
} from "@tanstack/db";
import type PartySocket from "partysocket";
import { z } from "zod";

export const partyMessageSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("sync"),
      data: z.array(itemSchema).optional(),
      id: z.uuid().optional(),
    }),
    z.object({
      type: z.literal("ack"),
      transactionId: z.string(),
      id: z.uuid(),
    }),
    z.object({
      type: z.literal("transaction"),
      mutations: z.array(
        z.object({
          type: z.enum(["insert", "update", "delete"]),
          data: itemSchema,
          id: z.uuid(),
        }),
      ),
      transactionId: z.uuid(),
    }),
  ]);

export type PartyMessage<T> = z.infer<
  ReturnType<typeof partyMessageSchema<z.ZodType<T>>>
>;

interface PartyCollectionConfig<
  TItem extends object = object,
  Tkey extends string | number = string | number,
  TSchema extends StandardSchemaV1 = never,
> extends Omit<
    BaseCollectionConfig<TItem, Tkey, TSchema>,
    "onInsert" | "onUpdate" | "onDelete"
  > {
  ws: PartySocket;
}

export const partyCollectionOptions = <
  TSchema extends StandardSchemaV1 = never,
  TKey extends string | number = string | number,
>(
  config: PartyCollectionConfig<InferSchemaOutput<TSchema>, TKey, TSchema> & {
    schema: TSchema;
  },
): CollectionConfig<InferSchemaOutput<TSchema>, TKey, TSchema> & {
  schema: TSchema;
} => {
  const { ws, ...rest } = config;

  const send = (data: PartyMessage<InferSchemaOutput<TSchema>>) => {
    if (ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }
    ws.send(JSON.stringify(data));
  };

  // Track pending transactions awaiting acknowledgment
  const pendingTransactions = new Map<
    string,
    {
      resolve: () => void;
      reject: (error: Error) => void;
      timeout: number;
    }
  >();

  const sync: SyncConfig<InferSchemaOutput<TSchema>, TKey>["sync"] = (
    params,
  ) => {
    const { begin, write, commit, markReady } = params;

    ws.onopen = () => {
      send({ type: "sync" });
    };

    ws.onmessage = (event) => {
      const message: PartyMessage<InferSchemaOutput<TSchema>> = JSON.parse(
        event.data,
      );

      switch (message.type) {
        case "sync": {
          // Initial sync with array of items
          begin();
          if (message.data != null) {
            for (const item of message.data) {
              write({
                type: "insert",
                value: item,
              });
            }
          }
          commit();
          markReady();
          break;
        }

        case "ack": {
          // Server acknowledged our transaction
          if (message.transactionId) {
            const pending = pendingTransactions.get(message.transactionId);
            if (pending) {
              clearTimeout(pending.timeout);
              pendingTransactions.delete(message.transactionId);
              pending.resolve();
            }
          }
          break;
        }

        case "transaction": {
          // Server sending back the actual data after processing our transaction
          if (message.mutations) {
            begin();
            for (const mutation of message.mutations) {
              write({
                type: mutation.type,
                value: mutation.data,
              });
            }
            commit();
          }
          break;
        }

        default: {
          const _exhaustiveCheck: never = message;
        }
      }
    };

    // Return cleanup function
    return () => {
      ws.close();
    };
  };

  // Helper function to send transaction and wait for server acknowledgment
  const sendTransaction = async (
    params:
      | InsertMutationFnParams<InferSchemaOutput<TSchema>, TKey>
      | UpdateMutationFnParams<InferSchemaOutput<TSchema>, TKey>
      | DeleteMutationFnParams<InferSchemaOutput<TSchema>, TKey>,
  ): Promise<void> => {
    if (ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    const transactionId = crypto.randomUUID();

    // Convert all mutations in the transaction to the wire format
    const mutations = params.transaction.mutations.map((mutation) => ({
      type: mutation.type,
      id: mutation.key,
      data: mutation.modified,
    }));

    send({
      type: "transaction",
      transactionId,
      mutations,
    });

    // Wait for server acknowledgment
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingTransactions.delete(transactionId);
        reject(new Error(`Transaction ${transactionId} timed out`));
      }, 10000); // 10 second timeout

      pendingTransactions.set(transactionId, {
        resolve,
        reject,
        timeout,
      });
    });
  };

  return {
    ...rest,
    sync: {
      sync,
      getSyncMetadata: () => ({}),
    },
    onInsert: sendTransaction,
    onUpdate: sendTransaction,
    onDelete: sendTransaction,
  };
};
