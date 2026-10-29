# Suede Shelf for the PayPal AI Hackathon

**AI shopping, catalog-priced carts, customer-approved PayPal checkout.**

Suede Shelf turns a merchant catalog into an MCP storefront that AI assistants can shop. PayPal Orders v2 provides the checkout and payment-status workflow; the AI finds products and prepares the cart. The customer retains payment approval.

## Try the working demo

- [Hosted storefront](https://suede-shelf.vercel.app/s/suede-demo-catalog-2f78dff6)
- [Public YouTube demonstration](https://www.youtube.com/watch?v=EWiX1nd5HcY)
- [Public MIT-licensed source](https://github.com/JasonColapietro/suede-shelf)
- [Original October 17 live evidence](nebius/live-verification.md)

The hosted demo needs no sign-in for catalog browsing, the shopping assistant, or checkout creation. It uses fictional sandbox products; no goods are sold or shipped. The page identifies NVIDIA Nemotron on Nebius Token Factory as the AI provider and PayPal Sandbox as the payment environment.

1. Ask: "Find the in-stock gifts under $20. Tell me their exact catalog prices."
2. Expect Pocket Notebook at $12.50 and Canvas Pouch at $18.00.
3. Ask: "Prepare a PayPal Sandbox checkout for two Pocket Notebooks and one Canvas Pouch."
4. Expect $43.00 USD and a PayPal Sandbox approval link.
5. Before approving anything, ask: "Check the status of that existing order with check_order. I have NOT approved it on PayPal. Do not create another checkout or claim payment."
6. An unpaid order should remain awaiting customer action. Creation of an approval link is not a completed payment.

To exercise buyer approval and capture, use your own PayPal Sandbox Personal buyer account. The README explains local setup with a Sandbox REST app and Business merchant account. Do not use a real-money account or publish credentials. The hosted checkout-creation demonstration does not require sharing the application's API keys.

## PayPal's actual contribution

PayPal is the transaction provider, not a decorative button:

- The server obtains an OAuth access token and calls PayPal Orders v2 to create, retrieve, and capture orders.
- Cart values are computed from stored catalog records in integer cents. MCP checkout inputs contain product IDs and quantities, not agent-provided prices.
- Orders specify `intent: CAPTURE` and `user_action: PAY_NOW`. Merchant payee routing is supported.
- `create_checkout` returns the approval URL from PayPal.
- `check_order` retrieves PayPal's actual order state. The implementation captures only after PayPal reports `APPROVED`.
- Capture uses a stable per-order idempotency key. Paid status requires both the order and capture to be `COMPLETED`.

Source: [PayPal client](../lib/paypal.ts), [cart pricing](../lib/cart.ts), [shopping operations](../lib/shop.ts), and [MCP storefront](../lib/storefront-mcp.ts).

## AI's actual contribution

The shopper uses catalog-search and checkout tools to turn a natural-language request into products and a cart. The public demo identifies NVIDIA Nemotron on Nebius Token Factory; the repository also supports Claude. Structured catalog extraction and the Claude fallback are documented in the main README.

Available MCP tools:

- `search_products`: names, descriptions, price ceilings, and stock filtering.
- `create_checkout`: validated product IDs and quantities to a PayPal approval link.
- `check_order`: PayPal order state and capture after customer approval.

## Fresh browser verification: October 29, 2026

The public storefront loaded without sign-in and displayed four products, three in stock. A fresh assistant conversation returned the two expected products under $20, generated a $43.00 checkout for two notebooks and one pouch, and displayed a link on `www.sandbox.paypal.com`. When asked to check the existing order without approval, the assistant reported `PAYER_ACTION_REQUIRED` and that the order was unpaid.

These are browser-observed results. The October 29 check did not independently query the PayPal API, approve a payment, capture an order, or demonstrate a completed purchase. No complete order identifier or approval token is retained here.

The source review used main at `ecff6f93e59d9395a58a6f74862adc70a4c8216d`. Current code contains approval-gated capture and idempotency handling; code inspection is separate from live execution evidence. No new automated test run is claimed.

## Existing video assessment

The original MP4 is 115.53 seconds, H.264, 1920 × 1080, with no audio track. It includes on-screen English captions, real storefront interaction, catalog search, a $43 checkout request, and an awaiting-customer receipt. It explicitly states that no customer payment completed.

The YouTube page was accessible without sign-in on October 29 and displayed a 1:56 duration and the expected Suede AI title and description. Playback buffered in the checking browser; visual review used the repository MP4. This does not establish a general YouTube outage.

The video was made for the separate Nebius entry and gives Nebius more emphasis than PayPal. It still names and shows the PayPal workflow, making it reusable evidence for this entry. Its limitation is that it stops before customer approval and capture. Do not describe it as a completed-payment demonstration. Preserve the existing video and Nebius entry.

## Suggested submission copy

### Project name

Suede Shelf

### Elevator pitch

Turn a merchant catalog into an AI-shoppable storefront. The assistant finds products and builds a catalog-priced cart; PayPal Sandbox handles checkout with customer approval.

### Inspiration

AI assistants can recommend products, but small merchants need a practical connection between recommendations and checkout. Suede Shelf explores that connection with a merchant catalog, standard MCP tools, and PayPal's order workflow.

### What it does

A merchant supplies a catalog URL. Suede Shelf imports products and publishes an MCP storefront with search, checkout creation, and order-status tools. A shopper can ask for gifts under a budget, choose quantities, and receive a PayPal Sandbox approval link. Product prices come from the stored catalog. Payment remains under the customer's control.

The public demonstration uses fictional products. Two $12.50 notebooks and one $18 pouch create a $43 PayPal Sandbox checkout. The demonstrated order remains awaiting customer approval; no completed payment is claimed.

### How it was built

Suede Shelf uses Next.js and TypeScript, the Model Context Protocol SDK, Redis storage, and PayPal Orders v2. The live demo identifies NVIDIA Nemotron through Nebius Token Factory as the shopping assistant; Claude is also supported.

The AI calls storefront tools. Server code validates stock, quantities, and catalog prices before requesting a PayPal order. PayPal returns the approval link. After buyer approval, the return page or order-status tool can trigger the implementation's approval-gated, idempotent capture path.

### Challenges addressed

The implementation keeps model-selected products separate from server-authoritative prices and distinguishes an order being created from a payment being completed. It also limits quantities and tool execution, rejects unavailable products, guards catalog URL fetching, and supports recovery from inference failures.

### Accomplishments demonstrated

A publicly accessible storefront connects real AI responses to catalog search and PayPal Sandbox checkout creation. The October 17 evidence and fresh October 29 browser check both support the $43 example. The code implements customer-approval gating and payment-status handling, while the public demo accurately labels the order as unpaid.

### What's next

Complete and record a buyer-approved Sandbox capture, improve chat formatting, and add cross-message duplicate-checkout protection. These are next steps, not completed results.

### Built with

PayPal Orders v2, PayPal Sandbox, NVIDIA Nemotron, Nebius Token Factory, Claude, Anthropic SDK, Model Context Protocol, Next.js, TypeScript, Upstash Redis, Vercel.

Only claim optional sponsor-prize tools if separately verified. Deployment on Vercel is not deployment on Nebius AI Cloud or Render.

### Development history

The repository's initial core, MCP, AI, UI, and PayPal commits are dated October 13, 2026. The Nemotron integration and associated verification were added October 17. These dates fall within the PayPal submission period beginning October 1. They are repository-history evidence, not a personal eligibility attestation or an organizer eligibility decision. Suede Shelf also has a separate Nebius entry; preserve that entry and disclose reused work when asked.

## Submission boundaries

This guide prepares the PayPal entry; it is not a submission receipt or proof of eligibility. Reuse any existing PayPal draft after checking the authenticated Devpost dashboard. Keep the separate Nebius submission 1241992 intact.

Official references: [rules](https://paypalaihackathon.devpost.com/rules) and [FAQs](https://paypalaihackathon.devpost.com/details/faqs). Judges need working access through the end of judging. Confirm any personal declarations from the entrant, not from this document.
