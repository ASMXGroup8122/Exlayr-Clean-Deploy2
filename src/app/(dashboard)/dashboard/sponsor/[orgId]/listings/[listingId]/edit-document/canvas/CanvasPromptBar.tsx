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
  onWidthChange?: (width: number) => void;
}

export default function CanvasPromptBar({
  isVisible,
  onToggle,
  activeFieldId,
  activeFieldTitle,
  activeFieldContent,
  onInsertContent,
  documentId,
  onWidthChange
}: CanvasPromptBarProps) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(CANVAS_AGENTS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [copiedResponseId, setCopiedResponseId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-focus textarea when visible
  useEffect(() => {
    if (isVisible && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isVisible]);

  // Notify parent of width changes
  useEffect(() => {
    if (onWidthChange) {
      onWidthChange(panelWidth);
    }
  }, [panelWidth, onWidthChange]);

  // Handle mouse resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = panelWidth;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startX - e.clientX;
      const maxWidth = typeof window !== 'undefined' ? window.innerWidth * 0.8 : 1200;
      const newWidth = Math.min(Math.max(400, startWidth + deltaX), maxWidth);
      setPanelWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelWidth]);

  // Preset width options
  const handleWidthPreset = useCallback((width: number) => {
    setPanelWidth(width);
  }, []);

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
      {/* Mobile Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
        onClick={onToggle}
      />
      
      {/* Side Panel */}
      <div 
        ref={panelRef}
        className="fixed right-0 top-0 h-full bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200"
        style={{ 
          width: isMounted && typeof window !== 'undefined' 
            ? (window.innerWidth >= 1024 ? `${panelWidth}px` : window.innerWidth >= 640 ? '400px' : '100%')
            : '480px'
        }}
      >
        {/* Resize Handle - Desktop Only */}
        <div 
          className={`absolute left-0 top-0 w-2 h-full cursor-col-resize transition-all duration-200 hidden lg:block group ${
            isResizing ? 'bg-blue-500' : 'hover:bg-blue-500/20'
          }`}
          onMouseDown={handleMouseDown}
          title="Drag to resize panel"
        >
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 transition-all duration-200 rounded-r-sm ${
            isResizing ? 'bg-blue-600' : 'bg-gray-300 group-hover:bg-blue-500'
          }`} />
          <div className={`absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-8 transition-all duration-200 rounded-r-sm ${
            isResizing ? 'bg-blue-400' : 'bg-gray-400 group-hover:bg-blue-300'
          }`} />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex-shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900 text-sm sm:text-base">AI Assistant</h2>
                {isMounted && typeof window !== 'undefined' && window.innerWidth >= 1024 && (
                  <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                    {panelWidth}px
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                {activeFieldId ? `Working on: ${activeFieldTitle}` : 'Ready to help'}
              </p>
            </div>
          </div>
          
          {/* Width Controls - Desktop Only */}
          <div className="hidden lg:flex items-center gap-1 mr-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleWidthPreset(480)}
              className={`h-7 w-7 p-0 text-xs font-medium rounded-md transition-all ${
                panelWidth === 480 
                  ? 'bg-blue-100 text-blue-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title="Small width (480px)"
            >
              S
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleWidthPreset(640)}
              className={`h-7 w-7 p-0 text-xs font-medium rounded-md transition-all ${
                panelWidth === 640 
                  ? 'bg-blue-100 text-blue-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title="Medium width (640px)"
            >
              M
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleWidthPreset(800)}
              className={`h-7 w-7 p-0 text-xs font-medium rounded-md transition-all ${
                panelWidth === 800 
                  ? 'bg-blue-100 text-blue-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title="Large width (800px)"
            >
              L
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleWidthPreset(1000)}
              className={`h-7 w-8 p-0 text-xs font-medium rounded-md transition-all ${
                panelWidth === 1000 
                  ? 'bg-blue-100 text-blue-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title="Extra large width (1000px)"
            >
              XL
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0 hover:bg-white/50 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Agent Selection */}
        <div className="p-4 sm:p-6 border-b bg-gray-50 flex-shrink-0">
          <p className="text-sm font-medium text-gray-700 mb-3 sm:mb-4">Choose your AI agent:</p>
          <div className="grid grid-cols-1 gap-2 sm:gap-3">
            {CANVAS_AGENTS.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={cn(
                  "w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-200 text-left group",
                  selectedAgent.id === agent.id
                    ? `${agent.bgColor} ${agent.borderColor} ${agent.textColor} shadow-md`
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm"
                )}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={cn(
                    "p-2 sm:p-3 rounded-md sm:rounded-lg transition-all duration-200 flex-shrink-0",
                    selectedAgent.id === agent.id 
                      ? `bg-gradient-to-r ${agent.color} text-white shadow-sm`
                      : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                  )}>
                    {React.cloneElement(agent.icon, { className: "w-4 h-4 sm:w-5 sm:h-5" })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm sm:text-base mb-0.5 sm:mb-1">{agent.name}</div>
                    <div className="text-xs sm:text-sm opacity-80 leading-relaxed">{agent.description}</div>
                  </div>
                  {selectedAgent.id === agent.id && (
                    <div className="flex-shrink-0">
                      <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                {responses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-16">
                    <div className="p-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl mb-6">
                      <MessageSquare className="h-12 w-12 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Start a conversation</h3>
                    <p className="text-base text-gray-600 max-w-sm leading-relaxed">
                      Ask {selectedAgent.name} anything about your document. I'm here to help with research, writing, and analysis!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {responses.map((response) => (
                      <Card key={response.id} className="p-6 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                              <Zap className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <span className="text-base font-semibold text-gray-900">{response.agentName}</span>
                              <div className="text-sm text-gray-500 mt-0.5">
                                {response.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(response)}
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            {copiedResponseId === response.id ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        
                        <div className="prose prose-base max-w-none mb-5">
                          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-base">{response.content}</p>
                        </div>

                        {response.fieldContext && (
                          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleInsert(response, 'insert')}
                              className="text-sm h-9 px-4 hover:bg-blue-50 hover:border-blue-300"
                            >
                              Insert
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleInsert(response, 'replace')}
                              className="text-sm h-9 px-4 hover:bg-blue-50 hover:border-blue-300"
                            >
                              Replace
                            </Button>
                            <span className="text-sm text-gray-500 ml-auto font-medium">
                              → {response.fieldContext.fieldTitle}
                            </span>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="p-4 sm:p-6 border-t bg-white flex-shrink-0">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${selectedAgent.name} anything about your document...`}
                className="min-h-[80px] sm:min-h-[100px] pr-12 sm:pr-14 resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base leading-relaxed"
                disabled={isLoading}
              />
              <Button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isLoading}
                size="sm"
                className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 h-8 w-8 sm:h-10 sm:w-10 p-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2 sm:mt-3 text-xs sm:text-sm text-gray-500">
              <span className="hidden sm:inline">Press Cmd/Ctrl + Enter to send</span>
              <span className="sm:hidden">Cmd/Ctrl + Enter to send</span>
              <span className="font-mono">{prompt.length}/1000</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 