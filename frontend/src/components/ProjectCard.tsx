import React from 'react'
import type { Project } from '../types'
import { ShareIcon, DeleteIcon, PencilIcon } from './Icons'

interface ProjectCardProps {
  project: Project
  isOwner: boolean
  onOpen: () => void
  onShare: () => void
  onDelete: (e: React.MouseEvent) => void
  onRename: () => void
  deleting: string | null
}

export function ProjectCard({
  project,
  isOwner,
  onOpen,
  onShare,
  onDelete,
  onRename,
  deleting,
}: ProjectCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div
      onClick={onOpen}
      className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-800 truncate">
              {project.title || 'Untitled Project'}
            </h3>
            {project.comment_count > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                {project.comment_count} comments
              </span>
            )}
          </div>
          {!isOwner && project.owner_name && (
            <p className="text-xs text-gray-400 mt-1">Shared by {project.owner_name}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Updated {formatDate(project.updated_at)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {isOwner && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRename()
              }}
              className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
              title="Rename project"
            >
              <PencilIcon />
            </button>
          )}
          {isOwner && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onShare()
              }}
              className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
              title="Share project"
            >
              <ShareIcon />
            </button>
          )}
          {isOwner && (
            <button
              onClick={onDelete}
              disabled={deleting === project.id}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              title="Delete project"
            >
              {deleting === project.id ? (
                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <DeleteIcon />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
