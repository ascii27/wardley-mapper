# Wardley Mapper

Simple Wardley mapping application with Node.js backend and static frontend.

## Backend

- Express API with PostgreSQL connection.
- Authentication via JWT tokens with password hashing.
- Environment variables:
  - `DATABASE_URL` PostgreSQL connection string (e.g., `postgres://localhost:5432/wardley_mapper`).
  - `DB_USER` PostgreSQL username.
  - `DB_PASSWORD` PostgreSQL password (optional; may be empty for local trust auth).
  - `JWT_SECRET` for signing tokens.
  - `OPENAI_API_KEY` for Phase 2 AI map generation.
  - See `backend/.env.example` and create `backend/.env`.
- Initialize the database tables:

```bash
cd backend
npm install
# Optional: the server will auto-initialize tables at startup
npm run init-db
```

- Start the server and serve frontend:

```bash
npm start
```
Visit http://localhost:3000 to use the app (Express serves the `frontend/` directory).

## Frontend

- Vue 3 single-page application styled with Bootstrap 5.
- Served by the Express server from `frontend/` with same-origin API calls.
- Frontend assets:
  - `frontend/index.html` (Vue + Bootstrap entry)
  - `frontend/app.js` (SPA logic and routing)
  - `frontend/styles.css` (custom tweaks for sidebar and landing page)

## Phase 2: AI Map Generation
- Endpoint: `POST /ai/generate-map` (auth required) with `{ "prompt": "..." }`.
- Returns: `{ id, name, components:[{ name, evolution, visibility }], links:[{ from, to }] }` and persists to DB.
- Requires `OPENAI_API_KEY` to be set. The server validates AI output and saves components with coordinates and links.

## Phase 3: Interactive Editing
- Canvas supports selecting and dragging components to update `evolution` and `visibility` (auto-saved).
- Add components via the input + Add button; delete the selected component.
- Link mode: toggle on, click source then target to create a link; delete links from the list under the canvas.
- Endpoints used: `POST /maps/:id/components`, `PATCH /maps/:id/components/:componentId`, `DELETE /maps/:id/components/:componentId`, `POST /maps/:id/links`, `DELETE /maps/:id/links/:linkId`.

## Phase 4: AI Chat & Map Manipulation
- Chat panel per map with history; persists messages in DB.
- Endpoints: `GET /maps/:id/chat` (history), `POST /maps/:id/chat` with `{ message }`.
- Backend sends current map + recent messages as context to OpenAI and returns:
  - Assistant reply text
  - Optional map updates applied (add/move/delete components; add/delete links)
- Requires `OPENAI_API_KEY`.
