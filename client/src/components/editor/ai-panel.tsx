import { useState, useEffect, useMemo } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Sparkles, Send, Copy, RotateCw, CheckCircle, Code2, FileCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DiffViewer } from "./diff-viewer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { apiRequest } from "@/lib/queryClient"

interface Message {
  role: 'user' | 'assistant'
  content: string
  hasCode?: boolean
  extractedCode?: string
}

interface AiPanelProps {
  projectId: string
  currentFile: string | null
  currentContent: string
  onApplyPatch: (content: string) => void
}

interface Model {
  value: string
  label: string
}

// Extract code blocks from AI response (supports ```language ... ``` format)
function extractCodeFromResponse(text: string): string | null {
  const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/
  const match = text.match(codeBlockRegex)
  return match ? match[1].trim() : null
}

export function AiPanel({ projectId, currentFile, currentContent, onApplyPatch }: AiPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState('')
  const [provider, setProvider] = useState('groq')
  const [mode, setMode] = useState<'explain' | 'refactor' | 'generate' | 'review' | 'test'>('explain')
  const [showDiff, setShowDiff] = useState<number | null>(null)
  const { toast } = useToast()

  // Fetch available models for the selected provider
  const { data: modelsData, isLoading: modelsLoading } = useQuery<{ models: Model[] }>({
    queryKey: ['ai-models', provider],
    queryFn: () => apiRequest('GET', `/api/ai/models?provider=${provider}`).then(res => res.json()),
    enabled: !!provider,
  })

  const models: Model[] = modelsData?.models || []

  // Set default model when models load
  useEffect(() => {
    if (models.length > 0 && !model) {
      setModel(models[0].value)
    }
  }, [models, model])

  const aiMutation = useMutation({
    mutationFn: async (data: { prompt: string; model: string; provider?: string; filePath?: string; content?: string }) => {
      const res = await apiRequest('POST', '/api/ai/complete', {
        ...data,
        provider,
        projectId,
      })
      return res.json()
    },
    onSuccess: (data: any) => {
      const extractedCode = extractCodeFromResponse(data.response)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          hasCode: !!extractedCode,
          extractedCode: extractedCode || undefined,
        }
      ])
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Unknown error occurred'
      let description = "Failed to get AI response."

      // Handle provider-specific errors
      if (errorMessage.includes('API key')) {
        description = "Invalid or missing API key for this provider."
      } else if (errorMessage.includes('rate limit')) {
        description = "Rate limit exceeded. Please try again later."
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        description = "Network error. Check your connection and try again."
      } else if (errorMessage.includes('model not found')) {
        description = "Selected model is not available. Try a different model."
      }

      toast({
        title: "AI Error",
        description,
        variant: "destructive",
      })
    },
  })

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage = input
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setInput('')

    let prompt = userMessage

    // Build prompt based on mode
    switch (mode) {
      case 'explain':
        prompt = `Explain this code:\n\n${currentContent}\n\nQuestion: ${userMessage}`
        break
      case 'refactor':
        prompt = `Refactor this code:\n\n${currentContent}\n\nRequirements: ${userMessage}`
        break
      case 'generate':
        prompt = `Generate code: ${userMessage}`
        break
      case 'review':
        prompt = `Review this code for bugs, performance issues, and best practices:\n\n${currentContent}\n\nAdditional feedback: ${userMessage}`
        break
      case 'test':
        prompt = `Generate unit tests for this code:\n\n${currentContent}\n\nRequirements: ${userMessage}`
        break
    }

    aiMutation.mutate({
      prompt,
      model,
      provider,
      filePath: currentFile || undefined,
      content: currentContent || undefined,
    })
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({ title: "Copied to clipboard" })
  }

  return (
    <div className="flex flex-col h-full bg-card border-l border-card-border" style={{ width: '400px' }}>
      <div className="p-4 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-ai-accent" />
          <h3 className="text-sm font-semibold" data-testid="text-ai-assistant">AI Assistant</h3>
        </div>
        
        {/* Provider Selection */}
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger className="mb-3" data-testid="select-provider">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="groq" data-testid="provider-groq">Groq (Free & Fast)</SelectItem>
            <SelectItem value="openai" data-testid="provider-openai">OpenAI</SelectItem>
            <SelectItem value="anthropic" data-testid="provider-anthropic">Anthropic</SelectItem>
            <SelectItem value="grok" data-testid="provider-grok">Grok</SelectItem>
          </SelectContent>
        </Select>

        {/* Model Selection */}
        <Select value={model} onValueChange={setModel} disabled={modelsLoading}>
          <SelectTrigger data-testid="select-model">
            <SelectValue placeholder={modelsLoading ? "Loading models..." : "Select model"} />
          </SelectTrigger>
          <SelectContent>
            {models.map(m => (
              <SelectItem key={m.value} value={m.value} data-testid={`model-${m.value}`}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="mt-3">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="explain" data-testid="tab-explain">Explain</TabsTrigger>
            <TabsTrigger value="refactor" data-testid="tab-refactor">Refactor</TabsTrigger>
            <TabsTrigger value="generate" data-testid="tab-generate">Generate</TabsTrigger>
            <TabsTrigger value="review" data-testid="tab-review">Review</TabsTrigger>
            <TabsTrigger value="test" data-testid="tab-test">Test</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-12" data-testid="text-ai-empty">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Ask AI to help with your code</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-primary/10 ml-4'
                    : 'bg-ai-accent/10 mr-4'
                }`}
                data-testid={`message-${i}`}
              >
                <p className="text-sm font-medium mb-1 capitalize">{msg.role}</p>
                
                {/* Show diff viewer if code detected and diff view is active */}
                {msg.role === 'assistant' && msg.hasCode && showDiff === i ? (
                  <div className="mt-2 border border-border rounded-md overflow-hidden" style={{ maxHeight: '300px' }}>
                    <DiffViewer
                      original={currentContent}
                      modified={msg.extractedCode || ''}
                    />
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
                
                {msg.role === 'assistant' && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(msg.content)}
                      data-testid={`button-copy-${i}`}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    {msg.hasCode && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDiff(showDiff === i ? null : i)}
                          data-testid={`button-toggle-diff-${i}`}
                        >
                          <Code2 className="h-3 w-3 mr-1" />
                          {showDiff === i ? 'Hide Diff' : 'View Diff'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (msg.extractedCode) {
                              onApplyPatch(msg.extractedCode)
                            }
                          }}
                          data-testid={`button-apply-${i}`}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Apply Code
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-border bg-sidebar">
        <div className="flex gap-2">
          <Textarea
            placeholder={
              mode === 'explain'
                ? 'Ask about the code...'
                : mode === 'refactor'
                ? 'How should we refactor?'
                : mode === 'generate'
                ? 'What should we generate?'
                : mode === 'review'
                ? 'Additional review requirements...'
                : 'Test requirements...'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            className="min-h-[60px] resize-none"
            data-testid="textarea-ai-input"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={aiMutation.isPending || !input.trim()}
            data-testid="button-send-ai"
            aria-label="Send message"
          >
            {aiMutation.isPending ? (
              <RotateCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
