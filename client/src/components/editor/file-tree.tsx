import { useState } from "react"
import { ChevronRight, ChevronDown, File as FileIcon, Folder, FolderOpen, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { File } from "@shared/schema"

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileTreeNode[]
}

interface FileTreeProps {
  files: File[]
  activeFile: string | null
  onFileSelect: (path: string) => void
  onFileCreate: (path: string) => void
  onFileDelete: (path: string) => void
}

function buildFileTree(files: File[]): FileTreeNode[] {
  const root: FileTreeNode[] = []
  
  files.forEach(file => {
    const parts = file.path.split('/')
    let current = root
    
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1
      const path = parts.slice(0, index + 1).join('/')
      
      let existing = current.find(n => n.name === part)
      
      if (!existing) {
        existing = {
          name: part,
          path,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
        }
        current.push(existing)
      }
      
      if (!isFile && existing.children) {
        current = existing.children
      }
    })
  })
  
  return root.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function TreeNode({
  node,
  activeFile,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  level = 0,
}: {
  node: FileTreeNode
  activeFile: string | null
  onFileSelect: (path: string) => void
  onFileCreate: (path: string) => void
  onFileDelete: (path: string) => void
  level?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const isActive = activeFile === node.path

  const handleClick = () => {
    if (node.type === 'file') {
      onFileSelect(node.path)
    } else {
      setExpanded(!expanded)
    }
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={`flex items-center h-8 px-2 rounded-sm cursor-pointer transition-colors hover-elevate ${
              isActive ? 'bg-primary/10 border-l-2 border-primary' : ''
            }`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={handleClick}
            data-testid={`tree-item-${node.path}`}
          >
            {node.type === 'folder' ? (
              <>
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground mr-1" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground mr-1" />
                )}
                {expanded ? (
                  <FolderOpen className="h-4 w-4 text-muted-foreground mr-2" />
                ) : (
                  <Folder className="h-4 w-4 text-muted-foreground mr-2" />
                )}
              </>
            ) : (
              <FileIcon className="h-4 w-4 text-muted-foreground mr-2 ml-5" />
            )}
            <span className="text-sm truncate">{node.name}</span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {node.type === 'folder' && (
            <ContextMenuItem onClick={() => onFileCreate(node.path)} data-testid={`menu-new-file-${node.path}`}>
              <Plus className="h-4 w-4 mr-2" />
              New File
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={() => onFileDelete(node.path)} data-testid={`menu-delete-${node.path}`}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {node.type === 'folder' && expanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.path}
              node={child}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
              onFileCreate={onFileCreate}
              onFileDelete={onFileDelete}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({ files, activeFile, onFileSelect, onFileCreate, onFileDelete }: FileTreeProps) {
  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false)
  const [newFilePath, setNewFilePath] = useState('')
  const [parentPath, setParentPath] = useState('')
  
  const tree = buildFileTree(files)

  const handleCreateFile = (path: string) => {
    setParentPath(path)
    setNewFilePath('')
    setNewFileDialogOpen(true)
  }

  const handleConfirmCreate = () => {
    if (newFilePath.trim()) {
      const fullPath = parentPath ? `${parentPath}/${newFilePath}` : newFilePath
      onFileCreate(fullPath)
      setNewFileDialogOpen(false)
      setNewFilePath('')
    }
  }

  return (
    <>
      <div className="h-full bg-sidebar border-r border-sidebar-border overflow-y-auto">
        <div className="p-3 border-b border-sidebar-border flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide" data-testid="text-explorer">
            Explorer
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleCreateFile('')}
            data-testid="button-new-file"
            aria-label="New file"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-2">
          {tree.map(node => (
            <TreeNode
              key={node.path}
              node={node}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
              onFileCreate={handleCreateFile}
              onFileDelete={onFileDelete}
            />
          ))}
        </div>
      </div>

      <Dialog open={newFileDialogOpen} onOpenChange={setNewFileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>
              {parentPath ? `Creating in: ${parentPath}` : 'Creating in root directory'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filename">File name</Label>
              <Input
                id="filename"
                placeholder="example.tsx"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmCreate()}
                data-testid="input-filename"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setNewFileDialogOpen(false)} data-testid="button-cancel-file">
              Cancel
            </Button>
            <Button onClick={handleConfirmCreate} data-testid="button-create-file">
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
