# Annona Demo Site PRD / Visual Review Rubric

This document is the CI visual-review rubric for the current Annona demo slice.
It consolidates the accepted product intent from issues `#7`, `#11`, and `#12`
into a deterministic checklist that GPT-5.4 can evaluate against screenshots.

## Product Intent

- The demo must present a trustworthy side-by-side comparison between two agents.
- The left panel is the ungrounded / raw agent and must stay ungrounded relative to Annona data.
- The right panel is the grounded Annona agent and must show Annona snapshot
  tooling behavior.
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
- A `Live Comparison` explainer is visible.
- Two equal-width panels are visible side by side on desktop.
- The left panel title is `Ungrounded / Raw Agent`.
- The right panel title is `Grounded Annona Agent`.
- Amber styling is used for the raw side and teal styling is used for the
  grounded side.
- Empty states are readable and visually balanced.

### 3. Post-Prompt Response

- The same user prompt appears in both panels.
- The left panel response is visibly framed as ungrounded relative to Annona data.
- The right panel response is visibly framed as grounded Annona output.
- The grounded panel includes tool evidence for the Annona snapshot lookup.
- The grounded result references the snapshot finding for `Suspension King`.

## Visual Acceptance Criteria

- `password_gate_integrity`: the gate looks intentional, centered, and protects
  the demo content.
- `comparison_layout`: the desktop layout clearly communicates a left-vs-right
  comparison without clipped, overlapping, or collapsed regions.
- `truthful_disclosure`: labels, explainer copy, and panel notes do not
  overclaim live ERP, Annona grounding, arbitrary filesystem access, or other
  missing capabilities.
- `grounded_evidence_visibility`: the grounded panel makes its tool-backed
  evidence visually distinct from the raw panel.
- `readability_and_polish`: text is readable, contrast is acceptable, spacing is
  coherent, and the screen does not look broken or unfinished.

## Automatic Failure Conditions

- A required state is missing or visually broken.
- Either panel is missing, mislabeled, or no longer clearly side by side on the
  desktop capture.
- The password gate exposes protected content before authentication.
- The grounded panel does not visually distinguish grounded evidence from the
  raw panel.
- Text is clipped, overlapping, or unreadable in any captured state.
- The screenshots show obvious loading failure, blank output, or severe visual
  regression.
