import { useState, useEffect } from 'react'
import { User, Project } from '../types'
import { getUserProjects, getSharedProjects, deleteProject } from '../api'
import { ShareModal } from './ShareModal'
import { RenameProjectModal } from './RenameProjectModal'
import { ProjectCard } from './ProjectCard'
import { EmptyState } from './EmptyState'

interface DashboardProps {
  user: User
  onLogout: () => void
  onOpenProject: (project: Project) => void
  onNewProject: () => void
}

interface ProjectListProps {
  title: string
  projects: Project[]
  isOwner: boolean
  onOpenProject: (project: Project) => void
  onShare: (projectId: string) => void
  onDelete: (projectId: string, e: React.MouseEvent) => void
  onRename: (project: Project) => void
  deleting: string | null
}

function ProjectList({
  title,
  projects,
  isOwner,
  onOpenProject,
  onShare,
  onDelete,
  onRename,
  deleting,
}: ProjectListProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      {projects.length === 0 ? (
        <EmptyState title="No projects" description="Create a new project to get started" />
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isOwner={isOwner}
              onOpen={() => onOpenProject(project)}
              onShare={() => onShare(project.id)}
              onDelete={(e) => onDelete(project.id, e)}
              onRename={() => onRename(project)}
              deleting={deleting}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function Dashboard({ user, onLogout, onOpenProject, onNewProject }: DashboardProps) {
  const [myProjects, setMyProjects] = useState<Project[]>([])
  const [sharedProjects, setSharedProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [sharing, setSharing] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<Project | null>(null)

  useEffect(() => {
    loadProjects()
  }, [user.id])

  const loadProjects = async () => {
    try {
      const [my, shared] = await Promise.all([
        getUserProjects(user.id),
        getSharedProjects(user.id),
      ])
      setMyProjects(my)
      setSharedProjects(shared)
    } catch (err) {
      console.error('Failed to load projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this project and all its comments?')) return

    setDeleting(projectId)
    try {
      await deleteProject(projectId)
      setMyProjects(myProjects.filter((p) => p.id !== projectId))
    } catch (err) {
      console.error('Failed to delete project:', err)
    } finally {
      setDeleting(null)
    }
  }

  const handleRename = (project: Project) => {
    setRenaming(project)
  }

  const handleProjectRenamed = (updatedProject: Project) => {
    setMyProjects(myProjects.map(p => p.id === updatedProject.id ? updatedProject : p))
    setRenaming(null)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-blue-600">Annotate</h1>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600">Design Review Tool</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Hi, {user.name}</span>
            <button
              onClick={onLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-gray-800">Dashboard</h2>
          <button
            onClick={onNewProject}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New Project
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading projects...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-8">
            <ProjectList
              title="My Projects"
              projects={myProjects}
              isOwner={true}
              onOpenProject={onOpenProject}
              onShare={setSharing}
              onDelete={handleDelete}
              onRename={handleRename}
              deleting={deleting}
            />
            <ProjectList
              title="Shared to Me"
              projects={sharedProjects}
              isOwner={false}
              onOpenProject={onOpenProject}
              onShare={() => {}}
              onDelete={() => {}}
              onRename={() => {}}
              deleting={null}
            />
          </div>
        )}
      </main>

      {/* Share Modal */}
      {sharing && myProjects.find((p) => p.id === sharing) && (
        <ShareModal
          projectId={sharing}
          projectTitle={myProjects.find((p) => p.id === sharing)?.title || ''}
          onClose={() => setSharing(null)}
          onShared={() => {
            setSharing(null)
            loadProjects()
          }}
        />
      )}

      {/* Rename Modal */}
      {renaming && (
        <RenameProjectModal
          projectId={renaming.id}
          currentTitle={renaming.title}
          onClose={() => setRenaming(null)}
          onRenamed={handleProjectRenamed}
        />
      )}
    </div>
  )
}
