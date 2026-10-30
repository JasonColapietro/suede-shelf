import assert from "node:assert/strict";
import { test } from "node:test";
import { runNebiusShopper, NEBIUS_URL } from "../lib/nebius";
import { memoryDb } from "../lib/db";
import { store } from "./fixtures";
import type { PayPalClient } from "../lib/paypal";

const call = (id: string, name: string, args: unknown) => ({ id, type: "function", function: { name, arguments: JSON.stringify(args) } });
function harness(replies: unknown[], model?: string) {
  const requests: any[] = [];
  let created = 0, captured = 0;
  const paypal: PayPalClient = {
    createOrder: async () => { created++; return { id: "N-1", status: "PAYER_ACTION_REQUIRED", links: [{ rel: "payer-action", href: "https://sandbox.paypal.test/approve" }] }; },
    getOrder: async id => ({ id, status: "PAYER_ACTION_REQUIRED" }),
    captureOrder: async id => { captured++; return { id, status: "COMPLETED" }; },
  };
  const fakeFetch = (async (url: string, init: RequestInit) => {
    assert.equal(url, NEBIUS_URL);
    requests.push(JSON.parse(String(init.body)));
    assert.ok(replies.length, "Unexpected provider call");
    return Response.json({ choices: [replies.shift()] });
  }) as typeof fetch;
  return { requests, counts: () => ({ created, captured }), run: () => runNebiusShopper({ apiKey: "fake", model, fetch: fakeFetch }, store, { db: memoryDb(), paypal, baseUrl: "https://shelf.test" }, [{ role: "user", content: "Buy two pothos" }]) };
}
const tools = (...calls: unknown[]) => ({ finish_reason: "tool_calls", message: { content: null, tool_calls: calls } });
const done = { finish_reason: "stop", message: { content: "Review your checkout on PayPal." } };
test("Nemotron browses MCP and only creates one checkout despite repeated requests", async () => {
  const cart = { items: [{ product_id: "pothos", quantity: 2 }] };
  const h = harness([tools(call("a", "search_products", { query: "pothos" })), tools(call("b", "create_checkout", cart), call("c", "create_checkout", cart)), tools(call("d", "check_order", { order_id: "N-1" })), done]);
  const reply = await h.run();
  assert.equal(reply.orderId, "N-1");
  assert.equal(reply.approvalUrl, "https://sandbox.paypal.test/approve");
  assert.deepEqual(h.counts(), { created: 1, captured: 0 });
  assert.match(JSON.stringify(h.requests[2].messages), /24.00/);
  assert.match(JSON.stringify(h.requests[3].messages), /"paid":false|\\"paid\\":false/);
  assert.ok(h.requests.every(r => r.model === "nvidia/Nemotron-3_5-Lightning"));
  assert.equal(h.requests[0].tools.length, 3);
  assert.equal(h.requests[0].parallel_tool_calls, false);
});
test("invalid arguments and unknown tools cannot create orders", async () => {
  const h = harness([tools(call("a", "capture_payment", {}), call("b", "create_checkout", { items: [{ product_id: "pothos", quantity: 999 }] })), done]);
  await h.run();
  assert.deepEqual(h.counts(), { created: 0, captured: 0 });
});
test("tool loop is bounded", async () => {
  const h = harness(Array.from({ length: 8 }, (_, i) => tools(call(String(i), "search_products", {}))));
  assert.match((await h.run()).text, /narrow/);
  assert.equal(h.requests.length, 8);
});
test("truncated model output is rejected before tools execute", async () => {
  const h = harness([{ finish_reason: "length", message: { tool_calls: [call("a", "create_checkout", { items: [{ product_id: "pothos", quantity: 1 }] })] } }]);
  await assert.rejects(h.run, /did not finish/);
  assert.equal(h.counts().created, 0);
});
test("checkout link survives a later provider failure without another order", async () => {
  const h = harness([tools(call("a", "create_checkout", { items: [{ product_id: "pothos", quantity: 1 }] })), { choices: "malformed" }]);
  const reply = await h.run();
  assert.equal(reply.orderId, "N-1");
  assert.match(reply.text, /not yet confirmed/);
  assert.equal(h.counts().created, 1);
});

 test("Nebius nullable tool_calls is a valid final answer", async () => {
  const h = harness([{ finish_reason: "stop", message: { content: "Golden Pothos costs 12.00 USD.", tool_calls: null } }]);
  assert.equal((await h.run()).text, "Golden Pothos costs 12.00 USD.");
  assert.equal(h.counts().created, 0);
});

 test("explicit Nemotron model override is sent unchanged", async () => {
  const h = harness([done], "nvidia/Nemotron-3-Ultra-550b-a55b");
  await h.run();
  assert.equal(h.requests[0].model, "nvidia/Nemotron-3-Ultra-550b-a55b");
});
