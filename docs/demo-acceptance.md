# Demo Acceptance

Canonical prompt and answer expectations live in
[`tests/fixtures/demo-scenarios.js`](/home/jack/workspace/supplie-demo/tests/fixtures/demo-scenarios.js).
Any change to the demo prompt set, expected answers, or answer-review behavior
must update that fixture in the same branch.

## Core Flow

The demo is accepted only when the live dev deployment can show this end-to-end:

1. Password gate loads
2. Demo unlocks
3. Both panels render
4. A known prompt can be submitted
5. Left/raw panel responds honestly from the shared baseline
6. Right/grounded panel responds with the expected grounded Annona result
7. No runtime/module error is shown

## Prompt Coverage

Every demo prompt in the canonical fixture must have:

- an authoritative raw expectation
- an authoritative grounded expectation
- the correct answer path called out explicitly, such as shared bundle,
  shared native web/code, or Annona grounded snapshot
- answer-review coverage in the Playwright and visual-review flows

For prompts answerable from shared bundled files, the raw panel is judged against
the shared-bundle answer path even if the prose is less polished than the
grounded panel. For Annona-grounded scenarios, the grounded panel is judged
against the Annona-specific expected answer path.

## Done Criteria

A feature touching the demo is only truly done when:

- PR is green
- deploy completes
- live QA passes against the intended flow
