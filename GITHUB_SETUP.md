# GitHub Workflow Notes

The repo now targets AWS EKS workflows instead of Vercel.

## Active Workflows

- [`.github/workflows/dev.yml`](/home/jack/workspace/supplie-demo/.github/workflows/dev.yml)
  - Runs lint, typecheck, and build.
  - Deploys `dev` branch to the EKS dev namespace.
- [`.github/workflows/deploy-eks.yml`](/home/jack/workspace/supplie-demo/.github/workflows/deploy-eks.yml)
  - Builds and deploys `main` to the production EKS namespace.

## Secrets To Maintain

- `AWS_ACCOUNT_ID`
- `AWS_ACCESS_KEY_ID_DEV`
- `AWS_SECRET_ACCESS_KEY_DEV`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_DEPLOY_ROLE_ARN` (optional; enables prod OIDC instead of static prod keys)
- `EKS_CLUSTER_DEV`
- `EKS_CLUSTER_PROD`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `DEMO_PASSWORD_DEV`
- `DEMO_PASSWORD`
- `DEV_DEMO_HOST`
- `DEV_ACM_CERT_ARN`
- `ACM_CERT_ARN`
