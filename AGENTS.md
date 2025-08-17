# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: Node.js Express API, DB setup in `db.js`, entry `app.js`, script `init-db.js`.
- `frontend/`: Static client in `index.html` that talks to the API at `http://localhost:3000`.
- `intents/`: Product docs and phased execution notes.

## Build, Test, and Development Commands
- Install backend deps: `cd backend && npm install`
- Configure env: copy `backend/.env.example` to `backend/.env` and set values.
- Initialize DB schema: `npm run init-db` (requires Postgres; no in-memory fallback).
- Start server + frontend: `npm start` (listens on `PORT` or 3000). Express serves `frontend/`.
- Tests: `npm test` (currently a placeholder; see Testing Guidelines).

## Coding Style & Naming Conventions
- Language: Node.js (CommonJS) in `backend/`, vanilla HTML/JS in `frontend/`.
- Indentation: 2 spaces; include semicolons in JS.
- Filenames: lowercase with dashes for scripts (`init-db.js`), short module names for files (`app.js`, `db.js`).
- Prefer small modules and pure functions where possible; keep routes thin and delegate to helpers.

## Testing Guidelines
- Framework: not configured yet. Recommended: `jest` + `supertest` for API routes.
- Add tests under `backend/__tests__/` with `*.test.js` naming.
- Example: `npm i -D jest supertest && npx jest --init`; run with `npm test`.
- Target behaviors: auth flows (`/signup`, `/login`), protected route (`/dashboard`), and DB init.

## Commit & Pull Request Guidelines
- Commits: use imperative, concise messages. Conventional Commits encouraged (e.g., `feat: add db migration script`).
- PRs: include description, linked issues, and testing notes. Add screenshots/GIFs for frontend changes.
- Scope PRs narrowly; update docs in `README.md` or `intents/` when behavior or plans change.

## Security & Configuration Tips
- Required env vars (set in `backend/.env`): `DATABASE_URL`, `DB_USER`, `JWT_SECRET`, `OPENAI_API_KEY`. `DB_PASSWORD` is optional and may be empty.
- No in-memory DB fallback; Postgres must be reachable.
- Never log secrets; validate input and authenticate via the `Authorization: Bearer <token>` pattern.

## Phase 2 Notes
- API: `POST /ai/generate-map` expects `{ prompt }`, uses OpenAI with a strict JSON system prompt, validates and saves output.
- Schema additions: `maps.prompt`, component coordinates (`evolution`, `visibility`), and a `links` table.
- Frontend: Adds a prompt textarea in the dashboard and renders a simple canvas map.
