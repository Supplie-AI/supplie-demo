# AWS EKS Deployment Guide

## Overview

The Supplie demo runs on AWS EKS with:
- **supplie-demo**: Next.js app (3 replicas)
- **litellm**: LiteLLM proxy for AI model routing (2 replicas)
- **ALB Ingress**: AWS Load Balancer → demo.supplie.ai

## Architecture

```
Internet → ALB (HTTPS) → supplie-demo pods (3) → LiteLLM (2) → OpenAI/Anthropic
```

The Next.js app calls its own API routes, which call LiteLLM at `http://litellm:4000` (internal K8s DNS).

## Prerequisites

- AWS CLI configured with admin credentials
- Terraform >= 1.5
- kubectl
- Docker
- `gh` CLI (for secrets)

## First-Time Setup

### 1. Bootstrap Terraform state bucket

```bash
aws s3 mb s3://supplie-terraform-state --region us-east-1
aws s3api put-bucket-versioning \
  --bucket supplie-terraform-state \
  --versioning-configuration Status=Enabled
```

### 2. Provision Infrastructure

```bash
cd infra
terraform init
terraform plan
terraform apply
```

This creates:
- VPC with public/private subnets across 2 AZs
- EKS cluster v1.31 with 2x t3.medium nodes
- ECR repos: `supplie-demo`, `supplie-litellm`
- IAM role for GitHub Actions (OIDC)

Note the outputs:
```
ecr_supplie_demo_url = "123456789.dkr.ecr.us-east-1.amazonaws.com/supplie-demo"
ecr_litellm_url      = "123456789.dkr.ecr.us-east-1.amazonaws.com/supplie-litellm"
github_actions_role_arn = "arn:aws:iam::123456789:role/supplie-demo-github-actions-deploy"
```

### 3. Install AWS Load Balancer Controller

```bash
# Update kubeconfig
aws eks update-kubeconfig --name supplie-demo --region us-east-1

# Install ALB controller via Helm
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=supplie-demo \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=<lb_controller_irsa_arn>
```

### 4. Set GitHub Secrets

In the `Supplie-AI/supplie-demo` repository settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `AWS_ACCOUNT_ID` | Your AWS account ID |
| `AWS_DEPLOY_ROLE_ARN` | From Terraform output `github_actions_role_arn` |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key (optional) |
| `DEMO_PASSWORD` | `supplie2026` |
| `LITELLM_MASTER_KEY` | Any strong random key |
| `ACM_CERT_ARN` | ACM certificate ARN for demo.supplie.ai |
| `OPENAI_CSV_FILE_ID` | (optional) pre-uploaded file ID |
| `ANTHROPIC_CSV_FILE_ID` | (optional) pre-uploaded file ID |

### 5. Request ACM Certificate

```bash
aws acm request-certificate \
  --domain-name demo.supplie.ai \
  --validation-method DNS \
  --region us-east-1
```

Validate via DNS (add CNAME to your DNS provider), then paste the ARN into `ACM_CERT_ARN` secret.

### 6. Deploy

Push to `main` — the CI/CD pipeline runs automatically:

```
git push origin main
```

Or trigger manually from GitHub Actions → "Deploy to EKS" → Run workflow.

### 7. Point DNS

After first deploy, get the ALB hostname:
```bash
kubectl get ingress supplie-demo -n supplie
```

Add a CNAME record:
```
demo.supplie.ai → <alb-hostname>.us-east-1.elb.amazonaws.com
```

## Local Development

```bash
npm install
cp k8s/secrets.yaml.example .env.local
# edit .env.local with real values
npm run dev
```

## Manual K8s Operations

```bash
# Check pod status
kubectl get pods -n supplie

# View logs
kubectl logs -n supplie -l app=supplie-demo -f
kubectl logs -n supplie -l app=litellm -f

# Scale
kubectl scale deployment supplie-demo -n supplie --replicas=5

# Restart
kubectl rollout restart deployment/supplie-demo -n supplie
kubectl rollout restart deployment/litellm -n supplie

# Create/update secrets manually
kubectl create secret generic supplie-secrets \
  --namespace=supplie \
  --from-literal=OPENAI_API_KEY="sk-..." \
  --from-literal=DEMO_PASSWORD="supplie2026" \
  --from-literal=LITELLM_MASTER_KEY="sk-master-..." \
  --save-config --dry-run=client -o yaml | kubectl apply -f -
```

## Cost Estimate (us-east-1, monthly)

| Resource | Cost |
|----------|------|
| EKS control plane | ~$73 |
| 2x t3.medium nodes | ~$60 |
| NAT Gateway | ~$32 |
| ALB | ~$20 |
| ECR storage | ~$1 |
| **Total** | **~$186/mo** |

To reduce costs for a demo: scale nodes to 0 when not in use, or switch to 1x t3.small.

## Troubleshooting

**Pods crash on startup:**
```bash
kubectl describe pod -n supplie -l app=supplie-demo
kubectl logs -n supplie -l app=supplie-demo --previous
```

**ALB not provisioning:**
- Ensure AWS Load Balancer Controller is running: `kubectl get pods -n kube-system | grep aws-load`
- Check ingress events: `kubectl describe ingress supplie-demo -n supplie`

**Auth errors (401):**
- Verify `DEMO_PASSWORD` secret matches what users type
- Check middleware.ts — token must equal DEMO_PASSWORD exactly

**LiteLLM proxy errors:**
- Check `litellm-config.yaml` model names match what the app sends
- Verify OPENAI_API_KEY is set in supplie-secrets

## Code Changes Summary

The migration from Vercel Lambda replaced `@ai-sdk/react`'s `useChat` hook with a custom `hooks/useStreamingChat.ts` that:
1. Uses native `fetch` with streaming
2. Parses Vercel AI SDK data stream format (`0:` text delta, `8:` metadata, `3:` errors, `d:` done)
3. Falls back to standard SSE `data:` format
4. Handles 401 auth errors and 429 rate limits
5. Supports cancellation via AbortController

This eliminates the dependency on `@ai-sdk/react` which had incompatibilities in the Lambda environment.
