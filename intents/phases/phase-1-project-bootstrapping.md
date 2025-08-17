# Phase 1: Project Bootstrapping & Core Infrastructure

## Goal
Establish the foundational project structure, database schema, and basic authentication to enable further development.

## Iterations

### Iteration 1: Repository and Environment Setup
- Initialize Git repository with README and .gitignore
- Configure project directories for backend and frontend
- Install core dependencies and set up basic Node.js server
- Deliverable: Initial commit with project skeleton and running server

### Iteration 2: Database and Authentication
- Configure PostgreSQL connection and initialize `users`, `maps`, and `components` tables
- Implement user model and authentication routes (signup, login, logout)
- Hash passwords and manage sessions/JWT tokens
- Deliverable: Users can create accounts and log in through API endpoints

### Iteration 3: Placeholder Frontend Dashboard
- Create simple frontend layout with authentication forms
- After login, display placeholder dashboard showing logged-in status
- Set up minimal styling using Tailwind or basic CSS
- Deliverable: Authenticated users land on a placeholder dashboard after login
