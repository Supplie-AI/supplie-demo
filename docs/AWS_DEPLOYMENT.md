# AWS EKS Deployment

## Runtime Shape

- One Next.js service: `supplie-demo`
- One shared LangChain backend route: `/api/chat`
- No LiteLLM sidecar
- No file-upload bootstrap step

## Required GitHub Secrets

### Dev workflow

- `AWS_ACCOUNT_ID`
- `AWS_DEPLOY_ROLE_ARN_DEV`
- `EKS_CLUSTER_DEV`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY` (optional)
- `DEMO_PASSWORD_DEV`
- `DEV_DEMO_HOST`
- `DEV_ACM_CERT_ARN`

### Main/prod workflow

- `AWS_ACCOUNT_ID`
- `AWS_DEPLOY_ROLE_ARN`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY` (optional)
- `DEMO_PASSWORD`
- `ACM_CERT_ARN`

## Local Verification

```bash
npm install
npm run lint
npm run typecheck
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

- Anthropic is optional at deploy time. The UI exposes Claude models, but the backend returns a clear configuration error if the key is missing.
- The current slice intentionally does not mount code-execution, search, or file capabilities.
