# Suede Shelf: a storefront for AI shoppers

Draft for Best Apps and Agents. Do not submit until a live Nebius demo and public video are attached.

## Inspiration

A merchant's catalog already describes what can be bought. We wanted an AI assistant to use that catalog to help shoppers choose and check out, while keeping prices and payment approval under application and customer control.

## What it does

Suede Shelf imports structured product catalogs and exposes product search, checkout and order-status tools through MCP. The Nebius edition connects NVIDIA Nemotron to those same tools. Shoppers describe what they want, compare catalog items and receive a PayPal approval link for their selected cart.

## How we built it

Next.js hosts the storefront and API. NVIDIA Nemotron runs through Nebius Token Factory's OpenAI-compatible API. A bounded tool loop discovers MCP schemas at runtime and dispatches model requests through the MCP client. Redis persists stores and orders; PayPal Orders v2 handles customer-approved checkout. Prices are calculated in integer cents from catalog records, never model-generated totals.

## Challenges

A tool-capable model can repeat a checkout call or fail after the order is created. The Nebius adapter limits each reply to one checkout attempt and retains a successfully created approval link even if the next model response fails. Invalid tools, malformed arguments and truncated responses are rejected.

## Accomplishments

The implementation connects a second model provider to the existing MCP storefront without changing pricing or payment approval rules. Automated offline tests cover the complete tool loop and failure paths. Live Nebius inference and the recorded walkthrough remain pending account setup.

## What we learned

The MCP boundary makes the catalog and checkout tools reusable across model providers. Model output still requires validation and bounded execution, especially around side effects.

## What's next

Evaluate shopping quality and latency on real Nebius requests, complete the live walkthrough, and improve cross-message checkout deduplication.

## Existing project disclosure

Suede Shelf's storefront, catalog import, Claude shopper, Redis persistence, MCP tools and PayPal integration predate this Nebius entry. New work for this entry is the NVIDIA Nemotron / Nebius adapter, provider selection, accurate provider display, bounded execution, repeated-checkout protection, failure recovery, tests and Nebius documentation. Optional unstructured catalog extraction still uses Claude; structured import does not.

## Submission checklist

- Public repository: https://github.com/JasonColapietro/suede-shelf (MIT).
- Live Nebius deployment URL: pending account setup and verification.
- Public video, maximum three minutes: pending real walkthrough.
- Exact NVIDIA model ID and live inference evidence: pending.
- Feedback: add observations from actual Token Factory use, not simulated tests.
