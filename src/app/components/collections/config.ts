import { createCollection, localStorageCollectionOptions } from "@tanstack/db";
import z from "zod";

const configSchema = z.discriminatedUnion("key", [
  z.object({ key: z.literal("username"), value: z.string() }),
]);

const createMemoryStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

const createNoopStorageEventApi = () => ({
  addEventListener: () => {},
  removeEventListener: () => {},
});

export const createConfigCollection = () =>
  createCollection(
    localStorageCollectionOptions({
      schema: configSchema,
      getKey: (item) => item.key,
      storageKey: "config",
      storage: typeof window === "undefined" ? createMemoryStorage() : window.localStorage,
      storageEventApi: typeof window === "undefined" ? createNoopStorageEventApi() : window,
    }),
  );

export type ConfigCollection = ReturnType<typeof createConfigCollection>;
