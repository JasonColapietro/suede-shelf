# Technical answers and product feedback

Saved in Devpost draft 1241992 on October 17, 2026. Numeric assessments describe this limited functional sample, not a benchmark. Personal eligibility fields and final terms acceptance remain for the entrant.

## Project history and improvements

The repository first commits date to October 12, 2026, within the hackathon period, so New is selected relative to August 26. The storefront, catalog import, Claude shopper, Redis, MCP tools and PayPal workflow existed before this Nebius entry. New entry work adds the NVIDIA Nemotron / Token Factory adapter, provider selection and display, an eight-round/45-second tool loop, one checkout attempt per reply, approval-link recovery, live response compatibility, tests, documentation and an original sandbox demonstration.

## Model and variant

nvidia/nemotron-3-super-120b-a12b through Nebius Token Factory. This served tool-calling model was configured for the entry and successfully drove the existing MCP shopping tools. We did not run a controlled comparison of model sizes or claim this variant is optimal. The deployed source default and absence of a NEBIUS_MODEL override establish the exact requested model.

## Output quality

8/10 for the limited functional sample. In real browser tests it found the correct in-stock products under $20, used catalog prices and created the requested two-notebook/one-pouch cart at $43.00. It explained that payment still required customer approval. It emitted Markdown punctuation in our plain-text chat UI, so presentation can improve. This is a small functional assessment, not a comprehensive benchmark.

## Prompting approach

Prompt-engineered, without fine-tuning. A system prompt directs the shopper to discover products using MCP, clarify ambiguous carts, use server-controlled product IDs and quantities, and verify payment before claiming success. Runtime-discovered tool schemas, response validation, sequential execution and bounded loops constrain execution. Catalog descriptions are treated as untrusted data.

## Comparison with other models

The pre-existing app used Claude with the same MCP storefront, which made tool reuse straightforward. We verified Nemotron can perform the core discovery and checkout flow. We did not run a controlled head-to-head quality, latency or cost benchmark, so we make no superiority claim.

## Nebius capabilities used

Token Factory API access and OpenAI-compatible function calling were the useful capabilities. The app runs on Vercel and calls https://api.tokenfactory.nebius.com/v1/chat/completions at runtime. Redis persists catalog and order state. We did not provision dedicated GPUs, use Nebius AI Cloud compute, or test custom scaling. Runtime tool discovery reused the existing MCP interface.

## Recommendation assessment

8/10 based on this integration and small live acceptance sample. The hosted API let the existing application use an NVIDIA tool-calling model without managing GPU infrastructure. Recommend validating real response shapes early: nullable tool_calls required a compatibility fix that offline fixtures had initially missed.

## Inference experience

8/10 for functional integration. Managed inference avoided local model hosting and GPU setup. Compared with the app existing hosted-model integration, both can use the same MCP tool boundary. No controlled performance, cost or local-versus-cloud benchmark was run.

## Suggested platform improvements

Publish minimal tool-calling response fixtures for omitted, null and populated tool_calls, plus examples for sequential tool loops, truncation handling and recovery after a side effect. A compatibility test suite and clear examples for request-level usage/latency reporting would help teams verify adapters before deployment.

## Requested Nemotron improvements

Continue improving reliable tool selection and instruction-following in multi-step workflows. Examples and evaluations that distinguish preparing an action from a verified completed action would help payment and commerce developers. We also want consistent plain-text formatting when requested by the application.

## AI tools used

NVIDIA Nemotron on Nebius Token Factory powers the live shopping assistant. OpenAI Codex assisted with validation, testing, documentation and submission materials. The original Suede Shelf code includes Anthropic Claude for unstructured catalog extraction and its earlier shopper; structured import and the selected Nebius shopper do not require Claude inference.
