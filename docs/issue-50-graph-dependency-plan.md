# Issue 50 Implementation Plan

Date: 2026-04-08

Issue: `#50`

## Goal

Add graph-backed multi-level dependency reasoning for manufacturing-style
traceability so the demo can follow blockers across sales orders, work orders,
purchase orders, BOM levels, and shared components instead of stopping at a
first join.

## Delivered Slice In This PR

- Canonical fixture expansion in
  [`data/openai-native/demo_manufacturing_dependency_bundle_manifest.json`](/home/jack/worktrees/supplie-demo-issue-50/data/openai-native/demo_manufacturing_dependency_bundle_manifest.json)
  plus the companion CSV and reference files for customers, factories,
  machines, parts, sales orders, BOM edges, work orders, and purchase orders.
- Generic bundle-loader support for the second canonical dataset in
  [`lib/server/demo-dataset-bundle.ts`](/home/jack/worktrees/supplie-demo-issue-50/lib/server/demo-dataset-bundle.ts).
- Deterministic dependency-graph compilation and traversal in
  [`lib/server/demo-dependency-graph.ts`](/home/jack/worktrees/supplie-demo-issue-50/lib/server/demo-dependency-graph.ts)
  covering multi-hop blocker tracing and downstream impact propagation.
- Annona tool-surface updates in
  [`lib/server/annona-grounded-tools.ts`](/home/jack/worktrees/supplie-demo-issue-50/lib/server/annona-grounded-tools.ts)
  for `annona_trace_graph_dependencies` and
  `annona_propagate_dependency_impact`.
- Prompt-pack and eval alignment in
  [`tests/fixtures/demo-scenarios.js`](/home/jack/worktrees/supplie-demo-issue-50/tests/fixtures/demo-scenarios.js)
  and
  [`lib/server/openai-native-grounded-agent.ts`](/home/jack/worktrees/supplie-demo-issue-50/lib/server/openai-native-grounded-agent.ts)
  for a deep traceability blocker scenario anchored on `SO-240501-01`.
- Canonical spec updates in
  [`docs/annona-engine-spec.md`](/home/jack/worktrees/supplie-demo-issue-50/docs/annona-engine-spec.md),
  [`docs/demo-acceptance.md`](/home/jack/worktrees/supplie-demo-issue-50/docs/demo-acceptance.md),
  [`docs/site-prd-demo-plan.md`](/home/jack/worktrees/supplie-demo-issue-50/docs/site-prd-demo-plan.md),
  and
  [`docs/capability-matrix.json`](/home/jack/worktrees/supplie-demo-issue-50/docs/capability-matrix.json)
  so the graph/domain model and acceptance contract match the implementation.

## Follow-On Work

1. Replace the static manufacturing fixture with a compiler-generated graph from
   real ERP exports once the source schema stabilizes.
2. Add graph-path visualization in the UI if the product wants to expose the
   dependency hops more directly than text plus tool cards.
3. Extend impact propagation beyond sales orders and work orders to inventory
   reservations, transfer orders, and field-install commitments if those become
   part of the canonical demo scope.

## Validation

- `npm test -- lib/server/annona-grounded-tools.test.ts`
- `npm test -- lib/server/openai-native-grounded-agent.test.ts`
- `npm test -- lib/server/openai-native-bundle.test.ts`
- `npm run typecheck`
