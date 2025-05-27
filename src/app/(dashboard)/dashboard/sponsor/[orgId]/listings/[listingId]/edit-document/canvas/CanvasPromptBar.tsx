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
  ArrowUp,
  AlertTriangle,
  Upload,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { type SectionContext, type AssistantMode } from '@/lib/ai/context/getSectionContext';
import { CanvasUploadModal } from '@/components/documents/CanvasUploadModal';
import { 
  storeSectionCompletion, 
  storeEntityFact, 
  storeToneReference,
  isMem0Configured 
} from '@/lib/ai/memory/mem0Client';

// Enhanced agent definitions with mode mapping
const CANVAS_AGENTS = [
  {
    id: 'document_completion',
    name: 'Content Writer',
    description: 'Generate content from structured data and documents',
    icon: <PenTool className="w-5 h-5" />,
    category: 'content' as const,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    mode: 'document_completion' as AssistantMode
  },
  {
    id: 'industry_research',
    name: 'Deep Research',
    description: 'Conduct research with citations and external data',
    icon: <Search className="w-5 h-5" />,
    category: 'research' as const,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    mode: 'industry_research' as AssistantMode
  },
  {
    id: 'regulatory_guidance',
    name: 'Compliance Assistant',
    description: 'Generate regulatory-compliant content',
    icon: <BookOpen className="w-5 h-5" />,
    category: 'compliance' as const,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    mode: 'regulatory_guidance' as AssistantMode
  },
  {
    id: 'agent_mode',
    name: 'Smart Agent',
    description: 'Autonomous mode selection and orchestration',
    icon: <Zap className="w-5 h-5" />,
    category: 'autonomous' as const,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    mode: 'agent_mode' as AssistantMode
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
  sectionContext?: SectionContext;
  sources?: string[];
  missingData?: string[];
  uploadRecommendation?: string;
}

interface CanvasPromptBarProps {
  isVisible: boolean;
  onToggle: () => void;
  activeFieldId?: string;
  activeFieldTitle?: string;
  activeFieldContent?: string;
  onInsertContent: (fieldId: string, content: string, mode: 'insert' | 'replace') => void;
  documentId: string;
  organizationId: string;
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
  organizationId,
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
  const [currentContext, setCurrentContext] = useState<SectionContext | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
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

  // Load context when active field changes
  useEffect(() => {
    if (activeFieldId && documentId) {
      loadSectionContext();
    }
  }, [activeFieldId, documentId]);

  // Auto-select agent based on field context
  useEffect(() => {
    if (currentContext?.mode) {
      const matchingAgent = CANVAS_AGENTS.find(agent => agent.mode === currentContext.mode);
      if (matchingAgent && matchingAgent.id !== selectedAgent.id) {
        setSelectedAgent(matchingAgent);
      }
    }
  }, [currentContext?.mode]);

  // Notify parent of width changes
  useEffect(() => {
    if (onWidthChange) {
      onWidthChange(panelWidth);
    }
  }, [panelWidth, onWidthChange]);

  // Handle AI prompt submission
  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    const currentPrompt = prompt;
    setPrompt('');

    try {
      // Create context-aware message
      const contextMessage = activeFieldId && activeFieldContent
        ? `Field: ${activeFieldTitle}\nCurrent content: ${activeFieldContent}\n\nUser request: ${currentPrompt}`
        : currentPrompt;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant helping with listing document creation. The user is working on a ${selectedAgent.name} task. ${
                currentContext ? `Context: ${JSON.stringify(currentContext)}` : ''
              }`
            },
            {
              role: 'user',
              content: contextMessage
            }
          ],
          orgId: organizationId
        }),
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
        content: data.message,
        agentId: selectedAgent.id,
        agentName: selectedAgent.name,
        timestamp: new Date(),
        fieldContext: activeFieldId ? {
          fieldId: activeFieldId,
          fieldTitle: activeFieldTitle || activeFieldId,
          existingContent: activeFieldContent || ''
        } : undefined,
        sectionContext: currentContext || undefined,
        sources: currentContext?.source_trace || [],
        missingData: currentContext?.missing_flags || []
      };

      setResponses(prev => [...prev, aiResponse]);

      toast({
        title: "AI Response Generated",
        description: `${selectedAgent.name} has provided a response`,
      });

    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [prompt, isLoading, activeFieldId, activeFieldTitle, activeFieldContent, selectedAgent, currentContext, organizationId, toast]);

  // Handle inserting AI response into field
  const handleInsert = useCallback(async (response: AIResponse, mode: 'insert' | 'replace') => {
    if (!activeFieldId) {
      toast({
        title: "No Field Selected",
        description: "Please click on a field to insert content",
        variant: "destructive",
      });
      return;
    }

    try {
      // Insert content into the field
      onInsertContent(activeFieldId, response.content, mode);

      // Store in MEM0 if configured and this is a significant completion
      if (isMem0Configured() && response.content.length > 50) {
        try {
          console.log('🧠 MEM0: Attempting to store memory for field:', activeFieldId);
          console.log('🧠 MEM0: Content length:', response.content.length);
          console.log('🧠 MEM0: Current context:', currentContext);
          
          // Get issuer ID from current context or use document ID as fallback
          const issuerData = currentContext?.structured_data?.listing?.instrumentissuerid || 
                           currentContext?.structured_data?.instrumentissuerid ||
                           organizationId || 
                           documentId;
          
          console.log('🧠 MEM0: Using issuer/org ID:', issuerData);

          // Always store as section completion for significant content
          if (response.content.length > 100) {
            const memoryId = await storeSectionCompletion(
              issuerData,
              documentId,
              activeFieldId,
              response.content,
              'system'
            );

            if (memoryId) {
              console.log('✅ MEM0: Stored section completion with ID:', memoryId);
            } else {
              console.warn('⚠️ MEM0: Section completion storage returned null');
            }
          }

          // If this looks like an entity fact, store it separately
          if (response.content.includes('company') || response.content.includes('business') || 
              response.content.includes('entity') || response.content.includes('organization')) {
            const memoryId = await storeEntityFact(
              issuerData,
              response.content.substring(0, 500), // Truncate for entity facts
              'system'
            );

            if (memoryId) {
              console.log('✅ MEM0: Stored entity fact with ID:', memoryId);
            } else {
              console.warn('⚠️ MEM0: Entity fact storage returned null');
            }
          }

          // If this has a consistent tone/style, store as tone reference
          if (response.content.length > 150 && 
              (response.agentId === 'document_completion' || response.agentId === 'regulatory_guidance')) {
            const memoryId = await storeToneReference(
              issuerData,
              response.content.substring(0, 300), // Sample for tone
              'system'
            );

            if (memoryId) {
              console.log('✅ MEM0: Stored tone reference with ID:', memoryId);
            } else {
              console.warn('⚠️ MEM0: Tone reference storage returned null');
            }
          }

        } catch (memError) {
          console.error('❌ MEM0: Failed to store memory:', memError);
          // Don't fail the insert operation if MEM0 storage fails
        }
      } else if (!isMem0Configured()) {
        console.log('⚠️ MEM0: Not configured, skipping memory storage');
      } else {
        console.log('⚠️ MEM0: Content too short for storage:', response.content.length);
      }

      toast({
        title: `Content ${mode === 'insert' ? 'Inserted' : 'Replaced'}`,
        description: `AI response has been ${mode === 'insert' ? 'inserted into' : 'replaced in'} ${activeFieldTitle}`,
      });

    } catch (error) {
      console.error('Error inserting content:', error);
      toast({
        title: "Error",
        description: "Failed to insert content",
        variant: "destructive",
      });
    }
  }, [activeFieldId, activeFieldTitle, onInsertContent, currentContext, documentId, toast]);

  // Handle copying response to clipboard
  const handleCopy = useCallback(async (response: AIResponse) => {
    try {
      await navigator.clipboard.writeText(response.content);
      setCopiedResponseId(response.id);
      
      setTimeout(() => {
        setCopiedResponseId(null);
      }, 2000);

      toast({
        title: "Copied to Clipboard",
        description: "AI response has been copied",
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onToggle();
    }
  }, [handleSubmit, onToggle]);

  // Load section context for current field
  const loadSectionContext = useCallback(async () => {
    if (!activeFieldId || !documentId) return;

    setIsLoadingContext(true);
    try {
      const response = await fetch('/api/ai-assistant/get-section-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt: '',
          listingId: documentId,
          currentFieldKey: activeFieldId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setCurrentContext(data.context);
    } catch (error) {
      console.error('Error loading section context:', error);
      toast({
        title: "Context Loading Error",
        description: "Could not load field context. Some features may be limited.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingContext(false);
    }
  }, [activeFieldId, documentId, toast]);

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
                {isLoadingContext && (
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                )}
              </div>
              {activeFieldId && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {activeFieldTitle || activeFieldId}
                  </Badge>
                  {currentContext && (
                    <Badge variant="secondary" className="text-xs">
                      {currentContext.mode.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="flex-shrink-0 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Context Status */}
        {currentContext && (
          <div className="px-4 py-3 bg-gray-50 border-b">
            <div className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="text-gray-600">
                Sources: {currentContext.source_trace.join(', ') || 'None'}
              </span>
            </div>
            {currentContext.missing_flags.length > 0 && (
              <div className="flex items-center gap-2 text-sm mt-1">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-orange-600">
                  Missing: {currentContext.missing_flags.join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Agent Selection */}
        <div className="p-4 sm:p-6 border-b bg-gray-50/50 flex-shrink-0">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Select Assistant Mode</h3>
          <div className="grid grid-cols-1 gap-2">
            {CANVAS_AGENTS.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all duration-200 text-left group",
                  selectedAgent.id === agent.id
                    ? `${agent.borderColor} ${agent.bgColor} shadow-sm`
                    : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg transition-all duration-200",
                    selectedAgent.id === agent.id
                      ? `bg-gradient-to-r ${agent.color} text-white`
                      : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                  )}>
                    {agent.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-medium text-sm transition-colors duration-200",
                      selectedAgent.id === agent.id ? agent.textColor : "text-gray-900"
                    )}>
                      {agent.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-tight">
                      {agent.description}
                    </div>
                  </div>
                  {selectedAgent.id === agent.id && (
                    <div className={cn("p-1 rounded-full", agent.bgColor)}>
                      <Check className={cn("h-3 w-3", agent.textColor)} />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4 sm:p-6">
            {responses.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  {activeFieldId 
                    ? `Ask me anything about "${activeFieldTitle}"`
                    : "Ask me anything about this document or click on a field for specific context"
                  }
                </p>
                                 {currentContext?.missing_flags && currentContext.missing_flags.length > 0 && (
                  <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-orange-700">
                        <Upload className="h-4 w-4" />
                        <span>Consider uploading supporting documents for better results</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowUploadModal(true)}
                        className="h-8 text-xs"
                      >
                        Upload Documents
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {responses.map((response) => (
                  <Card key={response.id} className="p-4 bg-gray-50 border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {response.agentName}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {response.timestamp.toLocaleTimeString()}
                        </span>
                        {response.sources && response.sources.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {response.sources.join(', ')}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(response)}
                        className="h-6 w-6 p-0"
                      >
                        {copiedResponseId === response.id ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="prose prose-sm max-w-none text-gray-700 mb-4">
                      {response.content.split('\n').map((line, index) => (
                        <p key={index} className="mb-2 last:mb-0">
                          {line}
                        </p>
                      ))}
                    </div>

                    {/* Missing Data Warning */}
                    {response.missingData && response.missingData.length > 0 && (
                      <div className="mb-3 p-2 bg-orange-50 rounded border border-orange-200">
                        <div className="flex items-center gap-2 text-xs text-orange-700">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Missing: {response.missingData.join(', ')}</span>
                        </div>
                      </div>
                    )}

                    {/* Upload Recommendation */}
                    {response.uploadRecommendation && (
                      <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-blue-700">
                            <Upload className="h-3 w-3" />
                            <span>{response.uploadRecommendation}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowUploadModal(true)}
                            className="h-6 text-xs px-2"
                          >
                            Upload
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {activeFieldId && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleInsert(response, 'insert')}
                          className="flex-1 h-8 text-xs"
                        >
                          Insert
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInsert(response, 'replace')}
                          className="flex-1 h-8 text-xs"
                        >
                          Replace
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 sm:p-6 border-t bg-white flex-shrink-0">
            <div className="space-y-3">
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    activeFieldId 
                      ? `Ask about "${activeFieldTitle}" or request content generation...`
                      : "Ask about this document or click on a field for specific context..."
                  }
                  className="min-h-[80px] pr-12 resize-none text-sm"
                  disabled={isLoading}
                />
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isLoading}
                  className="absolute bottom-2 right-2 h-8 w-8 p-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {selectedAgent.name} • {currentContext?.mode.replace('_', ' ') || 'Standard mode'}
                </span>
                <span>⌘↵ to send</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <CanvasUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        fieldId={activeFieldId}
        fieldTitle={activeFieldTitle}
        missingData={currentContext?.missing_flags}
        uploadRecommendation={responses.find(r => r.uploadRecommendation)?.uploadRecommendation}
        organizationId={organizationId}
        listingId={documentId}
        onUploadComplete={() => {
          // Reload context after upload
          loadSectionContext();
          setShowUploadModal(false);
        }}
      />
    </>
  );
} 