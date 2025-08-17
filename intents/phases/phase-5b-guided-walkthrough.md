# Phase 5b: Guided Walkthrough, Needs vs. Value Chains, and Change Vectors

## Goal
Make map creation clearer and more strategic by: (1) guiding users through capturing user needs separately from value-chain components; (2) visualizing change over time via arrows; (3) upgrading the canvas to show full axes and staged evolution.

## Inspiration
- Wardley value-chain mapping overview: https://www.bmc.com/blogs/wardley-value-chain-mapping/

## Scope & Outcomes
- Guided creator distinguishes “User Needs” (top of value chain) from “Components” (supporting elements).
- Canvas shows full axes: Y = Value Chain (Invisible → Visible), X = Evolution (Genesis | Custom | Product | Commodity) with light dashed vertical separators.
- Change vectors: optional evolution/visibility deltas render as arrows on nodes.
- Persist needs/components, links, and change vectors; editable post-creation.

## Iterations
1) Axes + Staging
- Render labeled Y axis; X axis with Genesis/Custom/Product/Commodity labels and dashed stage dividers.
- Minor refactor of render utilities to support stages and gridlines.

2) Guided Creator (Wizard)
- Steps: Describe users → Capture user needs → Add components → Link dependencies → Review & Save.
- Inline hints + examples; allow back/next; save partial state client-side until submit.

3) Data Modeling + API
- DB: components.kind (enum: need|component); components.delta_evolution, components.delta_visibility (optional floats); components.changed_at (timestamp, optional).
- API: accept kind and deltas on create/update; validate ranges [0..1].

4) Change Vectors + Editing
- UI toggle “Show change vectors”; draw arrows from (e,v) to (e+Δe, v+Δv).
- Editor supports setting deltas, clearing deltas, and updating kind.

## Non‑Goals (Now)
- Sub-maps (drill-down) — planned later iteration.
- Streaming assistant during wizard — future enhancement.

## Acceptance Criteria
- Users can complete a guided flow and create a map with distinct needs and components.
- Canvas shows axes labels and X-stage dashed dividers.
- Nodes optionally display change arrows when deltas are present.
- Model and API persist kind + deltas; editor can modify them.
