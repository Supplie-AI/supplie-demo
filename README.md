# Supplie Demo

This repo is a Next.js demo frontend with a single LangChain-backed backend agent.

## Current Slice

- The UI keeps the two-panel side-by-side demo layout.
- Both panels mirror the same shared backend session.
- The backend is an **ungrounded** LangChain agent.
- Streaming text is supported.
- Native web search, code sandbox, and file access are **not wired yet**.

The agent is instructed to say when required data or capabilities are missing instead of pretending they exist.

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
