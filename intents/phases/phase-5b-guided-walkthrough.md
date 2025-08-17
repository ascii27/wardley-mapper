# Phase 5b: Guided Walkthrough — Users, Needs, Value Chains, and Change

## Goal
Provide a guided, AI‑assisted flow to build Wardley Maps by first capturing Users and their Needs, then enumerating Capabilities that satisfy those Needs (value chain), and finally placing Capabilities on a Wardley Map with clear axes and staged evolution. Add change vectors to visualize movement over time. Preserve manual editing and AI co‑pilot after creation.

## References
- Step 1 and Step 2 templates (Learn Wardley Mapping):
  - Users/Needs/Capabilities capture: https://learnwardleymapping.com/wp-content/uploads/2021/02/step-1.png
  - Value chain connections (User → Need → Capabilities): https://learnwardleymapping.com/wp-content/uploads/2021/02/step-2.png
- Evolution placement guide: https://learnwardleymapping.com/wp-content/uploads/2021/01/evolution.jpg
- Overview: https://www.bmc.com/blogs/wardley-value-chain-mapping/

## User Experience (Wizard)
1) Define Users & Needs
- Prompt: “Who are the primary users? What explicit needs do they have?”
- UI: left panel for Users; middle for Needs; right for quick notes. AI suggests needs from a short natural‑language problem statement; user confirms/edits.

2) Enumerate Capabilities (Value Chain)
- For each Need, list Capabilities required to satisfy it. AI proposes capabilities and initial dependency links (Need → Capability). Users can add/edit.
- Show a “Value Chain” preview that connects User → Need → Capabilities as in Step 2.

3) Place on Map (Evolution & Visibility)
- Axes rendered and labeled:
  - Y axis (left): Value Chain — Invisible → Visible (top).
  - X axis (bottom): Evolution — Genesis | Custom | Product | Commodity with light dashed vertical lines at stage boundaries.
- AI guidance for X placement (uses evolution guide chart) + user overrides via drag.
- Needs and Users appear above a horizontal dotted line; Capabilities below.
- Visual encoding: Users (diamond), Needs (rounded rectangle), Capabilities (circle). Distinct colors and a small legend.

4) Change Vectors (Optional)
- For any Capability/Need, user can set Δevolution and Δvisibility to indicate expected change; arrows render from (e,v) to (e+Δe, v+Δv). Toggle to show/hide.

5) Review & Create
- Summary of Users, Needs, Capabilities, links, and placements. Save to DB, then open in Editor.

## AI Assistance
- Step 1: Extract candidate Users/Needs from prompt; ask clarifying questions if missing.
- Step 2: Propose Capabilities and Need→Capability links; highlight gaps/duplicates.
- Step 3: Suggest initial X‑axis stages per evolution chart; annotate rationale; user drags to refine.
- Post‑creation: Same AI chat can add Needs/Capabilities, change links/placements, or propose deltas.

### Evolution Guidance (for UI hints and AI prompting)
Use the Evolution stages I–IV (Genesis, Custom, Product, Commodity) with the following cues derived from the provided table.

- Stage I — Genesis (rare, poorly understood)
  - Ubiquity: rare; Market: undefined; User perception: different/exciting; Failure: high/tolerated; Publications describe wonder; Decision driver: heritage/culture.
  - Heuristics: presence of novel R&D, prototypes, uncertainty, unpredictable outcomes → bias to I.

- Stage II — Custom (forming, expert‑driven)
  - Ubiquity: slowly increasing; Market: forming; Perception: domain of experts; Knowledge: learning on use; Failure: moderate; Publications: build/construct/learning.
  - Heuristics: bespoke integrations, specialist teams, proofs of value, case examples → bias to II.

- Stage III — Product (+rental)
  - Ubiquity: rapidly increasing; Market: growing; Perception: feature competition; Understanding: refinement; Failure: not tolerated; Publications: ops/installation/features.
  - Heuristics: off‑the‑shelf products, price/performance and features, SLAs, standardized interfaces → bias to III.

- Stage IV — Commodity (+utility)
  - Ubiquity: widespread/stabilising; Market: mature; User expectation: standard/expected; Perception: ordered/trivial; Focus: high volume/low margin; Metric‑driven.
  - Heuristics: utility pricing, pay‑per‑use, pervasive standards, little differentiation → bias to IV.

AI should justify suggested placement by referencing 2–3 cues (e.g., “utility pricing + standard API → Commodity”).

### Prompt Templates
- Users & Needs discovery
  - “Given this context: <text>, list primary Users and their explicit Needs. Format as JSON: { users: [..], needs: [{ name, forUser }] }. Ask 2 clarifying questions if major gaps exist.”
- Capabilities proposal
  - “For each Need in <JSON>, propose Capabilities required, and Need→Capability links. Avoid duplicates, 5–12 items. JSON: { capabilities:[{ name }], links:[{ need, capability }] }.”
- Evolution placement suggestion
  - “Using the Evolution cues (Genesis, Custom, Product, Commodity) and these items <list>, suggest a stage 1..4 for each capability with rationale. JSON: [{ name, stage, rationale }].”
- Delta (change vectors)
  - “For each capability, optionally suggest Δevolution and Δvisibility in [‑0.2..+0.2] over next 6–12 months with a one‑line reason. JSON: [{ name, delta_evolution, delta_visibility, reason }].”

## Canvas Specification
- Y axis: “Value Chain (Invisible → Visible)” label; horizontal dotted threshold separating Users/Needs (above) from Capabilities (below).
- X axis: “Evolution (Genesis | Custom | Product | Commodity)”; dashed vertical separators at stage boundaries.
- Grid: faint horizontal/vertical guides; stage labels at bottom.
- Nodes: shapes/colors per type — Users (diamond), Needs (rounded rectangle), Capabilities (circle). Hover shows type + stage; legend in corner.
- Arrows: change vectors when Δ set; thin arrowheads; color keyed to type.

## Data Model & API
- components table additions:
  - kind TEXT CHECK(kind IN ('user','need','capability')) DEFAULT 'capability'
  - delta_evolution DOUBLE PRECISION NULL, delta_visibility DOUBLE PRECISION NULL, changed_at TIMESTAMPTZ NULL
- links table remains (map component relationships). Wizard primarily creates User→Need and Need→Capability links.
- API accepts kind and deltas in create/update; clamp to [0..1]; store NULL when unset.

Validation rules
- evolution, visibility ∈ [0..1]; stage mapping ≈ { I:[0..0.25), II:[0.25..0.5), III:[0.5..0.75), IV:[0.75..1] } (used for grid labels and default placement).
- deltas constrained to small steps (e.g., |Δ| ≤ 0.3) unless user overrides.

## Iterations
1) Axes + Staging + Visual Encoding
- Implement axes labeling, stage dividers, dotted threshold, node shapes/colors, legend.

2) Wizard (Users/Needs → Value Chain → Placement)
- Multi‑step UI with back/next, inline hints, AI prompts, and local draft state.

3) Model/API Changes
- Migrate DB and extend endpoints to include kind + deltas; update editor to edit them.

4) Change Vectors + Toggle
- Add Δ editing UI and canvas arrows; global toggle to show/hide.

## Non‑Goals (Now)
- Sub‑maps (drill‑down) — future iteration.
- Streaming AI during wizard — future enhancement.

## Acceptance Criteria
- Wizard captures Users, Needs, and Capabilities; builds value chain and initial map.
- Canvas shows labeled axes, stage dividers, dotted threshold, and type‑specific visuals.
- Change vectors render when provided; can be toggled.
- Model/API persist kind + deltas; editor supports manual + AI‑assisted updates.
