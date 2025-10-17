import { Editor } from "@monaco-editor/react"
import { useTheme } from "@/components/theme-provider"

interface MonacoEditorProps {
  value: string
  onChange: (value: string | undefined) => void
  language: string
  path: string
}

export function MonacoEditor({ value, onChange, language, path }: MonacoEditorProps) {
  const { theme } = useTheme()

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={onChange}
      theme={theme === "dark" ? "vs-dark" : "light"}
      path={path}
      options={{
        minimap: { enabled: true },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        lineHeight: 20,
        padding: { top: 16, bottom: 16 },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
      }}
    />
  )
}
