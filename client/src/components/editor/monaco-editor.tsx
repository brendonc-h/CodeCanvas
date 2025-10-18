import { Editor } from "@monaco-editor/react"
import { useTheme } from "@/components/theme-provider"
import { useEffect, useState } from "react"

interface MonacoEditorProps {
  value: string
  onChange: (value: string | undefined) => void
  language: string
  path: string
}

export function MonacoEditor({ value, onChange, language, path }: MonacoEditorProps) {
  const { theme } = useTheme()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={onChange}
      theme={theme === "dark" ? "vs-dark" : "light"}
      path={path}
      options={{
        minimap: { enabled: !isMobile }, // Disable minimap on mobile
        fontSize: isMobile ? 16 : 14, // Larger font on mobile
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        lineHeight: isMobile ? 24 : 20, // More spacing on mobile
        padding: { top: isMobile ? 20 : 16, bottom: isMobile ? 20 : 16 },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
        // Mobile-specific options
        mouseWheelZoom: !isMobile,
        cursorBlinking: isMobile ? "blink" : "smooth",
        renderWhitespace: isMobile ? "none" : "selection",
        bracketPairColorization: { enabled: !isMobile },
        guides: {
          bracketPairs: !isMobile,
          indentation: !isMobile,
        },
        // Better touch support
        multiCursorModifier: isMobile ? 'ctrlCmd' : 'alt',
        selectionHighlight: !isMobile,
        occurrencesHighlight: isMobile ? "off" : "singleFile",
        // Mobile keyboard improvements
        acceptSuggestionOnEnter: isMobile ? "on" : "off",
        tabCompletion: "on",
        suggestOnTriggerCharacters: true,
        quickSuggestions: isMobile ? false : true, // Disable quick suggestions on mobile to reduce UI clutter
      }}
    />
  )
}
