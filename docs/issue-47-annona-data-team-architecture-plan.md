# Issue 47 Implementation Plan

Date: 2026-04-08

Issue: `#47`

## Goal

Specify the Annona autonomous data-team architecture needed to run the pilot
stack so the canonical spec defines role boundaries, handoff contracts,
pilot-versus-later responsibilities, and delivery workflow alignment on top of
the existing engine/container model.

## Delivered Slice In This PR

- Canonical architecture updates in
  [`docs/annona-engine-spec.md`](/home/jack/worktrees/supplie-demo-issue-47/docs/annona-engine-spec.md)
  that define the nine-role pilot autonomous data team, its interfaces to
  `annona-engine`, the explicit handoff loop, and the pilot-versus-later phase
  boundary.
- Machine-readable alignment in
  [`docs/capability-matrix.json`](/home/jack/worktrees/supplie-demo-issue-47/docs/capability-matrix.json)
  so the capability/architecture contract includes the same pilot operations
  model and delivery workflow rules.
- No implementation/runtime behavior changes in this slice. The source of truth
  change is intentionally spec-first so future pilot-lane issues can attach
  concrete tooling, eval, or platform work to the documented role boundaries.

## Follow-On Work

1. Break the nine-role pilot model into concrete follow-on implementation lanes
   for ingestion automation, eval automation, planner policy operations, and
   platform runbooks where the current pilot still relies on manual gates.
2. Add explicit SLAs, alert ownership, and incident/runbook contracts if the
   pilot graduates from bounded demo support into ongoing production operations.
3. Split currently combined pilot roles into separate services or teams only
   after the operating model proves stable across more than one pilot dataset or
   customer environment.

## Validation

- `node -e "JSON.parse(require('fs').readFileSync('docs/capability-matrix.json', 'utf8'))"`
- `git diff --check`
