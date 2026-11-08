const CACHE_SYMBOL = Symbol.for("caze.authzDiscoveryCache.v1");
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5_000;

type CacheEntry = {
  at: number;
  body: string;
  headers: Record<string, string>;
};

type DiscoveryCacheState = {
  discoveryUrl: string;
  entry: CacheEntry | null;
  originalFetch: typeof fetch;
};

type GlobalWithCache = typeof globalThis & {
  [CACHE_SYMBOL]?: DiscoveryCacheState;
};

const stateFor = (): DiscoveryCacheState | undefined =>
  (globalThis as GlobalWithCache)[CACHE_SYMBOL];

const requestUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const cachedResponse = (entry: CacheEntry, cacheStatus: "hit" | "stale"): Response =>
  new Response(entry.body, {
    status: 200,
    headers: {
      ...entry.headers,
      "x-caze-discovery-cache": cacheStatus,
    },
  });

/**
 * Cache the AuthZ OIDC discovery document inside the Worker isolate.
 *
 * Better Auth's genericOAuth provider runs discovery when the auth instance is
 * created, and Void creates that instance per request. Fetching discovery from
 * AuthZ on every page, API call, and asset would make an AuthZ outage or rate
 * limit take down the whole app. The cache is per isolate and intentionally
 * serves stale data if AuthZ is temporarily unreachable.
 */
export const installDiscoveryCache = (discoveryUrl: string): void => {
  const existing = stateFor();
  if (existing != null) {
    existing.discoveryUrl = discoveryUrl;
    return;
  }

  const state: DiscoveryCacheState = {
    discoveryUrl,
    entry: null,
    originalFetch: globalThis.fetch,
  };
  (globalThis as GlobalWithCache)[CACHE_SYMBOL] = state;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (requestUrl(input) !== state.discoveryUrl) {
      return state.originalFetch.call(globalThis, input, init);
    }

    const now = Date.now();
    if (state.entry != null && now - state.entry.at < CACHE_TTL_MS) {
      return cachedResponse(state.entry, "hit");
    }

    try {
      const response = await state.originalFetch.call(globalThis, input, {
        ...init,
        signal: init?.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (response.ok) {
        const body = await response.clone().text();
        state.entry = {
          at: now,
          body,
          headers: Object.fromEntries(response.headers),
        };
      }
      return response;
    } catch (error) {
      if (state.entry != null) return cachedResponse(state.entry, "stale");
      throw error;
    }
  };
};

export const resetDiscoveryCacheForTests = (): void => {
  const state = stateFor();
  if (state == null) return;
  globalThis.fetch = state.originalFetch;
  delete (globalThis as GlobalWithCache)[CACHE_SYMBOL];
};
