import { createCollection, localStorageCollectionOptions } from "@tanstack/db";
import z from "zod";

const configSchema = z.discriminatedUnion("key", [
  z.object({ key: z.literal("username"), value: z.string() }),
]);

export const createConfigCollection = () =>
  createCollection(
    localStorageCollectionOptions({
      schema: configSchema,
      getKey: (item) => item.key,
      storageKey: "config",
    }),
  );

export type ConfigCollection = ReturnType<typeof createConfigCollection>;
