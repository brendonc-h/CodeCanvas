import { useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DiffViewerProps {
  original: string
  modified: string
}

interface DiffLine {
  type: 'add' | 'remove' | 'unchanged'
  content: string
  lineNumber: number
}

function computeDiff(original: string, modified: string): DiffLine[] {
  const originalLines = original.split('\n')
  const modifiedLines = modified.split('\n')
  const diff: DiffLine[] = []

  // Simple line-by-line diff (not a full Myers diff algorithm)
  // This is a basic implementation for demonstration
  const maxLen = Math.max(originalLines.length, modifiedLines.length)
  
  let origIdx = 0
  let modIdx = 0

  while (origIdx < originalLines.length || modIdx < modifiedLines.length) {
    const origLine = originalLines[origIdx]
    const modLine = modifiedLines[modIdx]

    if (origIdx >= originalLines.length) {
      // Only modified lines left
      diff.push({
        type: 'add',
        content: modLine,
        lineNumber: modIdx + 1
      })
      modIdx++
    } else if (modIdx >= modifiedLines.length) {
      // Only original lines left
      diff.push({
        type: 'remove',
        content: origLine,
        lineNumber: origIdx + 1
      })
      origIdx++
    } else if (origLine === modLine) {
      // Lines match
      diff.push({
        type: 'unchanged',
        content: origLine,
        lineNumber: origIdx + 1
      })
      origIdx++
      modIdx++
    } else {
      // Lines differ - check if it's an addition or removal
      // Look ahead to see if we can find a match
      const nextOrigMatch = modifiedLines.slice(modIdx + 1, modIdx + 5).indexOf(origLine)
      const nextModMatch = originalLines.slice(origIdx + 1, origIdx + 5).indexOf(modLine)

      if (nextOrigMatch !== -1 && (nextModMatch === -1 || nextOrigMatch < nextModMatch)) {
        // Addition detected
        diff.push({
          type: 'add',
          content: modLine,
          lineNumber: modIdx + 1
        })
        modIdx++
      } else if (nextModMatch !== -1) {
        // Removal detected
        diff.push({
          type: 'remove',
          content: origLine,
          lineNumber: origIdx + 1
        })
        origIdx++
      } else {
        // Both lines changed - show as remove + add
        diff.push({
          type: 'remove',
          content: origLine,
          lineNumber: origIdx + 1
        })
        diff.push({
          type: 'add',
          content: modLine,
          lineNumber: modIdx + 1
        })
        origIdx++
        modIdx++
      }
    }
  }

  return diff
}

export function DiffViewer({ original, modified }: DiffViewerProps) {
  const diffLines = useMemo(() => computeDiff(original, modified), [original, modified])

  return (
    <ScrollArea className="h-full">
      <div className="font-mono text-xs">
        {diffLines.map((line, idx) => (
          <div
            key={idx}
            className={`px-3 py-0.5 ${
              line.type === 'add'
                ? 'bg-green-500/20 text-green-300'
                : line.type === 'remove'
                ? 'bg-red-500/20 text-red-300'
                : 'bg-transparent'
            }`}
          >
            <span className="inline-block w-6 text-muted-foreground select-none mr-2">
              {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
            </span>
            <span className="whitespace-pre">{line.content || ' '}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
