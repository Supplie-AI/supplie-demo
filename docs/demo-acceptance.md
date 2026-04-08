# Demo Acceptance

The canonical implementation spec for Annona engine behavior lives in
[`docs/annona-engine-spec.md`](/home/jack/workspace/supplie-demo/docs/annona-engine-spec.md).
Canonical prompt and answer expectations live in
[`tests/fixtures/demo-scenarios.js`](/home/jack/workspace/supplie-demo/tests/fixtures/demo-scenarios.js).
Any change to the demo prompt set, answer behavior, review rubric, or engine
execution contract must update the relevant canonical docs in the same branch.

## Acceptance Goal

The demo is accepted only when it presents a truthful side-by-side comparison:

- both panels receive the same baseline of CSV / tabular data, web search, and
  code execution
- the left panel shows what a generic model does with that baseline
- the right panel shows how Annona turns the same baseline into a clearer,
  earlier, more operational recommendation

The differentiator is not hidden data access. The differentiator is Annona's
dataset-adaptive orchestration running on the dedicated backend engine.

## Core Flow

The demo must show this end-to-end:

1. Password gate loads
2. Demo unlocks
3. Both panels render
4. A tabular dataset baseline is available to both panels
5. A canonical prompt can be submitted to both panels
6. The raw panel responds honestly from the shared baseline
7. The Annona panel responds from the same baseline, but through the Annona
   engine execution flow
8. The response shows no runtime or module failure

In the current test harness, the shared dataset baseline may be represented by a
canonical bundled fixture rather than a live upload UI. That does not change the
spec: the baseline is shared tabular data.

## Annona Flow Requirement

The grounded Annona panel is accepted only if the spec, prompts, and review
rubric all align on this flow:

1. Dataset intake and profiling
2. Semantic understanding of the tabular inputs
3. Capability-template binding and stable analysis primitive selection
4. Orchestration and answer planning
5. Tool execution with evidence capture
6. Answer evaluation before final response

The final answer should read like a high-trust operational recommendation, not a
tool dump or dashboard summary.

## Canonical Scenario Structure

Every canonical scenario in the fixture must declare:

- the user prompt
- whether the prompt is answerable from the shared tabular bundle alone
- prompt class, including analytical, predictive, or prescriptive framing
- data prerequisites
- expected raw behavior
- expected Annona behavior
- correctness rubric
- authoritative raw and grounded expectations for automated review

For heuristic scenarios where point-of-use truth is missing, the fixture must
also declare:

- whether the grounded answer is exact or probabilistic traceability
- the expected Virtual MES / Shadow Factory management status
- the expected inferred-progress or wobble signal path
- the expected confidence and caveat posture for estimated state

For manufacturing dependency scenarios where deep traceability is required, the
fixture must also declare:

- the root entity and blocker entity being traced
- the expected multi-hop path across BOM levels, work orders, and purchase
  orders
- the expected impact propagation to other work orders or sales orders when a
  shared component or purchase order slips

The accepted prompt pack must include all of the following:

- one blocker plus traceability prompt, including a multi-level manufacturing
  dependency case when the canonical fixture requires it
- one Virtual MES / Shadow Factory management-status prompt over broken ERP /
  MRP visibility
- one prioritization plus next-action prompt grounded in the same Shadow
  Factory status model

In addition to the live prompt pack, the repo must carry example heuristic eval
scenarios covering:

- inferred progress when point-of-use confirmation is missing
- wobble detection when estimated progress becomes unstable
- deep dependency traceability across sales orders, work orders, purchase
  orders, and BOM levels
- management-status mapping from inferred shadow state into `on_track`,
  `watch`, `verify_now`, or `blocked`

The prompt set is not accepted if it collapses into simple descriptive or
retrospective lookups.

## Review Expectations

For every canonical scenario:

- the raw panel may calculate, inspect files, search the web, or use code, but
  it should read as a generic model working directly from the shared baseline
- the Annona panel should compile or reuse compiled dataset context, use bound
  capabilities and stable analysis primitives, and return a recommendation with
  context
- for Zeder-like factory prompts, the grounded panel should translate broken
  ERP / MRP and shadow signals into a clear Virtual MES / Shadow Factory
  management status rather than leaving the user with raw heuristic fragments
- both panels must stay explainable and honest about what came from the dataset
  versus the web
- if the grounded answer is estimated rather than observed, the UI and fixture
  expectations must say so directly and show the missing point-of-use caveat
- automated review must check the expected answer path, key facts, tool
  evidence, recommendation quality, and correct confidence downgrades for
  estimated states

## Done Criteria

A demo change is done only when:

- the canonical spec files are updated together where relevant
- local validation passes at the strongest relevant level
- non-trivial work is committed on a dedicated issue branch and linked to a PR
- the branch is pushed and reviewed
- deploy and post-deploy smoke-test, when relevant, match the intended spec
- live QA, when run, matches the intended spec
