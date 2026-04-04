# Demo Acceptance

## Core Flow

The demo is accepted only when the live dev deployment can show this end-to-end:

1. Password gate loads
2. Demo unlocks
3. Both panels render
4. A known prompt can be submitted
5. Left/raw panel responds honestly from the shared baseline
6. Right/grounded panel responds with the expected grounded Annona result
7. No runtime/module error is shown

## Known Reference Scenario

Prompt:

> What's the net margin on last week's Suspension King orders after freight and rebates?

Expected grounded result:

- Right panel returns the grounded snapshot answer
- Expected margin result includes **$7,990**

Expected left/raw behavior:

- Must not pretend to have grounded operational access it does not have
- Should answer from the shared bundled baseline when the prompt is solvable from those bundled files
- For the Suspension King margin scenario, should attempt the calculation from the bundled order snapshot/reference files

## Done Criteria

A feature touching the demo is only truly done when:

- PR is green
- deploy completes
- live QA passes against the intended flow
