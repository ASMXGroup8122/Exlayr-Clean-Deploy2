'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ComparisonResult {
  documentText: string;
  ruleText: string;
  status: 'compliant' | 'warning' | 'violation';
  explanation: string;
}

interface ListingAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: string | null;
}

export default function ListingAIAssistant({
  isOpen,
  onClose,
  documentId
}: ListingAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Mock rules for the demo
  const listingRules = [
    {
      id: 'rule-1',
      title: 'Disclosure Requirements',
      description: 'All material risks must be clearly disclosed in the Risk Factors section.'
    },
    {
      id: 'rule-2',
      title: 'Financial Reporting',
      description: 'Financial information must include at least 3 years of historical data where available.'
    },
    {
      id: 'rule-3',
      title: 'Corporate Governance',
      description: 'The company must have a board with at least 3 independent directors.'
    },
    {
      id: 'rule-4',
      title: 'Lock-up Periods',
      description: 'Insiders must have a minimum 180-day lock-up period post-listing.'
    },
    {
      id: 'rule-5',
      title: 'Market Capitalization',
      description: 'Minimum market capitalization of $50 million required for Main Board listing.'
    }
  ];
  
  // Initial welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      role: 'assistant',
      content: `👋 Hello! I'm your Listing Rules Assistant. I can help you analyze document sections against exchange listing rules.

What would you like to do?
- Compare a document section to rules
- Check compliance with a specific rule
- Get rule explanations`,
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage]);
    
    // Add document-specific message if a document is selected
    if (documentId) {
      const documentMessage: Message = {
        role: 'assistant',
        content: `I see you're currently reviewing a document. You can copy and paste sections directly from the document to analyze them.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, documentMessage]);
    }
  }, [documentId]);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Handle user message submission
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userInput.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: userInput,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = userInput;
    setUserInput('');
    setIsTyping(true);
    
    // Mock AI response generation with delay for realistic effect
    setTimeout(() => {
      generateMockResponse(currentInput);
      setIsTyping(false);
    }, 1500);
  }, [userInput]);
  
  // Generate mock response based on user input
  const generateMockResponse = useCallback((input: string) => {
    let responseContent = '';
    
    // Check if it's a rule question
    const ruleQuestion = input.toLowerCase().includes('rule') || 
                         input.toLowerCase().includes('requirement') ||
                         input.toLowerCase().includes('regulation');
    
    // Check if it's a comparison request
    const comparisonRequest = input.toLowerCase().includes('compare') || 
                             input.toLowerCase().includes('check') ||
                             input.toLowerCase().includes('analyze');
    
    // Check if it's a long text (likely a document section)
    const isDocumentSection = input.length > 200;
    
    if (isDocumentSection) {
      responseContent = `I've analyzed this document section and here's what I found:

1. This appears to be ${input.toLowerCase().includes('risk') ? 'a risk disclosure' : 
                          input.toLowerCase().includes('financial') ? 'a financial statement' : 
                          input.toLowerCase().includes('overview') ? 'a company overview' : 
                          'company information'}.

2. Based on listing rules, here are potential compliance issues:
   - ${listingRules[0].title}: The section ${Math.random() > 0.5 ? 'meets' : 'may not fully meet'} the requirements
   - ${listingRules[1].title}: Additional detail may be needed

Would you like me to do a detailed comparison with a specific rule?`;

      // Show comparison modal for document sections
      setComparisonResult({
        documentText: input,
        ruleText: listingRules[0].description,
        status: Math.random() > 0.5 ? 'compliant' : 'warning',
        explanation: 'The document section contains most of the required elements, but may need additional detail on risk mitigation strategies.'
      });
    } else if (ruleQuestion) {
      const randomRule = listingRules[Math.floor(Math.random() * listingRules.length)];
      responseContent = `Regarding listing rules:

The ${randomRule.title} states:
"${randomRule.description}"

This rule ensures that investors have sufficient information to make informed decisions. Companies must provide clear documentation to show compliance with this requirement.`;
    } else if (comparisonRequest) {
      responseContent = `I'd be happy to compare a document section against our listing rules.

Please copy and paste the section you'd like me to analyze, and I'll check it against relevant rules.`;
    } else {
      responseContent = `I understand you're asking about "${input}".

To best assist you, I can:
1. Explain specific listing rules
2. Compare document sections against rules
3. Suggest improvements for compliance

What specific aspect would you like me to help with?`;
    }
    
    const assistantMessage: Message = {
      role: 'assistant',
      content: responseContent,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, assistantMessage]);
  }, [listingRules]);
  
  // Reset the comparison view
  const handleCloseComparison = useCallback(() => {
    setComparisonResult(null);
  }, []);
  
  // If the component is not open, don't render anything
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-700 text-white px-4 py-3 flex justify-between items-center rounded-t-lg">
          <h3 className="font-medium flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <path d="M8 12h8"></path>
              <path d="M12 8v8"></path>
            </svg>
            Listing Rules Assistant
          </h3>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-3/4 p-3 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="whitespace-pre-line">{message.content}</div>
                  <div 
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
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
        
        {/* Input form */}
        <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            <textarea
              className="flex-1 min-h-[80px] border border-gray-300 rounded-md p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Type your message or paste document text here..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white rounded-md p-3 hover:bg-blue-700 transition-colors"
              disabled={isTyping || !userInput.trim()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
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
      </div>
    </div>
  );
}
