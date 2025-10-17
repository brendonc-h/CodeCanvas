import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Link } from "wouter"
import { Plus, Folder, Trash2, Code2, FileCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"
import type { Project, TemplateType } from "@shared/schema"
import { ThemeToggle } from "@/components/theme-toggle"

const templates = [
  {
    id: 'vite-react-ts' as TemplateType,
    name: 'Vite + React + TypeScript',
    description: 'Modern React app with Vite bundler',
    icon: Code2,
  },
  {
    id: 'next-static' as TemplateType,
    name: 'Next.js Static',
    description: 'Next.js with static export',
    icon: FileCode,
  },
  {
    id: 'vanilla-js' as TemplateType,
    name: 'Vanilla JavaScript',
    description: 'Plain HTML, CSS, and JS',
    icon: Folder,
  },
]

export default function Dashboard() {
  const [open, setOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('vite-react-ts')
  const [projectName, setProjectName] = useState('')
  const { toast } = useToast()

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  })

  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; template: TemplateType }) => {
      return apiRequest('POST', '/api/projects', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] })
      setOpen(false)
      setProjectName('')
      toast({
        title: "Project created",
        description: "Your new project is ready to code!",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      })
    },
  })

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/projects/${id}`, undefined)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] })
      toast({
        title: "Project deleted",
        description: "Project has been removed",
      })
    },
  })

  const handleCreateProject = () => {
    if (!projectName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project name",
        variant: "destructive",
      })
      return
    }
    createProjectMutation.mutate({ name: projectName, template: selectedTemplate })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-sidebar flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Code2 className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold" data-testid="text-app-title">Web IDE</h1>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-project">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl">Create New Project</DialogTitle>
                <DialogDescription>
                  Choose a template and name your project
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    placeholder="my-awesome-project"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    data-testid="input-project-name"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Template</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {templates.map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-colors hover-elevate ${
                          selectedTemplate === template.id
                            ? 'border-primary'
                            : ''
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                        data-testid={`card-template-${template.id}`}
                      >
                        <CardHeader className="pb-3">
                          <template.icon className="h-10 w-10 text-muted-foreground mb-2" />
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {template.description}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateProject}
                  disabled={createProjectMutation.isPending}
                  data-testid="button-create"
                >
                  {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <>
            <h2 className="text-2xl font-bold mb-6" data-testid="text-projects-heading">Your Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.id} className="hover-elevate transition-colors" data-testid={`card-project-${project.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1" data-testid={`text-project-name-${project.id}`}>
                          {project.name}
                        </CardTitle>
                        <CardDescription className="text-sm font-mono" data-testid={`text-project-template-${project.id}`}>
                          {project.template}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault()
                          deleteProjectMutation.mutate(project.id)
                        }}
                        data-testid={`button-delete-${project.id}`}
                        aria-label="Delete project"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/p/${project.id}`}>
                      <Button variant="outline" className="w-full" data-testid={`button-open-${project.id}`}>
                        Open Project
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Folder className="h-24 w-24 text-muted-foreground mb-4" />
            <h3 className="text-2xl font-semibold mb-2" data-testid="text-empty-state">
              No projects yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Create your first project to get started
            </p>
            <Button onClick={() => setOpen(true)} data-testid="button-create-first">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
