# Annona Demo Site PRD / Visual Review Rubric

This document is the CI visual-review rubric for the current Annona demo slice.
It consolidates the accepted product intent from issues `#7`, `#11`, and `#12`
and issue `#17` into a deterministic checklist that GPT-5.4 can evaluate
against screenshots.

## Product Intent

- The demo must present a trustworthy side-by-side comparison between two agents.
- The left panel is the ungrounded / raw agent and must behave like a generic
  model working directly from the shared baseline.
- The right panel is the grounded Annona agent and must show the same shared
  baseline transformed by Annona's dataset-adaptive orchestration flow.
- The UI must disclose capabilities and limitations truthfully instead of
  implying unavailable features.
- A password gate must block the demo until the user authenticates.

## Required Review States

### 1. Locked Entry

- The password gate fills the viewport.
- The Annona wordmark and `Grounding Demo` subtitle are visible.
- A centered password input and primary `Enter` button are visible.
- The protected comparison UI is not visible behind the gate.

### 2. Authenticated Comparison

- The top bar shows `Annona`, `Grounding Demo`, the model picker, and the
  clear button.
- Prompt chips are visible beneath the top bar.
- A `Live Comparison` explainer is visible and makes the comparison logic clear.
- Two equal-width panels are visible side by side on desktop.
- The left panel title is `Ungrounded / Raw Agent`.
- The right panel title is `Grounded Annona Agent`.
- Amber styling is used for the raw side and teal styling is used for the
  grounded side.
- Empty states are readable and visually balanced.

### 3. Post-Prompt Response

- The same user prompt appears in both panels.
- The left panel response is visibly framed as a generic read of the shared
  baseline.
- The right panel response is visibly framed as Annona output over the same
  baseline.
- The grounded panel includes tool evidence for dataset profiling, analysis, or
  answer evaluation rather than reading like a plain lookup.
- When the grounded panel is showing an estimated state rather than confirmed
  point-of-use truth, the confidence/evidence UI explicitly marks it as
  estimated or wobbling instead of presenting it like an exact observation.
- When the prompt is prescriptive, the grounded result resolves to a clear
  recommendation with context.

## Visual Acceptance Criteria

- `password_gate_integrity`: the gate looks intentional, centered, and protects
  the demo content.
- `comparison_layout`: the desktop layout clearly communicates a left-vs-right
  comparison without clipped, overlapping, or collapsed regions.
- `truthful_disclosure`: labels, explainer copy, and panel notes do not
  overclaim live ERP access, hidden data access, arbitrary filesystem access, or
  other missing capabilities.
- `grounded_evidence_visibility`: the grounded panel makes its tool-backed
  orchestration evidence visually distinct from the raw panel.
- `estimated_state_disclosure`: estimated-state answers are visibly labeled as
  estimated or wobbling, and the caveat about missing point-of-use confirmation
  is readable in the grounded panel.
- `operational_recommendation_shape`: Annona answers read as operational
  recommendations with context, not dashboard sprawl.
- `readability_and_polish`: text is readable, contrast is acceptable, spacing is
  coherent, and the screen does not look broken or unfinished.

## Automatic Failure Conditions

- A required state is missing or visually broken.
- Either panel is missing, mislabeled, or no longer clearly side by side on the
  desktop capture.
- The password gate exposes protected content before authentication.
- The grounded panel does not visually distinguish Annona orchestration evidence
  from the raw panel.
- An estimated-state answer is rendered as if it were exact observed truth, or
  the caveat about missing point-of-use confirmation is absent.
- The prompt set shown in the UI omits any of the required harder prompt
  classes: blocker plus traceability, predictive risk, or prioritization plus
  next action.
- The blocker-plus-traceability lane no longer demonstrates a multi-level path
  across BOM, work orders, and purchase orders when the canonical dependency
  fixture is present.
- Text is clipped, overlapping, or unreadable in any captured state.
- The screenshots show obvious loading failure, blank output, or severe visual
  regression.
