# Live verification — October 17, 2026

- Deployment: https://suede-shelf.vercel.app/s/allbirds-56301b74
- Source: `99e15f911643e37898ffb58c7bbf99f74b14da6a` (PR #2).
- Provider selected in production: Nebius Token Factory; secret stored privately in Vercel.
- Model: `nvidia/nemotron-3-super-120b-a12b`.
- 43 offline tests, TypeScript check and Vercel production build passed.

## Live results

The shopper returned Women's Wool Runner Mizzles at $99.00 and Men's Tree Runner at $100.00. Independent MCP catalog queries verified the returned IDs, prices and availability.

In Chrome, the shopper created a PayPal Sandbox approval link for one Women's Allbirds Flip Flop — Dusty Pink, size 10. An independent check_order call verified a total of $25.00 USD and paid=false. No buyer approval or completed payment was claimed. This is a sandbox demonstration using an imported catalog; it does not establish a relationship with Allbirds or a purchase from that merchant.

The production page identifies NVIDIA Nemotron on Nebius Token Factory as the shopper provider. The original Claude catalog-extraction fallback remains separate; structured catalog imports do not need it.

## Remaining submission work

Record and attach a public video of at most three minutes, then complete the Devpost submission. The local draft is not a submitted entry.
