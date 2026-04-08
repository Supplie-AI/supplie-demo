# Issue 46 Live QA

Date: 2026-04-08

- Source deploy: dev workflow run `24116746388` on `main` succeeded on 2026-04-08 and produced the live dev environment used for this QA pass.
- Live URL: `http://a2b494ddd44594284b4d169bec49d2b9-1825691264.us-east-1.elb.amazonaws.com`
- Deployed dev smoke: reran `node scripts/smoke-dev-deploy.mjs` against the live URL; config, password auth, and grounded chat all passed, including `annona_query_order_margin_snapshot`.

## Refreshed Proof

- Tracked visual-review inputs were refreshed in `artifacts/visual-review-inputs/`.
- Live QA capture was refreshed in `artifacts/live-qa-2026-04-08-refresh/`, with the run summary in `artifacts/live-qa-2026-04-08-refresh/manifest.json`.

## What The Refreshed Screenshots Verified

- Harder prompts are live together in the protected demo UI: blocker plus traceability, predictive service risk, and prioritization plus next action.
- Multi-table bundle support is visible in the grounded answers and tool traces. The refreshed live capture shows the grounded panel combining shared file search with Annona snapshot tools across supplier leakage, order margin, freight-risk, and stockout contexts instead of relying on a single flat table.
- Confidence and evidence UX is live with the harder prompts. In the refreshed live manifest, the grounded panel rendered a confidence chip and three supporting evidence cards for all three prompts, with `High` confidence on blocker plus predictive and `Medium` confidence on prioritization. The raw panel did not render evidence cards in the same way.

## Remaining Blocker

- Production deploy on `main` is still blocked by missing production-only GitHub secrets and AWS credentials, including `AWS_DEPLOY_ROLE_ARN` and likely other prod-only values. That did not block issue #46 dev QA, so it was left untouched here.
