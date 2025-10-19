import { Keyboard } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ShortcutItem {
  keys: string
  description: string
  category: string
}

const shortcuts: ShortcutItem[] = [
  { keys: "Cmd/Ctrl + S", description: "Save current file", category: "File Operations" },
  { keys: "Cmd/Ctrl + B", description: "Toggle file tree", category: "Panels" },
  { keys: "Cmd/Ctrl + J", description: "Toggle terminal", category: "Panels" },
  { keys: "Cmd/Ctrl + K", description: "Toggle AI panel", category: "Panels" },
  { keys: "Cmd/Ctrl + P", description: "Toggle preview", category: "Panels" },
  { keys: "Cmd/Ctrl + R", description: "Run dev server", category: "Commands" },
  { keys: "Cmd/Ctrl + Shift + B", description: "Build project", category: "Commands" },
]

const categories = Array.from(new Set(shortcuts.map(s => s.category)))

export function KeyboardShortcutsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="View keyboard shortcuts">
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{category}</h3>
              <div className="space-y-2">
                {shortcuts
                  .filter(s => s.category === category)
                  .map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <kbd className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
