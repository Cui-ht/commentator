import type { Comment as CommentType } from '../types'

interface CommentSidebarProps {
  comments: CommentType[]
  selectedCommentId: string | null
  onSelectComment: (id: string) => void
  loadedUrl: string
}

export function CommentSidebar({
  comments,
  selectedCommentId,
  onSelectComment,
  loadedUrl,
}: CommentSidebarProps) {
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

  const copyAsMarkdown = () => {
    const md = comments
      .map((c, i) => `${i + 1}. ${c.resolved ? '~~' : ''}${c.text}${c.resolved ? '~~' : ''}`)
      .join('\n')
    navigator.clipboard.writeText(md)
    alert('Copied!')
  }

  return (
    <div className="w-80 bg-white border-l flex flex-col flex-shrink-0">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-gray-800">
          Comments {comments.length > 0 ? `(${comments.length})` : ''}
        </h2>
        <p className="text-xs text-gray-400 mt-1 truncate" title={loadedUrl}>
          {loadedUrl}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <p className="text-sm">No comments yet</p>
            <p className="text-xs mt-1">Click on the page to add feedback</p>
          </div>
        ) : (
          <div className="divide-y">
            {comments.map((comment) => {
              const userColor = getUserColor(comment.author)
              const initial = comment.author.charAt(0).toUpperCase()

              return (
                <div
                  key={comment.id}
                  onClick={() => onSelectComment(comment.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    comment.resolved ? 'bg-gray-50' : 'hover:bg-gray-50'
                  } ${selectedCommentId === comment.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                        comment.resolved ? 'opacity-50' : ''
                      }`}
                      style={{ backgroundColor: userColor }}
                    >
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">
                        <span className="font-medium" style={{ color: userColor }}>
                          {comment.author}
                        </span>
                      </p>
                      <p
                        className={`text-sm ${
                          comment.resolved ? 'line-through text-gray-400' : 'text-gray-800'
                        }`}
                      >
                        {comment.text}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {comments.length > 0 && (
        <div className="p-3 border-t bg-gray-50">
          <button
            onClick={copyAsMarkdown}
            className="w-full text-sm px-3 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Copy as Markdown
          </button>
        </div>
      )}
    </div>
  )
}
