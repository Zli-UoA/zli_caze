import { createCollection, localStorageCollectionOptions } from "@tanstack/db";
import z from "zod";

const configSchema = z.discriminatedUnion("key", [
  z.object({ key: z.literal("username"), value: z.string() }),
]);

const memoryStorage = (() => {
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
})();

const noopStorageEventApi = {
  addEventListener: () => {},
  removeEventListener: () => {},
};

export const createConfigCollection = () =>
  createCollection(
    localStorageCollectionOptions({
      schema: configSchema,
      getKey: (item) => item.key,
      storageKey: "config",
      storage: typeof window === "undefined" ? memoryStorage : window.localStorage,
      storageEventApi: typeof window === "undefined" ? noopStorageEventApi : window,
    }),
  );

export type ConfigCollection = ReturnType<typeof createConfigCollection>;
