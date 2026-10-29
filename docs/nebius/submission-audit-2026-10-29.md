# Nebius submission audit: October 29, 2026

## Outcome

Devpost confirmed entry **1241992**, **Suede Shelf: a storefront for AI shoppers**, as submitted on October 17, 2026 at 19:23 UTC. The confirmation email was re-read during this audit. Earlier repository statements that this was an unfinished 3/5-step draft were stale and have been corrected.

The authenticated editor redirected to sign-in, and authentication did not complete. Therefore this audit **does not verify the current submitted field values or final submission-manager state**. No Devpost fields, eligibility declarations, video or runtime code were changed, and no duplicate entry was created.

## Requirement-by-requirement evidence

| Requirement | Verified evidence | Limit or remaining check |
|---|---|---|
| Nebius runtime plus an NVIDIA model | `lib/nebius.ts` calls the Token Factory chat-completions endpoint and defaults to `nvidia/nemotron-3-super-120b-a12b`; the route selects it with `SHOPPER_PROVIDER=nebius`. October 17 evidence records actual service results. | The fresh browser reply does not expose a provider-returned model ID. |
| Suitable track | The shopping agent fits Best Apps and Agents; repository materials and YouTube description identify this track. | Read back the actual saved Devpost track when authenticated. |
| Public source and license | GitHub reports `private=false`, public visibility and a detectable MIT license. Source, setup instructions and model integration are present. | Root README provider/setup wording was corrected to match the implemented Nebius option. |
| Working demonstration | The public demo loaded without sign-in on October 29. A live request for in-stock gifts under $20 returned Pocket Notebook at $12.50 and Canvas Pouch at $18.00, matching the displayed catalog. | Fresh check covered recommendation only. No new checkout or payment was attempted. |
| Public YouTube video under three minutes | Public watch page loaded without sign-in, with the expected title, channel and duration 1:56; repository duration is 1:55.53. Description contains exact model, source/demo links, sandbox boundary and prior-work disclosure. | Playback buffered at 0:00 in this browser. October 17 evidence records successful playback. Current Devpost video field still needs authenticated readback. |
| Technical feedback | `feedback.md` contains concrete feedback on nullable tool-call responses, bounded execution, side-effect recovery, formatting and compatibility fixtures. Scores are explicitly a small functional sample. | Compare the current saved answers with this material after sign-in. |
| Technology and prior-work disclosures | Materials distinguish Vercel hosting from Nebius inference, disclose Claude for optional unstructured catalog extraction and earlier shopper, acknowledge Codex assistance, and separate earlier PayPal storefront work from the Nebius adapter. | Verify these disclosures remain present in the saved form. No Nebius AI Cloud deployment or controlled model benchmark is claimed. |
| Entrant eligibility and team details | Official rules and organizer checklist were reviewed. Submission receipt establishes submission, not the truth or contents of personal declarations. | Identity, country, team acceptance, ownership/authority and conflict/support declarations cannot be independently inferred. Do not replace or invent answers. |

## Changes made

- Replaced stale draft/not-submitted statements in the submission materials, live-verification record, feedback and video status.
- Preserved historical technical results and clearly dated the new recommendation-only check.
- Corrected root README language that implied the public shopper required Anthropic; documented Nebius provider selection, key and default model.
- Added this audit to separate confirmed submission receipt from unverified authenticated form state.

These are documentation changes only. No runtime behavior was changed and no fresh offline test run is claimed.

## Remaining access and decisions

The next required step is authenticated access to the **existing** entry, followed by field-by-field readback, any independently justified corrections and a saved submitted-state check. No product, track or eligibility change has been identified as requiring an owner decision. If a personal declaration is absent or contradictory when the form becomes accessible, obtain the entrant's actual answer rather than infer it from code or the submission receipt.

No evidence here establishes disqualification, a missing required form answer or a failed public video. The limitations above describe what could not be verified.

## Cutoff and access

All competition-material edits must stop at **October 30, 2026, 1:00 PM Eastern (17:00 UTC)**, as instructed in the organizers' October 27 checklist. Keep the existing demo accessible through judging ending December 15, 2026; continued hosting and inference availability are operational requirements, not established future results. Existing rate limits are 30 shopper requests per IP per hour and 200 per store per day; this audit did not change them or buy credits.

## Sources

- [Official rules](https://nebiusglobalaihackathon.devpost.com/rules), reviewed October 29.
- Devpost submission confirmation, October 17, 2026, subject “Submission confirmed: Suede Shelf: a storefront for AI shoppers”. Private email reviewed; not published here.
- Organizer submission checklist, October 27, 2026. Private email reviewed; not published here.
- [Existing submission editor](https://devpost.com/submit-to/30790-nebius-x-nvidia-global-ai-hackathon/manage/submissions/1241992-suede-shelf-a-storefront-for-ai-shoppers/edit).
- [Live demo](https://suede-shelf.vercel.app/s/suede-demo-catalog-2f78dff6).
- [YouTube video](https://www.youtube.com/watch?v=EWiX1nd5HcY).
- [Public repository](https://github.com/JasonColapietro/suede-shelf), inspected at `ecff6f93e59d9395a58a6f74862adc70a4c8216d` before these documentation edits.
- [October 17 live evidence](live-verification.md), [sanitized service results](evidence-2026-10-17.json), [technical feedback](feedback.md), [setup](README.md).
