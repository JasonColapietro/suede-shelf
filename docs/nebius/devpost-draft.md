# Suede Shelf: a storefront for AI shoppers

Best Apps and Agents submission materials. Live inference and sandbox checkout were verified October 17, 2026. Devpost confirmed submission of entry `1241992` on October 17 at 19:23 UTC. Earlier draft-state notes are superseded by that confirmation. The filename is retained to preserve existing links; it is not the current submission status. See the [October 29 audit](submission-audit-2026-10-29.md) for verified evidence and remaining access limits.

## Inspiration

A merchant's catalog already describes what can be bought. Suede Shelf helps shoppers turn a request into a catalog-backed cart and a payment they control. The merchant supplies the products and prices; the assistant helps choose; the customer approves checkout.

## What it does

Suede Shelf imports a structured catalog and exposes product search, checkout and order-status tools through the Model Context Protocol (MCP). NVIDIA Nemotron on Nebius Token Factory uses those tools to find suitable items, explain prices and prepare a PayPal approval link. A browser storefront makes the workflow available without installing an MCP client.

The public demonstration uses an original, explicitly fictional catalog. No goods are sold or shipped. Its model calls and PayPal Sandbox orders are real service requests.

## How we built it

The deployed shopping model is `nvidia/nemotron-3-super-120b-a12b`, called at `https://api.tokenfactory.nebius.com/v1/chat/completions`. The exact requested model is established by the deployed source default and the absence of a model override. Next.js runs on Vercel; inference runs on Nebius Token Factory. This uses Nebius's inference API, not Nebius AI Cloud hosting.

The adapter discovers tool schemas from the existing in-process MCP server and dispatches returned function calls through its MCP client. Redis persists catalogs and order records. PayPal Orders v2 creates the approval flow. Cart totals use integer cents and stored catalog prices; the model supplies product IDs and quantities only.

Execution is sequential, limited to eight rounds, and bounded by a 45-second inference deadline. The adapter validates response shapes and tool arguments and permits one checkout attempt per reply. A successful approval link survives a later inference failure. Server controls reject unavailable items, unknown IDs and quantities above 10 per line. Capture runs only after PayPal reports customer approval and uses an idempotency key.

## Challenges

Real Nebius responses included nullable `tool_calls` fields. Updating the response validator to accept that valid shape fixed the initial compatibility failure. The adapter also handles repeated checkout calls and inference failure after order creation without losing the customer's approval link.

## Accomplishments

On October 17, the public browser assistant correctly recommended Pocket Notebook at $12.50 and Canvas Pouch at $18.00 for a request under $20. It then created a PayPal Sandbox checkout for two notebooks and one pouch at exactly $43.00 USD.

Independent live MCP calls verified the catalog prices and checked the order twice. Both checks reported `PAYER_ACTION_REQUIRED` and `paid=false`; no buyer approval, capture or completed purchase was performed. Live tool calls also rejected an out-of-stock Desk Tray, an unknown product and quantity 11. These results are recorded in the repository's live-verification document and sanitized evidence file.

Separately, all 43 offline tests, generated route types, TypeScript checks and the production build passed. Offline tests simulate provider and payment responses; the browser demonstration and live MCP checks use the deployed services.

## What we learned

Token Factory's OpenAI-compatible function-calling interface let us reuse the existing MCP tool boundary. Real testing exposed a response-shape difference that simulated fixtures had missed: optional tool-call fields may be null. A documented minimal response fixture covering null, omitted and populated fields would improve integration testing.

In the live sample, Nemotron returned the correct catalog items and total and explained the approval requirement. It also emitted Markdown punctuation in a plain-text chat interface, which is a useful presentation improvement for the next iteration. This is a small functional validation, not a latency or quality benchmark.

## What's next

Add checkout deduplication across messages, improve display of model-formatted replies, and evaluate a wider range of shopping requests. The current duplicate-checkout control applies within one reply; a new message may create a new order. Keep the demo available through judging, subject to configured service credits and rate limits.

## Existing project disclosure

Suede Shelf's storefront, catalog import, Claude shopper, Redis persistence, MCP tools and PayPal integration predate this Nebius entry. New work for this entry is the NVIDIA Nemotron / Nebius adapter, provider selection, accurate provider display, bounded execution, repeated-checkout protection, failure recovery, tests and Nebius documentation. Optional unstructured catalog extraction still uses Claude; structured import does not.

The earlier storefront was built for the PayPal AI Hackathon. This entry builds on that same repository and adds the Nebius shopping integration. The original demo catalog and recorded walkthrough were prepared for this submission.

## Submission links and status

- Working public demo: https://suede-shelf.vercel.app/s/suede-demo-catalog-2f78dff6
- Public repository (MIT): https://github.com/JasonColapietro/suede-shelf
- Setup: https://github.com/JasonColapietro/suede-shelf/blob/main/docs/nebius/README.md
- Live evidence: https://github.com/JasonColapietro/suede-shelf/blob/main/docs/nebius/live-verification.md
- Existing Devpost entry (edit only before the deadline): https://devpost.com/submit-to/30790-nebius-x-nvidia-global-ai-hackathon/manage/submissions/1241992-suede-shelf-a-storefront-for-ai-shoppers/project_details/edit
- Public YouTube demonstration: https://www.youtube.com/watch?v=EWiX1nd5HcY (1:55.53 captioned recording; public playback verified without signing in). [Repository copy](demo.mp4) and [publishing copy](video.md).
- Deadline: October 30, 2026, 1:00 PM Eastern (10:00 AM Pacific).
- Submission status: Devpost's October 17 confirmation establishes that entry `1241992` was submitted. The October 29 audit could not inspect the authenticated form, so its current field values, selected track, eligibility answers and final manager state have not been independently reverified. Do not infer that any field remains blank from the earlier 3/5 draft snapshot. Preserve this entry; do not create a duplicate.
- Historical form selection recorded October 17: New relative to August 26, 2026 (first repository commits October 12); the pre-Nebius storefront work is explicitly disclosed. The current saved selection still requires authenticated readback.
- Freeze: the organizers' October 27 checklist prohibits changes to the submission, repository, video and project materials after October 30, 2026, 1:00 PM Eastern. Keep the existing demo available through judging ending December 15, 2026.
