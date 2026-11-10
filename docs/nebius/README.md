# Suede Shelf — Nebius edition

A merchant catalog becomes a storefront that NVIDIA Nemotron can browse through MCP, with catalog-priced checkout and customer approval on PayPal.

## Run

Use the normal README setup, then set these server-side environment variables:

- `SHOPPER_PROVIDER=nebius`
- `NEBIUS_API_KEY`: a Token Factory API key; never use a NEXT_PUBLIC variable.
- `NEBIUS_MODEL=nvidia/Nemotron-3_5-Lightning` (or another available NVIDIA Nemotron model ID).

The endpoint is fixed to `https://api.tokenfactory.nebius.com/v1/chat/completions`. Inference consumes your Nebius credits. Choose an available NVIDIA model in your account before deployment. This integration does not create a paid subscription or dedicated GPU endpoint.

Structured Shopify and JSON-LD catalogs do not need another model. Optional unstructured catalog extraction still uses Claude if ANTHROPIC_API_KEY is set; the shopping agent uses only Nebius when selected, with no silent provider fallback.

Code defaults to Claude unless SHOPPER_PROVIDER is explicitly set. The verified production demo currently selects Nebius; this was already configured before the October 17 acceptance run. Use a separate Vercel project or preview environment for this edition if retaining the existing PayPal entry. Set PUBLIC_BASE_URL to that deployment's actual origin. Keep PAYPAL_ENV=sandbox for demonstrations.

## Architecture and safeguards

The adapter discovers all three tools from the live in-process MCP server, converts their schemas to OpenAI-style function definitions, and executes returned calls through MCP. Tools perform catalog lookup, checkout creation and verified order status. The model never supplies prices. Existing stock, quantity, currency, approval and idempotency checks remain authoritative.

Calls are sequential; model output is validated before use; unknown tools and invalid input are rejected. Each reply has an eight-round limit and a 45-second inference deadline. Each reply can attempt checkout only once. If inference fails after a successful checkout, the customer still receives the real approval link. This is not cross-request deduplication: a new shopper message can create a new checkout.

## Validation

`npm test`, `npx next typegen`, `npm run typecheck`, `npm run build`.

Offline tests exercise real MCP dispatch with a simulated Nebius HTTP provider. They cover product search, total calculation, duplicate checkout attempts, unapproved payment state, malformed calls, truncated model output, loop limits and recovery after checkout. They do not prove live inference access.

Live acceptance: open a catalog, ask for products under a budget, request one specific in-stock variant, verify the sandbox approval link and total, and verify the order stays unpaid until buyer approval. Record a short real walkthrough after live inference is configured.

## Historical verified public demonstration

Open https://suede-shelf.vercel.app/s/suede-demo-catalog-2f78dff6. Ask for in-stock gifts under $20, then request two Pocket Notebooks and one Canvas Pouch. The catalog total is $43.00 USD. The goods are fictional sandbox data; no items are sold or shipped. Customer approval remains required.

The October 17 and 29 results used the former model; see [live verification](live-verification.md) for the deployed source, actual inference evidence, unpaid order state and separate offline test results. The website is hosted on Vercel and calls Nebius Token Factory at runtime.

## Sources

- https://nebius.com/services/token-factory/nemotron
- https://nebiusglobalaihackathon.devpost.com/resources
- https://github.com/nebius/token-factory-cookbook
