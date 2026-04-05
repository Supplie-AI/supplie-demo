# Annona Demo

This repo is a Next.js demo frontend with two side-by-side demo agents.

The canonical implementation spec for Annona behavior lives in
[`docs/annona-engine-spec.md`](/home/jack/workspace/supplie-demo/docs/annona-engine-spec.md).
Brand framing lives in
[`docs/brand-spec.md`](/home/jack/workspace/supplie-demo/docs/brand-spec.md).
Acceptance criteria live in
[`docs/demo-acceptance.md`](/home/jack/workspace/supplie-demo/docs/demo-acceptance.md).

## Current Slice

- The UI keeps the two-panel side-by-side demo layout.
- The left panel is an **ungrounded / raw** agent.
- The right panel is a **grounded Annona** agent backed by Annona tools.
- The Annona engine is a dedicated backend/container architecture separate from
  the UI, even when the demo is deployed within one environment.
- Streaming text is supported on both sides.
- The grounded side uses a static bundled Annona demo snapshot, not live production data.
- When an OpenAI model is selected, both panels share the same native OpenAI web search, sandboxed code interpreter, and bundled file workflows over the same static reference file set.
- The raw panel still does **not** have Annona-specific grounded tools, calculators, datasets, or grounded analysis.
- The grounded panel is a strict superset of the raw panel and adds
  dataset-adaptive capability binding, planning, evidence capture, evaluation,
  and grounded model-backed analysis.

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

## Delivery Workflow

- OpenClaw critiques the current state, opens or updates GitHub issues, and sequences the next issue to work.
- Codex executes one GitHub issue at a time on a dedicated `issue-N-*` branch/worktree.
- Non-trivial changes are expected to ship through the full GitHub loop: local validation, commit, push, PR, review, deploy, and smoke-test.
- Work is only done when the deployed result still matches the canonical specs and acceptance docs.

## AWS EKS Deployment

- Dev CI/CD: [`.github/workflows/dev.yml`](/home/jack/workspace/supplie-demo/.github/workflows/dev.yml)
- Main/prod EKS deploy: [`.github/workflows/deploy-eks.yml`](/home/jack/workspace/supplie-demo/.github/workflows/deploy-eks.yml)
- Kubernetes manifests: [`k8s/`](/home/jack/workspace/supplie-demo/k8s)
- Notes: [`docs/AWS_DEPLOYMENT.md`](/home/jack/workspace/supplie-demo/docs/AWS_DEPLOYMENT.md)
