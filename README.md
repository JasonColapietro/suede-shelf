# Suede Shelf

**Let AI assistants check out at your store, with PayPal.**

AI assistants already recommend products. Suede Shelf lets them finish the sale: it reads a merchant's product pages and publishes a storefront that Claude, ChatGPT and any MCP client can shop. The assistant searches the catalog and builds a cart, the customer approves payment on PayPal, and the money lands in the merchant's PayPal account.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) by [Suede AI](https://seo.suedeai.ai).

## PayPal judge quick start

Open the [working sandbox storefront](https://suede-shelf.vercel.app/s/suede-demo-catalog-2f78dff6), [public video](https://www.youtube.com/watch?v=EWiX1nd5HcY), and [PayPal judge guide](docs/paypal-submission.md). The guide explains PayPal's contribution, gives repeatable test prompts, and separates checkout creation from completed-payment evidence. No completed customer payment has been demonstrated in the verified walkthrough.

## NVIDIA Nemotron on Nebius

The shopping assistant also supports NVIDIA Nemotron through Nebius Token Factory. The verified public demo currently uses this provider. See the [Nebius setup and live evidence](docs/nebius/README.md) and [submission materials and status](docs/nebius/devpost-draft.md). Set `SHOPPER_PROVIDER=nebius` and `NEBIUS_API_KEY` to select it; the code default remains Claude when the provider is unset.

## How it works

1. **Merchant pastes a store address and a PayPal email.** Shelf reads the catalog from Shopify's public `products.json`, then schema.org `Product` markup, then Claude for pages that have neither.
2. **Shelf publishes an MCP storefront** at `/api/mcp/<store-id>` (Streamable HTTP, MCP 2025-11-25) with three tools:
   - `search_products`: query, price ceiling, stock filter
   - `create_checkout`: product ids and quantities in, a PayPal approval link out
   - `check_order`: reports whether the customer paid, and captures the order once PayPal says it is approved
3. **The customer approves on PayPal.** Shelf creates a PayPal Orders v2 order with `intent: CAPTURE`, `payee.email_address` set to the merchant, and `user_action: PAY_NOW`. After approval, the return page (or the agent's `check_order` call) captures it.

The store page also includes a demo shopper connected to the same MCP storefront, so judges can watch an agent shop without setting up their own client. With `SHOPPER_PROVIDER=nebius`, NVIDIA Nemotron calls the MCP tools through the Nebius adapter. Otherwise, Claude uses the Anthropic SDK's `mcpTools` helper. The public Nebius demonstration selects the Nemotron provider.

### Safety model

- **Agents never set prices.** `create_checkout` takes product ids and quantities only; the server prices the cart from the stored catalog in integer cents.
- **Customers approve every payment.** Nothing is captured until PayPal reports the order `APPROVED`.
- **Merchant input is untrusted.** Store URLs are fetched through an SSRF guard that re-checks every redirect against private and reserved addresses. Page text and product descriptions are passed to Claude as data, never as instructions.
- **Limits:** out-of-stock items are refused, quantities are capped at 10 per line and 20 lines per order, and store creation, MCP calls and the demo shopper are rate limited per IP.
- **Idempotent payments:** order creation sends a unique `PayPal-Request-Id`, and capture uses `shelf-capture-<orderId>`, so a retried capture never charges twice.

## Run it

Requires Node 20+.

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

| Variable | Needed for |
|---|---|
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Creating and capturing orders. Get them from a **Sandbox** REST app in the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications). |
| `SHOPPER_PROVIDER` | Set to `nebius` for the NVIDIA Nemotron shopper; otherwise the shopper uses Claude. |
| `NEBIUS_API_KEY`, `NEBIUS_MODEL` | Token Factory API key and optional model override for the Nebius shopper. Default model: `nvidia/Nemotron-3_5-Lightning`. |
| `ANTHROPIC_API_KEY` | Optional catalog extraction for pages without structured data, and the Claude shopper when selected. Not required by the Nebius shopper. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Durable stores and orders on serverless hosts. Without them, data lives in memory. |
| `PUBLIC_BASE_URL` | Optional fixed origin for PayPal return links. |

Browsing and MCP catalog search work with no model keys. Checkout needs PayPal. The browser shopper needs the selected provider's API key: Nebius for `SHOPPER_PROVIDER=nebius`, otherwise Anthropic. Structured Shopify and JSON-LD import do not require Claude.

### Try a full purchase in Sandbox

1. In the PayPal Developer Dashboard, open **Sandbox accounts** and note one **Business** account email (the merchant) and one **Personal** account (the buyer).
2. Create a store on the home page with any Shopify store address (for example `allbirds.com`) and the sandbox Business email.
3. Ask the demo shopper to buy something, open the PayPal link, and log in with the sandbox Personal account.
4. After approval you land on the receipt page with the capture id. Click **I approved it on PayPal** in the chat to watch the agent confirm the payment.

### Connect your own assistant

Copy the MCP storefront URL from a store page and add it as a remote MCP server (in Claude: Settings, then Connectors, then add a custom connector). Or inspect it directly:

```bash
npx @modelcontextprotocol/inspector
```

## Tests

```bash
npm test          # 43 tests: catalog parsing, SSRF guard, cart pricing, PayPal client, MCP storefront, Claude flows
npm run typecheck
npm run build
```

PayPal, Claude and Nebius are faked at the HTTP layer in tests, so the suite runs offline and spends nothing.

## Tools used

- **PayPal:** Orders v2 REST API (create, get, capture) in Sandbox, with payee routing and idempotency keys.
- **NVIDIA Nemotron** (`nvidia/Nemotron-3_5-Lightning`): the selected public demo shopper, using runtime function-calling inference through Nebius Token Factory. The app is hosted on Vercel, not Nebius AI Cloud.
- **Claude** (`claude-opus-5-5` via `@anthropic-ai/sdk`): optional unstructured catalog extraction and the alternate shopper using the SDK tool runner with `mcpTools`. Server-side refusal fallbacks apply to the Claude shopper.
- **Model Context Protocol** TypeScript SDK: the per-store storefront server, served statelessly over Streamable HTTP.
- **Next.js 16** on Vercel, **Upstash Redis** for storage.

## License

MIT. See [LICENSE](LICENSE).
