import { User, Project, ProjectCreate, Comment, CommentCreate, CommentUpdate, Line, LineCreate, LineUpdate, Page, PageCreate, PageUpdate } from './types'

// Use relative paths - Vite dev server proxies to backend
// For production, set VITE_API_URL environment variable
const API_BASE = import.meta.env.VITE_API_URL || ''

// User APIs
export async function createUser(name: string): Promise<User> {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error('Failed to create user')
  return res.json()
}

export async function getUser(userId: string): Promise<User> {
  const res = await fetch(`${API_BASE}/users/${userId}`)
  if (!res.ok) throw new Error('Failed to get user')
  return res.json()
}

// Project APIs
export async function createProject(userId: string, project: ProjectCreate): Promise<Project> {
  const res = await fetch(`${API_BASE}/users/${userId}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  })
  if (!res.ok) throw new Error('Failed to create project')
  return res.json()
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/users/${userId}/projects`)
  if (!res.ok) throw new Error('Failed to fetch projects')
  return res.json()
}

export async function getSharedProjects(userId: string): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/users/${userId}/shared-projects`)
  if (!res.ok) throw new Error('Failed to fetch shared projects')
  return res.json()
}

export async function getProject(projectId: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${projectId}`)
  if (!res.ok) throw new Error('Failed to get project')
  return res.json()
}

export async function deleteProject(projectId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete project')
}

export async function updateProject(projectId: string, update: { title?: string }): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  })
  if (!res.ok) throw new Error('Failed to update project')
  return res.json()
}

// Share APIs
export async function shareProject(projectId: string, username: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to share project')
  }
}

// Comment APIs
export async function getComments(projectId: string, pageId: string): Promise<Comment[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/pages/${pageId}/comments`)
  if (!res.ok) throw new Error('Failed to fetch comments')
  return res.json()
}

export async function createComment(projectId: string, comment: CommentCreate): Promise<Comment> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(comment),
  })
  if (!res.ok) throw new Error('Failed to create comment')
  return res.json()
}

export async function updateComment(commentId: string, update: CommentUpdate): Promise<Comment> {
  const res = await fetch(`${API_BASE}/comments/${commentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  })
  if (!res.ok) throw new Error('Failed to update comment')
  return res.json()
}

export async function deleteComment(commentId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/comments/${commentId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete comment')
}

// Line APIs
export async function getLines(projectId: string, pageId: string): Promise<Line[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/pages/${pageId}/lines`)
  if (!res.ok) throw new Error('Failed to fetch lines')
  return res.json()
}

export async function createLine(projectId: string, line: LineCreate): Promise<Line> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/lines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(line),
  })
  if (!res.ok) throw new Error('Failed to create line')
  return res.json()
}

export async function updateLine(lineId: string, update: LineUpdate): Promise<Line> {
  const res = await fetch(`${API_BASE}/lines/${lineId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  })
  if (!res.ok) throw new Error('Failed to update line')
  return res.json()
}

export async function deleteLine(lineId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/lines/${lineId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete line')
}

// Page APIs
export async function getPages(projectId: string): Promise<Page[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/pages`)
  if (!res.ok) throw new Error('Failed to fetch pages')
  return res.json()
}

export async function getPage(projectId: string, pageId: string): Promise<Page> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/pages/${pageId}`)
  if (!res.ok) throw new Error('Failed to get page')
  return res.json()
}

export async function createPage(projectId: string, page: PageCreate): Promise<Page> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(page),
  })
  if (!res.ok) throw new Error('Failed to create page')
  return res.json()
}

export async function updatePage(projectId: string, pageId: string, update: PageUpdate): Promise<Page> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/pages/${pageId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  })
  if (!res.ok) throw new Error('Failed to update page')
  return res.json()
}

export async function deletePage(projectId: string, pageId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/pages/${pageId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete page')
}
