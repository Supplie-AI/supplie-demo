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
- prompt class, including direct, predictive, or prescriptive framing
- data prerequisites
- expected raw behavior
- expected Annona behavior
- correctness rubric
- authoritative raw and grounded expectations for automated review

At least two canonical prompts must be future-state, predictive, or
prescriptive. The prompt set is not accepted if it collapses into simple data
lookups.

## Review Expectations

For every canonical scenario:

- the raw panel may calculate, inspect files, search the web, or use code, but
  it should read as a generic model working directly from the shared baseline
- the Annona panel should compile or reuse compiled dataset context, use bound
  capabilities and stable analysis primitives, and return a recommendation with
  context
- both panels must stay explainable and honest about what came from the dataset
  versus the web
- automated review must check the expected answer path, key facts, tool
  evidence, and recommendation quality

## Done Criteria

A demo change is done only when:

- the canonical spec files are updated together where relevant
- local validation passes at the strongest relevant level
- the branch is pushed and reviewed
- deploy and live QA, when run, match the intended spec
