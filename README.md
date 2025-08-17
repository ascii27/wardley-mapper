# Wardley Mapper

Simple Wardley mapping application with Node.js backend and static frontend.

## Backend

- Express API with PostgreSQL connection.
- Authentication via JWT tokens with password hashing.
- Environment variables:
  - `DATABASE_URL` for PostgreSQL connection string (optional when using in-memory DB).
  - `JWT_SECRET` for signing tokens.
- Initialize the database tables:

```bash
cd backend
npm install
npm run init-db
```

- Start the server:

```bash
npm start
```

## Frontend

- Static HTML served from `frontend/index.html`.
- Provides signup and login forms and shows a placeholder dashboard after authentication.
