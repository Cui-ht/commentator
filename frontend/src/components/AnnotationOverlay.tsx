import React from 'react'
import type { Comment as CommentType, Line as LineType, LineColor } from '../types'
import { CommentPin } from './CommentPin'

interface AnnotationOverlayProps {
  mode: 'browse' | 'annotate' | 'draw'
  iframeStatus: 'idle' | 'loading' | 'loaded' | 'error'
  lines: LineType[]
  comments: CommentType[]
  selectedCommentId: string | null
  user: { id: string; name: string } | null
  containerRef: React.RefObject<HTMLDivElement | null>
  isAddingComment: boolean
  pendingPosition: { x: number; y: number } | null
  newComment: string
  drawPreview: { x1: number; y1: number; x2: number; y2: number; color: LineColor } | null
  draggingCommentId: string | null
  onOverlayClick: (e: React.MouseEvent) => void
  onDrawClick: (e: React.MouseEvent) => void
  onDrawMouseMove: (e: React.MouseEvent) => void
  onAddComment: () => void
  onCancelComment: () => void
  onNewCommentChange: (text: string) => void
  onPinMouseDown: (e: React.MouseEvent, commentId: string, author: string) => void
  onSelectComment: (id: string | null) => void
  onDeleteLine: (lineId: string) => void
}

const LINE_COLOR_MAP: Record<LineColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
}

export function AnnotationOverlay({
  mode,
  iframeStatus,
  lines,
  comments,
  selectedCommentId,
  user,
  isAddingComment,
  pendingPosition,
  newComment,
  drawPreview,
  onOverlayClick,
  onDrawClick,
  onDrawMouseMove,
  onAddComment,
  onCancelComment,
  onNewCommentChange,
  onPinMouseDown,
  onSelectComment,
  onDeleteLine,
}: AnnotationOverlayProps) {
  const getUserColor = (name: string): string => {
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
      '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6',
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Drawing overlay */}
      {mode === 'draw' && iframeStatus === 'loaded' && (
        <div
          className="absolute inset-0 cursor-crosshair pointer-events-auto"
          onClick={onDrawClick}
          onMouseMove={onDrawMouseMove}
          style={{ background: 'rgba(59, 130, 246, 0.02)' }}
        />
      )}

      {/* Annotation overlay */}
      {mode === 'annotate' && iframeStatus === 'loaded' && (
        <div
          className="absolute inset-0 cursor-crosshair pointer-events-auto"
          onClick={onOverlayClick}
          style={{ background: 'rgba(59, 130, 246, 0.02)' }}
        />
      )}

      {/* Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {lines.map((line) => (
          <line
            key={line.id}
            x1={`${line.x1}%`}
            y1={`${line.y1}%`}
            x2={`${line.x2}%`}
            y2={`${line.y2}%`}
            stroke={LINE_COLOR_MAP[line.color as LineColor] || line.color}
            strokeWidth="3"
            strokeLinecap="round"
            className="pointer-events-auto cursor-pointer hover:opacity-70"
            onClick={() => {
              if (line.author === user?.name) {
                if (confirm('Delete this line?')) {
                  onDeleteLine(line.id)
                }
              }
            }}
          />
        ))}
        {/* Preview line while drawing */}
        {drawPreview && (
          <line
            x1={`${drawPreview.x1}%`}
            y1={`${drawPreview.y1}%`}
            x2={`${drawPreview.x2}%`}
            y2={`${drawPreview.y2}%`}
            stroke={LINE_COLOR_MAP[drawPreview.color]}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="5,5"
            opacity="0.6"
          />
        )}
      </svg>

      {/* Comment Pins */}
      {comments.map((comment) => {
        const userColor = getUserColor(comment.author)
        const initial = comment.author.charAt(0).toUpperCase()
        const canDrag = comment.author === user?.name && mode === 'annotate'

        return (
          <CommentPin
            key={comment.id}
            comment={comment}
            initial={initial}
            userColor={userColor}
            isSelected={selectedCommentId === comment.id}
            canDrag={canDrag}
            onSelect={() => onSelectComment(selectedCommentId === comment.id ? null : comment.id)}
            onMouseDown={(e) => onPinMouseDown(e, comment.id, comment.author)}
          />
        )
      })}

      {/* New Comment Input */}
      {isAddingComment && pendingPosition && (
        <div
          className="absolute z-30"
          style={{
            left: `${pendingPosition.x}%`,
            top: `${pendingPosition.y}%`,
            transform: 'translate(-50%, 0)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-4 h-4 bg-blue-500 rounded-full mx-auto shadow-lg" />
          <div className="mt-2 bg-white rounded-lg shadow-2xl border p-3 w-72">
            <textarea
              autoFocus
              value={newComment}
              onChange={(e) => onNewCommentChange(e.target.value)}
              placeholder="Add your feedback..."
              className="w-full text-sm border rounded-md p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  onAddComment()
                }
                if (e.key === 'Escape') {
                  onCancelComment()
                }
              }}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-400">Enter to submit</span>
              <div className="flex gap-2">
                <button
                  onClick={onCancelComment}
                  className="text-sm px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={onAddComment}
                  disabled={!newComment.trim()}
                  className="text-sm px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
