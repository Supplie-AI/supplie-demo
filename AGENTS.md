# Annona Demo — Delivery & Spec Rules

## Goal

This repository ships the Annona two-agent demo. The target experience is:

- **Left / raw agent**: the same shared CSV / tabular baseline and the same native provider tool surface, interpreted generically
- **Right / grounded agent**: the same shared baseline, but with Annona's dataset-adaptive orchestration, planning, and answer evaluation

## Canonical Spec Files

Treat these files as the source of truth for product behavior:

- `docs/brand-spec.md`
- `docs/demo-acceptance.md`
- `docs/capability-matrix.json`
- `tests/fixtures/demo-scenarios.js`

Closely coupled authority files should stay aligned when relevant:

- `data/openai-native/capability-baseline-notes.md`
- `docs/site-prd-demo-plan.md`

Issue bodies should point to these files. They should not silently replace them.

## Spec Drift Rules

If a PR changes any of the following, update the relevant canonical spec in the same change:

- user-facing copy or branding
- capability disclosures
- expected demo outputs
- agent/tool behavior
- visual-review expectations

If implementation changes but spec files do not, treat the work as incomplete.

## Branching / Codex Rules

- One meaningful issue = one branch = one worktree
- Overlapping UI/copy/capability branches should be stacked or sequenced, not merged blindly in parallel
- Before running Codex, verify the repo path, remote, branch, and worktree
- If a Codex run stalls or targets the wrong path, stop it and relaunch cleanly

## Validation Ladder

A change is not done at local green. Use this ladder:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. build / deployment-equivalent smoke where relevant
5. Playwright functional E2E
6. GPT visual review
7. deploy
8. live QA

Only treat work as done when the live environment matches the intended spec.

## Current Product Truth

See `docs/capability-matrix.json` and `docs/demo-acceptance.md` for the current baseline.
