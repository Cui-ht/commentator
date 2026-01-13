# Annotate - Design Review Tool

A simple design review tool for small teams. Leave spatial feedback on web pages by clicking to add comments or drawing directly on the design.

## Getting Started

1. Enter your name to start (no registration required)
2. Create a new project or open an existing one
3. Add pages (URLs) to review

## Dashboard

Your homepage shows two columns:

- **My Projects** - Projects you've created (you can rename, share, or delete them)
- **Shared to Me** - Projects others have shared with you (view-only)

## Working with Pages

Each project can contain multiple pages:

1. Click **+ New Page** to add a URL to review
2. Switch between pages using the tabs at the top
3. Click the pencil icon on a page tab to rename it

**Note:** Comments and drawings are unique to each page - they won't carry over when you switch pages.

## Annotate Mode (Comments)

1. Select **Annotate** mode from the toolbar
2. Click anywhere on the page to add a comment
3. Comments appear as colored pins with the author's initial
4. Hover over a pin to see the comment
5. Click a pin to:
   - Resolve/Reopen the comment
   - Delete the comment
6. **Drag** a pin to reposition it (only the author can move their own pins)

## Draw Mode (Lines)

1. Select **Draw** mode from the toolbar
2. Choose a color (red, blue, or green)
3. Click to start a line, click again to complete it
4. **Undo**: Press `Cmd+Z` (Mac) or `Ctrl+Z` (Windows) to remove the last line
5. **Eraser**: Toggle eraser mode to delete lines by clicking on them

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Esc` | Cancel current line drawing |
| `Cmd+Z` / `Ctrl+Z` | Undo last line or comment |
| `Enter` | Submit a new comment |

## Sharing Projects

1. Open a project and click the share icon
2. Enter the username of the person you want to share with
3. They can then find your project in their "Shared to Me" column

## Tips

- Use the proxy feature to load external URLs that block iframes
- Comments are per-page - each page has its own set of annotations
- Line drawings persist until you delete them or refresh
- Export comments as Markdown for easy sharing
