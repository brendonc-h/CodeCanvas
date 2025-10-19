import { useQuery } from "@tanstack/react-query"
import { Circle, Server, Terminal as TerminalIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface SandboxStatusProps {
  projectId: string
  onStartDev?: () => void
}

export function SandboxStatus({ projectId, onStartDev }: SandboxStatusProps) {
  const { data: sandbox, isLoading } = useQuery<any>({
    queryKey: ['/api/projects', projectId, 'sandbox'],
    refetchInterval: 5000, // Poll every 5 seconds
  })

  if (isLoading) {
    return null
  }

  const isRunning = sandbox && sandbox.containerId
  const hasPort = sandbox && sandbox.port

  return (
    <div className="px-3 py-2 border-b border-border bg-muted/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Circle 
            className={`h-2 w-2 fill-current ${
              isRunning ? 'text-green-500' : 'text-gray-400'
            }`}
          />
          <span className="text-xs font-medium">
            {isRunning ? 'Sandbox Running' : 'No Sandbox'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasPort && (
            <Badge variant="secondary" className="text-xs">
              <Server className="h-3 w-3 mr-1" />
              Port: {sandbox.port}
            </Badge>
          )}
          
          {!isRunning && onStartDev && (
            <Button
              size="sm"
              variant="outline"
              onClick={onStartDev}
              className="h-6 text-xs"
            >
              Start Dev Server
            </Button>
          )}
        </div>
      </div>

      {!isRunning && (
        <p className="text-xs text-muted-foreground mt-1">
          Click "Dev" or "Install" to start a sandbox for terminal and preview
        </p>
      )}
    </div>
  )
}
