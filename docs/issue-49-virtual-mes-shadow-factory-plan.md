# Issue 49 Implementation Plan

Date: 2026-04-09

Issue: `#49`

## Goal

Define Annona's Virtual MES / Shadow Factory pilot model for Zeder-like
manufacturing visibility so the product can express management-facing factory
status over broken ERP / MRP data without pretending to have hardware-heavy MES
truth.

## Delivered Slice In This PR

- Canonical spec updates in
  [`docs/annona-engine-spec.md`](/home/jack/worktrees/supplie-demo-issue-49/docs/annona-engine-spec.md),
  [`docs/capability-matrix.json`](/home/jack/worktrees/supplie-demo-issue-49/docs/capability-matrix.json),
  [`docs/demo-acceptance.md`](/home/jack/worktrees/supplie-demo-issue-49/docs/demo-acceptance.md),
  and
  [`docs/site-prd-demo-plan.md`](/home/jack/worktrees/supplie-demo-issue-49/docs/site-prd-demo-plan.md)
  defining the Virtual MES / Shadow Factory concept, core entities, inferred
  execution states, and management-facing status model.
- Demo and eval alignment in
  [`tests/fixtures/demo-scenarios.js`](/home/jack/worktrees/supplie-demo-issue-49/tests/fixtures/demo-scenarios.js)
  so the live prompt pack and probabilistic traceability fixtures exercise the
  Shadow Factory status contract instead of the older generic predictive lane.
- Grounded prompt-routing and tool-steering updates in
  [`lib/server/openai-native-grounded-agent.ts`](/home/jack/worktrees/supplie-demo-issue-49/lib/server/openai-native-grounded-agent.ts)
  and
  [`lib/server/openai-native-grounded-agent.test.ts`](/home/jack/worktrees/supplie-demo-issue-49/lib/server/openai-native-grounded-agent.test.ts)
  so the Annona panel recognizes and steers Virtual MES / Shadow Factory prompts
  into the intended tool path.
- Shadow-status contract updates in
  [`lib/server/annona-grounded-tools.ts`](/home/jack/worktrees/supplie-demo-issue-49/lib/server/annona-grounded-tools.ts)
  and
  [`lib/server/annona-grounded-tools.test.ts`](/home/jack/worktrees/supplie-demo-issue-49/lib/server/annona-grounded-tools.test.ts)
  so estimated-state outputs also carry management-facing Shadow Factory status
  fields and next-action posture.

## Follow-On Work

1. Replace the static Zeder pilot fixtures with compiler-generated Shadow
   Factory state from real ERP / MRP exports once the source schema stabilizes.
2. Add UI status chips or status cards if the product wants the management
   status layer exposed more directly than narrative text plus tool evidence.
3. Extend the management-status mapping from kit-level pilot entities to line,
   work-center, and factory rollups when the pilot needs broader operational
   visibility.

## Validation

- `npm test -- lib/server/annona-grounded-tools.test.ts`
- `npm test -- lib/server/openai-native-grounded-agent.test.ts`
- `npm run lint`
- `npm run typecheck`
