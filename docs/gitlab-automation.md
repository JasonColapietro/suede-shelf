# GitLab automation: verified workflow and proposed lifecycle

## Verified Life After Code workflow

The executed hackathon workflow lives in the public [GitLab Showcase project](https://gitlab.com/gitlab-ai-hackathon/transcend-october-2026/43309406/showcase). Its complete source is on [`duo/feature/2-suede-shelf-payment-guard`](https://gitlab.com/gitlab-ai-hackathon/transcend-october-2026/43309406/showcase/-/tree/duo/feature/2-suede-shelf-payment-guard), reviewed at commit `214096632b51b5c713145bd3569a02a9b30ad0c6`. This GitHub repository is the original MIT-licensed source, pinned at `1164355a14b9f49b75c5d9406f7e8a667f52bb53` for the import; the two pipelines are different.

Foundational **Duo Developer** and **Code Review** sessions investigated merchant-input defects, added failing regressions, applied fixes and reviewed the result in [MR !1](https://gitlab.com/gitlab-ai-hackathon/transcend-october-2026/43309406/showcase/-/merge_requests/1). This is a **supervised** workflow: a person evaluates the result and controls integration/release.

[Hosted pipeline 2970346843](https://gitlab.com/gitlab-ai-hackathon/transcend-october-2026/43309406/showcase/-/pipelines/2970346843) passed all five jobs: typecheck, unit tests, the shipped Next.js build, a separate webpack build and the advisory payment-safety label check. Its [JUnit report](https://gitlab.com/gitlab-ai-hackathon/transcend-october-2026/43309406/showcase/-/pipelines/2970346843/test_report) records **51 tests, 0 failures and 0 errors**. The [gate trace](https://gitlab.com/gitlab-ai-hackathon/transcend-october-2026/43309406/showcase/-/jobs/17336646129) records execution on the MR head. These results apply to the GitLab revision, not this GitHub revision.

The custom **Payment Guard**, **Issue Triage**, **Pipeline Medic** and **Release Scribe** files are prototypes; their presence is not evidence that they were created, enabled, triggered or successfully executed. Payment Guard is explicitly [documented as uncreated, unenabled and unexecuted](https://gitlab.com/gitlab-ai-hackathon/transcend-october-2026/43309406/showcase/-/blob/duo/feature/2-suede-shelf-payment-guard/docs/payment-guard.md). The executed label check is advisory: a missing blocked label does not prove a review ran or completed, and later label changes require a retry.

The Showcase pipeline has no package, deployment, smoke, registry/container-scanning or release jobs. Do not describe the nine-stage design below as nine executed stages, an automated production rollout, or verified Cloud Run/protected-environment setup. The [existing Devpost entry](https://devpost.com/software/suede-shelf-gitlab-duo-safety-workflow) and [YouTube demonstration](https://www.youtube.com/watch?v=sn0lOxTL8_k) describe the narrower foundational-agent workflow.

## Proposed nine-stage lifecycle

The following is the original architecture and configuration plan retained in this GitHub repository. Every row is a proposed capability requiring its own setup and execution evidence. It is not a run history.

| Planned stage | Intended behavior after setup | Configuration |
|---|---|---|
| plan | **Issue Triage** flow labels new issues, writes a plan, and hands small, non-payment work to the Duo Developer flow | `.gitlab/duo/flows/issue-triage.yaml`, trigger: Work item created |
| create | **Developer** foundational flow opens draft MRs from agent-ready issues | mention from Issue Triage |
| verify | typecheck, unit tests (JUnit report), Next.js build; **Code Review** foundational flow with repo review rules; **Pipeline Medic** flow fixes code failures | `.gitlab-ci.yml`, `.gitlab/duo/mr-review-instructions.yaml`, `.gitlab/duo/flows/pipeline-medic.yaml` |
| package | Container image built and pushed to the GitLab registry | `container-image` job, `Dockerfile` |
| secure | SAST, Secret Detection, Dependency Scanning, Container Scanning; **Payment Guard** flow reviews every MR against the payment invariants | `.gitlab-ci.yml` includes, `.gitlab/duo/flows/payment-guard.yaml` |
| release | Release Scribe writes the release candidate brief; tags publish a GitLab Release | `.gitlab/duo/flows/release-scribe.yaml`, `release` job |
| configure | Cloud Run runtime config and Secret Manager secrets set by the deploy job; keyless auth with Workload Identity Federation | `.deploy` job |
| monitor | Smoke tests run a real MCP search and PayPal Sandbox checkout against staging and production, plus a scheduled synthetic check; failures route to Pipeline Medic, which opens incidents | `scripts/smoke.mjs`, `smoke-*` and `synthetic-check` jobs |
| govern | Payment Guard label gate fails blocked MRs; protected `production` environment with a required approval; Duo tool governance; release candidate issue as the approval record | `payment-safety-gate` job, environment settings |

## Proposed one-time setup (not completion evidence)

### GitLab project
1. **Settings › General › GitLab Duo**: turn on GitLab Duo, flow execution and foundational flows.
2. **AI › Flows › New flow**: create one flow per file in `.gitlab/duo/flows/`, pasting the YAML. Enable each in this project.
3. **AI › Triggers**:
   - Payment Guard: Merge request created, Merge request marked ready
   - Pipeline Medic: Pipeline failed
   - Issue Triage: Work item created
   - Release Scribe: Pipeline passed
4. **Settings › Merge requests**: turn on automatic reviews by GitLab Duo, and "Pipelines must succeed".
5. **Settings › CI/CD › Protected environments**: protect `production`, require one approval, allow the pipeline triggerer to approve.
6. **Settings › CI/CD › Variables** (none of these are secrets):
   `GCP_PROJECT_ID`, `GCP_PROJECT_NUMBER`, `GCP_WIF_POOL`, `GCP_WIF_PROVIDER`, `GCP_DEPLOYER_SA`, `GCP_RUNTIME_SA`, `STAGING_URL`, `PRODUCTION_URL`, `DEMO_STORE_ID`.
7. Replace `NAMESPACE` in `issue-triage.yaml` with the group's Duo Developer handle.

### Google Cloud
Artifact Registry repository `shelf`, a runtime service account with `roles/secretmanager.secretAccessor` on the app's secrets, a deployer service account with `roles/run.admin`, `roles/iam.serviceAccountUser` and `roles/artifactregistry.writer`, a Workload Identity pool and OIDC provider trusting `https://gitlab.com` restricted to this project, and Secret Manager secrets `paypal-client-id`, `paypal-client-secret`, `anthropic-api-key`, `kv-rest-api-url`, `kv-rest-api-token`.
