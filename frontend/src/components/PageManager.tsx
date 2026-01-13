import { useState, useEffect } from 'react'
import type { Page } from '../types'
import { getPages, deletePage } from '../api'

interface PageManagerProps {
  projectId: string
  currentPageId: string | null
  onSelectPage: (page: Page) => void
  onAddPage: () => void
  onPageDeleted: () => void
  onRenamePage: (page: Page) => void
}

export function PageManager({ projectId, currentPageId, onSelectPage, onAddPage, onPageDeleted, onRenamePage }: PageManagerProps) {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadPages()
  }, [projectId])

  const loadPages = async () => {
    try {
      const data = await getPages(projectId)
      setPages(data)
    } catch (err) {
      console.error('Failed to load pages:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePage = async (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (pages.length <= 1) {
      alert('Cannot delete the last page')
      return
    }
    if (!confirm('Are you sure you want to delete this page and all its comments?')) return

    setDeleting(pageId)
    try {
      await deletePage(projectId, pageId)
      setPages(pages.filter((p) => p.id !== pageId))
      // If we deleted the current page, select the first remaining page
      if (currentPageId === pageId) {
        const remaining = pages.filter((p) => p.id !== pageId)
        if (remaining.length > 0) {
          onSelectPage(remaining[0])
        }
      }
      onPageDeleted()
    } catch (err) {
      console.error('Failed to delete page:', err)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Page tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto max-w-md">
        {pages.map((page, index) => (
          <div
            key={page.id}
            className={`group relative px-3 py-1 text-sm rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
              currentPageId === page.id
                ? 'bg-white shadow text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <button
              onClick={() => onSelectPage(page)}
              className="flex items-center gap-1"
            >
              <span className="truncate max-w-[80px]">{page.title || `Page ${index + 1}`}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRenamePage(page)
              }}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition-opacity"
              title="Rename page"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            {pages.length > 1 && (
              <button
                onClick={(e) => handleDeletePage(page.id, e)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                title="Delete page"
              >
                {deleting === page.id ? (
                  <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            )}
          </div>
        ))}
        <button
          onClick={onAddPage}
          className="px-2 py-1 text-sm rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
          title="Add page"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  )
}
