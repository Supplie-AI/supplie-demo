# Annona Engine Canonical Spec

This document is the implementation source of truth for the Annona engine in
the demo and any future productionized backend. Product messaging lives in
[`docs/brand-spec.md`](/home/jack/workspace/supplie-demo/docs/brand-spec.md),
but engine behavior, architecture, contracts, and orchestration rules are
defined here.

## Scope

This spec defines:

- the dedicated Annona backend / container architecture separate from the UI
- the dataset-adaptive capability registry and tool-template binding model
- the algorithmic capability families Annona must support for generic tabular
  datasets
- planner / orchestrator rules for selecting, executing, and evaluating work
- token and latency optimization requirements
- wire-safe, versioned, polymorphic schemas used across the system

This spec does not require a specific implementation language. Contracts must
remain portable to TypeScript, Rust, or Go services.

## Design Principles

- The UI is not the engine. The frontend presents traces and answers, but
  orchestration, planning, analysis, and schema enforcement belong in a
  dedicated Annona backend container.
- Dataset adaptation is a compile step, not repeated prompt rhetoric. Annona
  should profile a dataset once, bind capabilities once, and reuse that compiled
  understanding across prompts.
- Tool-first, LLM-last is the default. Deterministic analysis tools should
  produce the facts; the LLM should primarily handle planning under uncertainty,
  explanation, and final narrative synthesis.
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

2. `Dataset Compiler`
   - profiles data
   - infers semantic roles
   - builds reusable dataset assets
   - binds tool templates to concrete dataset-aware capabilities

3. `Capability Registry`
   - stores reusable tool templates and algorithm families
   - declares input requirements, output schemas, cost classes, and safety rules

4. `Planner / Orchestrator`
   - classifies prompt intent
   - selects candidate capabilities
   - builds and executes a plan
   - decides when LLM reasoning is required versus when deterministic tools are
     sufficient

5. `Execution Runtime`
   - runs bound capabilities
   - captures artifacts, evidence, and telemetry
   - handles retries, timeouts, and fallbacks

6. `Evaluation Layer`
   - validates recommendation quality, support, risk, and completeness before
     answer publication

7. `Answer Composer`
   - converts evidence-backed outputs into the final user-facing answer,
     including `Situation -> Impact -> Action` when the prompt is operational

8. `Trace Store`
   - persists plan versions, invocation history, evidence, evaluations, and
     final answer objects

## Runtime Flow

### Dataset Compilation Flow

1. Dataset uploaded or selected
2. Engine creates a `DatasetManifest`
3. Compiler profiles tables, columns, units, missingness, keys, time axes, and
   categorical distributions
4. Compiler derives a `SemanticModel` mapping raw fields to operational meaning
5. Capability registry binds eligible tool templates to dataset-specific
   `BoundCapability` objects
6. Compiler stores a reusable `CompiledDataset` bundle containing:
   - dataset profile
   - semantic model
   - bound capabilities
   - materialized helper artifacts such as embeddings, derived views, and
     feature summaries
7. Prompt sessions reference the compiled dataset by immutable version

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
5. Planner emits a `Plan` with ordered steps
6. Runtime executes deterministic tools first
7. Planner may call the LLM to refine hypotheses, reconcile ambiguity, or
   compose missing reasoning only when tool outputs alone are insufficient
8. Evaluation layer scores the draft answer and recommendations
9. Answer composer emits the final `AnswerEnvelope`
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

### Binding Model

Binding happens per compiled dataset, not per prompt. A binder turns generic
templates into dataset-specific `BoundCapability` objects by attaching:

- the exact dataset version
- resolved field mappings
- resolved time grains and keys
- generated SQL / dataframe templates
- default thresholds and priors inferred from the dataset
- output artifact destinations

Examples:

- a generic `forecast_univariate_series` template becomes a bound capability for
  `weekly_demand_by_sku`
- a generic `anomaly_residual_scan` template becomes a bound capability over
  `margin_pct` by supplier and week
- a generic `driver_decomposition` template binds to `late_delivery_rate`
  against route, carrier, and warehouse predictors

### Binding Requirements

- Binding must be repeatable for the same dataset version.
- Bound capability IDs must be stable and deterministic.
- Binding must fail closed when semantic roles are missing or ambiguous.
- The engine may expose fewer capabilities for weak datasets rather than
  pretending full coverage.

## Algorithmic Capability Families

Annona must support richer generic dataset families than simple lookup tools.
Each family can contain multiple templates.

### 1. Descriptive Analysis

- summary statistics
- grouped rollups and ranking
- segmentation
- trend extraction
- distribution and concentration analysis
- cohort and mix analysis

### 2. Driver / Diagnostic Analysis

- variance decomposition
- contribution analysis
- change-point explanation
- segment comparison
- correlation screening with caveats
- driver modeling for key outcomes

### 3. Anomaly Detection

- threshold and rules-based exception detection
- robust z-score / MAD anomaly scans
- residual-based anomaly scoring against forecast baselines
- peer-group deviation analysis
- sequence break / process interruption detection

### 4. Forecasting

- univariate baseline forecasts
- hierarchical forecasts where keys and time structure permit
- scenario deltas and confidence bands
- forecast-vs-capacity or forecast-vs-target comparison

### 5. Optimization / Prescriptive Logic

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

### Failure And Fallback Rules

- If a capability family is unavailable for the dataset, the planner must say
  so explicitly and fall back to the strongest supported alternative.
- The planner must not fabricate causal claims from descriptive outputs.
- The planner must not emit prescriptive certainty without support from either
  rules, constraints, or modeled evidence.
- If evaluation fails, the engine should revise, narrow, or downgrade the answer
  before responding.

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

2. `DatasetProfile`
   - row counts, column stats, missingness, key candidates, detected time axes,
     units, value ranges, and quality warnings

3. `SemanticModel`
   - semantic roles, entities, measures, dimensions, grains, join assumptions,
     target candidates, and confidence annotations

4. `Artifact`
   - generated tables, plots, fitted models, notebooks, feature stores, or
     exports

5. `CapabilityTemplate`
   - generic registry declaration

6. `BoundCapability`
   - dataset-specific capability with resolved inputs and execution contract

7. `Plan`
   - prompt, intent classification, ordered `PlanStep` list, budget, and plan
     status

8. `ToolInvocation`
   - step ID, capability ID, parameters, runtime metadata, outputs, and errors

9. `Evidence`
   - evidence claims, supporting metrics, supporting artifacts, provenance, and
     confidence

10. `Recommendation`
   - action candidate, rationale, expected impact, priority, assumptions, and
     guardrails

11. `Evaluation`
   - answer quality checks such as support coverage, hallucination risk, action
     clarity, policy compliance, and confidence

12. `Trace`
   - end-to-end execution record linking datasets, plans, invocations,
     evidence, evaluations, and answer versions

13. `AnswerEnvelope`
   - final user-facing response, structured recommendations, evidence summary,
     answer status, and trace references

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
- `traceId`

If the prompt is descriptive only, the answer may omit prescriptive fields, but
the engine must still preserve trace and evidence objects.

## Acceptance Requirements

The implementation is only aligned with the canonical spec when:

- the UI and engine are treated as separate architectural concerns
- dataset compilation exists as a reusable backend operation
- capabilities are registered as templates and bound per dataset
- the planner chooses among descriptive, diagnostic, anomaly, forecasting,
  optimization, and selective AutoML families as appropriate
- tool-first / LLM-last execution is observable in traces
- schemas are versioned and polymorphic across datasets, capabilities, plans,
  invocations, evidence, recommendations, evaluations, traces, artifacts, and
  answers

## Related Docs

- [`docs/brand-spec.md`](/home/jack/workspace/supplie-demo/docs/brand-spec.md)
- [`docs/demo-acceptance.md`](/home/jack/workspace/supplie-demo/docs/demo-acceptance.md)
- [`docs/capability-matrix.json`](/home/jack/workspace/supplie-demo/docs/capability-matrix.json)
