import assert from "node:assert/strict";
import { test } from "node:test";
import Anthropic from "@anthropic-ai/sdk";
import { extractCatalogWithClaude, runShopper } from "../lib/ai";
import { memoryDb } from "../lib/db";
import type { PayPalClient } from "../lib/paypal";
import { store } from "./fixtures";

type Block = Record<string, unknown>;

function fakeClaude(replies: Array<{ content: Block[]; stop_reason: string }>) {
  const requests: Array<Record<string, unknown>> = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    requests.push(JSON.parse(String(init.body)));
    const reply = replies.shift();
    if (!reply) throw new Error("unexpected extra request");
    const body = { id: `msg_${requests.length}`, type: "message", role: "assistant", model: "claude-opus-5-5", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 }, ...reply };
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { client: new Anthropic({ apiKey: "test", fetch: fetchImpl, maxRetries: 0 }), requests };
}

test("Claude extraction keeps priced products and resolves links", async () => {
  const { client, requests } = fakeClaude([
    {
      stop_reason: "end_turn",
      content: [
        {
          type: "text",
          text: JSON.stringify({
            products: [
              { name: "Sourdough loaf", price: 8, description: "Naturally leavened", url: "/bread/sourdough", in_stock: true },
              { name: "Mystery item", price: 0, description: "", url: "", in_stock: true },
            ],
          }),
        },
      ],
    },
  ]);
  const products = await extractCatalogWithClaude(client, { storeName: "Crumb", pageUrl: "https://crumb.test/menu", pageText: "Sourdough loaf $8", currency: "USD" });
  assert.deepEqual(products.map((p) => [p.name, p.price, p.url]), [["Sourdough loaf", "8.00", "https://crumb.test/bread/sourdough"]]);
  assert.equal(requests[0].model, "claude-opus-5-5");
  assert.match(JSON.stringify(requests[0].messages), /<page_text>/);
});

test("demo shopper checks out through the MCP storefront exactly once", async () => {
  let created = 0;
  const paypal: PayPalClient = {
    createOrder: async () => {
      created++;
      return { id: "O-7", status: "PAYER_ACTION_REQUIRED", links: [{ rel: "payer-action", href: "https://sandbox.paypal.test/checkoutnow?token=O-7" }] };
    },
    getOrder: async (id) => ({ id, status: "PAYER_ACTION_REQUIRED" }),
    captureOrder: async (id) => ({ id, status: "COMPLETED" }),
  };
  const db = memoryDb();
  const { client, requests } = fakeClaude([
    { stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu_1", name: "create_checkout", input: { items: [{ product_id: "pothos", quantity: 2 }] } }] },
    { stop_reason: "end_turn", content: [{ type: "text", text: "Here is your PayPal link." }] },
  ]);

  const reply = await runShopper(client, store, { db, paypal, baseUrl: "https://shelf.test" }, [{ role: "user", content: "Two pothos please" }]);

  assert.equal(created, 1);
  assert.deepEqual(reply, { text: "Here is your PayPal link.", approvalUrl: "https://sandbox.paypal.test/checkoutnow?token=O-7", orderId: "O-7" });
  assert.equal((await db.getOrder("O-7"))?.channel, "demo");

  const first = requests[0] as { tools: Array<{ name: string }>; fallbacks: unknown; system: string };
  assert.deepEqual(first.tools.map((t) => t.name).sort(), ["check_order", "create_checkout", "search_products"]);
  assert.equal(first.fallbacks, "default");
  const toolResult = JSON.stringify(requests[1].messages);
  assert.match(toolResult, /Total 24\.00 USD/);
});
