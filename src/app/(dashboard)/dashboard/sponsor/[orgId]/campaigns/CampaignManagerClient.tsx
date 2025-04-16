'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Mic, Send, Search, X, Bot, SparkleIcon, MessageSquare, Loader2, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { CampaignScheduler } from '@/components/campaign/CampaignScheduler';
import { Label } from '@/components/ui/label';
import { CampaignGoal } from '@/types/campaigns';
import Link from 'next/link';

interface CampaignManagerClientProps {
  orgId: string;
}

// Define message type for better typing
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function CampaignManagerClient({ orgId }: CampaignManagerClientProps) {
  const router = useRouter();
  const [goal, setGoal] = useState('raise');
  const [client, setClient] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [mode, setMode] = useState<'sponsor' | 'client'>('sponsor');
  const [template, setTemplate] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const campaignTemplates = [
    { value: 'token-uae', label: 'Token Raise - UAE Focus', description: '30-day push for regulated token issuance targeting UAE-based investors.' },
    { value: 'volume-smallcap', label: 'Volume Boost - Small Cap', description: 'Drive liquidity for a thinly traded listed company with social and finfluencer activation.' },
    { value: 'post-raise-ir', label: 'Post-Raise Investor Confidence', description: 'IR and messaging playbook to boost share price momentum after a successful raise.' }
  ];

  const aiSuggestions = [
    "What is the best campaign for fund raising?",
    "Can you guide me step by step through a campaign process?"
  ];

  // System prompt that helps focus the AI on campaign creation
  const systemPrompt = `You are a campaign management assistant for Exlayr, a financial marketing platform.
  Your primary goal is to help users create, manage, and optimize their marketing campaigns for financial products and services.
  You can provide advice on best practices, recommend campaign types, and guide users through the campaign creation process.
  Be specific and practical in your advice, focusing on actionable steps.
  When asked about campaign creation, provide a structured approach with clear steps.`;

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    
    // Clear any previous errors
    setError(null);
    
    // Add user message to the chat
    const userMessage: ChatMessage = { role: 'user', content: aiPrompt };
    setAiMessages(prev => [...prev, userMessage]);
    
    // Start loading state
    setIsLoading(true);
    
    try {
      // Prepare messages for the API call
      const messagesToSend: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...aiMessages,
        userMessage
      ];
      
      // Call the OpenAI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToSend,
          orgId: orgId // Pass orgId for potential custom behavior/logging
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add assistant response to chat
      const assistantMessage: ChatMessage = { 
        role: 'assistant', 
        content: data.message || "I'm sorry, I couldn't process that request."
      };
      
      setAiMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error calling AI API:', err);
      setError('Sorry, there was an error communicating with the AI service.');
    } finally {
      // End loading state
      setIsLoading(false);
      // Clear the input
      setAiPrompt('');
    }
  };

  return (
    <div className="p-6">
      <Tabs defaultValue={mode} onValueChange={(val) => setMode(val as 'sponsor' | 'client')} className="w-full">
        <TabsList className="bg-[#F8F9FA] border border-[#DADCE0] p-1 rounded-lg mb-6 w-full">
          <TabsTrigger value="sponsor" className="flex-1 data-[state=active]:bg-[#E8F0FE] data-[state=active]:text-[#1a73e8] text-[#5f6368] hover:text-[#202124]">My Campaigns</TabsTrigger>
          <TabsTrigger value="client" className="flex-1 data-[state=active]:bg-[#E8F0FE] data-[state=active]:text-[#1a73e8] text-[#5f6368] hover:text-[#202124]">Client Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="sponsor">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-[#202124] mb-4">Sponsor Campaigns</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  size="sm" 
                  onClick={() => setShowScheduler(!showScheduler)}
                  variant="outline"
                  className="text-[#5f6368] border-[#DADCE0] hover:bg-[#E8EAED] hover:text-[#202124] w-full sm:w-auto"
                >
                  {showScheduler ? 'Hide Scheduler' : 'Open Scheduler'}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-[#5f6368] border-[#DADCE0] hover:bg-[#E8EAED] hover:text-[#202124] w-full sm:w-auto"
                    >
                      Choose from Templates
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-4xl mx-auto">
                    <DialogHeader>
                      <DialogTitle className="text-[#202124]">Select a Campaign Template</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
                      {campaignTemplates.map(tpl => (
                        <Card
                          key={tpl.value}
                          onClick={() => setTemplate(tpl.value)}
                          className={`cursor-pointer border transition-colors ${template === tpl.value ? 'border-[#1a73e8] bg-[#E8F0FE]' : 'border-[#DADCE0] hover:bg-[#F8F9FA]'}`}
                        >
                          <CardHeader className="text-base font-semibold text-[#202124] pb-1 p-4">{tpl.label}</CardHeader>
                          <CardContent className="text-sm text-[#5f6368] px-4 pb-4">{tpl.description}</CardContent>
                        </Card>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
                <Link href={`/dashboard/sponsor/${orgId}/campaigns/social-post`}>
                  <Button 
                    size="sm"
                    className="bg-[#1a73e8] hover:bg-[#1557B0] text-white w-full sm:w-auto"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Single Social Post
                  </Button>
                </Link>
                <Button 
                  size="sm" 
                  className="bg-[#1a73e8] hover:bg-[#1557B0] text-white w-full sm:w-auto"
                  onClick={() => router.push(`/dashboard/sponsor/${orgId}/campaigns/new`)}
                >
                  + New Campaign
                </Button>
              </div>
            </div>

            {showScheduler && (
              <div className="bg-[#F8F9FA] border border-[#DADCE0] rounded-lg p-2 sm:p-4 -mx-2 sm:mx-0">
                <CampaignScheduler orgId={orgId} />
              </div>
            )}

            <div>
              <h2 className="text-base font-medium text-[#202124] mb-4">Active Campaigns</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border-[#DADCE0] hover:border-[#1a73e8] transition-colors">
                  <div className="p-4">
                    <h3 className="text-base font-medium text-[#202124] mb-2">Webinar Series - Volume Drive</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5f6368] mb-3">
                      <p>Status: <span className="font-semibold text-green-600">Running</span></p>
                      <p>Reach: 9,250 views</p>
                      <p>Spend: £6,120</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-[#1a73e8] border-[#1a73e8] hover:bg-[#E8F0FE] w-full sm:w-auto"
                    >
                      View
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="client">
          <div>
            <h2 className="text-lg font-semibold text-[#202124] mb-4">Client Campaigns</h2>
            <Select onValueChange={setClient}>
              <SelectTrigger className="w-full sm:w-[300px] border-[#DADCE0] text-[#202124]">
                <SelectValue placeholder="Select a client" className="text-[#5f6368]" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client1">Alpha Energy PLC</SelectItem>
                <SelectItem value="client2">GreenBlock Ventures</SelectItem>
                <SelectItem value="client3">Tokenised Assets Ltd</SelectItem>
              </SelectContent>
            </Select>
            {client && (
              <div className="mt-6">
                <p className="text-sm text-[#5f6368]">Viewing campaigns for: <span className="font-semibold text-[#202124]">{client}</span></p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                  <Card className="border-[#DADCE0] hover:border-[#1a73e8] transition-colors">
                    <CardHeader className="text-base font-medium text-[#202124] pb-1 p-4">Alpha Energy - £3M Raise</CardHeader>
                    <CardContent className="space-y-3 px-4 pb-4">
                      <p>Status: <span className="font-semibold text-yellow-600">Planning</span></p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-[#1a73e8] border-[#1a73e8] hover:bg-[#E8F0FE] w-full sm:w-auto"
                      >
                        Manage
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* AI Assistant Dialog */}
      {showAiAssistant && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30" onClick={() => setShowAiAssistant(false)}>
          <div 
            className="bg-white rounded-t-lg sm:rounded-lg shadow-xl w-full sm:max-w-4xl mx-0 sm:mx-4 overflow-hidden flex flex-col h-[90vh] sm:h-[560px]" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="p-3 sm:p-4 border-b flex items-center justify-between">
              <div className="flex items-center">
                <MessageSquare className="text-blue-600 mr-2 h-4 sm:h-5 w-4 sm:w-5" />
                <h2 className="font-semibold text-sm sm:text-base">Campaign AI Assistant</h2>
              </div>
              <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => setShowAiAssistant(false)}>
                <X className="h-4 sm:h-5 w-4 sm:w-5" />
              </Button>
            </div>
            
            {/* Chat Messages Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
              {aiMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <Bot className="h-12 w-12 mb-3 text-blue-600 opacity-80" />
                  <p className="text-center max-w-md">
                    I can help you plan, create, and optimize your marketing campaigns.
                    Ask me anything about campaign management!
                  </p>
                </div>
              )}
              
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                  <div 
                    className={cn(
                      "max-w-[80%] rounded-lg p-3",
                      msg.role === 'assistant' 
                        ? "bg-gray-100 text-gray-800" 
                        : "bg-blue-600 text-white"
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words prose-headings:mt-3 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:text-gray-800 prose-headings:font-semibold">
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3 flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-600" />
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="flex justify-center">
                  <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">
                    {error}
                  </div>
                </div>
              )}
            </div>
            
            {/* Suggestions */}
            <div className="p-3 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-500 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {aiSuggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    className="text-sm px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                    onClick={() => {
                      setAiPrompt(suggestion);
                      // Focus the input - this would require a ref in a real implementation
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Input Area */}
            <form onSubmit={handleAiSearch} className="p-3 border-t flex items-center gap-2">
              <Input
                type="text"
                placeholder="Ask me anything about campaigns..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-grow rounded-full border-gray-300"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-9 w-9"
                disabled={!aiPrompt.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 