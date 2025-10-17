import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Sparkles, Send, Copy, RotateCw, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
}

interface AiPanelProps {
  projectId: string
  currentFile: string | null
  currentContent: string
  onApplyPatch: (content: string) => void
}

const models = [
  { value: 'qwen2.5-coder:7b', label: 'Qwen2.5-Coder 7B' },
  { value: 'codellama:7b', label: 'CodeLlama 7B' },
  { value: 'deepseek-coder:6.7b', label: 'DeepSeek Coder 6.7B' },
]

export function AiPanel({ projectId, currentFile, currentContent, onApplyPatch }: AiPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState('qwen2.5-coder:7b')
  const [mode, setMode] = useState<'explain' | 'refactor' | 'generate'>('explain')
  const { toast } = useToast()

  const aiMutation = useMutation({
    mutationFn: async (data: { prompt: string; model: string; filePath?: string; content?: string }) => {
      return apiRequest('POST', '/api/ai/complete', data)
    },
    onSuccess: (data: any) => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    },
    onError: () => {
      toast({
        title: "AI Error",
        description: "Failed to get AI response. Make sure Ollama is running.",
        variant: "destructive",
      })
    },
  })

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage = input
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setInput('')

    const prompt = mode === 'explain' 
      ? `Explain this code:\n\n${currentContent}\n\nQuestion: ${userMessage}`
      : mode === 'refactor'
      ? `Refactor this code:\n\n${currentContent}\n\nRequirements: ${userMessage}`
      : `Generate code: ${userMessage}`

    aiMutation.mutate({
      prompt,
      model,
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
        
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger data-testid="select-model">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {models.map(m => (
              <SelectItem key={m.value} value={m.value} data-testid={`model-${m.value}`}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="mt-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="explain" data-testid="tab-explain">Explain</TabsTrigger>
            <TabsTrigger value="refactor" data-testid="tab-refactor">Refactor</TabsTrigger>
            <TabsTrigger value="generate" data-testid="tab-generate">Generate</TabsTrigger>
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
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.role === 'assistant' && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(msg.content)}
                      data-testid={`button-copy-${i}`}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onApplyPatch(msg.content)}
                      data-testid={`button-apply-${i}`}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Apply
                    </Button>
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
                : 'What should we generate?'
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
