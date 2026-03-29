# Supplie Demo

This repo is a Next.js demo frontend with two LangChain-backed demo agents.

## Current Slice

- The UI keeps the two-panel side-by-side demo layout.
- The left panel is an **ungrounded / raw** LangChain agent.
- The right panel is a **grounded Supplie** agent backed by built-in demo tools.
- Streaming text is supported on both sides.
- The grounded side uses a static bundled Supplie demo snapshot, not live production data.
- Native web search, code sandbox, live ERP access, and file access are **not wired yet**.

Both agents are instructed to say when required data or capabilities are missing instead of pretending they exist.

## Local Development

```bash
npm install
export DEMO_PASSWORD=local-demo-password
export OPENAI_API_KEY=sk-...
# optional
export ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Open `http://localhost:3000`.

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## AWS EKS Deployment

- Dev CI/CD: [`.github/workflows/dev.yml`](/home/jack/workspace/supplie-demo/.github/workflows/dev.yml)
- Main/prod EKS deploy: [`.github/workflows/deploy-eks.yml`](/home/jack/workspace/supplie-demo/.github/workflows/deploy-eks.yml)
- Kubernetes manifests: [`k8s/`](/home/jack/workspace/supplie-demo/k8s)
- Notes: [`docs/AWS_DEPLOYMENT.md`](/home/jack/workspace/supplie-demo/docs/AWS_DEPLOYMENT.md)
