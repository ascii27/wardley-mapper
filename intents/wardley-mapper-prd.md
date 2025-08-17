# Product Requirements Document: Wardley Mapper

**Owner:** Michael  
**Status:** Draft  
**Last Updated:** 2025-08-16

---

### 🎯 Overview

Wardley Mapper is a collaborative, AI-powered web application for creating, editing, analyzing, and discussing Wardley Maps. The app is designed to be fast, visual, and AI-native — allowing users to generate maps from natural language prompts, interact with the maps via chat, and iterate rapidly.

---

### 🧩 Key Capabilities

#### 1. **User Accounts & Authentication**
- Multi-user support with login/logout functionality
- Basic user management (signup, password reset)
- Role: Only authenticated users can create/edit/delete maps

#### 2. **Wardley Map Management**
- Create, edit, and delete maps
- Each map consists of:
  - **Components** with position (evolution, visibility)
  - **Anchors** and **Links** between components
  - Metadata (name, description, timestamps)
- UI for visual drag-and-drop editing and map layout
- Each map belongs to a user

#### 3. **AI-Powered Map Creation & Chat**
- Chat interface powered by OpenAI
- Natural language prompt to generate initial map (e.g. “I want a map about building an online marketplace”)
- AI can:
  - Generate new maps
  - Modify existing maps (add/remove components, rename, re-link)
  - Answer questions about the strategy or evolution
- Map and chat context remain synced in real-time

#### 4. **Visualization**
- Visually appealing, interactive canvas (SVG or WebGL-based)
- Zoom/pan support
- Clear axis labels: **Value Chain (Y)** and **Evolution (X)**
- Color-coded or icon-based component types

#### 5. **Persistence & Database**
- All maps and user data stored in **PostgreSQL**
- Maps stored as JSON documents with structured fields for queryable attributes

#### 6. **APIs**
- RESTful API (and later GraphQL, if needed) for:
  - CRUD operations on maps and users
  - Chat sessions with OpenAI
  - Real-time updates via websockets (Phase 2)

#### 7. **Security**
- Token-based auth (JWT)
- Role-based access to maps (Phase 2: Team sharing)

---

### 💻 Technical Architecture

#### 🖼️ Frontend
- **Stack**: HTML, CSS (Tailwind), JavaScript (Vanilla or lightweight framework if needed)
- **Core Libraries**:
  - Canvas: D3.js or Fabric.js for drag-and-drop interactivity
  - Chat: Simple React/Vue-like chat window
- **Responsibilities**:
  - User login + auth
  - Map canvas rendering + editing
  - Displaying chat + triggering API actions

#### 🔥 Backend (Node.js + Ember FastBoot)
- **Stack**: Node.js with Ember FastBoot
- **Responsibilities**:
  - Serve frontend assets
  - User authentication
  - API endpoints for map & user CRUD
  - Chat handling (proxying OpenAI API)

#### 🤖 AI Integration
- Use OpenAI GPT-4o via API (with streaming support)
- System prompt to include Wardley Mapping definitions and best practices
- Middleware for:
  - Capturing user input
  - Sending context (map structure) to OpenAI
  - Executing returned actions (e.g. update map with new node)

#### 🗃️ Database (PostgreSQL)
- Tables:
  - `users`: id, name, email, hashed_password, timestamps
  - `maps`: id, user_id, name, metadata, created_at, updated_at
  - `components`: id, map_id, name, x (evolution), y (visibility), metadata
  - `chat_sessions`: id, map_id, user_id, messages (jsonb)

---

### ✨ Future Features (Phase 3+)
- Team collaboration (shared maps, comments)
- Map versioning and history
- Export to PDF or PNG
- Pre-built strategy templates
- Public map gallery
- Embedding maps in external sites

---

### ✅ Acceptance Criteria
- A user can:
  - Log in, create a map from a prompt, and edit it visually or through chat
  - See changes reflected on the canvas
  - Save and return to maps later
- Map generation and modification via OpenAI is accurate and consistent
- PostgreSQL stores all data persistently
- App can be hosted locally or deployed to cloud (e.g. Fly.io or Vercel for frontend, Render or Heroku for backend)

---

### 🚧 Execution Phases

Each phase delivers a functional milestone of the Wardley Mapper, allowing for iterative testing and feedback. The plan is designed to provide value early and frequently.

#### **Phase 1: Project Bootstrapping & Core Infrastructure**
- Initialize local Git repository and set up basic project structure
- Initialize PostgreSQL schema (`users`, `maps`, `components`)
- Implement basic authentication (signup/login/logout)
- Simple frontend layout with placeholder components
- Deliverable: Users can log in and see a placeholder dashboard

#### **Phase 2: Map Creation from Natural Language Prompt**
- Integrate OpenAI GPT API (initial prompt → map generation)
- Middleware to convert AI response into component data
- Render map with basic canvas using hardcoded scale/axes
- Store generated map in DB
- Deliverable: Users can generate a basic Wardley Map via chat

#### **Phase 3: Interactive Map Canvas & Editing**
- Implement drag-and-drop component placement (D3.js or Fabric.js)
- Support component updates (position, labels)
- Implement visual links and anchors
- Sync visual updates to DB
- Deliverable: Users can interactively update their maps and save changes

#### **Phase 4: AI-Powered Chat & Map Manipulation**
- Build chat UI component (right panel)
- Maintain chat context and history (via DB)
- AI responses can suggest or execute map changes (add/delete/move)
- Deliverable: Users can converse with AI to iteratively evolve maps

#### **Phase 5: Map Management & User Dashboard**
- List user’s maps on dashboard
- Support editing/deleting maps
- Add timestamps and description metadata
- Deliverable: Users can manage multiple maps

#### **Phase 6: Multi-User & Team Expansion (Optional)**
- Role-based access control
- Map sharing between users or teams
- Deliverable: Teams can collaborate on shared maps

#### **Phase 7: Polish & Production Deployment**
- Add error handling, form validation, UX refinements
- Export to PNG/PDF
- Setup production deployment (e.g. Fly.io, Heroku)
- Deliverable: Fully usable, cloud-deployed app with feedback loop

Each phase should conclude with a short usability test to confirm functionality and gather feedback for the next iteration.
