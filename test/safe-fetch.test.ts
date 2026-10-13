import assert from "node:assert/strict";
import { test } from "node:test";
import { isPrivateAddress, safeFetch } from "../lib/safe-fetch";

test("private and reserved addresses are blocked", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "169.254.169.254", "192.168.0.1", "::1", "fd00::1", "::ffff:10.0.0.1", "not-an-ip"]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  assert.equal(isPrivateAddress("93.184.216.34"), false);
});

test("safeFetch refuses hosts that resolve privately, including after a redirect", async () => {
  const calls: string[] = [];
  const fetchImpl = (async (url: string) => {
    calls.push(String(url));
    return new Response(null, { status: 302, headers: { location: "http://internal.test/admin" } });
  }) as typeof fetch;
  const resolve = async (host: string) => (host === "internal.test" ? ["10.0.0.5"] : ["93.184.216.34"]);

  const result = await safeFetch("https://shop.test/", { fetchImpl, resolve });
  assert.equal(result.ok, false);
  assert.deepEqual(calls, ["https://shop.test/"]);

  const direct = await safeFetch("http://localhost:3000/", { fetchImpl, resolve });
  assert.equal(direct.ok, false);
  assert.equal(calls.length, 1);
});

test("safeFetch returns the body of a public page", async () => {
  const fetchImpl = (async () => new Response("<title>Hi</title>", { status: 200 })) as unknown as typeof fetch;
  const result = await safeFetch("https://shop.test/", { fetchImpl, resolve: async () => ["93.184.216.34"] });
  assert.deepEqual(result, { ok: true, status: 200, text: "<title>Hi</title>", finalUrl: "https://shop.test/" });
});
