import assert from "node:assert/strict";
import { test } from "node:test";
import { PayPalError, approvalUrl, createPayPalClient, paypalConfigFromEnv } from "../lib/paypal";

const config = { clientId: "id", clientSecret: "secret", baseUrl: "https://api-m.sandbox.paypal.test" };

function recorder(responses: Array<[number, unknown]>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    const [status, body] = responses.shift() ?? [500, {}];
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

test("config defaults to sandbox and needs both credentials", () => {
  assert.equal(paypalConfigFromEnv({}), null);
  assert.equal(paypalConfigFromEnv({ PAYPAL_CLIENT_ID: "a", PAYPAL_CLIENT_SECRET: "b" })?.baseUrl, "https://api-m.sandbox.paypal.com");
  assert.equal(paypalConfigFromEnv({ PAYPAL_CLIENT_ID: "a", PAYPAL_CLIENT_SECRET: "b", PAYPAL_ENV: "live" })?.baseUrl, "https://api-m.paypal.com");
});

test("authenticates once, then creates and fetches orders with idempotency", async () => {
  const { calls, fetchImpl } = recorder([
    [200, { access_token: "tok", expires_in: 3600 }],
    [201, { id: "O-1", status: "PAYER_ACTION_REQUIRED", links: [{ rel: "payer-action", href: "https://www.sandbox.paypal.test/checkoutnow?token=O-1" }] }],
    [200, { id: "O-1", status: "APPROVED" }],
  ]);
  const client = createPayPalClient(config, fetchImpl);

  const order = await client.createOrder({ intent: "CAPTURE" }, "req-1");
  assert.equal(approvalUrl(order), "https://www.sandbox.paypal.test/checkoutnow?token=O-1");
  assert.equal((await client.getOrder("O-1")).status, "APPROVED");

  assert.equal(calls.length, 3, "token is reused");
  assert.equal(calls[0].url, "https://api-m.sandbox.paypal.test/v1/oauth2/token");
  assert.equal((calls[0].init.headers as Record<string, string>).authorization, `Basic ${Buffer.from("id:secret").toString("base64")}`);
  const create = calls[1].init.headers as Record<string, string>;
  assert.equal(create.authorization, "Bearer tok");
  assert.equal(create["paypal-request-id"], "req-1");
  assert.equal(calls[2].url, "https://api-m.sandbox.paypal.test/v2/checkout/orders/O-1");
});

test("surfaces PayPal's error detail", async () => {
  const { fetchImpl } = recorder([
    [200, { access_token: "tok", expires_in: 3600 }],
    [422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "PAYEE_ACCOUNT_INVALID", description: "Payee account is invalid." }] }],
  ]);
  const client = createPayPalClient(config, fetchImpl);
  await assert.rejects(client.createOrder({}, "r"), (e: unknown) => e instanceof PayPalError && e.issue === "PAYEE_ACCOUNT_INVALID" && e.status === 422);
});

test("failed authentication is a PayPalError", async () => {
  const { fetchImpl } = recorder([[401, { error: "invalid_client" }]]);
  await assert.rejects(createPayPalClient(config, fetchImpl).getOrder("O-1"), /authentication failed/);
});
