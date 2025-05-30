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
  onTriggerResearchPanel?: (suggestedCategory?: string, suggestedLabel?: string) => void;
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
  onWidthChange,
  onTriggerResearchPanel
}: CanvasPromptBarProps) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  // Always use Smart Agent - no selection needed
  const selectedAgent = CANVAS_AGENTS.find(agent => agent.id === 'agent_mode') || CANVAS_AGENTS[0];
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [copiedResponseId, setCopiedResponseId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [currentContext, setCurrentContext] = useState<SectionContext | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  // Removed showUploadModal state - using ResearchPanel instead via onTriggerResearchPanel
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

  // Smart Agent automatically adapts to field context - no manual selection needed

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
          orgId: organizationId,
          mode: selectedAgent.mode
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Handle Smart Agent response with upload suggestions
      if (data.shouldTriggerUpload && onTriggerResearchPanel) {
        console.log('🤖 Smart Agent: Triggering upload panel with suggestion:', data.uploadSuggestion);
        
        // Trigger the Research Panel (upload interface)
        onTriggerResearchPanel(
          data.uploadSuggestion?.category,
          data.uploadSuggestion?.label
        );

        toast({
          title: "Documents Needed",
          description: "Please upload the suggested documents to continue",
          variant: "default",
        });
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
        sources: data.foundDocuments?.map((doc: any) => doc.name) || currentContext?.source_trace || [],
        missingData: data.missingDocuments?.map((doc: any) => doc.label) || currentContext?.missing_flags || [],
        uploadRecommendation: data.uploadSuggestion?.message
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

  // Load context only when prompt bar becomes visible with an active field
  // This prevents unnecessary API calls when users click fields without using AI
  useEffect(() => {
    if (isVisible && activeFieldId && documentId) {
      loadSectionContext();
    }
    // Only trigger when prompt bar visibility changes, not when field changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, documentId, loadSectionContext]);

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
        className="fixed right-0 top-0 h-full bg-white/95 backdrop-blur-xl shadow-2xl z-40 flex flex-col border-l border-white/20"
        style={{ 
          width: isMounted && typeof window !== 'undefined' 
            ? (window.innerWidth >= 1024 ? `${panelWidth}px` : window.innerWidth >= 640 ? '400px' : '100%')
            : '480px'
        }}
      >
        {/* Resize Handle - Desktop Only */}
        <div 
          className={`absolute left-0 top-0 w-2 h-full cursor-col-resize transition-all duration-300 hidden lg:block group ${
            isResizing ? 'bg-gradient-to-b from-blue-500 to-purple-600' : 'hover:bg-gradient-to-b hover:from-blue-500/20 hover:to-purple-600/20'
          }`}
          onMouseDown={handleMouseDown}
          title="Drag to resize panel"
        >
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 transition-all duration-300 rounded-r-lg ${
            isResizing ? 'bg-gradient-to-b from-blue-600 to-purple-700' : 'bg-gradient-to-b from-gray-300 to-gray-400 group-hover:from-blue-500 group-hover:to-purple-600'
          }`} />
          <div className={`absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-8 transition-all duration-300 rounded-r-lg ${
            isResizing ? 'bg-gradient-to-b from-blue-400 to-purple-500' : 'bg-gradient-to-b from-gray-400 to-gray-500 group-hover:from-blue-300 group-hover:to-purple-400'
          }`} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-blue-50/80 to-purple-50/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg flex-shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-lg bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                  AI Assistant
                </h2>
                {isLoadingContext && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
              </div>
              {activeFieldId && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs font-medium bg-white/60 backdrop-blur-sm border-blue-200/50">
                    {activeFieldTitle || activeFieldId}
                  </Badge>
                  {currentContext && (
                    <Badge variant="secondary" className="text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-0">
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
            className="flex-shrink-0 h-9 w-9 p-0 hover:bg-white/60 backdrop-blur-sm rounded-lg transition-all duration-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Context Status */}
        {currentContext && (
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50/80 to-blue-50/80 backdrop-blur-sm border-b border-white/10">
            <div className="flex items-center gap-3 text-sm">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="text-gray-700 font-medium">
                Sources: <span className="font-normal">{currentContext.source_trace.join(', ') || 'None'}</span>
              </span>
            </div>
            {currentContext.missing_flags.length > 0 && (
              <div className="flex items-center gap-3 text-sm mt-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-orange-700 font-medium">
                  Missing: <span className="font-normal">{currentContext.missing_flags.join(', ')}</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Smart Agent Status */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-orange-50/80 to-amber-50/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl shadow-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold bg-gradient-to-r from-orange-700 to-amber-700 bg-clip-text text-transparent">
                  Smart Agent
                </h3>
                <Badge variant="secondary" className="text-xs font-medium bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 border-0">
                  {currentContext?.mode ? 
                    currentContext.mode.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                    'Autonomous Mode'
                  }
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1 font-medium">
                {currentContext?.mode === 'document_completion' && 'Generating content from structured data'}
                {currentContext?.mode === 'industry_research' && 'Conducting research with citations'}
                {currentContext?.mode === 'regulatory_guidance' && 'Ensuring regulatory compliance'}
                {!currentContext?.mode && 'Analyzing context and selecting optimal approach'}
              </p>
            </div>
            {isLoadingContext && (
              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-white/50 to-gray-50/50 backdrop-blur-sm">
          <ScrollArea className="flex-1 p-6">
            {responses.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl w-fit mx-auto mb-4">
                  <MessageSquare className="h-12 w-12 text-blue-500 mx-auto" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-blue-700 bg-clip-text text-transparent mb-2">
                  Ready to Assist
                </h3>
                <p className="text-gray-600 text-sm font-medium max-w-sm mx-auto leading-relaxed">
                  {activeFieldId 
                    ? `Ask me anything about "${activeFieldTitle}" or request content generation`
                    : "Ask me anything about this document or click on a field for specific context"
                  }
                </p>
                {currentContext?.missing_flags && currentContext.missing_flags.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-orange-700">
                        <Upload className="h-4 w-4" />
                        <span className="font-medium">Consider uploading supporting documents for better results</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onTriggerResearchPanel && onTriggerResearchPanel()}
                        className="h-8 text-xs font-medium bg-white/80 backdrop-blur-sm hover:bg-white border-orange-200"
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
                  <Card key={response.id} className="p-5 bg-white/80 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-0">
                          {response.agentName}
                        </Badge>
                        <span className="text-xs text-gray-500 font-medium">
                          {response.timestamp.toLocaleTimeString()}
                        </span>
                        {response.sources && response.sources.length > 0 && (
                          <Badge variant="outline" className="text-xs font-medium bg-white/60 backdrop-blur-sm border-gray-200/50">
                            {response.sources.join(', ')}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(response)}
                        className="h-7 w-7 p-0 hover:bg-white/60 backdrop-blur-sm rounded-lg transition-all duration-200"
                      >
                        {copiedResponseId === response.id ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="prose prose-sm max-w-none text-gray-700 mb-4 font-medium leading-relaxed">
                      {response.content.split('\n').map((line, index) => (
                        <p key={index} className="mb-3 last:mb-0">
                          {line}
                        </p>
                      ))}
                    </div>

                    {/* Missing Data Warning */}
                    {response.missingData && response.missingData.length > 0 && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200/50 backdrop-blur-sm">
                        <div className="flex items-center gap-3 text-xs text-orange-700">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="font-medium">Missing: {response.missingData.join(', ')}</span>
                        </div>
                      </div>
                    )}

                    {/* Upload Recommendation */}
                    {response.uploadRecommendation && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200/50 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-blue-700">
                            <Upload className="h-3 w-3" />
                            <span className="font-medium">{response.uploadRecommendation}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onTriggerResearchPanel && onTriggerResearchPanel(response.uploadRecommendation?.split(' ')[0])}
                            className="h-6 text-xs px-3 font-medium bg-white/80 backdrop-blur-sm hover:bg-white border-blue-200"
                          >
                            Upload
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {activeFieldId && (
                      <div className="flex gap-3">
                        <Button
                          size="sm"
                          onClick={() => handleInsert(response, 'insert')}
                          className="flex-1 h-9 text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          Insert
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInsert(response, 'replace')}
                          className="flex-1 h-9 text-sm font-medium bg-white/80 backdrop-blur-sm hover:bg-white border-gray-200/50 hover:border-gray-300 transition-all duration-300"
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
          <div className="p-6 border-t border-white/10 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm flex-shrink-0">
            <div className="space-y-4">
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
                  className="min-h-[90px] pr-14 resize-none text-sm font-medium bg-white/80 backdrop-blur-sm border-white/20 focus:border-blue-300 focus:ring-blue-200/50 rounded-xl shadow-lg placeholder:text-gray-500"
                  disabled={isLoading}
                />
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isLoading}
                  className="absolute bottom-3 right-3 h-9 w-9 p-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="font-medium">
                  <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">Smart Agent</span> • {currentContext?.mode ? 
                    currentContext.mode.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                    'Autonomous Mode'
                  }
                </span>
                <span className="font-medium">⌘↵ to send</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Upload Modal */}
      {/* Upload functionality now handled by ResearchPanel via onTriggerResearchPanel */}
    </>
  );
} 