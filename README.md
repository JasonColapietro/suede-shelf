# Suede Shelf

**Let AI assistants check out at your store, with PayPal.**

AI assistants already recommend products. Suede Shelf lets them finish the sale: it reads a merchant's product pages and publishes a storefront that Claude, ChatGPT and any MCP client can shop. The assistant searches the catalog and builds a cart, the customer approves payment on PayPal, and the money lands in the merchant's PayPal account.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) by [Suede AI](https://seo.suedeai.ai).

## NVIDIA Nemotron on Nebius

The shopping assistant also supports NVIDIA Nemotron through Nebius Token Factory. The verified public demo currently uses this provider. See the [Nebius setup and live evidence](docs/nebius/README.md) and [submission draft](docs/nebius/devpost-draft.md). Set `SHOPPER_PROVIDER=nebius` and `NEBIUS_API_KEY` to select it; the code default remains Claude when the provider is unset.

## How it works

1. **Merchant pastes a store address and a PayPal email.** Shelf reads the catalog from Shopify's public `products.json`, then schema.org `Product` markup, then Claude for pages that have neither.
2. **Shelf publishes an MCP storefront** at `/api/mcp/<store-id>` (Streamable HTTP, MCP 2025-11-25) with three tools:
   - `search_products`: query, price ceiling, stock filter
   - `create_checkout`: product ids and quantities in, a PayPal approval link out
   - `check_order`: reports whether the customer paid, and captures the order once PayPal says it is approved
3. **The customer approves on PayPal.** Shelf creates a PayPal Orders v2 order with `intent: CAPTURE`, `payee.email_address` set to the merchant, and `user_action: PAY_NOW`. After approval, the return page (or the agent's `check_order` call) captures it.

The store page also includes a demo shopper: Claude connected to the same MCP storefront through the Anthropic SDK's `mcpTools` helper, so judges can watch an agent shop without setting up their own client.

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
| `ANTHROPIC_API_KEY` | Catalog extraction for pages without structured data, and the demo shopper. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Durable stores and orders on serverless hosts. Without them, data lives in memory. |
| `PUBLIC_BASE_URL` | Optional fixed origin for PayPal return links. |

Browsing and search work with no keys at all. Checkout needs PayPal, and the demo shopper needs Anthropic.

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
- **Claude** (`claude-opus-5-5` via `@anthropic-ai/sdk`): structured-output catalog extraction, and the demo shopping agent using the SDK tool runner with `mcpTools` over the store's MCP server. Server-side refusal fallbacks are enabled for the shopper.
- **Model Context Protocol** TypeScript SDK: the per-store storefront server, served statelessly over Streamable HTTP.
- **Next.js 16** on Vercel, **Upstash Redis** for storage.

## License

MIT. See [LICENSE](LICENSE).
