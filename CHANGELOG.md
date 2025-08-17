# Changelog

## Phase 3 – Interactive Map Editing
- Interactive canvas: select and drag components; positions auto-save.
- Component CRUD: add new components, delete selected components.
- Link mode: click source then target to create links; delete links from list.
- Backend endpoints: POST/PATCH/DELETE for components; POST/DELETE for links.
- API responses include link IDs to support UI deletion.

## Phase 2 – AI Map Generation
- Endpoint: POST /ai/generate-map (auth required) accepts { prompt }.
- Validates strict JSON from OpenAI and persists maps, components (with evolution/visibility), and links.
- DB migrations: maps.prompt, components.evolution/visibility, new links table.
- Frontend: prompt input and basic canvas renderer.

## Infrastructure & Docs
- Express serves frontend; same-origin API calls.
- .env example updated; DB password optional; no in-memory DB fallback.
- Auto DB init/migrations at startup.
