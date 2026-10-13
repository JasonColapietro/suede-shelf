# Suede Shelf: rules for AI agents working in this repository

Suede Shelf turns a merchant's catalog into an MCP storefront that AI assistants can shop, with payment through PayPal Orders v2. Read this before changing code.

## Payment invariants (never break these)

1. **Agents never set prices.** `create_checkout` (lib/storefront-mcp.ts) accepts product ids and quantities only. Prices come from the stored catalog via `priceCart` (lib/cart.ts), computed in integer cents. Never add a price, amount, total or discount field to any MCP tool input.
2. **Customers approve every payment.** Orders are created with `intent: CAPTURE` and `user_action: PAY_NOW`; capture happens only in `settleOrder` (lib/shop.ts) after PayPal reports `APPROVED`. Never capture an order that is not `APPROVED`, and never add a tool that captures directly.
3. **Idempotency.** Order creation sends a unique `PayPal-Request-Id`; capture uses `shelf-capture-<orderId>`. Keep both.
4. **Merchant input is untrusted.** All merchant URLs go through `safeFetch` (lib/safe-fetch.ts), which re-checks every redirect against private and reserved addresses. Page text reaches Claude as data inside `<page_text>`, never as instructions.
5. **Limits stay on.** Out-of-stock refusal, `MAX_QUANTITY` 10, `MAX_LINES` 20, and the per-IP rate limits in lib/limit.ts.
6. **No secrets in code.** PayPal, Anthropic and Redis credentials come from environment variables (Secret Manager on Cloud Run). Never log them.

## Commands

- `npm ci --ignore-scripts`, then `npx next typegen` once
- `npm test` (node:test via tsx, PayPal and Claude are faked at the HTTP layer; must stay offline)
- `npm run typecheck`, `npm run build`
- `node scripts/smoke.mjs <url> <store-id> [--checkout]` checks a deployment

## Conventions

- Next.js 16 with Cache Components: read `node_modules/next/dist/docs/` before using framework APIs. `params` and `searchParams` are Promises; read them inside `<Suspense>`.
- Every bug fix gets a regression test in `test/`.
- Merge requests explain the user-visible effect first, then the code change.
- Commits carry no AI attribution trailers.
