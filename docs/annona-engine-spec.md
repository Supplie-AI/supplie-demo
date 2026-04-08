# Annona Engine Canonical Spec

This document is the implementation source of truth for the Annona engine in
the demo and any future productionized backend. Product messaging lives in
[`docs/brand-spec.md`](/home/jack/workspace/supplie-demo/docs/brand-spec.md),
but engine behavior, architecture, contracts, orchestration rules, and the base
analytical substrate are defined here.

## Scope

This spec defines:

- the dedicated Annona backend / container architecture separate from the UI
- the read-only operational ingestion and transformation stack for pilot source
  systems such as NetSuite, Focus, and S3
- the Universal Schema Interpreter as the foundational compile step
- the Universal Analytical Toolkit as the default capability-registry substrate
- the dataset-adaptive capability registry and tool-template binding model
- the algorithmic capability families Annona must support for generic tabular
  datasets
- the translation / narration layer that turns tool outputs into operator-ready
  language
- planner / orchestrator rules for selecting, composing, and evaluating work
- the pilot autonomous data-team architecture that operates the engine,
  evolves the scaffold, and owns delivery handoffs per dataset
- the Virtual MES / Shadow Factory pilot model for manufacturing visibility
  over broken ERP / MRP data
- token and latency optimization requirements
- wire-safe, versioned, polymorphic schemas used across the system

This spec does not require a specific implementation language. Contracts must
remain portable to TypeScript, Rust, or Go services.

## Design Principles

- The UI is not the engine. The frontend presents traces and answers, but
  orchestration, planning, analysis, and schema enforcement belong in a
  dedicated Annona backend container.
- Dataset adaptation is a compile step, not repeated prompt rhetoric. Annona
  should interpret a dataset once, bind capabilities once, and reuse that
  compiled understanding across prompts.
- The Universal Schema Interpreter is Layer 1. Every downstream capability
  depends on its stable dataset profile and semantic interpretation.
- The Universal Analytical Toolkit is the default substrate, not the whole
  product. Annona-specific planning, evaluation, recommendation shaping, and
  agent-team iteration sit on top of it.
- Tools are independently invocable and composable. The engine may call one
  tool, several tools, or none of a given family; there is no mandatory fixed
  pipeline.
- Tool-first, LLM-last is the default. Deterministic analysis tools should
  produce the facts; the LLM should primarily handle planning under uncertainty,
  explanation, and final narrative synthesis.
- Operational source access is read-only during the pilot. Annona may extract
  from source systems, but it must not write back statuses, acknowledgements,
  or planning changes into NetSuite, Focus, S3, or any adjacent operational
  system as part of this stack.
- Missing point-of-use truth must downgrade the contract, not break it. When a
  pilot such as Zeder's lacks perfect scan-level confirmation, Annona should
  emit estimated state with explicit caveats rather than pretending exact
  completion telemetry exists.
- Virtual MES / Shadow Factory is a visibility layer, not a hardware-first MES
  replacement. In the pilot, Annona reconstructs management-facing factory
  status from imperfect ERP / MRP records and adjacent shadow signals before it
  tries to act like a system-of-record execution ledger.
- Contracts are explicit and portable. Every cross-service payload must be
  versioned, discriminated, and safe to serialize over HTTP, queues, or storage.
- The system must preserve explainability. Recommendations require evidence,
  evaluations, and traceable execution history.

## System Topology

### Containers

1. `annona-ui`
   - Next.js frontend
   - owns user auth gate, prompt submission, trace display, and answer rendering
   - does not own dataset compilation, capability binding, planning, or analysis

2. `annona-engine`
   - API surface for dataset compilation and answer generation
   - owns capability registry, planner, orchestration, tool execution, evidence
     capture, evaluation, and final answer assembly
   - may run as a single deployable container for the demo, but it is a backend
     boundary distinct from the UI

3. optional worker containers
   - support heavier jobs such as forecasting fits, anomaly sweeps,
     optimization runs, or AutoML experiments
   - invoked asynchronously by the engine when runtime or resource isolation is
     needed

### External Dependencies

- object storage for uploaded datasets and generated artifacts
- read-only source connectivity for operational systems such as NetSuite,
  Focus, and S3-backed file drops
- cache / KV store for compiled dataset assets and hot session state
- relational or document persistence for traces, plans, evaluations, and answer
  metadata
- LLM provider APIs for planning, synthesis, and fallback reasoning
- deterministic compute runtimes such as SQL engines, dataframe runtimes,
  statistical libraries, optimization libraries, and forecasting libraries

### Logical Components Inside `annona-engine`

1. `Dataset Intake API`
   - receives dataset manifests and files
   - normalizes file metadata and storage references

2. `Layer 1: Universal Schema Interpreter`
   - foundational compile step for every dataset version
   - profiles raw tables, columns, units, missingness, keys, and time axes
   - infers semantic roles and operational meaning
   - produces the canonical `DatasetProfile` and `SemanticModel`

3. `Dataset Compiler`
   - orchestrates schema-interpreter outputs
   - builds reusable dataset assets
   - binds substrate tools and Annona-specific templates to concrete
     dataset-aware capabilities

4. `Capability Registry`
   - stores reusable tool templates and algorithm families
   - uses the Universal Analytical Toolkit as the default substrate foundation
   - declares input requirements, output schemas, cost classes, and safety rules

5. `Planner / Orchestrator`
   - classifies prompt intent
   - selects candidate capabilities
   - builds and executes a plan
   - decides when LLM reasoning is required versus when deterministic tools are
     sufficient

6. `Execution Runtime`
   - runs bound capabilities
   - captures artifacts, evidence, and telemetry
   - handles retries, timeouts, and fallbacks

7. `Evaluation Layer`
   - validates recommendation quality, support, risk, and completeness before
     answer publication

8. `Translation / Narration Layer`
   - converts evidence-backed outputs into the final user-facing answer
   - translates structured tool outputs into operator-readable language
   - includes the substrate `narrate` tool plus Annona-specific answer shaping
     such as `Situation -> Impact -> Action`

9. `Trace Store`
   - persists plan versions, invocation history, evidence, evaluations, and
     final answer objects

## Layer Model

The Annona engine should be understood in three layers:

1. `Layer 1: Universal Schema Interpreter`
   - foundational compile step
   - converts arbitrary tabular schemas into stable semantic interpretations

2. `Layer 2: Universal Analytical Toolkit`
   - schema-agnostic analytical substrate
   - provides independently invocable tools that can be composed as needed

3. `Layer 3: Annona Orchestration And Recommendation Layer`
   - applies planning, evidence thresholds, evaluation, recommendation framing,
     and agent-team iteration on top of the substrate

## Runtime Flow

### Dataset Compilation Flow

1. Dataset uploaded or selected
2. Engine creates a `DatasetManifest`
3. Layer 1 Schema Interpreter profiles tables, columns, units, missingness,
   keys, time axes, and categorical distributions
4. Schema Interpreter derives a `SemanticModel` mapping raw fields to
   operational meaning
5. Compiler materializes reusable dataset assets from the interpreted schema
6. Capability registry binds eligible substrate tools and Annona-specific
   templates to dataset-specific `BoundCapability` objects
7. Compiler stores a reusable `CompiledDataset` bundle containing:
   - dataset profile
   - semantic model
   - bound capabilities
   - materialized helper artifacts such as embeddings, derived views, and
     feature summaries
8. Prompt sessions reference the compiled dataset by immutable version

### Prompt Execution Flow

1. UI sends prompt plus target dataset version to `annona-engine`
2. Planner loads the compiled dataset assets from cache or storage
3. Planner classifies the prompt into one or more intent classes:
   - descriptive
   - diagnostic / driver
   - anomaly / exception
   - forecasting / future-state
   - optimization / prescriptive
   - comparative / scenario evaluation
4. Planner selects candidate capabilities based on:
   - prompt intent
   - dataset semantics
   - capability preconditions
   - expected evidence quality
   - runtime budget
   - whether a single tool or a composition of tools is sufficient
5. Planner emits a `Plan` with ordered steps
6. Runtime executes deterministic tools first
7. Planner may call the LLM to refine hypotheses, reconcile ambiguity, or
   compose missing reasoning only when tool outputs alone are insufficient
8. Evaluation layer scores the draft answer and recommendations
9. Translation / narration layer emits the final `AnswerEnvelope`
10. UI renders answer, recommendation, evidence, and trace summary

## Dedicated Backend / Container Architecture

The canonical deployment model is a two-tier application:

- `annona-ui` serves the browser and never directly executes dataset reasoning
  logic
- `annona-engine` exposes backend endpoints such as:
  - `POST /datasets`
  - `POST /datasets/{id}/compile`
  - `GET /datasets/{id}/compiled`
  - `POST /answers`
  - `GET /answers/{id}`
  - `GET /traces/{id}`

The engine must remain deployable independently from the UI so that:

- compute-heavy analysis does not compete with frontend resources
- dataset compilation can be cached and reused across sessions
- future worker pools can scale independently
- future non-web clients can reuse the same contracts
- language migration to Rust or Go does not require a frontend rewrite

For the demo, the backend may run as a single container image with modular
packages. The architectural boundary still applies even if deployed in one
cluster namespace.

## Read-Only Operational Ingestion And Transformation Stack

The canonical pilot stack for operational data refresh is:

- read-only extraction from NetSuite, Focus, and S3-backed file drops
- immutable raw landing into object storage
- DuckDB normalization and snapshot assembly
- dbt transformations over DuckDB
- Prefect orchestration for extraction, transformation, publication, and
  failure handling
- Annona compilation and prompt-time consumption against published dataset
  versions only

This stack is upstream of prompt execution. The engine may use the published
artifacts from a refresh run, but it must not query NetSuite, Focus, or S3
directly during answer generation.

### Scope And Guardrails

- The pilot ingestion layer is read-only end to end.
- Prompt-time answers operate on a published dataset version, not on mutable
  source-system state.
- Every refresh run must produce versioned provenance, including source refs,
  landed objects, transformation outputs, and publish status.
- Landing and transformation failures must fail closed. The engine should keep
  using the last accepted dataset version rather than publishing partial or
  contradictory snapshots.
- Manual triggering is acceptable for the pilot. Scheduled Prefect runs are
  also acceptable. In both cases the output contract stays the same.

### Canonical Runtime Placement

- `annona-ui` never runs extraction, DuckDB, dbt, or Prefect logic.
- `annona-engine` owns dataset compilation and prompt-time reasoning over the
  published dataset bundle.
- Prefect flows and DuckDB/dbt jobs may run in a companion worker container or
  as engine-adjacent jobs, but they remain outside the browser-facing UI
  surface.
- The engine's prompt path is intentionally decoupled from refresh jobs so a
  slow source extract does not block operator questions.

### Canonical Flow

1. `Extract`
   - NetSuite, Focus, and S3 sources are read through read-only credentials,
     exports, or API contracts.
   - Each source extract is stamped with a run ID, source timestamp, and pilot
     environment metadata.

2. `Land`
   - Raw source files are written unchanged into an immutable landing prefix in
     object storage.
   - A `LandingManifest` records file paths, row counts when available, source
     freshness, extraction method, and checksum metadata.

3. `Normalize In DuckDB`
   - DuckDB reads the landed raw objects directly from object storage or a
     mounted cache.
   - Normalization standardizes IDs, timestamps, units, status enums, null
     handling, and source-specific key shapes into consistent source schemas.
   - DuckDB also emits lightweight diagnostics such as freshness gaps, failed
     joins, duplicate keys, and type coercion warnings.

4. `Transform In dbt`
   - dbt runs on top of DuckDB using explicit staging, intermediate, and mart
     layers.
   - `stg_*` models preserve source-grain cleanup, `int_*` models resolve joins
     and dependency edges, and `mart_*` models expose pilot-ready analytical
     tables for compilation.
   - dbt run artifacts such as manifests, run results, tests, and docs are
     preserved as publishable artifacts.

5. `Publish Dataset Version`
   - The refresh flow materializes a versioned DuckDB snapshot or equivalent
     exported tables plus dbt artifacts.
   - Annona creates a `DatasetManifest`, `CompiledDataset`, `DatasetProfile`,
     and `SemanticModel` from the transformed mart surface.
   - Only an accepted publish step makes the new dataset version eligible for
     prompt use.

6. `Consume In Annona`
   - Prompt execution loads the latest approved dataset version or an explicitly
     requested historical version.
   - Planner, bound capabilities, evidence, and answer traces all reference
     the immutable published dataset version rather than mutable source APIs.

### Canonical Artifact Flow

The pilot artifact chain is:

`NetSuite / Focus / S3 -> LandingManifest -> DuckDB normalized source schemas -> dbt staging/intermediate/marts -> DatasetManifest -> CompiledDataset -> Evidence / Trace / AnswerEnvelope`

Minimum artifacts per accepted run:

- `LandingManifest`
- `IngestionRun`
- landed raw source snapshots
- DuckDB normalization snapshot or exported normalized tables
- dbt `manifest.json`, `run_results.json`, and relevant test outputs
- `DatasetManifest`
- `CompiledDataset`
- downstream prompt traces and answer artifacts that reference the published
  dataset version

### Concrete Pilot Scenario: Zeder Shadow Factory Daily Refresh

This issue's concrete pilot dataflow scenario is a daily or manually triggered
`zeder_shadow_factory_refresh` run:

1. Prefect extracts NetSuite sales-order, work-order, purchase-order, and item
   status data using read-only credentials.
2. Prefect pulls Focus schedule, dispatch, and exception exports using a
   read-only contract.
3. Prefect registers S3 drops such as carrier ETA files, installer handoff
   files, or other pilot-approved shadow-signal feeds.
4. All three sources land unchanged in object storage under a run-scoped
   prefix such as `landing/<pilot>/<source>/<run_id>/...`.
5. DuckDB normalizes entity IDs, timestamps, quantity units, and status labels
   across those landed files into source-clean tables such as
   `src_netsuite_orders`, `src_focus_schedule`, and `src_s3_eta_events`.
6. dbt builds staging and intermediate models that reconcile order lines,
   work-order progress, purchase dependencies, and external ETA signals, then
   publishes marts such as:
   - `mart_sales_order_readiness`
   - `mart_supply_blockers`
   - `mart_shadow_factory_status`
   - `mart_management_priority_queue`
7. Annona compiles those marts into the published dataset version consumed by
   the engine's dependency tracing, progress inference, management-status
   mapping, and recommendation layers.
8. When an operator asks which kits are blocked or which units need leadership
   intervention in the next 24 hours, the engine answers from that published
   dataset version and cites the exact refresh run used.

## Virtual MES / Shadow Factory Pilot Model

For Zeder-like pilots, Annona should be understood as a Virtual MES / Shadow
Factory layer sitting over broken ERP / MRP data. It does not claim to replace
a traditional scan-heavy MES during the pilot. It reconstructs enough
directionally correct operational state for management and pilot operators to
see blockers, progress, and verify-now cases earlier than the source systems
can.

### Product Definition

In product terms, Virtual MES / Shadow Factory means:

- management gets one operational status model even when source-system status
  codes are stale, contradictory, or incomplete
- the answer contract favors visibility and intervention timing over false
  exactness
- Annona can say `on_track`, `watch`, `verify_now`, or `blocked` with explicit
  evidence and caveats even when it cannot say `completed` with scan-level
  certainty
- the differentiator is earlier, clearer operational visibility over the same
  imperfect pilot data, not hidden live-system access

### System Definition

In system terms, the Virtual MES / Shadow Factory layer is a compiled view that:

1. normalizes broken ERP / MRP extracts, purchase and work-order data, and
   adjacent shadow signals into a shared semantic model
2. links demand, execution, supply, resource, and exception entities into a
   traceable factory graph
3. infers directional execution state when point-of-use truth is missing
4. maps those inferred states into management-facing status labels with
   calibrated confidence and next-action posture
5. preserves exact-vs-probabilistic traceability all the way to the final
   answer and trace objects

### Core Pilot Entities

The pilot model must support at least these entity classes:

- demand entities
  - `customer`
  - `sales_order`
  - `sales_order_line`
- execution entities
  - `factory`
  - `work_center`
  - `machine`
  - `work_order`
  - `operation_step`
  - `kit` or other install / build unit tracked through the pilot
- supply entities
  - `part`
  - `assembly`
  - `bom_edge`
  - `purchase_order`
  - `purchase_order_line`
  - `inventory_position`
- shadow-signal entities
  - `erp_or_mrp_status_snapshot`
  - `dispatch_or_handoff_event`
  - `carrier_eta_event`
  - `booking_or_schedule_commitment`
  - `quantity_acknowledgement`
  - `exception_reopen_or_rework_event`

Zeder's pilot may begin with `kit` as the primary management entity even when
the deeper execution graph also includes work orders, operations, or purchase
dependencies behind that kit.

### Inferred Execution States

The Virtual MES / Shadow Factory layer must separate granular inferred state
from management-facing status. The pilot should support states equivalent to:

- `queued_not_started`
- `material_constrained`
- `ready_to_build`
- `in_build`
- `built_pending_handoff`
- `in_transit`
- `arrived_at_site_not_confirmed_at_point_of_use`
- `installed_not_confirmed`
- `blocked_on_dependency`
- `exception_or_rework`

These are estimated execution states unless exact point-of-use confirmation is
present. The engine must not silently translate them into confirmed completion.

### Management-Facing Status Model

The pilot must also expose a simpler management status layer derived from the
execution state, blocker graph, wobble signals, and evidence coverage:

| Management status | Meaning | Typical trigger |
| --- | --- | --- |
| `on_track` | Forward motion is visible and no material blocker or wobble is active. | Positive shadow-signal trend, acceptable evidence coverage, no active blocker. |
| `watch` | The unit is directionally advancing but confidence or slack is thinning. | Estimated progress exists, but point-of-use truth is still missing or evidence coverage is thin. |
| `verify_now` | Signals conflict enough that leadership should not commit to the apparent progress without checking. | Wobble, ETA regression, quantity reversals, or conflicting adjacent-system signals. |
| `blocked` | A dependency or execution constraint is preventing the next operational step. | Known component, purchase-order, capacity, or exception blocker on the critical path. |

This management-facing status is the primary answer surface for pilot
leadership. Detailed inferred execution state remains available underneath it.

### Canonical Shadow Factory Status Object

Externally visible status outputs for this pilot should preserve fields
equivalent to:

- `entityType`
- `entityId`
- `virtualMesMode`
- `traceabilityMode`
- `managementStatus`
- `estimatedState`
- `primaryConstraint`
- `statusReason`
- `inferredProgressPct`
- `progressPctLow`
- `progressPctHigh`
- `evidenceCoveragePct`
- `wobbleDetected`
- `supportingSignals`
- `counterSignals`
- `recommendedAction`
- `caveats`

## Pilot Autonomous Data-Team Architecture

For pilot operations, Annona is run by a nine-role autonomous data team layered
on top of the `annona-ui` and `annona-engine` runtime boundary. This operating
model does not replace the engine architecture. It owns dataset onboarding,
semantic interpretation, capability evolution, evaluation, release gating, and
pilot feedback loops around that architecture.

During the pilot, one person or one execution lane may cover multiple logical
roles. The role boundaries still remain explicit so ownership, handoffs, and
acceptance do not blur.

### Role Model

| Role | Pilot responsibility boundary | Primary interfaces | Later-phase split |
| --- | --- | --- | --- |
| `Pilot PM` | Own issue sequencing, acceptance criteria, rollout scope, and release decisions. | GitHub issues, canonical spec docs, pull requests, release checklist. | Split into multi-pilot program management and portfolio planning once several pilots run in parallel. |
| `Domain Researcher` | Translate operator questions, source-system semantics, and risk assumptions into canonical scenarios and dataset expectations. | `docs/demo-acceptance.md`, scenario fixtures, semantic notes, failure-analysis briefs. | Split by industry/domain once pilots span different operational archetypes. |
| `Data Pipeline` | Run read-only extraction, immutable landing, DuckDB normalization, dbt publication, and compile-ready bundle assembly. | `LandingManifest`, `IngestionRun`, `DatasetManifest`, storage refs, dbt artifacts, ingestion diagnostics. | Move to scheduled or event-driven ingestion with automated data-quality gates. |
| `Semantic Modeler` | Curate dataset profile, entity meanings, graph assumptions, and reusable compiled assets. | `DatasetProfile`, `SemanticModel`, `CompiledDataset`, dataset helper artifacts. | Split schema-interpreter tuning from dataset-compiler operations. |
| `Capability Engineer` | Bind and extend deterministic tools, templates, and dataset-aware capability contracts. | `CapabilityTemplate`, `BoundCapability`, tool schemas, capability registry entries. | Specialize by capability family and worker-backed analytical services. |
| `Orchestration Engineer` | Own planner policy, answer scaffolds, evidence thresholds, and confidence posture. | `Plan`, `Recommendation`, `AnswerEnvelope`, policy configs, orchestration traces. | Separate planner policy, answer-quality, and recommendation-policy services. |
| `Evaluation And QA` | Run fixture evals, regression review, trace inspection, visual review, and acceptance gating. | `Evaluation`, `Trace`, review rubrics, QA artifacts, smoke-test evidence. | Expand into continuous eval pipelines and lane-specific certification gates. |
| `Platform Ops` | Own environments, secrets, deployment, observability, rollback, and runtime health. | container images, Kubernetes manifests, logs, alerts, smoke tests. | Split runtime platform engineering from SRE/on-call operations. |
| `Pilot Ops Analyst` | Review live pilot traces with operator context, capture misses, and turn field feedback into next issue candidates. | live answer reviews, failure-analysis notes, operator feedback, issue backlog. | Expand into customer success, enablement, and pilot-performance operations. |

### Handoff Contracts

The nine roles coordinate through explicit Annona contracts rather than
informal prompts:

1. `Pilot PM` scopes the next delivery lane as a GitHub issue tied to the
   canonical spec files.
2. `Domain Researcher` defines the target operator question, success rubric,
   and dataset assumptions.
3. `Data Pipeline` produces a versioned landing and transformation contract.
4. `Semantic Modeler` turns that intake into stable interpreted dataset assets.
5. `Capability Engineer` binds or extends the eligible deterministic tool
   surface for the dataset.
6. `Orchestration Engineer` sets planner and answer-policy behavior on top of
   the bound capabilities.
7. `Evaluation And QA` proves the change against fixtures, traces, and review
   rubrics before release.
8. `Platform Ops` promotes the validated slice into the target environment and
   verifies runtime health.
9. `Pilot Ops Analyst` feeds live misses, operator language gaps, and false
   confidence cases back into the next failure-analysis cycle.

No role may silently bypass the canonical contracts owned by another role. For
example, `Platform Ops` does not redefine answer behavior, `Capability
Engineer` does not ship without evaluation evidence, and `Pilot PM` does not
treat uncommitted local edits as accepted scope.

### Pilot Vs Later-Phase Responsibilities

The pilot implementation must include:

- issue-scoped delivery on a dedicated branch and worktree
- canonical spec updates before or with behavior changes
- explicit dataset manifests and compiled dataset versions
- deterministic tool contracts and bounded planner policy changes
- human-reviewed evaluation, PR, deploy, and smoke-test gates
- live-pilot feedback captured as failure analysis for the next issue

Later phases may add, but the pilot does not require:

- continuous live-system ingestion and autonomous refresh scheduling
- always-on remediation agents that open or merge changes without a scoped
  issue
- tenant-isolated service fleets and specialized worker pools for each
  capability family
- closed-loop policy tuning from production telemetry without explicit review
- fully automated release promotion across environments

## Universal Analytical Toolkit Substrate

The default capability-registry foundation is the Universal Analytical Toolkit.
It is the base substrate the research harness and agent team iterate on top of,
not the entirety of Annona.

The ten default substrate tools are:

1. `profile`
   - schema and statistical profiling over interpreted datasets
2. `correlate`
   - relationship and association discovery with explicit caveats
3. `anomaly`
   - exception and outlier detection
4. `regress`
   - regression-style driver and explanatory modeling
5. `segment`
   - cohorting, clustering, and segmentation
6. `forecast`
   - future-state projection over time-aware data
7. `classify`
   - classification and labeling over eligible targets
8. `simulate`
   - scenario testing and what-if evaluation
9. `optimize`
   - constrained recommendation and objective-seeking logic
10. `narrate`
   - translation of structured analytical outputs into concise human-readable
     explanation

These tools are schema-agnostic in design but become dataset-aware only after
the Layer 1 Schema Interpreter and binder resolve fields, grains, measures, and
constraints.

The registry may add Annona-specific templates on top of this substrate, but it
should default to these ten universal tools before introducing custom
specializations.

### Composability Rule

The ten-tool substrate is not a compulsory end-to-end chain.

- A prompt may invoke only `profile`.
- A diagnostic question may use `profile`, `correlate`, and `regress`.
- A prescriptive question may use `forecast`, `simulate`, `optimize`, and
  `narrate`.
- A simple operator-facing answer may skip most tools and use one deterministic
  capability plus narration.

The planner is responsible for composing the minimum effective tool set for the
prompt and dataset.

## Capability Registry And Dataset-Adaptive Binding

### Registry Model

The registry stores reusable `CapabilityTemplate` definitions rather than
hard-coded one-off tools. Each template declares:

- `capabilityId`
- `family`
- `schemaVersion`
- supported intent classes
- dataset preconditions
- required semantic roles
- parameter schema
- artifact outputs
- evidence outputs
- runtime cost class
- deterministic or model-assisted execution mode
- safety / policy constraints

The registry foundation should include the ten Universal Analytical Toolkit
tools as first-class capability families. Annona-specific tools and templates
should extend this base rather than replace it.

### Binding Model

Binding happens per compiled dataset, not per prompt. A binder turns generic
templates into dataset-specific `BoundCapability` objects by attaching:

- the exact dataset version
- resolved field mappings
- resolved time grains and keys
- generated SQL / dataframe templates
- default thresholds and priors inferred from the dataset
- output artifact destinations

Binding applies both to the Universal Analytical Toolkit substrate and to
Annona-specific tools layered on top of it.

Examples:

- a generic `forecast_univariate_series` template becomes a bound capability for
  `weekly_demand_by_sku`
- a generic `anomaly_residual_scan` template becomes a bound capability over
  `margin_pct` by supplier and week
- a generic `driver_decomposition` template binds to `late_delivery_rate`
  against route, carrier, and warehouse predictors
- a generic `dependency_graph_trace` template becomes a bound capability over a
  manufacturing graph that links sales orders, work orders, BOM levels,
  purchase orders, machines, and factories

### Binding Requirements

- Binding must be repeatable for the same dataset version.
- Bound capability IDs must be stable and deterministic.
- Binding must fail closed when semantic roles are missing or ambiguous.
- The engine may expose fewer capabilities for weak datasets rather than
  pretending full coverage.

## Graph-Backed Manufacturing Dependency Reasoning

For manufacturing-style datasets, the compiler should materialize a
`DependencyGraphModel` from the tabular schema so Annona can reason over
multi-level production and supply dependencies without re-deriving the path on
every prompt.

### Domain Model

The canonical manufacturing graph model should be able to represent at least:

- parts and assemblies
- BOM parent-child edges and BOM levels
- sales orders and sales-order lines
- work orders and parent-child work-order chains
- purchase orders and purchase-order lines
- customers
- machines or workcenters
- factories or sites

### Graph Edge Expectations

The compiled dependency graph should capture edges such as:

- sales order to sales-order line
- sales-order line to root work order
- work order to child work order
- work order to required BOM component or subassembly
- component to purchase-order line
- purchase-order line to purchase order
- work order to machine
- work order to factory
- sales order to customer

The precise internal representation may vary, but the engine must preserve a
stable path model that deterministic tools can traverse and explain.

### Required Graph Capabilities

Manufacturing datasets with the needed semantics should expose deterministic
capabilities for:

- multi-hop dependency tracing from a root sales order, work order, or part to
  the blocking upstream dependency
- impact propagation from a blocked purchase order or shared component into
  affected work orders and sales orders
- path narration that makes the hop sequence explicit enough for an operator to
  act without reconstructing the graph manually

### Required Output Shape

Externally visible deep-trace outputs should include fields equivalent to:

- `rootEntityType`
- `rootEntityId`
- `criticalPath`
- `pathHops`
- `blockerPartId`
- `blockerPurchaseOrderId`
- `impactedSalesOrders`
- `impactedWorkOrders`
- machine and factory context for the blocked branch when available

## Algorithmic Capability Families

Annona must support richer generic dataset families than simple lookup tools.
Each family can contain multiple templates. The default substrate is the
ten-tool Universal Analytical Toolkit, and the families below describe how that
substrate maps into Annona behavior for generic datasets.

### 1. Descriptive Analysis

- `profile`
- summary statistics
- grouped rollups and ranking
- segmentation
- trend extraction
- distribution and concentration analysis
- cohort and mix analysis

### 2. Driver / Diagnostic Analysis

- `correlate`
- `regress`
- variance decomposition
- contribution analysis
- change-point explanation
- segment comparison
- correlation screening with caveats
- driver modeling for key outcomes

### 3. Anomaly Detection

- `anomaly`
- threshold and rules-based exception detection
- robust z-score / MAD anomaly scans
- residual-based anomaly scoring against forecast baselines
- peer-group deviation analysis
- sequence break / process interruption detection

### 4. Forecasting

- `forecast`
- univariate baseline forecasts
- hierarchical forecasts where keys and time structure permit
- scenario deltas and confidence bands
- forecast-vs-capacity or forecast-vs-target comparison

### 5. Optimization / Prescriptive Logic

- `simulate`
- `optimize`
- rule-based action selection
- constrained prioritization
- inventory / reorder or exception ranking
- route / supplier / resource allocation heuristics
- mathematical optimization where objective functions and constraints are
  available

### 6. Selective AutoML

AutoML is optional and selective, not default. It is appropriate only when:

- the dataset has enough rows and signal for a predictive task
- the target variable is explicit
- the runtime budget allows model search
- the output improves a real decision, not a vanity benchmark

When used, AutoML must produce explainability artifacts such as feature
importance, validation metrics, and confidence limitations.

### 7. Translation / Narration

- `narrate`
- answer translation from structured evidence to human-readable explanation
- recommendation wording with explicit assumptions and confidence
- operator-facing synthesis without inventing unsupported facts

## Planner / Orchestrator Logic

### Planning Policy

The planner must prefer this order:

1. reuse compiled dataset assets
2. use deterministic bound capabilities
3. use lightweight retrieval over semantic models and prior traces
4. use the LLM for plan refinement, ambiguity resolution, or final synthesis
5. use open-ended code generation only as a last resort

### Plan Construction Rules

- Build minimal plans that answer the prompt with sufficient evidence.
- Prefer one high-signal capability over many redundant tool calls.
- Require at least one evidence-bearing step before any recommendation.
- Prefer independently invocable substrate tools over monolithic fixed
  workflows.
- When a prompt explicitly asks for blocker or traceability reasoning across
  BOM levels, work orders, or purchase orders, prefer compiled dependency-graph
  path queries over ad hoc first-level joins.
- When a prompt asks for factory visibility over broken ERP / MRP data, prefer
  the Virtual MES / Shadow Factory path: infer directional state, map it into a
  management status, and keep exact-vs-probabilistic truth explicit.
- Escalate from descriptive to predictive or prescriptive only when the prompt
  or data justifies it.
- Attach explicit assumptions when the prompt requires unavailable fields or
  uncertain mappings.
- Distinguish dataset-derived evidence from web-derived context.

### Execution Modes

- `deterministic_only`
  - for direct descriptive or ranking questions
- `deterministic_plus_synthesis`
  - for most operator-facing answers
- `model_assisted_planning`
  - when prompt ambiguity or task decomposition requires the model
- `async_heavy_compute`
  - for forecasting sweeps, optimization, or AutoML workloads

The planner may invoke substrate tools in any order required by the prompt. It
must not force a fixed `profile -> correlate -> anomaly -> regress -> ... ->
narrate` sequence when the prompt only needs a subset.

### Failure And Fallback Rules

- If a capability family is unavailable for the dataset, the planner must say
  so explicitly and fall back to the strongest supported alternative.
- The planner must not fabricate causal claims from descriptive outputs.
- The planner must not emit prescriptive certainty without support from either
  rules, constraints, or modeled evidence.
- If evaluation fails, the engine should revise, narrow, or downgrade the answer
  before responding.

### Missing Point-Of-Use Data, Inferred Progress, And Wobble Detection

Some deployments, including Zeder's pilot, cannot rely on perfect point-of-use
or scan-level truth. The engine must support an explicit estimated-state path
for these cases rather than collapsing to either false precision or no answer.

#### Inferred Progress / Shadow Progress Model

When point-of-use truth is missing, the engine may infer progress from shadow
signals such as:

- dispatch and handoff events
- carrier ETA movement
- installer or crew bookings
- quantity acknowledgements
- exception, reopen, or rework events
- inventory decrements or reservations adjacent to the point of use

The inferred-progress model must:

- mark the trace as `probabilistic`, not exact
- distinguish observed facts from inferred state
- emit an `estimatedState` label rather than a confirmed completion label
- emit a `managementStatus` label for leadership-facing visibility
- emit a bounded progress range such as `progressPctLow`, `inferredProgressPct`,
  and `progressPctHigh`
- emit `evidenceCoveragePct` or an equivalent measure of shadow-signal coverage
- attach counter-signals, missing-data warnings, and operator caveats

#### Wobble Detection

The engine should detect wobble when inferred progress becomes directionally
unstable. Wobble is not a confirmed reversal at point of use. It is a heuristic
warning that competing signals make the inferred state unreliable.

Wobble detection should trigger when signals show patterns such as:

- ETA regression after forward movement
- quantity or booking reversals
- long stalls after earlier forward progress
- conflicting evidence from adjacent systems
- reopen or exception events inconsistent with the current estimated state

When wobble is detected, the engine must:

- lower confidence below the equivalent exact-state answer
- label the answer as unstable or verify-now rather than completed
- surface the competing signals directly in evidence
- recommend manual confirmation before operational commitment

#### Probabilistic Traceability Output Contract

When point-of-use truth is missing, externally visible trace and answer objects
must preserve the distinction between exact and estimated state. The canonical
probabilistic-traceability output should include fields equivalent to:

- `traceabilityMode`
- `pointOfUseDataStatus`
- `managementStatus`
- `estimatedState`
- `progressPctLow`
- `inferredProgressPct`
- `progressPctHigh`
- `evidenceCoveragePct`
- `wobbleDetected`
- `wobbleScore`
- `supportingSignals`
- `counterSignals`
- `caveats`

The engine must never translate these outputs into exact state language unless
confirmed point-of-use evidence arrives later.

## Token And Latency Optimization

Token use is a first-class architectural concern.

### Required Strategy

- Compile once per dataset version.
- Cache the `DatasetProfile`, `SemanticModel`, and `BoundCapability` set.
- Reuse generated helper prompts and field descriptions instead of re-sending
  raw schemas on every request.
- Prefer tool invocation outputs, structured metrics, and artifact references
  over repeated LLM narration.
- Use tool-first / LLM-last execution.
- Summarize long artifacts into structured evidence objects before passing them
  to the model.

### Cacheable Assets

- dataset profile
- semantic model
- bound capabilities
- feature summaries
- canonical metric definitions
- prior plan skeletons for repeated prompt classes
- reusable answer composition snippets for stable response shapes

### Anti-Patterns

- re-profiling the same dataset on every prompt
- injecting raw CSVs into the model context when structured tools can read them
- using the LLM to rediscover field semantics that already exist in the
  compiled dataset
- forcing the full ten-tool substrate to run for every question
- running AutoML or custom code for simple descriptive prompts

## Wire-Safe Versioned Schemas

All system objects must be:

- versioned with `schemaVersion`
- discriminated with `kind` or equivalent union tags
- serializable without language-specific class metadata
- forward-compatible via additive fields where possible
- reference-safe via stable IDs rather than in-memory pointers

### Required Schema Families

1. `DatasetManifest`
   - dataset identity, source files, owner, timestamps, storage references

2. `LandingManifest`
   - immutable raw landed objects, source provenance, extraction method,
     checksums, and freshness metadata

3. `IngestionRun`
   - source-system read summary, landing status, diagnostics, orchestration
     metadata, and publish eligibility

4. `TransformationRun`
   - DuckDB normalization outputs, dbt manifest refs, dbt test results, and
     transformation status

5. `CompiledDataset`
   - published analytical bundle linking transformed marts, semantic assets,
     capability bindings, and immutable version metadata

6. `DatasetProfile`
   - row counts, column stats, missingness, key candidates, detected time axes,
     units, value ranges, and quality warnings

7. `SemanticModel`
   - semantic roles, entities, measures, dimensions, grains, join assumptions,
     target candidates, and confidence annotations

8. `Artifact`
   - generated tables, plots, fitted models, notebooks, feature stores, or
     exports

9. `CapabilityTemplate`
   - generic registry declaration

10. `BoundCapability`
   - dataset-specific capability with resolved inputs and execution contract

11. `Plan`
   - prompt, intent classification, ordered `PlanStep` list, budget, and plan
     status

12. `ToolInvocation`
   - step ID, capability ID, parameters, runtime metadata, outputs, and errors

13. `Evidence`
   - evidence claims, supporting metrics, supporting artifacts, provenance, and
     confidence
   - for estimated states, also preserves `traceabilityMode`, supporting
     signals, counter-signals, and missing-data caveats

14. `Recommendation`
   - action candidate, rationale, expected impact, priority, assumptions, and
     guardrails

15. `Evaluation`
   - answer quality checks such as support coverage, hallucination risk, action
     clarity, policy compliance, confidence, and calibration between exact and
     estimated states

16. `Trace`
   - end-to-end execution record linking datasets, plans, invocations,
     evidence, evaluations, and answer versions

17. `AnswerEnvelope`
   - final user-facing response, structured recommendations, evidence summary,
     traceability mode, estimated-state caveats when applicable, answer status,
     and trace references

18. `DependencyGraphModel`
   - compiled graph nodes, edges, path semantics, and blocker-impact traversal
     rules for datasets that support multi-level dependency reasoning

19. `ShadowFactoryStatus`
   - pilot-facing Virtual MES status object linking entity identity, estimated
     execution state, management status, blocker or wobble posture, signal
     coverage, and recommended next action

### Canonical Envelope Pattern

Every externally visible object should follow a shape equivalent to:

```json
{
  "kind": "BoundCapability",
  "schemaVersion": "annona.v1",
  "id": "cap_bound_weekly_demand_forecast",
  "createdAt": "2026-04-05T07:00:00Z",
  "payload": {}
}
```

### Polymorphism Rules

- Polymorphic unions must discriminate on explicit wire fields such as `kind`
  and `subtype`.
- Never rely on language runtime class names for deserialization.
- Consumers must tolerate unknown future `kind` values.
- IDs must be globally unique within their schema family.

## Recommendation Contract

When Annona emits an operational answer, the final `AnswerEnvelope` should
contain:

- `situation`
- `impact`
- `recommendedActions`
- `evidenceSummary`
- `assumptions`
- `confidence`
- `traceabilityMode`
- `managementStatus`
- `estimatedState`
- `caveats`
- `traceId`

If the prompt is descriptive only, the answer may omit prescriptive fields, but
the engine must still preserve trace and evidence objects.

## Research Harness And Pilot Data-Team Loop

The Universal Analytical Toolkit is the substrate the research harness and agent
team iterate on top of for each dataset family.

Within the pilot operating model:

- `Domain Researcher` and `Pilot Ops Analyst` primarily supply failure analysis
- `Pilot PM` turns accepted gaps into scoped issue lanes
- `Data Pipeline`, `Semantic Modeler`, `Capability Engineer`, and
  `Orchestration Engineer` modify the scaffold and tooling
- `Evaluation And QA` runs the acceptance loop
- `Platform Ops` owns deployment and post-change runtime verification

The expected loop is:

1. failure analysis
2. plan changes
3. modify scaffold and/or tooling
4. run evaluations
5. compare results
6. keep or revert

This loop may adjust:

- schema-interpreter heuristics
- substrate-tool prompts, parameters, or guards
- capability-binding logic
- planner policies
- evaluation thresholds
- Annona-specific recommendation scaffolds

The loop must remain dataset-aware. Changes are evaluated against the current
dataset class and comparable benchmark datasets before being kept.

## Acceptance Requirements

The implementation is only aligned with the canonical spec when:

- the UI and engine are treated as separate architectural concerns
- the Universal Schema Interpreter exists as Layer 1 and a reusable backend
  compile step
- the ten-tool Universal Analytical Toolkit is the default substrate of the
  capability registry
- translation / narration is explicitly modeled as a layer rather than an
  implicit side effect
- capabilities are registered as templates and bound per dataset
- the planner chooses among descriptive, diagnostic, anomaly, forecasting,
  optimization, narration, and selective AutoML families as appropriate
- tool-first / LLM-last execution is observable in traces
- tools remain independently invocable and composable rather than forced into a
  mandatory pipeline
- graph-backed dependency tracing and impact propagation are available for
  manufacturing datasets with BOM, work-order, and purchase-order semantics
- the Virtual MES / Shadow Factory pilot model is explicit about core entities,
  inferred execution state, and management-facing status over broken ERP / MRP
  data
- the pilot autonomous data-team roles, interfaces, and pilot-vs-later
  boundaries are explicitly documented
- the agent-team eval loop iterates on top of the substrate per dataset
- schemas are versioned and polymorphic across datasets, capabilities, plans,
  invocations, evidence, recommendations, evaluations, traces, artifacts, and
  answers

## Related Docs

- [`docs/brand-spec.md`](/home/jack/workspace/supplie-demo/docs/brand-spec.md)
- [`docs/demo-acceptance.md`](/home/jack/workspace/supplie-demo/docs/demo-acceptance.md)
- [`docs/capability-matrix.json`](/home/jack/workspace/supplie-demo/docs/capability-matrix.json)
