import { createContext, useContext } from "react";
import type { ConfigCollection } from "@/components/collections/config";

const ConfigCollectionContext = createContext<ConfigCollection | null>(null);

export const ConfigCollectionProvider = ConfigCollectionContext.Provider;

export const useConfigCollection = (): ConfigCollection => {
  const collection = useContext(ConfigCollectionContext);
  if (collection === null) {
    throw new Error("useConfigCollection must be used inside ConfigCollectionProvider");
  }
  return collection;
};
