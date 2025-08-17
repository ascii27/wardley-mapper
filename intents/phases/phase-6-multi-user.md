# Phase 6: Multi-User & Team Expansion (Optional)

## Goal
Introduce collaboration features that allow sharing maps between users or teams with appropriate access control.

## Iterations

### Iteration 1: Role-Based Access Control
- Define user roles and permissions in database
- Restrict map actions based on role (owner, editor, viewer)
- Update authentication middleware to enforce roles
- Deliverable: Role-aware authorization enforced across endpoints

### Iteration 2: Map Sharing
- Allow map owners to invite other users or teams
- Create UI for managing collaborators and permissions
- Track shared maps in database with join table
- Deliverable: Users can share maps with specified access levels

### Iteration 3: Real-Time Collaboration
- Implement WebSocket or Socket.IO channel for live updates
- Resolve conflicting edits and show presence indicators
- Deliverable: Multiple users can simultaneously edit a shared map
