import { afterEach, describe, expect, it } from "vite-plus/test";
import { installDiscoveryCache, resetDiscoveryCacheForTests } from "./discoveryCache";

const DISCOVERY_URL = "https://idp.example/.well-known/openid-configuration";
const realFetch = globalThis.fetch;

afterEach(() => {
  resetDiscoveryCacheForTests();
  globalThis.fetch = realFetch;
});

describe("installDiscoveryCache", () => {
  it("fetches the discovery document once per cache window", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({ issuer: "https://idp.example" }), {
        headers: { "content-type": "application/json" },
      });
    };

    installDiscoveryCache(DISCOVERY_URL);
    const first = await fetch(DISCOVERY_URL);
    const second = await fetch(DISCOVERY_URL);

    expect(calls).toBe(1);
    expect(first.headers.get("x-caze-discovery-cache")).toBeNull();
    expect(second.headers.get("x-caze-discovery-cache")).toBe("hit");
  });

  it("does not intercept unrelated URLs", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response("other", { status: 200 });
    };

    installDiscoveryCache(DISCOVERY_URL);
    await fetch("https://idp.example/other");
    await fetch("https://idp.example/other");

    expect(calls).toBe(2);
  });
});
