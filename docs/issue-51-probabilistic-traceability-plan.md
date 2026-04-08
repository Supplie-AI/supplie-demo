# Issue 51 Implementation Plan

Date: 2026-04-08

Issue: `#51`

## Goal

Add a canonical estimated-state contract for Zeder's pilot where point-of-use
truth is missing. The repo should define inferred-progress and wobble-detection
heuristics, define probabilistic traceability outputs and caveats, and align
the confidence/evidence UX to estimated states.

## Delivered Slice In This PR

- Canonical spec updates in [`docs/annona-engine-spec.md`](/home/jack/worktrees/supplie-demo-issue-51/docs/annona-engine-spec.md),
  [`docs/demo-acceptance.md`](/home/jack/worktrees/supplie-demo-issue-51/docs/demo-acceptance.md),
  [`docs/site-prd-demo-plan.md`](/home/jack/worktrees/supplie-demo-issue-51/docs/site-prd-demo-plan.md),
  and [`docs/capability-matrix.json`](/home/jack/worktrees/supplie-demo-issue-51/docs/capability-matrix.json)
  that introduce probabilistic traceability, inferred progress, wobble
  detection, and estimated-state disclosure rules.
- Concrete example heuristic eval scenarios in
  [`tests/fixtures/demo-scenarios.js`](/home/jack/worktrees/supplie-demo-issue-51/tests/fixtures/demo-scenarios.js)
  for missing point-of-use inferred progress and wobble detection.
- Deterministic demo-tool contracts in
  [`lib/server/annona-grounded-tools.ts`](/home/jack/worktrees/supplie-demo-issue-51/lib/server/annona-grounded-tools.ts)
  for `annona_estimate_shadow_progress` and
  `annona_detect_shadow_wobble`.
- Confidence/evidence UX alignment in
  [`lib/answer-insights.ts`](/home/jack/worktrees/supplie-demo-issue-51/lib/answer-insights.ts),
  [`components/AnswerEvidencePanel.tsx`](/home/jack/worktrees/supplie-demo-issue-51/components/AnswerEvidencePanel.tsx),
  and [`components/ToolCallCard.tsx`](/home/jack/worktrees/supplie-demo-issue-51/components/ToolCallCard.tsx)
  so estimated states are visibly marked and confidence is downgraded when the
  trace is probabilistic or wobbling.

## Follow-On Work

1. Add a live prompt-pack lane if the product wants estimated-state prompts in
   the protected UI rather than only in fixture evals.
2. Bind the heuristic tools to real Zeder pilot telemetry once the point-of-use
   shadow-signal schema is stable.
3. Extend visual-review capture to include an estimated-state grounded answer
   screenshot after the fixture-based UX contract is proven.

## Validation

- `npm test`
- `npm run lint`
- `npm run typecheck`
