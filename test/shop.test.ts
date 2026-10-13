import assert from "node:assert/strict";
import { test } from "node:test";
import { memoryDb } from "../lib/db";
import type { PayPalClient, PayPalOrder } from "../lib/paypal";
import { createCheckout, searchProducts, settleOrder } from "../lib/shop";
import { store } from "./fixtures";

function fakePayPal(script: { getStatus?: PayPalOrder["status"] } = {}) {
  const calls: string[] = [];
  const bodies: unknown[] = [];
  const paypal: PayPalClient = {
    async createOrder(body) {
      calls.push("create");
      bodies.push(body);
      return { id: "O-1", status: "PAYER_ACTION_REQUIRED", links: [{ rel: "payer-action", href: "https://sandbox.paypal.test/checkoutnow?token=O-1" }] };
    },
    async getOrder(id) {
      calls.push(`get:${id}`);
      return { id, status: script.getStatus ?? "PAYER_ACTION_REQUIRED" };
    },
    async captureOrder(id, requestId) {
      calls.push(`capture:${id}:${requestId}`);
      return { id, status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "CAP-1", status: "COMPLETED" }] } }] };
    },
  };
  return { paypal, calls, bodies };
}

test("search ranks name matches first and hides out-of-stock by default", () => {
  assert.deepEqual(searchProducts(store, { query: "plant" }).map((p) => p.id), ["monstera"]);
  assert.deepEqual(searchProducts(store, { query: "plant", inStockOnly: false }).map((p) => p.id), ["snake", "monstera"]);
  assert.deepEqual(searchProducts(store, { maxPrice: 20 }).map((p) => p.id), ["pothos"]);
  assert.deepEqual(searchProducts(store).map((p) => p.id), ["pothos", "monstera"]);
});

test("checkout creates a PayPal order priced from the catalog and records it", async () => {
  const db = memoryDb();
  const { paypal, bodies } = fakePayPal();
  const checkout = await createCheckout({ db, paypal, baseUrl: "https://shelf.test" }, store, [{ productId: "pothos", quantity: 2 }], "mcp");

  assert.equal(checkout.approvalUrl, "https://sandbox.paypal.test/checkoutnow?token=O-1");
  assert.equal(checkout.cart.total, "24.00");
  const body = bodies[0] as { purchase_units: Array<{ amount: { value: string } }>; payment_source: { paypal: { experience_context: { return_url: string; cancel_url: string } } } };
  assert.equal(body.purchase_units[0].amount.value, "24.00");
  assert.equal(body.payment_source.paypal.experience_context.return_url, "https://shelf.test/checkout/return");
  assert.equal(body.payment_source.paypal.experience_context.cancel_url, "https://shelf.test/checkout/cancel?store=fern-co");

  const record = await db.getOrder("O-1");
  assert.equal(record?.channel, "mcp");
  assert.deepEqual(record?.items, [{ name: "Golden Pothos", quantity: 2 }]);
});

test("settleOrder captures once the buyer approves, and only for the right store", async () => {
  const db = memoryDb();
  const approved = fakePayPal({ getStatus: "APPROVED" });
  const deps = { db, paypal: approved.paypal, baseUrl: "https://shelf.test" };
  await createCheckout(deps, store, [{ productId: "monstera", quantity: 1 }], "demo");

  assert.equal(await settleOrder(deps, "O-1", "someone-else"), null);
  const state = await settleOrder(deps, "O-1", store.id);
  assert.deepEqual(state, { orderId: "O-1", status: "COMPLETED", paid: true, total: "39.50", currency: "USD", captureId: "CAP-1" });
  assert.ok(approved.calls.includes("capture:O-1:shelf-capture-O-1"));
  assert.equal((await db.getOrder("O-1"))?.status, "COMPLETED");
});

test("settleOrder leaves unapproved orders alone", async () => {
  const db = memoryDb();
  const pending = fakePayPal();
  const deps = { db, paypal: pending.paypal, baseUrl: "https://shelf.test" };
  await createCheckout(deps, store, [{ productId: "monstera", quantity: 1 }], "mcp");
  const state = await settleOrder(deps, "O-1");
  assert.equal(state?.paid, false);
  assert.ok(!pending.calls.some((c) => c.startsWith("capture")));
  assert.equal(await settleOrder(deps, "unknown"), null);
});
