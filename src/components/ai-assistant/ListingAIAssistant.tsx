'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AIMessage } from '@/lib/ai/config';
import { ListingRule } from '@/lib/ai/vectorSearch';
import { AgentType, executeAgent } from '@/lib/ai/agents';
import { Loader2, AlertCircle, CheckCircle, X, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import RuleRegenerationModal from './RuleRegenerationModal';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { aiAgentLogger } from '@/components/ai-assistant/ExlayrAIAgentView';

interface ComparisonResult {
  documentText: string;
  ruleText: string;
  status: 'compliant' | 'warning' | 'non-compliant';
  explanation: string;
}

interface ListingAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: string | null;
  currentSection?: {
    id: string;
    title: string;
    content: string;
  } | null;
  className?: string;
}

// Define knowledge base options
const KNOWLEDGE_BASES = [
  { value: 'exchangedocs', label: 'Exchange Docs' },
  { value: 'regulations', label: 'Regulations' },
  { value: 'compliance', label: 'Compliance' },
];

// Define status messages for different operations
const STATUS_MESSAGES = {
  retrieving: [
    "Retrieving relevant information...",
    "Searching knowledge base...",
    "Looking up relevant rules..."
  ],
  analyzing: [
    "Analyzing your question...",
    "Processing your request...",
    "Examining relevant documents..."
  ],
  compiling: [
    "Compiling the best answer...",
    "Organizing information...",
    "Preparing response..."
  ],
  responding: [
    "Finalizing response...",
    "Putting it all together...",
    "Almost ready..."
  ]
};

// Add a custom message type that extends AIMessage
interface CustomAIMessage extends AIMessage {
  knowledgeBase?: string;
}

// Add feedback UI after assistant messages in training mode
const FeedbackUI = ({ 
  message, 
  originalQuery, 
  knowledgeBase 
}: { 
  message: AIMessage, 
  originalQuery: string, 
  knowledgeBase: string 
}) => {
  const [feedbackState, setFeedbackState] = useState<'initial' | 'positive' | 'negative' | 'improving' | 'submitted'>('initial');
  const [improvedResponse, setImprovedResponse] = useState('');
  
  const handleFeedback = async (type: 'positive' | 'negative') => {
    setFeedbackState(type);
    
    // If positive feedback, submit immediately
    if (type === 'positive') {
      await submitFeedback(type);
    }
  };
  
  const submitFeedback = async (type: 'positive' | 'negative') => {
    try {
      const response = await fetch('/api/ai-assistant/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalQuery,
          assistantResponse: message.content,
          userFeedback: type,
          improvedResponse: type === 'negative' ? improvedResponse : undefined,
          isTrainingMode: true,
          knowledgeBase
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFeedbackState('submitted');
      } else {
        console.error('Error submitting feedback:', data.error);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };
  
  if (feedbackState === 'submitted') {
    return (
      <div className="mt-2 text-xs text-muted-foreground">
        Thank you for your feedback!
      </div>
    );
  }
  
  return (
    <div className="mt-2">
      {feedbackState === 'initial' && (
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">Was this helpful?</span>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-2"
            onClick={() => handleFeedback('positive')}
          >
            👍 Yes
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-2"
            onClick={() => handleFeedback('negative')}
          >
            👎 No
          </Button>
        </div>
      )}
      
      {feedbackState === 'negative' && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            How would you improve this response?
          </div>
          <Textarea
            value={improvedResponse}
            onChange={(e) => setImprovedResponse(e.target.value)}
            placeholder="Provide an improved response..."
            className="min-h-[100px] text-sm"
          />
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFeedbackState('initial')}
            >
              Cancel
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={() => submitFeedback('negative')}
              disabled={!improvedResponse.trim()}
            >
              Submit Improvement
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Add interfaces for analysis results
interface AnalysisResult {
  sectionId: string;
  compliance: 'compliant' | 'non-compliant' | 'partially-compliant';
  suggestion?: string;
}

interface Section {
  id: string;
  title: string;
  content: string;
}

export default function ListingAIAssistant({
  isOpen,
  onClose,
  documentId,
  currentSection,
  className
}: ListingAIAssistantProps) {
  const [messages, setMessages] = useState<CustomAIMessage[]>([
    {
      role: 'system',
      content: 'I am an AI assistant that can help analyze listing documents against exchange rules. How can I help you today?'
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [relevantRules, setRelevantRules] = useState<ListingRule[]>([]);
  const [isApiKeySet, setIsApiKeySet] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isProcessing, setIsProcessing, isAdvancedMode } = useAIAssistant();
  
  // Add new state for knowledge base
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState(KNOWLEDGE_BASES[0].value);
  
  // Add state for status messages
  const [statusPhase, setStatusPhase] = useState<keyof typeof STATUS_MESSAGES>('retrieving');
  const [statusMessage, setStatusMessage] = useState<string>("Waiting for your message...");
  const [lastUsedKnowledgeBase, setLastUsedKnowledgeBase] = useState<string>(selectedKnowledgeBase);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add state for training mode
  const [isTrainingMode, setIsTrainingMode] = useState(false);
  
  // Rule regeneration state
  const [isRegenerationModalOpen, setIsRegenerationModalOpen] = useState(false);
  
  // Add a new state to track section compliance status
  const [sectionComplianceStatus, setSectionComplianceStatus] = useState<'pending' | 'compliant' | 'warning' | 'non-compliant'>('pending');
  
  // Add state for document analysis results
  const [documentAnalysisResults, setDocumentAnalysisResults] = useState<AnalysisResult[] | null>(null);
  const [isAnalyzingDocument, setIsAnalyzingDocument] = useState(false);
  
  // Replace the handleStartServer function with a simpler version
  const handleAdvancedMode = useCallback(async () => {
    try {
      setIsTyping(true);
      setStatusMessage("Using advanced AI analysis...");
      
      // No need to start a server, just update the UI
      const message: CustomAIMessage = {
        role: 'assistant',
        content: 'Advanced AI analysis is enabled. You can now use enhanced document analysis features.',
      };
      setMessages(prev => [...prev, message]);
      
      setIsTyping(false);
    } catch (error) {
      console.error('Error in advanced mode:', error);
      
      // Add a user-friendly message
      const errorMessage: CustomAIMessage = {
        role: 'assistant',
        content: 'I encountered an issue with advanced analysis. We\'ll continue with basic analysis features.',
      };
      setMessages(prev => [...prev, errorMessage]);
      
      setIsTyping(false);
    }
  }, [setMessages, setIsTyping, setStatusMessage]);
  
  // Replace the useEffect that starts the Python server
  useEffect(() => {
    if (isOpen && isAdvancedMode) {
      // No need to check server status, just update the UI if needed
      console.log('AI Assistant opened with advanced mode enabled');
    }
  }, [isOpen, isAdvancedMode]);
  
  // Update the initial welcome message to consolidate all information
  useEffect(() => {
    let welcomeContent = `👋 Hello! I'm your Listing Rules Assistant. I can help you analyze document sections against exchange listing rules.

What would you like to do?
- Compare a document section to rules
- Check compliance with a specific rule
- Get rule explanations`;

    // Add document-specific information if a document is selected
    if (documentId) {
      welcomeContent += `\n\nI see you're currently reviewing a document. You can copy and paste sections directly from the document to analyze them.`;
    }
    
    // Add section-specific information if a current section is provided
    if (currentSection) {
      welcomeContent += `\n\nI see you're viewing the "${currentSection.title}" section. Would you like me to analyze this section against listing rules?`;
      
      // Remove automatic fetching of relevant rules
      // fetchRelevantRules(currentSection.content);
    }
    
    // Create a single welcome message with all the information
    const welcomeMessage: CustomAIMessage = {
      role: 'assistant',
      content: welcomeContent,
    };
    
    setMessages([welcomeMessage]);
  }, [documentId, currentSection]);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Function to start rotating status messages
  const startStatusMessages = (type: keyof typeof STATUS_MESSAGES) => {
    setIsTyping(true);
    const messages = STATUS_MESSAGES[type];
    let index = 0;
    
    const intervalId = setInterval(() => {
      setStatusMessage(messages[index]);
      index = (index + 1) % messages.length;
    }, 3000);
    
    return () => {
      clearInterval(intervalId);
    };
  };
  
  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    };
  }, []);
  
  // Effect to fetch relevant rules when knowledge base changes
  useEffect(() => {
    if (selectedKnowledgeBase) {
      // Add a system message about the knowledge base change
      setMessages(prev => [
        ...prev,
        {
          role: 'system',
          content: `Switched to ${KNOWLEDGE_BASES.find(kb => kb.value === selectedKnowledgeBase)?.label || selectedKnowledgeBase} knowledge base.`,
          knowledgeBase: selectedKnowledgeBase
        }
      ]);
      
      // Show a brief notification about the knowledge base
      const kbName = KNOWLEDGE_BASES.find(kb => kb.value === selectedKnowledgeBase)?.label || selectedKnowledgeBase;
      setStatusMessage(`Using ${kbName} knowledge base`);
      setTimeout(() => setIsTyping(false), 1500);
    }
  }, [selectedKnowledgeBase]);
  
  // Load training mode preference from localStorage on component mount
  useEffect(() => {
    const savedTrainingMode = localStorage.getItem('aiAssistantTrainingMode');
    if (savedTrainingMode) {
      setIsTrainingMode(savedTrainingMode === 'true');
    }
  }, []);

  // Save training mode preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('aiAssistantTrainingMode', isTrainingMode.toString());
  }, [isTrainingMode]);
  
  // Function to fetch relevant rules - modify to only fetch when explicitly called
  const fetchRelevantRules = async (content: string) => {
    if (!content || content.trim() === '') {
      console.log('No content provided for fetching relevant rules');
      setRelevantRules([]);
      return;
    }

    try {
      console.log('Fetching relevant rules for content:', content.substring(0, 50) + '...');
      const response = await fetch('/api/ai-assistant/relevant-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content,
          knowledgeBase: selectedKnowledgeBase,
          isTrainingMode
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRelevantRules(data.rules || []);
        console.log('Relevant rules:', data.rules);
      } else {
        console.error('Failed to fetch relevant rules:', data.error);
        setRelevantRules([]);
      }
    } catch (error) {
      console.error('Error fetching relevant rules:', error);
      setRelevantRules([]);
    }
  };

  // Update the analyzeSection function to set compliance status
  const analyzeSection = async (sectionContent: string) => {
    if (!sectionContent.trim() || isTyping) return;
    
    // Reset compliance status to pending when starting a new analysis
    setSectionComplianceStatus('pending');
    
    // Add user message
    const userMessage: CustomAIMessage = { 
      role: 'user' as const, 
      content: `Please analyze this section: ${sectionContent.substring(0, 100)}${sectionContent.length > 100 ? '...' : ''}` 
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    try {
      // Start showing status messages
      startStatusMessages('retrieving');
      
      // Fetch relevant rules for the section
      await fetchRelevantRules(sectionContent);
      
      // Update status
      startStatusMessages('analyzing');
      
      // Send message to API
      const response = await fetch('/api/ai-assistant/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          knowledgeBase: selectedKnowledgeBase,
          isTrainingMode
        }),
      });
      
      // Update status
      startStatusMessages('compiling');
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update status
      startStatusMessages('responding');
      
      // Add a small delay before showing the response
      setTimeout(() => {
        if (data.success) {
          // Set a random compliance status for demo purposes
          // In a real implementation, this would be determined by analyzing the AI response
          const responseText = data.response.toLowerCase();
          if (responseText.includes('non-compliant') || responseText.includes('not compliant')) {
            setSectionComplianceStatus('non-compliant');
          } else if (responseText.includes('warning') || responseText.includes('potential issue') || responseText.includes('partially compliant')) {
            setSectionComplianceStatus('warning');
          } else if (responseText.includes('compliant') || responseText.includes('compliance')) {
            setSectionComplianceStatus('compliant');
          }
          
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: data.response,
              knowledgeBase: selectedKnowledgeBase
            }
          ]);
        } else {
          setMessages(prev => [
            ...prev,
            {
              role: 'system',
              content: `Error: ${data.error || 'Failed to get response from AI'}`,
            }
          ]);
        }
        setIsTyping(false);
      }, 500);
      
    } catch (error) {
      console.error('Error analyzing section:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'system',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to analyze section'}`,
        }
      ]);
      setIsTyping(false);
    }
  };
  
  // Reset the comparison view
  const handleCloseComparison = useCallback(() => {
    setComparisonResult(null);
  }, []);
  
  // Update the testKnowledgeBase function to be more concise
  const testKnowledgeBase = async () => {
    try {
      // Start status messages
      const stopRetrieving = startStatusMessages('retrieving');
      
      // Test the knowledge base selection
      const response = await fetch('/api/ai-assistant/test-knowledge-base', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          knowledgeBase: selectedKnowledgeBase
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to test knowledge base:', await response.text());
        setStatusMessage('Error testing knowledge base. Please try again.');
        setTimeout(() => setIsTyping(false), 2000);
        return;
      }
      
      // Stop status messages
      stopRetrieving();
      
      // Show a brief notification about the knowledge base
      const kbName = KNOWLEDGE_BASES.find(kb => kb.value === selectedKnowledgeBase)?.label || selectedKnowledgeBase;
      setStatusMessage(`Using ${kbName} knowledge base`);
      setTimeout(() => setIsTyping(false), 1500);
      
      // Remove automatic fetching of relevant rules
      // fetchRelevantRules(currentSection?.content || '');
    } catch (error) {
      console.error('Error testing knowledge base:', error);
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Failed to test knowledge base'}`);
      setTimeout(() => setIsTyping(false), 2000);
    }
  };
  
  // Add a function to clear the chat history
  const handleClearChat = useCallback(() => {
    // Create a new welcome message
    let welcomeContent = `👋 Hello! I'm your Listing Rules Assistant. I can help you analyze document sections against exchange listing rules.

What would you like to do?
- Compare a document section to rules
- Check compliance with a specific rule
- Get rule explanations`;

    // Add document-specific information if a document is selected
    if (documentId) {
      welcomeContent += `\n\nI see you're currently reviewing a document. You can copy and paste sections directly from the document to analyze them.`;
    }
    
    // Add section-specific information if a current section is provided
    if (currentSection) {
      welcomeContent += `\n\nI see you're viewing the "${currentSection.title}" section. Would you like me to analyze this section against listing rules?`;
    }
    
    // Reset messages to just the welcome message
    setMessages([
      {
        role: 'assistant',
        content: welcomeContent,
      }
    ]);
    
    // Reset other states
    setComparisonResult(null);
    setRelevantRules([]);
    setSectionComplianceStatus('pending');
  }, [documentId, currentSection]);
  
  // Update the handleSendMessage function to use the new context
  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    
    // Update processing state
    setIsTyping(true);
    setIsProcessing(true);
    
    // ... rest of the function ...
    
    // Update processing state at the end
    setIsTyping(false);
    setIsProcessing(false);
  };

  // Update the handleAnalyzeSection function to use the new context
  const handleAnalyzeSection = async () => {
    if (!currentSection) return;
    
    // Update processing state
    setIsTyping(true);
    setIsProcessing(true);
    
    // ... rest of the function ...
    
    // Update processing state at the end
    setIsTyping(false);
    setIsProcessing(false);
  };

  // Add a function to analyze the entire document at once
  const analyzeEntireDocument = async () => {
    if (!documentId || isTyping || isAnalyzingDocument) return;
    
    setIsAnalyzingDocument(true);
    aiAgentLogger.logActivity('process', `Starting document analysis for document ID: ${documentId}`);
    
    // Add user message
    const userMessage: CustomAIMessage = { 
      role: 'user' as const, 
      content: `Please analyze the entire document for compliance.` 
    };
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Start showing status messages
      startStatusMessages('retrieving');
      
      // Fetch all sections for the document
      aiAgentLogger.logActivity('process', 'Fetching document sections...');
      const response = await fetch(`/api/documents/${documentId}/sections`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document sections: ${response.statusText}`);
      }
      
      const data = await response.json();
      const sections: Section[] = data.sections || [];
      
      if (sections.length === 0) {
        throw new Error('No sections found in the document');
      }
      
      aiAgentLogger.logActivity('process', `Analyzing ${sections.length} sections for compliance`);
      
      // Update status
      startStatusMessages('analyzing');
      
      // Send all sections for analysis
      const analysisResponse = await fetch('/api/ai/analyze-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          sections,
        }),
      });
      
      if (!analysisResponse.ok) {
        throw new Error(`Failed to analyze document: ${analysisResponse.statusText}`);
      }
      
      const analysisData = await analysisResponse.json();
      const results: AnalysisResult[] = analysisData.results || [];
      
      // Update status
      startStatusMessages('compiling');
      
      // Store the results
      setDocumentAnalysisResults(results);
      
      // Create a summary message
      const compliantCount = results.filter((r: AnalysisResult) => r.compliance === 'compliant').length;
      const nonCompliantCount = results.filter((r: AnalysisResult) => r.compliance === 'non-compliant').length;
      const partiallyCompliantCount = results.filter((r: AnalysisResult) => r.compliance === 'partially-compliant').length;
      
      aiAgentLogger.logActivity('complete', 'Analysis complete:', {
        compliant: compliantCount,
        nonCompliant: nonCompliantCount,
        partiallyCompliant: partiallyCompliantCount,
        total: results.length
      });
      
      const summaryMessage = `
## Document Analysis Complete

I've analyzed all ${results.length} sections in the document:

- ✅ **Compliant sections:** ${compliantCount}
- ⚠️ **Partially compliant sections:** ${partiallyCompliantCount}
- ❌ **Non-compliant sections:** ${nonCompliantCount}

${nonCompliantCount > 0 ? '### Issues requiring attention:' : ''}
${results
  .filter((r: AnalysisResult) => r.compliance !== 'compliant' && r.suggestion)
  .map((r: AnalysisResult) => {
    const section = sections.find((s: Section) => s.id === r.sectionId);
    return `- **${section?.title || 'Section'}**: ${r.suggestion}`;
  })
  .join('\n')}

${nonCompliantCount === 0 ? '**Great job!** All sections meet compliance requirements.' : 'Please review the non-compliant sections and make the suggested changes.'}
`;
      
      // Add the summary message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: summaryMessage,
        }
      ]);
      
      // Update status
      startStatusMessages('responding');
      
      // Emit an event to update the document UI with compliance status
      if (window) {
        const event = new CustomEvent('document-analysis-complete', { 
          detail: { results } 
        });
        window.dispatchEvent(event);
      }
      
    } catch (error) {
      console.error('Error analyzing document:', error);
      aiAgentLogger.logActivity('process', 'Analysis failed:', { error });
      setMessages(prev => [
        ...prev,
        {
          role: 'system',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to analyze document'}`,
        }
      ]);
    } finally {
      setIsAnalyzingDocument(false);
    }
  };

  // Add a button to analyze the entire document
  const renderDocumentAnalysisButton = () => {
    if (!documentId) return null;
    
    return (
      <div className="flex items-center justify-center my-4">
        <Button
          onClick={analyzeEntireDocument}
          disabled={isTyping || isAnalyzingDocument}
          className="w-full"
          variant="outline"
        >
          {isAnalyzingDocument ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing Document...
            </>
          ) : (
            <>
              Analyze Entire Document
            </>
          )}
        </Button>
      </div>
    );
  };

  // If the component is not open, don't render anything
  if (!isOpen) return null;
  
  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/50", className)}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">AI Assistant</h2>
          
          <div className="flex items-center space-x-4">
            {/* Knowledge base selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Knowledge Base:</span>
              <Select
                value={selectedKnowledgeBase}
                onValueChange={setSelectedKnowledgeBase}
              >
                <SelectTrigger className="w-[180px] h-8 text-sm">
                  <SelectValue placeholder="Select knowledge base" />
                </SelectTrigger>
                <SelectContent>
                  {KNOWLEDGE_BASES.map((kb) => (
                    <SelectItem key={kb.value} value={kb.value}>
                      {kb.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Training mode toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="training-mode" className={cn(
                      "text-sm font-medium",
                      isTrainingMode ? "text-primary" : "text-muted-foreground"
                    )}>
                      Training Mode
                    </Label>
                    <Switch
                      id="training-mode"
                      checked={isTrainingMode}
                      onCheckedChange={setIsTrainingMode}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Training Mode allows you to improve the AI by submitting feedback and regenerating rules</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Close button */}
            {onClose && (
          <button 
            onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
            )}
          </div>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Document analysis button */}
          {renderDocumentAnalysisButton()}
          
          {messages.map((message, index) => {
            // Find the last user message before this message
            const previousUserMessages = messages.slice(0, index).filter(m => m.role === 'user');
            const lastUserMessage = previousUserMessages.length > 0 
              ? previousUserMessages[previousUserMessages.length - 1] 
              : { content: '' };
            
            return (
              <div key={index} className="mb-4">
                <div
                  className={cn(
                    "flex flex-col max-w-[80%] rounded-lg p-3",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground ml-auto" 
                      : message.role === 'system'
                        ? "bg-muted text-muted-foreground mx-auto text-sm"
                        : "bg-muted text-card-foreground mr-auto"
                  )}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.role === 'assistant' && message.knowledgeBase && (
                    <Badge variant="outline" className="mt-2 self-start">
                      Source: {KNOWLEDGE_BASES.find(kb => kb.value === message.knowledgeBase)?.label || message.knowledgeBase}
                    </Badge>
                  )}
                  
                  {/* Show feedback UI for assistant messages in training mode */}
                  {isTrainingMode && message.role === 'assistant' && 
                   // Only show feedback UI for AI-generated responses, not system placeholders
                   !message.content.includes("I am an AI assistant") &&
                   !message.content.includes("👋 Hello!") &&
                   !message.content.includes("This is a placeholder") &&
                   // Also check if it's in response to a user query
                   lastUserMessage.content.trim() !== "" && (
                    <FeedbackUI 
                      message={message} 
                      originalQuery={lastUserMessage.content} 
                      knowledgeBase={selectedKnowledgeBase} 
                    />
                  )}
                </div>
              </div>
            );
          })}
            
          {/* Show status message when typing */}
            {isTyping && (
            <div className="flex flex-col rounded-lg p-4 bg-gray-50 mr-8">
              <div className="text-sm font-medium mb-1">AI Assistant</div>
              <div className="text-sm text-muted-foreground animate-pulse">{statusMessage}</div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
        </div>
        
        {/* Rule Selection and Document Comparison UI */}
        {comparisonResult && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">Document vs. Rule Comparison</h4>
              <button 
                onClick={handleCloseComparison}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium mb-1">Document Section</div>
                <div className="text-xs p-2 bg-white border border-gray-200 rounded-md h-32 overflow-y-auto">
                  {comparisonResult.documentText.length > 300 
                    ? comparisonResult.documentText.substring(0, 300) + '...' 
                    : comparisonResult.documentText}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Listing Rule</div>
                <div className="text-xs p-2 bg-white border border-gray-200 rounded-md h-32 overflow-y-auto">
                  {comparisonResult.ruleText}
                </div>
              </div>
            </div>
            
            <div className="mt-2">
              <div className="text-sm font-medium mb-1">Compliance Status</div>
              <div className={`text-xs p-2 rounded-md ${
                comparisonResult.status === 'compliant' 
                  ? 'bg-green-100 text-green-800' 
                  : comparisonResult.status === 'warning'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
              }`}>
                <div className="font-medium">
                  {comparisonResult.status === 'compliant' 
                    ? '✓ Compliant' 
                    : comparisonResult.status === 'warning'
                      ? '⚠️ Potential Issues'
                      : '✗ Non-Compliant'}
                </div>
                <div className="mt-1">{comparisonResult.explanation}</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Current Section Analysis Button */}
        {currentSection && !comparisonResult && (
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <button
              onClick={() => analyzeSection(currentSection.content)}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              Analyze Current Section
            </button>
          </div>
        )}
        
        {/* Input form */}
        <form onSubmit={(e) => {
          e.preventDefault();
          if (userInput.trim()) {
            analyzeSection(userInput);
            setUserInput('');
          }
        }} className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your message..."
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (userInput.trim()) {
                    analyzeSection(userInput);
                    setUserInput('');
                  }
                }
              }}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors"
              disabled={isTyping || !userInput.trim()}
            >
              <span className="sr-only">Send</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
          
          {/* Quick suggestions */}
          <div className="flex mt-2 space-x-2">
            <button
              type="button"
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md transition-colors"
              onClick={() => setUserInput("What are the key disclosure requirements for an IPO?")}
            >
              Disclosure requirements
            </button>
            <button
              type="button"
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md transition-colors"
              onClick={() => setUserInput("Compare this section to risk disclosure rules")}
            >
              Check compliance
            </button>
            <button
              type="button"
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md transition-colors"
              onClick={() => setUserInput("What rules apply to financial reporting?")}
            >
              Financial rules
            </button>
          </div>
        </form>
        
        {/* Status Bar */}
        <div className="px-4 py-2 text-xs bg-gray-50 border-t flex justify-between items-center">
          <div className="flex items-center text-xs text-gray-500 space-x-2">
            <span>Knowledge Base: {selectedKnowledgeBase}</span>
            {isAdvancedMode && (
              <span className="px-1 py-0.5 bg-green-100 text-green-800 rounded">Advanced mode</span>
            )}
            {isTrainingMode && (
              <span className="px-1 py-0.5 bg-purple-100 text-purple-800 rounded">Training mode</span>
            )}
            {relevantRules.length > 0 && (
              <span className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded">{relevantRules.length} rules</span>
            )}
          </div>
        </div>
        
        {/* Compliance Status Indicator */}
        {currentSection && (
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">Section Compliance:</span>
              {sectionComplianceStatus === 'pending' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Pending Analysis
                </span>
              )}
              {sectionComplianceStatus === 'compliant' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Compliant
                </span>
              )}
              {sectionComplianceStatus === 'warning' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Potential Issues
                </span>
              )}
              {sectionComplianceStatus === 'non-compliant' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <X className="h-3 w-3 mr-1" />
                  Non-Compliant
                </span>
              )}
            </div>
            <button
              onClick={() => analyzeSection(currentSection.content)}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
              disabled={isTyping}
            >
              {isTyping ? 'Analyzing...' : 'Analyze Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
