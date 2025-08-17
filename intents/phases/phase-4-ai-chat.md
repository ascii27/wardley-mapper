# Phase 4: AI-Powered Chat & Map Manipulation

## Goal
Allow users to converse with an AI agent to analyze and modify Wardley Maps through natural language.

## Iterations

### Iteration 1: Chat UI and Backend Channel
- Build chat panel component in frontend
- Implement backend endpoint for streaming AI responses
- Store chat messages in `chat_sessions` table
- Deliverable: Users can exchange messages with AI without map changes

### Iteration 2: Context Management
- Send current map state and recent messages as context to OpenAI
- Maintain session identifiers for each map
- Display chat history when reloading a map
- Deliverable: Chat retains context across interactions

### Iteration 3: AI-Driven Map Updates
- Parse AI responses for map modification commands
- Apply add/remove/move operations to components and links
- Reflect changes on canvas and persist to DB
- Deliverable: Users can modify maps via conversation with AI
