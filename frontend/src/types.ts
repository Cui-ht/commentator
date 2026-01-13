export interface User {
  id: string
  name: string
  created_at: string
}

export interface UserCreate {
  name: string
}

export interface Project {
  id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
  comment_count: number
  owner_name?: string | null
}

export interface ProjectCreate {
  title: string
}

export interface ProjectUpdate {
  title?: string
}

export interface ShareRequest {
  username: string
}

export interface Comment {
  id: string
  project_id: string
  page_id: string
  x: number
  y: number
  text: string
  author: string
  resolved: boolean
  created_at: string
}

export interface CommentCreate {
  page_id: string
  x: number
  y: number
  text: string
  author: string
}

export interface CommentUpdate {
  text?: string
  resolved?: boolean
  x?: number
  y?: number
}

export interface Line {
  id: string
  project_id: string
  page_id: string
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  author: string
  created_at: string
}

export interface LineCreate {
  page_id: string
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  author: string
}

export interface LineUpdate {
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  color?: string
}

export type LineColor = 'red' | 'blue' | 'green'

export interface Page {
  id: string
  project_id: string
  url: string
  title: string | null
  order: number
  created_at: string
}

export interface PageCreate {
  url: string
  title?: string
}

export interface PageUpdate {
  url?: string
  title?: string
  order?: number
}
