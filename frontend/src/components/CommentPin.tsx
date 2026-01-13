import React from 'react'
import type { Comment as CommentType } from '../types'

interface CommentPinProps {
  comment: CommentType
  initial: string
  userColor: string
  isSelected: boolean
  canDrag: boolean
  onSelect: () => void
  onMouseDown: (e: React.MouseEvent) => void
}

export function CommentPin({
  comment,
  initial,
  userColor,
  isSelected,
  canDrag,
  onSelect,
  onMouseDown,
}: CommentPinProps) {
  return (
    <div
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-opacity ${
        comment.resolved ? 'opacity-50' : ''
      } ${canDrag ? 'cursor-move' : ''}`}
      style={{
        left: `${comment.x}%`,
        top: `${comment.y}%`,
        pointerEvents: 'auto',
      }}
    >
      <div className="relative group">
        <button
          onMouseDown={onMouseDown}
          onClick={(e) => {
            if (!canDrag) {
              e.stopPropagation()
              onSelect()
            }
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg transition-transform ring-2 ring-white ${
            canDrag ? 'hover:scale-110 cursor-move' : ''
          }`}
          style={{ backgroundColor: userColor }}
        >
          {initial}
        </button>

        {/* Hover tooltip */}
        {!isSelected && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50">
            <div className="bg-gray-900 text-white text-xs rounded px-2 py-1.5 whitespace-nowrap max-w-[200px] truncate">
              <span className="font-medium">{comment.author}:</span> {comment.text}
            </div>
            <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto" />
          </div>
        )}
      </div>

      {isSelected && (
        <div
          className="absolute top-9 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-2xl border p-4 w-72 z-30"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: userColor }}
            >
              {initial}
            </div>
            <span className="text-sm font-medium text-gray-800">{comment.author}</span>
          </div>
          <p className="text-sm text-gray-800 mb-3 whitespace-pre-wrap">{comment.text}</p>
          <p className="text-xs text-gray-400 mb-3">
            {new Date(comment.created_at).toLocaleString()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const updated = !comment.resolved
                fetch(`/comments/${comment.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ resolved: updated }),
                })
              }}
              className={`flex-1 text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${
                comment.resolved
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              {comment.resolved ? 'Reopen' : 'Resolve'}
            </button>
            <button
              onClick={() => {
                if (confirm('Delete this comment?')) {
                  fetch(`/comments/${comment.id}`, { method: 'DELETE' })
                }
              }}
              className="text-sm px-3 py-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 font-medium transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
