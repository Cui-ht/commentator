# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Internal design review tool. Enables spatial commenting on web pages (click anywhere → leave feedback).

**Target users**: Small team reviewing UI designs exported as HTML

## Tech Stack

- Frontend: React + TypeScript + Tailwind
- Backend: FastAPI + SQLite
- Hosting: Self-hosted

## Commands

- `cd frontend && npm install` - Install frontend dependencies
- `cd frontend && npm run dev` - Start frontend dev server
- `cd backend && pip install -r requirements.txt` - Install backend dependencies
- `cd backend && uvicorn main:app --reload` - Start backend server

## Project Structure

```
annotate/
├── frontend/
│   └── src/
│       ├── components/   # React components
│       ├── hooks/        # Custom hooks
│       ├── api.ts        # API client
│       └── types.ts      # TypeScript types
├── backend/
│   ├── main.py           # FastAPI app
│   ├── models.py         # Pydantic models
│   └── database.py       # SQLite setup
└── CLAUDE.md
```

## Core Features (MVP)

1. URL input → display page in iframe
2. Click anywhere → add comment at position
3. Show comments as numbered pins
4. Resolve/delete comments
5. Persist to SQLite
6. Multi-user access (no auth for MVP)

## Data Model

```typescript
interface Comment {
  id: string
  projectId: string
  x: number        // percentage 0-100
  y: number        // percentage 0-100
  text: string
  author: string
  resolved: boolean
  createdAt: string
}
```

## API Endpoints

```
GET    /projects/:id/comments
POST   /projects/:id/comments
PATCH  /comments/:id
DELETE /comments/:id
```

## Key Constraints

- Iframes blocked by many sites (X-Frame-Options)
- Only target self-hosted pages (Netlify/Vercel exports)
- Use percentage-based coordinates for positioning
- Overlay blocks iframe interaction; add Browse/Annotate mode toggle

## Code Style

- Functional components with hooks
- TypeScript strict mode
- Tailwind for styling (no CSS files)
- Small, focused components

## Development Phases

1. **Phase 1**: Frontend with localStorage (no backend)
2. **Phase 2**: Add FastAPI + SQLite backend
3. **Phase 3**: Polish, error handling, deploy

## Basic functionalities

Bare in mind we shall describe these functionalities by names defined here.

- Dashboard: User homepage, has two columns: `My Projects` which contains projects this user uploaded and under each project the user can share or delete; `Shared to Me` which contains projects shared by other users.
- Project: Can contain multiple pages, each page need the user to maually add urls.
- Page-under-review: Pages in Projects.
- Edit page: Page after clicking on a page-under-view. It has three "modes":
  - Browse: Acts as a simple browser, no additional feature.
  - Annotate: Comment layer. Users click to add comments which display as pins. The pin shows user name and specific colour for each user. Can be dragged only by poster. When hovering on the pin, display content and "solved" and "delete" buttons.
  - Draw: 
    - Currently only straight lines. 
    - User can cancel drawing after clicking start point by pressing "esc" button on keyboard. 
    - User can undo by pressing "cmd+z" or "ctrl+z" depending on their OS. 
    - An eraser button is near the colour selection panel, when clicked, an eraser icon replaces the cursor and when left mouse button is clicked, the eraser is activated, able to delete line it touches.
