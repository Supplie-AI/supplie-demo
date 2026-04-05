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

## Workflow Ownership

- OpenClaw critiques the current repo, product, and live state against the canonical specs
- OpenClaw creates or updates GitHub issues and sequences the next issue to execute
- Codex executes one GitHub issue at a time and keeps the branch scope tied to that issue

## Branching / Codex Rules

- One meaningful issue = one branch = one worktree
- Use a dedicated `issue-N-*` branch and matching worktree for each active GitHub issue
- Overlapping UI/copy/capability branches should be stacked or sequenced, not merged blindly in parallel
- Before running Codex, verify the repo path, remote, branch, and worktree
- Non-trivial changes require a commit and PR; do not treat uncommitted local edits as done
- If a Codex run stalls or targets the wrong path, stop it and relaunch cleanly

## Standard Delivery Flywheel

- OpenClaw critiques current state, creates GitHub issues, and sequences the work
- Codex picks the next issue, creates the dedicated branch/worktree, and implements only that scoped change
- Run the strongest relevant local validation before committing
- For non-trivial changes, commit, push the branch, and open a PR linked to the issue
- Review, deploy, and smoke-test are part of the default loop, not optional follow-up work
- Close the issue only after the deployed result matches the intended spec

## Validation Ladder

A change is not done at local green. Use this ladder:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. build / deployment-equivalent smoke where relevant
5. Playwright functional E2E
6. GPT visual review
7. PR review
8. deploy
9. post-deploy smoke-test
10. live QA

Only treat work as done when the live environment matches the intended spec.

## Current Product Truth

See `docs/capability-matrix.json` and `docs/demo-acceptance.md` for the current baseline.
