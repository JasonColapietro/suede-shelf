import assert from "node:assert/strict";
import { test } from "node:test";
import Anthropic from "@anthropic-ai/sdk";
import { CreateStoreInput, StoreSetupError, createStore } from "../lib/create-store";
import { memoryDb } from "../lib/db";
import type { FetchResult } from "../lib/safe-fetch";

const page = (text: string, ok = true): FetchResult => ({ ok, status: ok ? 200 : 404, text, finalUrl: "https://crumb.test/" });
const noShopify = (html: string) => async (url: string) => (url.includes("products.json") ? page("", false) : page(html));

test("input validation normalises currency and rejects bad emails", () => {
  assert.equal(CreateStoreInput.parse({ url: "crumb.test", payeeEmail: "a@b.co" }).currency, "USD");
  assert.equal(CreateStoreInput.safeParse({ url: "crumb.test", payeeEmail: "not-an-email" }).success, false);
  assert.equal(CreateStoreInput.safeParse({ url: "crumb.test", payeeEmail: "a@b.co", currency: "JPY" }).success, false);
});

test("structured catalogs never call Claude", async () => {
  const db = memoryDb();
  const html = `<title>Crumb</title><script type="application/ld+json">{"@type":"Product","name":"Loaf","offers":{"price":"8","priceCurrency":"USD"}}</script>`;
  const store = await createStore({ url: "crumb.test", payeeEmail: "Owner@Crumb.test", currency: "USD" }, { db, anthropic: null, fetcher: noShopify(html) });
  assert.equal(store.source, "json-ld");
  assert.equal(store.payeeEmail, "owner@crumb.test");
  assert.deepEqual(await db.getStore(store.id), store);
});

test("falls back to Claude when the page has no structured catalog", async () => {
  let calls = 0;
  const anthropic = new Anthropic({
    apiKey: "test",
    maxRetries: 0,
    fetch: (async () => {
      calls++;
      const text = JSON.stringify({ products: [{ name: "Croissant", price: 4.5, description: "", url: "", in_stock: true }] });
      return new Response(
        JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: "text", text }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch,
  });
  const store = await createStore({ url: "crumb.test", payeeEmail: "a@b.co", currency: "USD" }, { db: memoryDb(), anthropic, fetcher: noShopify("<title>Crumb</title>Croissant $4.50") });
  assert.equal(calls, 1);
  assert.equal(store.source, "ai");
  assert.deepEqual(store.products.map((p) => [p.name, p.price]), [["Croissant", "4.50"]]);
});

test("explains when nothing sellable is found or the site is down", async () => {
  await assert.rejects(
    createStore({ url: "crumb.test", payeeEmail: "a@b.co", currency: "USD" }, { db: memoryDb(), anthropic: null, fetcher: noShopify("<title>Crumb</title>About us") }),
    (e: unknown) => e instanceof StoreSetupError && /No products with USD prices found at crumb\.test/.test(e.message),
  );
  await assert.rejects(
    createStore({ url: "gone.test", payeeEmail: "a@b.co", currency: "USD" }, { db: memoryDb(), anthropic: null, fetcher: async () => page("", false) }),
    StoreSetupError,
  );
});
