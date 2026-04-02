# Supplie Demo

This repo is a Next.js demo frontend with two side-by-side demo agents.

## Current Slice

- The UI keeps the two-panel side-by-side demo layout.
- The left panel is an **ungrounded / raw** agent.
- The right panel is a **grounded Supplie** agent backed by built-in demo tools.
- Streaming text is supported on both sides.
- The grounded side uses a static bundled Supplie demo snapshot, not live production data.
- When an OpenAI model is selected, the raw panel can use native OpenAI web search, a sandboxed code interpreter, and bundled file workflows over a small static demo file set.
- The raw panel still does **not** have grounded Supplie tools or live ERP / warehouse access.
- The grounded panel still does **not** have browsing, code execution, or OpenAI file workflows.

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
