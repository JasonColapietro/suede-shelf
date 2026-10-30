# Nebius model maintenance, October 30, 2026

## Reason and selection

Nebius retires `nvidia/nemotron-3-super-120b-a12b` from Serverless on November 9, 2026, without automatic rerouting. The new source default is `nvidia/Nemotron-3_5-Lightning`.

Official sources checked October 30:
- https://docs.tokenfactory.nebius.com/model-deprecations-november-2026
- https://tokenfactory.nebius.com/api/public/models_info

The retirement notice recommends `nvidia/Nemotron-3.5-Super-VL` for the former Super model. However, the public catalog returned `status: error` for Super VL. Lightning is active, supports text and function calling, and is the notice's replacement for Nemotron 3 Nano. Ultra is also active but materially more expensive. Lightning's listed input/output rates are $0.06/$0.24 per million tokens versus Super VL's $0.30/$0.90 and Ultra's $1/$3. These are a dated catalog snapshot, not a pricing guarantee or a broad quality benchmark.

## Configuration and safety

The production project is `suede-shelf` (`prj_zgBb0sOY3UEUGEsKqVHkpCfae84r`) in team `team_i3zcwXswG8Kcy4hJaBIKuAt6`. Before migration, its production deployment was `dpl_FswARGEsDnusbLe2LW7YBuzhLoFB`, commit `71c5388cfa4562bd5601551e6d6fbcb2ce0d6d4e`. Configuration inspection confirmed `SHOPPER_PROVIDER=nebius`, a sensitive API key, no `NEBIUS_MODEL` override, and no `PAYPAL_ENV` override (application default: sandbox).

Use `NEBIUS_MODEL=nvidia/Nemotron-3_5-Lightning` and `PAYPAL_ENV=sandbox` explicitly for production. The endpoint remains `https://api.tokenfactory.nebius.com/v1/chat/completions`. No credentials change or dedicated endpoint is required. Model overrides remain supported; they require separate live validation. Do not roll back to the retiring model after November 9.

The adapter's MCP discovery, sequential calls, 45-second deadline, eight-round bound, single checkout attempt per reply, catalog prices, customer approval requirement and idempotency behavior remain unchanged. No silent provider fallback or automatic retry after checkout is introduced.

## Historical evidence

October 17 and October 29 evidence, recordings and submission text describe the old model and remain unchanged. This is post-submission operational maintenance, not a claim that Lightning generated the historical results. The repository records an October 30, 1 PM Eastern submission cutoff and organizer restrictions on subsequent project changes. This dated maintenance record makes the change explicit; organizer acceptance of post-cutoff maintenance has not been established.

## Validation and release

Pending: record offline results, staged real-inference acceptance, and production promotion before marking migration complete. Historical results are not evidence for the replacement model.
