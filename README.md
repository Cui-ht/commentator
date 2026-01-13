# Annotate - Design Review Tool

A design review tool enabling spatial commenting and drawing on web pages.

## Quick Start

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

Access at `http://localhost:5173`

## Architecture

```
annotate/
├── frontend/           # React + TypeScript + Tailwind
│   └── src/
│       ├── components/ # UI components (Dashboard, PageManager, modals)
│       ├── api.ts      # API client functions
│       └── types.ts    # TypeScript interfaces
│
└── backend/            # FastAPI + SQLite
    ├── main.py         # API endpoints
    ├── schemas.py      # Pydantic models
    └── db_models.py    # SQLAlchemy models
```

## Key Design Decisions

### Annotations are Page-Specific
Comments and lines are stored with `page_id`, not just `project_id`. Each page has its own isolated annotations. This was a deliberate choice to support multi-page reviews.

**Related files:**
- `backend/db_models.py` - `Comment` and `Line` tables have `page_id` column
- `backend/main.py` - Endpoints filter by `page_id`
- `frontend/src/api.ts` - `getComments(projectId, pageId)` signature

### Percentage-Based Coordinates
All comment positions and line coordinates are stored as percentages (0-100) relative to the viewport. This ensures annotations stay correctly positioned regardless of screen size.

### Mode-Based Interaction

The app operates in three modes:
- **Browse**: Passive viewing, no annotations
- **Annotate**: Click to add comment pins
- **Draw**: Click-drag to create lines

Mode is stored in React state (`mode: 'browse' | 'annotate' | 'draw'`).

### No Authentication (MVP)

Users are identified by name only. LocalStorage persists the session. This is a trade-off for simplicity - the backend creates or finds users by name on each login.

## Data Model

```typescript
// Comments - per-page, percentage-based positioning
interface Comment {
  id: string
  project_id: string
  page_id: string
  x: number        // 0-100
  y: number        // 0-100
  text: string
  author: string
  resolved: boolean
  created_at: string
}

// Lines - per-page drawings
interface Line {
  id: string
  project_id: string
  page_id: string
  x1: number       // 0-100
  y1: number       // 0-100
  x2: number       // 0-100
  y2: number       // 0-100
  color: 'red' | 'blue' | 'green'
  author: string
  created_at: string
}

// Pages - URLs to review
interface Page {
  id: string
  project_id: string
  url: string      // Proxied through /proxy endpoint
  title: string | null
  order: number
  created_at: string
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/{id}/pages/{page_id}/comments` | Get comments for a page |
| POST | `/projects/{id}/comments` | Create comment (requires `page_id` in body) |
| GET | `/projects/{id}/pages/{page_id}/lines` | Get lines for a page |
| POST | `/projects/{id}/lines` | Create line (requires `page_id` in body) |

## Adding New Features

### Adding a New Annotation Type
1. Add model to `backend/db_models.py`
2. Add schema to `backend/schemas.py`
3. Add endpoint to `backend/main.py`
4. Add API function to `frontend/src/api.ts`
5. Add type to `frontend/src/types.ts`
6. Create component in `frontend/src/components/`

### Modifying Comment Pins
- Pin rendering: `frontend/src/App.tsx` - Comment Pins section
- Pin interactions: `handlePinMouseDown`, `handleMouseMove`, `handleMouseUp`
- Dragging uses percentage-based updates

### Modifying Line Drawing
- Drawing logic: `handleDrawClick`, `handleDrawMouseMove`
- Line rendering: SVG overlay in `App.tsx`
- Eraser mode: `isEraser` state + `handleDeleteLine`

### Adding Page Features
- Page management: `frontend/src/components/PageManager.tsx`
- Page tabs UI and rename/delete buttons
- Add new modal: duplicate `RenamePageModal.tsx` pattern

### Adding Project Features
- Project list: `frontend/src/components/ProjectList.tsx`
- Project card: `frontend/src/components/ProjectCard.tsx`
- Modals in `frontend/src/components/`

## Known Issues / Technical Debt

1. **SQLite on serverless**: Current setup uses SQLite file-based DB. For production deployment, switch to PostgreSQL.

2. **No real user accounts**: Users identified by name only. Consider adding auth for multi-team use.

3. **Proxy limitations**: `/proxy` endpoint handles most URLs but may break on complex SPAs.

4. **No migration system**: Schema changes require deleting `annotate.db`.

5. **Frontend state**: Uses React useState + localStorage. Consider React Query for better async handling.

## Deployment

### Development (localhost)

```bash
cd backend && uvicorn main:app --reload
cd frontend && npm run dev
```

### LAN Access

```bash
# Start backend on all interfaces
cd backend && uvicorn main:app --host 0.0.0.0

# Start frontend on all interfaces
cd frontend && npm run dev -- --host 0.0.0.0
```

Find your IP with `ipconfig getifaddr en0` and share `http://YOUR_IP:5173`

The Vite dev server proxies API calls to the backend, so no configuration changes needed.

### Production Build

For LAN or cloud deployment:

```bash
cd frontend && npm run build
```

For custom API URL:
```bash
VITE_API_URL=http://your-api-server:8000 npm run build
```

Serve the `dist/` folder with any static file server.

For cloud deployment, replace SQLite with PostgreSQL and deploy frontend as static files.

## Tech Stack Details

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: FastAPI, SQLAlchemy (async), aiosqlite
- **Database**: SQLite (development), PostgreSQL (recommended for production)

## Scripts

```bash
# Frontend
npm run dev      # Development server with HMR
npm run build    # Production build to dist/

# Backend
uvicorn main:app --reload  # Development with auto-reload
uvicorn main:app           # Production
```
