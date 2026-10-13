import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { memoryDb } from "../lib/db";
import { PayPalError, type PayPalClient } from "../lib/paypal";
import { createStorefrontServer } from "../lib/storefront-mcp";
import { store } from "./fixtures";

function paypal(overrides: Partial<PayPalClient> = {}): PayPalClient {
  return {
    createOrder: async () => ({ id: "O-9", status: "PAYER_ACTION_REQUIRED", links: [{ rel: "payer-action", href: "https://sandbox.paypal.test/checkoutnow?token=O-9" }] }),
    getOrder: async (id) => ({ id, status: "APPROVED" }),
    captureOrder: async (id) => ({ id, status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "CAP", status: "COMPLETED" }] } }] }),
    ...overrides,
  };
}

async function connect(pp = paypal()) {
  const db = memoryDb();
  const server = createStorefrontServer(store, { db, paypal: pp, baseUrl: "https://shelf.test" });
  const client = new Client({ name: "agent", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return { client, db };
}

const firstText = (r: Record<string, unknown>) => (r.content as Array<{ text: string }>)[0].text;

test("exposes search, checkout and order-status tools", async () => {
  const { client } = await connect();
  assert.deepEqual((await client.listTools()).tools.map((t) => t.name).sort(), ["check_order", "create_checkout", "search_products"]);
});

test("an agent can search, check out and see the order paid", async () => {
  const { client, db } = await connect();
  const search = await client.callTool({ name: "search_products", arguments: { query: "pothos" } });
  assert.match(firstText(search), /Golden Pothos \(id: pothos\): 12\.00 USD/);
  assert.equal((search.structuredContent as { products: unknown[] }).products.length, 1);

  const checkout = await client.callTool({ name: "create_checkout", arguments: { items: [{ product_id: "pothos", quantity: 3 }] } });
  assert.notEqual(checkout.isError, true);
  assert.match(firstText(checkout), /Total 36\.00 USD\. Ask the shopper to approve payment on PayPal: https:\/\/sandbox\.paypal\.test/);
  assert.equal((await db.getOrder("O-9"))?.channel, "mcp");

  const status = await client.callTool({ name: "check_order", arguments: { order_id: "O-9" } });
  assert.equal((status.structuredContent as { paid: boolean }).paid, true);
  assert.match(firstText(status), /^Paid: 36\.00 USD/);
});

test("cart and PayPal problems come back as tool errors the agent can act on", async () => {
  const { client } = await connect(
    paypal({
      createOrder: async () => {
        throw new PayPalError("Payee account is invalid.", 422, "PAYEE_ACCOUNT_INVALID");
      },
    }),
  );
  const bad = await client.callTool({ name: "create_checkout", arguments: { items: [{ product_id: "snake", quantity: 1 }] } });
  assert.equal(bad.isError, true);
  assert.match(firstText(bad), /out of stock/);

  const pp = await client.callTool({ name: "create_checkout", arguments: { items: [{ product_id: "pothos", quantity: 1 }] } });
  assert.equal(pp.isError, true);
  assert.match(firstText(pp), /PayPal could not create the checkout: Payee account is invalid\./);

  const unknown = await client.callTool({ name: "check_order", arguments: { order_id: "nope" } });
  assert.equal(unknown.isError, true);
});
