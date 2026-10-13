import assert from "node:assert/strict";
import { test } from "node:test";
import { memoryDb, newStoreId } from "../lib/db";
import { store } from "./fixtures";

test("store ids are slugged and unguessable", () => {
  const id = newStoreId("Fern & Co — Plants!");
  assert.match(id, /^fern-co-plants-[0-9a-f]{8}$/);
  assert.notEqual(newStoreId("x"), newStoreId("x"));
  assert.match(newStoreId("✨✨"), /^store-[0-9a-f]{8}$/);
});

test("memory db round-trips stores without sharing references", async () => {
  const db = memoryDb();
  await db.saveStore(store);
  const loaded = await db.getStore(store.id);
  assert.deepEqual(loaded, store);
  loaded!.products.pop();
  assert.equal((await db.getStore(store.id))!.products.length, 3);
  assert.equal(await db.getStore("missing"), null);
});

test("orders list newest first, per store", async () => {
  const db = memoryDb();
  const base = { storeId: store.id, status: "PAYER_ACTION_REQUIRED", total: "1.00", currency: "USD", items: [], channel: "mcp" as const };
  await db.saveOrder({ ...base, orderId: "A", createdAt: "2026-10-12T10:00:00Z" });
  await db.saveOrder({ ...base, orderId: "B", createdAt: "2026-10-12T11:00:00Z" });
  await db.saveOrder({ ...base, orderId: "C", storeId: "other", createdAt: "2026-10-12T12:00:00Z" });
  assert.deepEqual((await db.listOrders(store.id)).map((o) => o.orderId), ["B", "A"]);
});
