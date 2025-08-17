# Phase 3: Interactive Map Canvas & Editing

## Goal
Provide an interactive canvas where users can modify map components visually and persist changes.

## Iterations

### Iteration 1: Drag-and-Drop Canvas
- Implement canvas using D3.js or Fabric.js with zoom/pan
- Allow adding, selecting, and dragging components
- Snap components within defined axes boundaries
- Deliverable: Users can move components on the canvas

### Iteration 2: Component Editing and Linking
- Enable editing of component labels and positions
- Add support for anchors and visual links between components
- Provide delete functionality for components and links
- Deliverable: Users can fully edit map structure visually

### Iteration 3: Persistence and Sync
- Sync frontend edits with backend via REST endpoints
- Persist component and link changes to PostgreSQL
- Reflect saved state when reloading map
- Deliverable: Visual edits persist across sessions
