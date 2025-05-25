'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Sparkles, 
  Search, 
  PenTool, 
  BookOpen, 
  X, 
  Loader2,
  Copy,
  Check,
  ChevronRight,
  MessageSquare,
  Zap,
  ArrowUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

// Agent definitions with enhanced styling
const CANVAS_AGENTS = [
  {
    id: 'research',
    name: 'Deep Research',
    description: 'Conduct comprehensive research with citations',
    icon: <Search className="w-5 h-5" />,
    category: 'research' as const,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  {
    id: 'writer',
    name: 'Content Writer',
    description: 'Generate professional regulatory content',
    icon: <PenTool className="w-5 h-5" />,
    category: 'content' as const,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  },
  {
    id: 'knowledge',
    name: 'Knowledge Base',
    description: 'Access your organization\'s knowledge',
    icon: <BookOpen className="w-5 h-5" />,
    category: 'research' as const,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200'
  }
];

interface AIResponse {
  id: string;
  content: string;
  agentId: string;
  agentName: string;
  timestamp: Date;
  fieldContext?: {
    fieldId: string;
    fieldTitle: string;
    existingContent: string;
  };
}

interface CanvasPromptBarProps {
  isVisible: boolean;
  onToggle: () => void;
  activeFieldId?: string;
  activeFieldTitle?: string;
  activeFieldContent?: string;
  onInsertContent: (fieldId: string, content: string, mode: 'insert' | 'replace') => void;
  documentId: string;
}

export default function CanvasPromptBar({
  isVisible,
  onToggle,
  activeFieldId,
  activeFieldTitle,
  activeFieldContent,
  onInsertContent,
  documentId
}: CanvasPromptBarProps) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(CANVAS_AGENTS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [copiedResponseId, setCopiedResponseId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when visible
  useEffect(() => {
    if (isVisible && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isVisible]);

  // Handle prompt submission
  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isLoading) return;

    const userPrompt = prompt.trim();
    setPrompt('');
    setIsLoading(true);

    try {
      // Prepare context for the agent
      const context = activeFieldId ? {
        fieldId: activeFieldId,
        fieldTitle: activeFieldTitle || '',
        existingContent: activeFieldContent || '',
        documentId
      } : { documentId };

      // Call the appropriate agent endpoint
      let endpoint = '/api/ai/chat';
      let requestBody: any = {
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant helping with listing document creation. ${
              activeFieldId 
                ? `The user is currently working on the field "${activeFieldTitle}" which contains: "${activeFieldContent}".`
                : 'The user is working on a listing document.'
            } Provide helpful, specific, and actionable responses.`
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        orgId: documentId
      };

      // Customize request based on selected agent
      if (selectedAgent.id === 'research') {
        requestBody.messages[0].content += ' Focus on providing well-researched, factual information relevant to capital markets and listing requirements.';
      } else if (selectedAgent.id === 'writer') {
        requestBody.messages[0].content += ' Focus on generating clear, professional content suitable for regulatory documents.';
      } else if (selectedAgent.id === 'knowledge') {
        requestBody.messages[0].content += ' Draw from your knowledge of exchange listing requirements and best practices.';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Create AI response object
      const aiResponse: AIResponse = {
        id: Date.now().toString(),
        content: data.message || 'No response generated.',
        agentId: selectedAgent.id,
        agentName: selectedAgent.name,
        timestamp: new Date(),
        fieldContext: activeFieldId ? {
          fieldId: activeFieldId,
          fieldTitle: activeFieldTitle || '',
          existingContent: activeFieldContent || ''
        } : undefined
      };

      setResponses(prev => [aiResponse, ...prev]);

      toast({
        title: "AI Response Generated",
        description: `${selectedAgent.name} has provided a response.`,
      });

    } catch (error) {
      console.error('Error calling AI agent:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [prompt, selectedAgent, activeFieldId, activeFieldTitle, activeFieldContent, documentId, isLoading, toast]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onToggle();
    }
  }, [handleSubmit, onToggle]);

  // Handle content insertion
  const handleInsert = useCallback((response: AIResponse, mode: 'insert' | 'replace') => {
    if (!activeFieldId) {
      toast({
        title: "No Active Field",
        description: "Please click on a field to insert content.",
        variant: "destructive",
      });
      return;
    }

    onInsertContent(activeFieldId, response.content, mode);
    
    toast({
      title: "Content Inserted",
      description: `Content ${mode === 'insert' ? 'inserted into' : 'replaced in'} ${activeFieldTitle}.`,
    });
  }, [activeFieldId, activeFieldTitle, onInsertContent, toast]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async (response: AIResponse) => {
    try {
      await navigator.clipboard.writeText(response.content);
      setCopiedResponseId(response.id);
      setTimeout(() => setCopiedResponseId(null), 2000);
      
      toast({
        title: "Copied to Clipboard",
        description: "Response content copied successfully.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  }, [toast]);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onToggle}
      />
      
      {/* Side Panel */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col border-l">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">AI Assistant</h2>
              <p className="text-sm text-gray-600">
                {activeFieldId ? `Working on: ${activeFieldTitle}` : 'Ready to help'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0 hover:bg-white/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Agent Selection */}
        <div className="p-4 border-b bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-3">Choose your AI agent:</p>
          <div className="space-y-2">
            {CANVAS_AGENTS.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={cn(
                  "w-full p-3 rounded-lg border-2 transition-all duration-200 text-left",
                  selectedAgent.id === agent.id
                    ? `${agent.bgColor} ${agent.borderColor} ${agent.textColor}`
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-md",
                    selectedAgent.id === agent.id 
                      ? `bg-gradient-to-r ${agent.color} text-white`
                      : "bg-gray-100 text-gray-600"
                  )}>
                    {agent.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-xs opacity-75">{agent.description}</div>
                  </div>
                  {selectedAgent.id === agent.id && (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {responses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-4">
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Start a conversation</h3>
                <p className="text-sm text-gray-600 max-w-xs">
                  Ask {selectedAgent.name} anything about your document. I'm here to help!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {responses.map((response) => (
                  <Card key={response.id} className="p-4 border-l-4 border-l-blue-500">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-md">
                          <Zap className="h-3 w-3 text-white" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{response.agentName}</span>
                          <div className="text-xs text-gray-500">
                            {response.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(response)}
                        className="h-6 w-6 p-0"
                      >
                        {copiedResponseId === response.id ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="prose prose-sm max-w-none mb-4">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{response.content}</p>
                    </div>

                    {response.fieldContext && (
                      <div className="flex items-center gap-2 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInsert(response, 'insert')}
                          className="text-xs h-7"
                        >
                          Insert
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInsert(response, 'replace')}
                          className="text-xs h-7"
                        >
                          Replace
                        </Button>
                        <span className="text-xs text-gray-500 ml-auto">
                          → {response.fieldContext.fieldTitle}
                        </span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-white">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${selectedAgent.name} anything...`}
                className="min-h-[80px] pr-12 resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                disabled={isLoading}
              />
              <Button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isLoading}
                size="sm"
                className="absolute bottom-2 right-2 h-8 w-8 p-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>Press Cmd/Ctrl + Enter to send</span>
              <span>{prompt.length}/1000</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 