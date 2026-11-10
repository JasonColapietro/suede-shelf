# Nemotron migration acceptance — November 10, 2026

This is operational maintenance after the hackathon cutoff. October 17/29 evidence, submission text, recordings and assets remain unchanged. These results do not describe the model used in the historical submission.

## Selected model and staged release

- Provider: Nebius Token Factory, `https://api.tokenfactory.nebius.com/v1/chat/completions`.
- Model: `nvidia/Nemotron-3_5-Lightning`. The provider's current public catalog identifies it as active, not deprecated, with function calling.
- Runtime source: `7d7837f9be4110a994c5a46309f72a1a68ef9c56`, signed locally and independently reported by GitHub as verified/valid with JasonColapietro author mapping.
- Project/team: `suede-shelf`, `prj_zgBb0sOY3UEUGEsKqVHkpCfae84r`, `team_i3zcwXswG8Kcy4hJaBIKuAt6`.
- Staged production deployment: `dpl_H5My2enNQ32Gv7QBXus5bQRPXCe7`, built with production configuration using `--prod --skip-domain`. The public alias remained on the former deployment during acceptance.
- Production settings explicitly select Lightning and `PAYPAL_ENV=sandbox`. Existing credentials and protection settings were reused without creating credentials or access grants.

## Actual inference and MCP results

All seven staged checks passed at approximately 13:03 UTC:

1. Independent MCP search returned in-stock Pocket Notebook ($12.50) and Canvas Pouch ($18.00).
2. The shopper made a real Nebius function call to `search_products`, then recommended those products under $20.
3. The shopper called `search_products` and `create_checkout` for two notebooks and one pouch. The generated approval host was `www.sandbox.paypal.com`, with a $43.00 USD catalog total.
4. Two independent `check_order` calls reported `PAYER_ACTION_REQUIRED`, `paid=false`, and $43.00.
5. When told the order was paid, the shopper called `check_order` and correctly reported that approval/payment was still outstanding.
6. MCP rejected an out-of-stock item, an unknown product, and quantity 11 without generating checkout links.
7. The shopper handled a nonexistent-order error from `check_order`, then recovered in the same conversation to search for the notebook and return $12.50.

Deployment runtime logs contain provider-returned `model: nvidia/Nemotron-3_5-Lightning` for each inference round, including all three tool types. This establishes provider acceptance and the serving model rather than inferring it from source defaults. Logs retain only model identifiers, finish reasons and allowlisted tool names; no prompt, response text, tool arguments, order identifiers or approval URLs are logged by this diagnostic.

No buyer approval, capture, live-money payment, or completed-payment claim occurred. Catalog-controlled pricing, approval-before-capture, idempotency, sequential MCP execution, eight-round/45-second bounds and one checkout attempt per reply remain intact.

## Offline checks and release boundary

- 45/45 offline tests passed, including model override handling, diagnostics privacy, malformed/truncated output, checkout preservation after provider failure, invalid tools, pricing, approval and idempotency.
- Route type generation and TypeScript passed.
- Local production build passed on retry. The initial build stopped with the existing Next.js 16.4.0 security advisory; a security upgrade remains separate follow-up work.
- Vercel built the staged production artifact successfully. No paid GitHub/external-runner jobs were dispatched.

This record establishes staged acceptance. Final merge SHA, public deployment/alias identity, post-promotion inference logs and public checks must be recorded in the release handoff before declaring production migration complete. Do not roll back to the retired model.

## Remaining limits

This is a small functional sample, not a quality/latency/cost benchmark. Provider outages, credits and existing rate limits still affect availability. Induced provider outages were tested offline; live recovery used a real MCP error. No completed or live-money PayPal flow was tested. Organizer acceptance of post-cutoff maintenance is unestablished; the maintenance is disclosed separately and historical submissions are preserved.
