# GitLab automation: Suede Shelf's post-code lifecycle

Suede Shelf ships through GitLab with Duo Agent Platform flows doing the work between "code written" and "running in production". Autonomy level: **Supervised**. Agents plan, review, repair and summarize on their own; a human approves the production deployment.

| Stage | What runs | Where |
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

## One-time setup

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
   `GCP_PROJECT_ID`, `GCP_PROJECT_NUMBER`, `GCP_WIF_POOL`, `GCP_WIF_PROVIDER`, `GCP_DEPLOYER_SA`, `STAGING_URL`, `PRODUCTION_URL`, `DEMO_STORE_ID`.
7. Replace `NAMESPACE` in `issue-triage.yaml` with the group's Duo Developer handle.

### Google Cloud
Artifact Registry repository `shelf`, a deployer service account with `roles/run.admin`, `roles/iam.serviceAccountUser` and `roles/artifactregistry.writer`, a Workload Identity pool and OIDC provider trusting `https://gitlab.com` restricted to this project, and Secret Manager secrets `paypal-client-id`, `paypal-client-secret`, `anthropic-api-key`, `kv-rest-api-url`, `kv-rest-api-token`.
