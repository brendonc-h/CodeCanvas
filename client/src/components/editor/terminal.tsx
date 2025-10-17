import { useEffect, useRef } from "react"
import { Terminal as XTerm } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import "@xterm/xterm/css/xterm.css"
import { Button } from "@/components/ui/button"
import { Trash2, X } from "lucide-react"

interface TerminalProps {
  projectId: string
}

export function Terminal({ projectId }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!terminalRef.current) return

    // Initialize xterm
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      theme: {
        background: '#1a1a1f',
        foreground: '#e5e7eb',
        cursor: '#60a5fa',
        black: '#1a1a1f',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e5e7eb',
        brightBlack: '#4b5563',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#f3f4f6',
      },
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    
    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Connect WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal/${projectId}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      term.writeln('Terminal connected. Type commands below:')
      term.write('$ ')
    }

    ws.onmessage = (event) => {
      term.write(event.data)
    }

    ws.onerror = () => {
      term.writeln('\r\n\x1b[31mWebSocket connection error\x1b[0m')
    }

    ws.onclose = () => {
      term.writeln('\r\n\x1b[33mTerminal disconnected\x1b[0m')
    }

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    })

    wsRef.current = ws

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
    })
    resizeObserver.observe(terminalRef.current)

    return () => {
      resizeObserver.disconnect()
      ws.close()
      term.dispose()
    }
  }, [projectId])

  const handleClear = () => {
    xtermRef.current?.clear()
  }

  const handleKill = () => {
    if (wsRef.current) {
      wsRef.current.send('\x03') // Send Ctrl+C
    }
  }

  return (
    <div className="flex flex-col h-full bg-card border-t border-card-border">
      <div className="h-10 border-b border-border bg-sidebar flex items-center justify-between px-3">
        <h3 className="text-sm font-semibold" data-testid="text-terminal">Terminal</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleClear}
            data-testid="button-clear-terminal"
            aria-label="Clear terminal"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleKill}
            data-testid="button-kill-process"
            aria-label="Kill process"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div ref={terminalRef} className="flex-1 p-2" data-testid="terminal-content" />
    </div>
  )
}
