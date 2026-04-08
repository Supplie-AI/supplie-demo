# Issue 48 Implementation Plan

Date: 2026-04-09

Issue: `#48`

## Goal

Specify the pilot-grade read-only ingestion and transformation stack for
NetSuite, Focus, and S3 so the canonical Annona architecture defines how raw
operational extracts land, normalize, transform, publish, and feed the engine.

## Delivered Slice In This PR

- Canonical architecture updates in
  [`docs/annona-engine-spec.md`](/home/jack/worktrees/supplie-demo-issue-48/docs/annona-engine-spec.md)
  that define the read-only source guardrails, the DuckDB + dbt + Prefect
  stack, the artifact flow, and a concrete Zeder shadow-factory refresh
  scenario.
- Machine-readable alignment in
  [`docs/capability-matrix.json`](/home/jack/worktrees/supplie-demo-issue-48/docs/capability-matrix.json)
  so the capability/architecture contract includes the same ingestion stack,
  schema families, artifacts, and pilot dataflow.
- Acceptance updates in
  [`docs/demo-acceptance.md`](/home/jack/worktrees/supplie-demo-issue-48/docs/demo-acceptance.md)
  so the demo contract explicitly distinguishes published read-only dataset
  snapshots from live prompt-time ERP access and requires a concrete pilot
  ingestion scenario.

## Implementation Plan

1. Define read-only source contracts for NetSuite, Focus, and S3, including
   run IDs, freshness metadata, and immutable landing rules.
2. Stand up a pilot DuckDB normalization layer that standardizes IDs,
   timestamps, enums, and join keys across landed extracts.
3. Build dbt staging, intermediate, and mart models for the first shadow
   factory / management-status dataset version.
4. Orchestrate extract, land, normalize, test, and publish steps with Prefect,
   including fail-closed publish rules.
5. Feed the published marts into Annona dataset compilation so planner traces
   and answers reference immutable dataset versions.

## Follow-On Work

1. Add concrete connector code and runtime packaging for the NetSuite, Focus,
   and S3 extract steps once credentials, endpoint details, and environment
   boundaries are approved.
2. Define dbt tests and freshness SLAs per mart before enabling scheduled
   production refreshes.
3. Add runbook and observability details for Prefect flow failures, stale
   landed data, and rejected publish attempts.

## Validation

- `node -e "JSON.parse(require('fs').readFileSync('docs/capability-matrix.json', 'utf8'))"`
- `git diff --check`
