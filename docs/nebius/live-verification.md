# Live verification — October 17, 2026

## Current acceptance run

- Public deployment: https://suede-shelf.vercel.app/s/suede-demo-catalog-2f78dff6
- Runtime source: `be2483f338018e4869de290b5914f529dde83c5e` (PR #3; runtime adapter from PR #2).
- Production provider was already Nebius when this run began. This validation did not change provider configuration or credentials.
- Model requested: `nvidia/nemotron-3-super-120b-a12b`, established from the deployed source default and no `NEBIUS_MODEL` override in Vercel. The shopper API does not expose a provider-returned model field.
- Inference endpoint: `https://api.tokenfactory.nebius.com/v1/chat/completions`.
- Hosting: Vercel. Runtime inference: Nebius Token Factory. Nebius AI Cloud deployment is not claimed.
- No credentials were printed or copied into the repository. No payment approval URL or complete order identifier is retained in public evidence.

## Real browser and service results

The original [demo catalog](../../public/demo-catalog.html) imported through the production JSON-LD path: four products, three available. Product descriptions explicitly identify fictional sandbox goods; no items are sold or shipped.

1. The browser shopper was asked for in-stock gifts under $20. It returned Pocket Notebook ($12.50) and Canvas Pouch ($18.00), matching an independent live MCP catalog query.
2. It was asked to prepare two Pocket Notebooks and one Canvas Pouch. It created an approval link on `www.sandbox.paypal.com/checkoutnow` and stated $43.00 USD: `2 × 12.50 + 18.00`.
3. Two independent live `check_order` calls returned `PAYER_ACTION_REQUIRED`, `paid=false`, $43.00 USD. The persisted storefront receipt showed AWAITING CUSTOMER. No buyer approval, capture, or completed payment was performed.
4. Direct live MCP calls rejected an out-of-stock Desk Tray, unknown product ID, and quantity 11. These failures did not create a checkout.

Machine-readable sanitized results: [evidence-2026-10-17.json](evidence-2026-10-17.json). The browser recording contains actual service interaction, followed by the persisted receipt. It does not represent the offline tests as live behavior.

## Offline verification

On the deployed runtime source before the documentation/catalog addition: `npm ci --ignore-scripts`, `npm test` (43/43), `npx next typegen`, `npm run typecheck`, and `npm run build` passed. The added catalog was parsed with the application's real parser and priced with its cart implementation; all four products, availability and the $43.00 cart were checked. Vercel's preview and production builds passed for the catalog addition.

The offline suite simulates Nebius, Claude and PayPal at the HTTP layer. It verifies pricing, approval, idempotency, invalid calls, bounded loops and error recovery; it is separate from the live results above.

## Earlier validation

The earlier PR #3 evidence records live search and a $25.00 unpaid sandbox checkout against an imported Allbirds catalog on source `99e15f911643e37898ffb58c7bbf99f74b14da6a`. This session independently rechecked its $25 catalog recommendation, then used the original fictional catalog for the public walkthrough. That earlier imported catalog does not establish an Allbirds relationship or a purchase from that merchant.

## Observations and operating boundaries

- Live nullable `tool_calls` responses required the PR #2 response-schema compatibility fix.
- The live assistant emitted Markdown markers into the plain-text chat UI; improve formatting in a later iteration.
- Functional testing used a small sample. No broad quality, latency or cost benchmark is claimed.
- Checkout prevention is per reply, not across messages. New messages may create separate unpaid orders.
- No completed checkout or live-money purchase was tested. The demonstrated approval host is PayPal Sandbox.
- The app is publicly reachable without sign-in at the demo URL. Availability depends on configured credits, hosting and rate limits (30 shopper requests per IP per hour, 200 per store per day).
- Original storefront, catalog, MCP, Redis and PayPal functionality predates the Nebius entry; the disclosure remains in the submission draft.

## Submission state

Devpost showed no existing Suede Shelf entry in the Nebius or PayPal hackathons, and the portfolio contained only the distinct Suede Agent Studio project. One draft for the established Suede Shelf repository was started: submission `1241992`. Do not create a second entry.

The [1:55.53 captioned demonstration](demo.mp4), [screenshots](receipt.jpg) and [technical feedback](feedback.md) are available in the repository. The [public YouTube video](https://www.youtube.com/watch?v=EWiX1nd5HcY) was published on Suede AI's channel October 17; playback without signing in was verified. The video URL, story, source/demo links, technology tags and technical answers are saved in the Devpost draft, which reports 3/5 steps done. Submitter identity/country, personal eligibility declarations and learning responses remain unfilled rather than inferred. Final rules/terms acceptance is still required. The Devpost draft is not a completed submission. Current official cutoff: October 30, 2026, 1:00 PM Eastern. Sources: [rules](https://nebiusglobalaihackathon.devpost.com/rules) and the signed-in Devpost submission manager. Judges need continued access through the judging period ending December 15, 2026.
