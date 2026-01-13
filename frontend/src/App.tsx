import { useState, useEffect, useRef, useCallback } from 'react'
import { User, Project, LineColor } from './types'
import { getComments, createComment, updateComment, deleteComment, getLines, createLine, deleteLine, getPages, getUser } from './api'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'
import { NewProjectModal } from './components/NewProjectModal'
import { AddPageModal } from './components/AddPageModal'
import { RenamePageModal } from './components/RenamePageModal'
import { EraserIcon } from './components/Icons'
import { PageManager } from './components/PageManager'
import type { Comment as CommentType, Line as LineType, Page } from './types'

type View = 'login' | 'dashboard' | 'annotate'
type Mode = 'browse' | 'annotate' | 'draw'

function App() {
  const [view, setView] = useState<View>('login')
  const [user, setUser] = useState<User | null>(null)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [showAddPage, setShowAddPage] = useState(false)
  const [renamingPage, setRenamingPage] = useState<Page | null>(null)

  // Annotate state
  const [loadedUrl, setLoadedUrl] = useState('')
  const [comments, setComments] = useState<CommentType[]>([])
  const [lines, setLines] = useState<LineType[]>([])
  const [currentPage, setCurrentPage] = useState<Page | null>(null)
  const [mode, setMode] = useState<Mode>('annotate')
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null)
  const [iframeStatus, setIframeStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const containerRef = useRef<HTMLDivElement>(null)

  // Comment adding state
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null)
  const [newComment, setNewComment] = useState('')

  // Line drawing state
  const [drawColor, setDrawColor] = useState<LineColor>('red')
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [drawPreview, setDrawPreview] = useState<{ x1: number; y1: number; x2: number; y2: number; color: LineColor } | null>(null)
  const [isEraser, setIsEraser] = useState(false)

  // Dragging state
  const [draggingCommentId, setDraggingCommentId] = useState<string | null>(null)

  // Check for existing session and verify user exists
  useEffect(() => {
    const userId = localStorage.getItem('annotate-user-id')
    const userName = localStorage.getItem('annotate-user-name')
    if (userId && userName) {
      // Verify user exists in backend
      getUser(userId)
        .then((user) => {
          setUser(user)
          setView('dashboard')
        })
        .catch(() => {
          // User doesn't exist, clear localStorage
          localStorage.removeItem('annotate-user-id')
          localStorage.removeItem('annotate-user-name')
        })
    }
  }, [])

  // Load pages when project changes, then load annotations when currentPage is set
  useEffect(() => {
    if (currentProject) {
      loadPages()
    }
  }, [currentProject])

  // Load comments and lines when currentPage changes
  useEffect(() => {
    if (currentProject && currentPage) {
      loadComments()
      loadLines()
    }
  }, [currentProject, currentPage])

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to cancel drawing
      if (e.key === 'Escape' && isDrawing) {
        setIsDrawing(false)
        setDrawStart(null)
        setDrawPreview(null)
        return
      }

      // Cmd+Z or Ctrl+Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        
        // Undo last line if it exists and belongs to user
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1]
          if (lastLine.author === user?.name) {
            handleDeleteLine(lastLine.id)
            return
          }
        }

        // Undo last comment if it exists and belongs to user
        if (comments.length > 0) {
          const lastComment = comments[comments.length - 1]
          if (lastComment.author === user?.name) {
            handleDeleteComment(lastComment.id)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawing, lines, comments, user])

  const loadComments = async () => {
    if (!currentProject || !currentPage) {
      console.debug('loadComments skipped: currentProject or currentPage is null', {
        hasProject: !!currentProject,
        hasPage: !!currentPage,
        projectId: currentProject?.id,
        pageId: currentPage?.id
      })
      return
    }
    console.debug('Loading comments for page:', currentPage.id)
    try {
      const data = await getComments(currentProject.id, currentPage.id)
      console.debug('Loaded comments:', data.length, 'for page:', currentPage.id)
      setComments(data)
    } catch (e) {
      console.error('Failed to load comments:', e)
    }
  }

  const loadLines = async () => {
    if (!currentProject || !currentPage) {
      console.debug('loadLines skipped: currentProject or currentPage is null')
      return
    }
    console.debug('Loading lines for page:', currentPage.id)
    try {
      const data = await getLines(currentProject.id, currentPage.id)
      console.debug('Loaded lines:', data.length, 'for page:', currentPage.id)
      setLines(data)
    } catch (e) {
      console.error('Failed to load lines:', e)
    }
  }

  const loadPages = async () => {
    if (!currentProject) return
    try {
      const data = await getPages(currentProject.id)
      console.debug('Loaded pages:', data.length, 'for project:', currentProject.id)
      // Set the first page as current if pages exist
      if (data.length > 0 && !currentPage) {
        console.debug('Setting first page as current:', data[0].id)
        setCurrentPage(data[0])
        setLoadedUrl(data[0].url)
      }
    } catch (e) {
      console.error('Failed to load pages:', e)
    }
  }

  const handlePageCreated = (page: Page) => {
    setCurrentPage(page)
    setLoadedUrl(page.url)
    setShowAddPage(false)
    // Reload comments and lines for the new page
    loadComments()
    loadLines()
  }

  const handlePageDeleted = () => {
    // Reload pages and clear comments/lines if no pages left
    loadPages()
    setComments([])
    setLines([])
  }

  const handlePageSelect = (page: Page) => {
    console.debug('Switching to page:', page.id, page.title)
    // Clear annotations immediately when switching pages
    setComments([])
    setLines([])
    setCurrentPage(page)
    setLoadedUrl(page.url)
    // Additional annotations will be loaded by useEffect when currentPage changes
  }

  const handleRenamePage = (page: Page) => {
    setRenamingPage(page)
  }

  const handlePageRenamed = (updatedPage: Page) => {
    setCurrentPage(updatedPage)
    setRenamingPage(null)
  }

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser)
    setView('dashboard')
  }

  const handleLogout = () => {
    setUser(null)
    setView('login')
    setCurrentProject(null)
    setLoadedUrl('')
    setComments([])
    setLines([])
    setCurrentPage(null)
  }

  const handleNewProject = () => {
    setShowNewProject(true)
  }

  const handleProjectCreated = async (project: Project) => {
    setShowNewProject(false)
    setCurrentProject(project)
    setIframeStatus('loading')
    setSelectedCommentId(null)
    setIsAddingComment(false)
    setView('annotate')
    // Pages will be loaded by the useEffect, first page needs to be added
    setCurrentPage(null)
    // Clear comments and lines
    setComments([])
    setLines([])
  }

  const handleOpenProject = async (project: Project) => {
    setCurrentProject(project)
    setIframeStatus('loading')
    setSelectedCommentId(null)
    setIsAddingComment(false)
    setView('annotate')
    // Pages will be loaded by the useEffect
    setCurrentPage(null)
    // Clear comments and lines
    setComments([])
    setLines([])
  }

  const handleBackToDashboard = () => {
    setCurrentProject(null)
    setLoadedUrl('')
    setComments([])
    setLines([])
    setCurrentPage(null)
    setView('dashboard')
  }

  // Comment handlers
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (mode === 'browse') return

    if (mode === 'draw') {
      handleDrawClick(e)
      return
    }

    if (selectedCommentId !== null) {
      setSelectedCommentId(null)
      return
    }

    if (isAddingComment) {
      setIsAddingComment(false)
      setPendingPosition(null)
      setNewComment('')
      return
    }

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setPendingPosition({ x, y })
    setIsAddingComment(true)
  }

  const handleAddComment = async () => {
    if (newComment.trim() && pendingPosition && user && currentProject && currentPage) {
      try {
        const created = await createComment(currentProject.id, {
          page_id: currentPage.id,
          x: pendingPosition.x,
          y: pendingPosition.y,
          text: newComment.trim(),
          author: user.name,
        })
        setComments([created, ...comments])
        setNewComment('')
        setPendingPosition(null)
        setIsAddingComment(false)
      } catch (e) {
        console.error('Failed to add comment:', e)
      }
    }
  }

  const handleDeleteComment = async (id: string) => {
    try {
      await deleteComment(id)
      setComments(comments.filter((c) => c.id !== id))
      setSelectedCommentId(null)
    } catch (e) {
      console.error('Failed to delete comment:', e)
    }
  }

  const handleResolveComment = async (id: string, current: boolean) => {
    try {
      const updated = await updateComment(id, { resolved: !current })
      setComments(comments.map((c) => (c.id === id ? updated : c)))
    } catch (e) {
      console.error('Failed to resolve comment:', e)
    }
  }

  // Drag and drop handlers for comment pins
  const handlePinMouseDown = (e: React.MouseEvent, commentId: string, author: string) => {
    if (mode !== 'annotate') return
    if (author !== user?.name) return // Only author can move

    e.stopPropagation()
    setDraggingCommentId(commentId)
    setSelectedCommentId(commentId)
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingCommentId || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    // Update comment position locally
    setComments(prev => prev.map(c => 
      c.id === draggingCommentId ? { ...c, x, y } : c
    ))
  }, [draggingCommentId])

  const handleMouseUp = async () => {
    if (!draggingCommentId) return

    const comment = comments.find(c => c.id === draggingCommentId)
    if (comment) {
      try {
        await updateComment(draggingCommentId, { x: comment.x, y: comment.y })
      } catch (e) {
        console.error('Failed to update comment position:', e)
        loadComments() // Revert on error
      }
    }

    setDraggingCommentId(null)
  }

  // Line drawing handlers
  const handleDrawClick = (e: React.MouseEvent) => {
    if (!user || !currentProject || !currentPage) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    if (!isDrawing) {
      // Start drawing
      setDrawStart({ x, y })
      setIsDrawing(true)
    } else {
      // Complete line
      if (drawStart) {
        const lineData = {
          page_id: currentPage.id,
          x1: drawStart.x,
          y1: drawStart.y,
          x2: x,
          y2: y,
          color: drawColor,
          author: user.name,
        }

        createLine(currentProject.id, lineData).then(created => {
          setLines(prev => [...prev, created])
        }).catch(e => {
          console.error('Failed to create line:', e)
        })
      }
      setIsDrawing(false)
      setDrawStart(null)
      setDrawPreview(null)
    }
  }

  const handleDrawMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setDrawPreview({
      x1: drawStart.x,
      y1: drawStart.y,
      x2: x,
      y2: y,
      color: drawColor,
    })
  }

  const handleDeleteLine = async (lineId: string) => {
    try {
      await deleteLine(lineId)
      setLines(lines.filter((l) => l.id !== lineId))
    } catch (e) {
      console.error('Failed to delete line:', e)
    }
  }

  const currentComments = comments
  const unresolvedCount = currentComments.filter((c) => !c.resolved).length

  // Generate consistent color from username
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

  const lineColorMap: Record<LineColor, string> = {
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#22c55e',
  }

  // Render views
  let appContent: React.ReactNode

  if (view === 'login') {
    appContent = <Login onLogin={handleLogin} />
  } else if (view === 'dashboard') {
    appContent = (
      <>
        <Dashboard
          user={user!}
          onLogout={handleLogout}
          onOpenProject={handleOpenProject}
          onNewProject={handleNewProject}
        />
        {showNewProject && user && (
          <NewProjectModal
            userId={user.id}
            onClose={() => setShowNewProject(false)}
            onCreated={handleProjectCreated}
          />
        )}
      </>
    )
  } else { // annotate view
    appContent = (
      <div
        className="h-full flex flex-col bg-gray-100"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleBackToDashboard}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-blue-600">Annotate</h1>
          {currentProject && (
            <div className="flex-1 flex items-center gap-3">
              <h2 className="text-sm font-medium text-gray-800 truncate">
                {currentProject.title}
              </h2>
              {/* Page Manager */}
              {currentProject && (
                <PageManager
                  projectId={currentProject.id}
                  currentPageId={currentPage?.id || null}
                  onSelectPage={handlePageSelect}
                  onAddPage={() => setShowAddPage(true)}
                  onPageDeleted={handlePageDeleted}
                  onRenamePage={handleRenamePage}
                />
              )}
            </div>
          )}
          {loadedUrl && (
            <div className="flex items-center gap-3">
              {/* Mode toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    setMode('browse')
                    setIsEraser(false)
                  }}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    mode === 'browse' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
                  }`}
                >
                  Browse
                </button>
                <button
                  onClick={() => {
                    setMode('annotate')
                    setIsEraser(false)
                  }}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    mode === 'annotate' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
                  }`}
                >
                  Annotate
                </button>
                <button
                  onClick={() => {
                    setMode('draw')
                    // Keep isEraser state when switching to draw mode
                  }}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    mode === 'draw' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
                  }`}
                >
                  Draw
                </button>
              </div>

              {/* Color picker (only in draw mode) */}
              {mode === 'draw' && (
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  {(['red', 'blue', 'green'] as LineColor[]).map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setDrawColor(color)
                        setIsEraser(false)
                      }}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        drawColor === color && !isEraser ? 'scale-110 ring-2 ring-white ring-offset-1' : ''
                      }`}
                      style={{ backgroundColor: lineColorMap[color] }}
                      title={color}
                    />
                  ))}
                  <div className="w-px h-4 bg-gray-300 mx-1" />
                  <button
                    onClick={() => setIsEraser(true)}
                    className={`p-1 rounded transition-colors ${
                      isEraser ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Eraser"
                  >
                    <EraserIcon className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div className="text-sm text-gray-500 tabular-nums">{unresolvedCount} open</div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {/* Viewport */}
          <div 
            className="flex-1 relative bg-gray-200"
            ref={containerRef}
          >
            {!loadedUrl ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-xl mb-4">
                    {currentProject ? 'No pages in this project' : 'No project loaded'}
                  </p>
                  {currentProject && (
                    <button
                      onClick={() => setShowAddPage(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      + New Page
                    </button>
                  )}
                  {!currentProject && (
                    <p className="text-sm">
                      Go back to dashboard to create or open a project
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Iframe */}
                <iframe
                  src={loadedUrl}
                  className="w-full h-full border-0"
                  onLoad={() => setIframeStatus('loaded')}
                  onError={() => setIframeStatus('error')}
                  title={currentProject?.title || 'Annotated page'}
                />

                {/* Annotation Overlay */}
                <div className="absolute inset-0">
                  {/* Drawing overlay */}
                  {(mode === 'draw' && iframeStatus === 'loaded') && (
                    <div
                      className={`absolute inset-0 ${
                        isEraser ? 'cursor-crosshair' : 'cursor-crosshair'
                      }`}
                      onClick={handleDrawClick}
                      onMouseMove={handleDrawMouseMove}
                      style={{ background: 'rgba(59, 130, 246, 0.02)' }}
                    />
                  )}

                  {/* Annotation overlay */}
                  {mode === 'annotate' && iframeStatus === 'loaded' && (
                    <div
                      className="absolute inset-0 cursor-crosshair"
                      onClick={handleOverlayClick}
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
                        stroke={lineColorMap[line.color as LineColor] || line.color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        className={`pointer-events-auto ${
                          isEraser ? 'cursor-pointer hover:opacity-50' : 'cursor-pointer hover:opacity-70'
                        }`}
                        onClick={() => {
                          if (line.author === user?.name) {
                            if (isEraser) {
                              // Eraser mode: delete without confirmation
                              handleDeleteLine(line.id)
                            } else if (confirm('Delete this line?')) {
                              handleDeleteLine(line.id)
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
                        stroke={lineColorMap[drawPreview.color]}
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
                      <div
                        key={comment.id}
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
                            onMouseDown={(e) => {
                              if (canDrag) {
                                handlePinMouseDown(e, comment.id, comment.author)
                              }
                            }}
                            onClick={(e) => {
                              if (!canDrag) {
                                e.stopPropagation()
                                setSelectedCommentId(selectedCommentId === comment.id ? null : comment.id)
                              }
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg transition-transform ${
                              canDrag ? 'hover:scale-110 cursor-move' : ''
                            }`}
                            style={{ backgroundColor: userColor }}
                          >
                            {initial}
                          </button>

                          {/* Hover tooltip */}
                          {selectedCommentId !== comment.id && (
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50">
                              <div className="bg-gray-900 text-white text-xs rounded px-2 py-1.5 whitespace-nowrap max-w-[200px] truncate">
                                <span className="font-medium">{comment.author}:</span> {comment.text}
                              </div>
                              <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto" />
                            </div>
                          )}
                        </div>

                        {selectedCommentId === comment.id && (
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
                                onClick={() => handleResolveComment(comment.id, comment.resolved)}
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
                                    handleDeleteComment(comment.id)
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
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add your feedback..."
                          className="w-full text-sm border rounded-md p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleAddComment()
                            }
                            if (e.key === 'Escape') {
                              setIsAddingComment(false)
                              setPendingPosition(null)
                              setNewComment('')
                            }
                          }}
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-400">Enter to submit</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setIsAddingComment(false)
                                setPendingPosition(null)
                                setNewComment('')
                              }}
                              className="text-sm px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleAddComment}
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
              </>
            )}
          </div>

          {/* Sidebar */}
          {loadedUrl && (
            <div className="w-80 bg-white border-l flex flex-col flex-shrink-0">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-800">
                  Comments {currentComments.length > 0 ? `(${currentComments.length})` : ''}
                </h2>
                <p className="text-xs text-gray-400 mt-1 truncate" title={loadedUrl}>
                  {currentPage?.title || loadedUrl}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {currentComments.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">
                    <p className="text-sm">No comments yet</p>
                    <p className="text-xs mt-1">Click on the page to add feedback</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {currentComments.map((comment) => {
                      const userColor = getUserColor(comment.author)
                      const initial = comment.author.charAt(0).toUpperCase()

                      return (
                        <div
                          key={comment.id}
                          onClick={() => setSelectedCommentId(comment.id)}
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
              {currentComments.length > 0 && (
                <div className="p-3 border-t bg-gray-50">
                  <button
                    onClick={() => {
                      const md = currentComments
                        .map((c, i) => `${i + 1}. ${c.resolved ? '~~' : ''}${c.text}${c.resolved ? '~~' : ''}`)
                        .join('\n')
                      navigator.clipboard.writeText(md)
                      alert('Copied!')
                    }}
                    className="w-full text-sm px-3 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    Copy as Markdown
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {appContent}
      {showAddPage && currentProject && (
        <AddPageModal
          projectId={currentProject.id}
          onClose={() => setShowAddPage(false)}
          onCreated={handlePageCreated}
        />
      )}
      {renamingPage && currentProject && (
        <RenamePageModal
          projectId={currentProject.id}
          pageId={renamingPage.id}
          currentTitle={renamingPage.title}
          onClose={() => setRenamingPage(null)}
          onRenamed={handlePageRenamed}
        />
      )}
    </>
  )
}

export default App
