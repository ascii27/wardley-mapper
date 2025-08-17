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

- Served by the Express server from `frontend/`.
- The client makes same-origin API calls; no separate static hosting is needed.

## Phase 2: AI Map Generation
- Endpoint: `POST /ai/generate-map` (auth required) with `{ "prompt": "..." }`.
- Returns: `{ id, name, components:[{ name, evolution, visibility }], links:[{ from, to }] }` and persists to DB.
- Requires `OPENAI_API_KEY` to be set. The server validates AI output and saves components with coordinates and links.
