import { useState, useEffect } from "react"
import { useParams, useLocation } from "wouter"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  Play,
  Square,
  Package,
  Rocket,
  ArrowLeft,
  Eye,
  EyeOff,
  Settings,
  History,
  Keyboard,
  Smartphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { FileTree } from "@/components/editor/file-tree"
import { MonacoEditor } from "@/components/editor/monaco-editor"
import { Terminal } from "@/components/editor/terminal"
import { AiPanel } from "@/components/editor/ai-panel"
import { ThemeToggle } from "@/components/theme-toggle"
import type { Project, File } from "@shared/schema"

export default function Editor() {
  const { id } = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const { toast } = useToast()
  
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [deployDialogOpen, setDeployDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [siteId, setSiteId] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const { data: project } = useQuery<Project>({
    queryKey: ['/api/projects', id],
  })

  const { data: files = [], isLoading: filesLoading } = useQuery<File[]>({
    queryKey: ['/api/projects', id, 'files'],
  })

  const activeFileData = files.find(f => f.path === activeFile)

  useEffect(() => {
    if (activeFileData) {
      setEditorContent(activeFileData.content)
      setHasUnsavedChanges(false)
    }
  }, [activeFile, activeFileData])

  const saveFileMutation = useMutation({
    mutationFn: async (data: { path: string; content: string }) => {
      return apiRequest('PUT', `/api/projects/${id}/files`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id, 'files'] })
      setHasUnsavedChanges(false)
      toast({ title: "File saved" })
    },
  })

  const createFileMutation = useMutation({
    mutationFn: async (path: string) => {
      return apiRequest('POST', `/api/projects/${id}/files`, { path, content: '' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id, 'files'] })
      toast({ title: "File created" })
    },
  })

  const deleteFileMutation = useMutation({
    mutationFn: async (path: string) => {
      return apiRequest('DELETE', `/api/projects/${id}/files`, { path })
    },
    onSuccess: (_, deletedPath) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id, 'files'] })
      if (activeFile === deletedPath) setActiveFile(null)
      toast({ title: "File deleted" })
    },
  })

  const runCommandMutation = useMutation({
    mutationFn: async (command: string[]) => {
      return apiRequest('POST', '/api/runs', { projectId: id, command })
    },
    onSuccess: () => {
      toast({ title: "Command started" })
    },
  })

  const deployMutation = useMutation({
    mutationFn: async (data: { siteId?: string }) => {
      return apiRequest('POST', '/api/deploy/netlify', {
        projectId: id,
        siteId: data.siteId || undefined,
      })
    },
    onSuccess: (data: any) => {
      setDeployDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id, 'deployments'] })
      toast({
        title: "Deployment started",
        description: data.deployUrl ? `URL: ${data.deployUrl}` : "Building...",
      })
    },
  })

  const { data: deployments = [] } = useQuery({
    queryKey: ['/api/projects', id, 'deployments'],
    refetchInterval: 5000, // Poll every 5s for deployment status updates
  })

  const rollbackMutation = useMutation({
    mutationFn: async (deploymentId: string) => {
      return apiRequest('POST', '/api/deploy/rollback', { deploymentId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id, 'deployments'] })
      setHistoryDialogOpen(false)
      toast({
        title: "Rollback started",
        description: "Redeploying previous version...",
      })
    },
  })

  const handleEditorChange = (value: string | undefined) => {
    setEditorContent(value || '')
    setHasUnsavedChanges(true)
  }

  const handleSaveFile = () => {
    if (activeFile && hasUnsavedChanges) {
      saveFileMutation.mutate({ path: activeFile, content: editorContent })
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveFile()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeFile, editorContent, hasUnsavedChanges])

  const getLanguage = (path: string) => {
    const ext = path.split('.').pop()
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      json: 'json',
      css: 'css',
      html: 'html',
      md: 'markdown',
    }
    return langMap[ext || ''] || 'plaintext'
  }

  if (!id) return null

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="h-14 border-b border-border bg-sidebar flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            data-testid="button-back"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Mobile: Show device icon */}
          {isMobile && <Smartphone className="h-5 w-5 text-muted-foreground" />}
          
          <div className={`${isMobile ? 'hidden' : ''}`}>
            <h1 className="text-sm font-semibold" data-testid="text-project-name">
              {project?.name || 'Loading...'}
            </h1>
            {activeFile && (
              <p className="text-xs text-muted-foreground font-mono" data-testid="text-active-file">
                {activeFile}
                {hasUnsavedChanges && ' •'}
              </p>
            )}
          </div>
          
          {/* Mobile: Compact display */}
          {isMobile && activeFile && (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-mono truncate" data-testid="text-active-file-mobile">
                {activeFile.split('/').pop()}
                {hasUnsavedChanges && ' •'}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile: Menu button */}
          {isMobile ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              data-testid="button-mobile-menu"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runCommandMutation.mutate(['npm', 'ci'])}
                disabled={runCommandMutation.isPending}
                data-testid="button-install"
              >
                <Package className="h-4 w-4 mr-2" />
                Install
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runCommandMutation.mutate(['npm', 'run', 'dev'])}
                disabled={runCommandMutation.isPending}
                data-testid="button-dev"
              >
                <Play className="h-4 w-4 mr-2" />
                Dev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runCommandMutation.mutate(['npm', 'run', 'build'])}
                disabled={runCommandMutation.isPending}
                data-testid="button-build"
              >
                <Square className="h-4 w-4 mr-2" />
                Build
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeployDialogOpen(true)}
                data-testid="button-deploy"
              >
                <Rocket className="h-4 w-4 mr-2" />
                Deploy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryDialogOpen(true)}
                data-testid="button-history"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                data-testid="button-toggle-preview"
              >
                {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                Preview
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobile && showMobileMenu && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg p-4 w-full max-w-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Quick Actions</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileMenu(false)}
              >
                ✕
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  runCommandMutation.mutate(['npm', 'ci'])
                  setShowMobileMenu(false)
                }}
                disabled={runCommandMutation.isPending}
              >
                <Package className="h-4 w-4 mr-1" />
                Install
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  runCommandMutation.mutate(['npm', 'run', 'dev'])
                  setShowMobileMenu(false)
                }}
                disabled={runCommandMutation.isPending}
              >
                <Play className="h-4 w-4 mr-1" />
                Dev
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  runCommandMutation.mutate(['npm', 'run', 'build'])
                  setShowMobileMenu(false)
                }}
                disabled={runCommandMutation.isPending}
              >
                <Square className="h-4 w-4 mr-1" />
                Build
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleSaveFile()
                  setShowMobileMenu(false)
                }}
                disabled={!hasUnsavedChanges}
              >
                💾 Save
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeployDialogOpen(true)
                  setShowMobileMenu(false)
                }}
              >
                <Rocket className="h-4 w-4 mr-1" />
                Deploy
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPreview(!showPreview)
                  setShowMobileMenu(false)
                }}
              >
                {showPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Editor Layout */}
      <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
        {/* File Tree - Collapsible on mobile */}
        <div className={`${isMobile ? 'w-full h-48' : 'w-64'} flex-shrink-0 border-b md:border-b-0 md:border-r border-border`}>
          {!filesLoading && (
            <FileTree
              files={files}
              activeFile={activeFile}
              onFileSelect={setActiveFile}
              onFileCreate={(path) => createFileMutation.mutate(path)}
              onFileDelete={(path) => deleteFileMutation.mutate(path)}
            />
          )}
        </div>

        {/* Editor & Terminal */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Monaco Editor */}
          <div className={`${isMobile ? 'h-96' : 'flex-1'} bg-background`}>
            {activeFile ? (
              <MonacoEditor
                value={editorContent}
                onChange={handleEditorChange}
                language={getLanguage(activeFile)}
                path={activeFile}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Settings className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p data-testid="text-no-file">Select a file to start editing</p>
                </div>
              </div>
            )}
          </div>

          {/* Terminal - Smaller on mobile */}
          <div className={`${isMobile ? 'h-48' : 'h-64'} border-t border-border`}>
            <Terminal projectId={id} />
          </div>
        </div>

        {/* AI Panel - Hidden on mobile by default */}
        {!isMobile && (
          <AiPanel
            projectId={id}
            currentFile={activeFile}
            currentContent={editorContent}
            onApplyPatch={(content) => {
              setEditorContent(content)
              setHasUnsavedChanges(true)
              toast({ title: "Patch applied", description: "Don't forget to save!" })
            }}
          />
        )}

        {/* Preview Panel - Responsive */}
        {showPreview && (
          <div className={`${isMobile ? 'fixed inset-0 z-40 bg-background' : 'w-96'} border-l border-border bg-card`}>
            <div className="h-10 border-b border-border bg-sidebar flex items-center px-3 justify-between">
              <h3 className="text-sm font-semibold" data-testid="text-preview">Preview</h3>
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                >
                  ✕
                </Button>
              )}
            </div>
            <iframe
              src={`/preview/${id}`}
              className="w-full h-full"
              title="Preview"
              data-testid="iframe-preview"
            />
          </div>
        )}
      </div>

      {/* Deploy Dialog */}
      <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy to Netlify</DialogTitle>
            <DialogDescription>
              Deploy your project to Netlify. Optionally provide a site ID to update an existing site.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="siteId">Netlify Site ID (optional)</Label>
              <Input
                id="siteId"
                placeholder="your-site-id"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                data-testid="input-site-id"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeployDialogOpen(false)} data-testid="button-cancel-deploy">
              Cancel
            </Button>
            <Button
              onClick={() => deployMutation.mutate({ siteId })}
              disabled={deployMutation.isPending}
              data-testid="button-confirm-deploy"
            >
              {deployMutation.isPending ? 'Deploying...' : 'Deploy'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deployment History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deployment History</DialogTitle>
            <DialogDescription>
              View all deployments for this project. Click rollback to redeploy a previous version.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {deployments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-deployments">
                No deployments yet. Click Deploy to create your first deployment.
              </p>
            ) : (
              deployments.map((deployment: any) => (
                <div
                  key={deployment.id}
                  className="border border-border rounded-md p-4 space-y-2"
                  data-testid={`deployment-${deployment.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            deployment.status === 'success' ? 'default' :
                            deployment.status === 'failed' ? 'destructive' :
                            'secondary'
                          }
                          data-testid={`badge-status-${deployment.id}`}
                        >
                          {deployment.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground" data-testid={`text-date-${deployment.id}`}>
                          {new Date(deployment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {deployment.deployUrl && (
                        <a
                          href={deployment.deployUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline block truncate"
                          data-testid={`link-url-${deployment.id}`}
                        >
                          {deployment.deployUrl}
                        </a>
                      )}
                      {deployment.buildLog && deployment.status === 'failed' && (
                        <p className="text-xs text-destructive mt-1" data-testid={`text-error-${deployment.id}`}>
                          Error: {deployment.buildLog}
                        </p>
                      )}
                    </div>
                    {deployment.status === 'success' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rollbackMutation.mutate(deployment.id)}
                        disabled={rollbackMutation.isPending}
                        data-testid={`button-rollback-${deployment.id}`}
                      >
                        Rollback
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
