# AWS EKS Deployment

## Runtime Shape

- One Next.js service: `supplie-demo`
- One shared LangChain backend route: `/api/chat`
- No LiteLLM sidecar
- No file-upload bootstrap step

## Required GitHub Secrets

### Dev workflow

- `AWS_ACCOUNT_ID`
- `AWS_ACCESS_KEY_ID_DEV`
- `AWS_SECRET_ACCESS_KEY_DEV`
- `EKS_CLUSTER_DEV`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY` (optional)
- `DEMO_PASSWORD_DEV`
- `DEV_DEMO_HOST`
- `DEV_ACM_CERT_ARN`

### Main/prod workflow

- `AWS_ACCOUNT_ID`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_DEPLOY_ROLE_ARN` (optional; if set, the workflow prefers OIDC over static keys)
- `EKS_CLUSTER_PROD`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY` (optional)
- `DEMO_PASSWORD`
- `ACM_CERT_ARN`

## Local Verification

```bash
npm install
npm run lint
npm run typecheck
npm test
DEMO_PASSWORD=test OPENAI_API_KEY=test npm run build
```

## Kubernetes Inputs

The manifests are templated by CI with:

- `SUPPLIE_NAMESPACE`
- `SUPPLIE_IMAGE`
- `SUPPLIE_HOST`
- `ACM_CERT_ARN`

Only these application secrets are injected:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `DEMO_PASSWORD`

## Notes

- The production workflow validates its AWS credential inputs before deploy. It uses `AWS_DEPLOY_ROLE_ARN` when present, otherwise falls back to `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.
- The production workflow also requires `EKS_CLUSTER_PROD` and uses it for `aws eks update-kubeconfig` instead of guessing a hardcoded cluster name. The repo’s documented production region remains `us-east-1`.
- Anthropic is optional at deploy time. The UI exposes Claude models, but the backend returns a clear configuration error if the key is missing.
- OpenAI-backed dev/prod deploys emit structured JSON logs with request IDs, trace IDs, capability snapshots, tool activity, and model-run summaries. See [`docs/LOGGING.md`](/home/jack/workspace/supplie-demo-issue5/docs/LOGGING.md).
- On successful deploys, the workflows print recent app logs with `kubectl logs deployment/supplie-demo -n <namespace> --tail=80`.
- On deploy failures, the workflows run `scripts/collect-k8s-diagnostics.sh` to capture rollout state, pod descriptions, current and previous pod logs, services, ingress, and recent events.
