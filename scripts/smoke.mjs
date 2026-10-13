// Post-deploy smoke test (GitLab CI "monitor" stage). Checks a live deployment
// the way an AI assistant would use it: home page, MCP handshake, catalog
// search, and optionally a real PayPal Sandbox checkout. Exits non-zero on
// any failure so the Pipeline Medic flow picks it up.
//
//   node scripts/smoke.mjs <base-url> <store-id> [--checkout]

const [base, storeId] = process.argv.slice(2);
const checkout = process.argv.includes("--checkout");
if (!base || !storeId) {
  console.error("usage: node scripts/smoke.mjs <base-url> <store-id> [--checkout]");
  process.exit(2);
}

const results = [];
async function step(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true, ms: Date.now() - started, detail });
  } catch (error) {
    results.push({ name, ok: false, ms: Date.now() - started, detail: error instanceof Error ? error.message : String(error) });
  }
}

async function mcp(method, params) {
  const res = await fetch(`${base}/api/mcp/${storeId}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`${method} returned HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

await step("home page", async () => {
  const res = await fetch(base, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes("Suede Shelf")) throw new Error("brand missing from page");
  return `HTTP ${res.status}`;
});

await step("mcp initialize", async () => {
  const r = await mcp("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "shelf-smoke", version: "1" } });
  return `protocol ${r.protocolVersion}`;
});

let productId;
await step("search_products", async () => {
  const r = await mcp("tools/call", { name: "search_products", arguments: {} });
  const products = r.structuredContent?.products ?? [];
  if (products.length === 0) throw new Error("catalog is empty");
  productId = products[0].id;
  return `${products.length} products, first ${productId}`;
});

if (checkout) {
  await step("create_checkout (PayPal Sandbox)", async () => {
    if (!productId) throw new Error("no product to buy");
    const r = await mcp("tools/call", { name: "create_checkout", arguments: { items: [{ product_id: productId, quantity: 1 }] } });
    if (r.isError) throw new Error(r.content?.[0]?.text ?? "checkout failed");
    const url = r.structuredContent?.approval_url ?? "";
    if (!url.startsWith("https://www.sandbox.paypal.com/")) throw new Error(`unexpected approval link ${url}`);
    return `order ${r.structuredContent.order_id}`;
  });
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name.padEnd(34)} ${String(r.ms).padStart(6)}ms  ${r.detail}`);
const failed = results.filter((r) => !r.ok);
process.exit(failed.length ? 1 : 0);
