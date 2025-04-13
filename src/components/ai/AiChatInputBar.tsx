'use client';

import React, { useState, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Mic } from 'lucide-react'; // Include Mic icon as in screenshot
import { cn } from "@/lib/utils";

// === Interfaces ===
interface AiChatInputBarProps {
  onIntentChange: (intent: string | null) => void;
  // Placeholder for future send message functionality
  // onSendMessage: (message: string) => void;
}

// === Component ===
const AiChatInputBar: React.FC<AiChatInputBarProps> = ({ onIntentChange }) => {
  const [inputValue, setInputValue] = useState('');

  // === Intent Detection Effect ===
  useEffect(() => {
    console.log('[AiChatInputBar] Intent detection useEffect running...');
    const lowerCaseInput = inputValue.toLowerCase().trim();
    let detectedIntent: string | null = null;

    // --- Reordered Intent Checks: Specific before General ---
    if (lowerCaseInput.includes('analytics') || lowerCaseInput.includes('stats') || lowerCaseInput.includes('volume') || lowerCaseInput.includes('market') || lowerCaseInput.includes('performance')) { // <<< Analytics FIRST
        detectedIntent = 'view_analytics';
    } else if (lowerCaseInput.includes('billing') || lowerCaseInput.includes('invoice') || lowerCaseInput.includes('subscription') || lowerCaseInput.includes('cancel') || lowerCaseInput.includes('upgrade') || lowerCaseInput.includes('payment')) { // <<< ADDED billing trigger
        detectedIntent = 'billing_management';
    } else if (lowerCaseInput.includes('settings') || lowerCaseInput.includes('profile') || lowerCaseInput.includes('account') || lowerCaseInput.includes('password') || lowerCaseInput.includes('preference')) { // <<< ADDED settings trigger
        detectedIntent = 'settings_management';
    } else if (lowerCaseInput.includes('manage listing') || lowerCaseInput.includes('edit listing')) {
        detectedIntent = 'manage_listing';
    } else if (lowerCaseInput.includes('manage issuer') || lowerCaseInput.includes('add issuer') || lowerCaseInput.includes('edit issuer') || lowerCaseInput.includes('issuer')) {
        detectedIntent = 'manage_issuer';
    } else if (lowerCaseInput.includes('list') || lowerCaseInput.includes('company') || lowerCaseInput.includes('listing')) {
      detectedIntent = 'list_company';
    } else if (lowerCaseInput.includes('generate') || lowerCaseInput.includes('document')) {
      detectedIntent = 'generate_document';
    } else if (lowerCaseInput.includes('campaign')) {
      detectedIntent = 'campaign_management';
    } else if (lowerCaseInput.includes('compliance') || lowerCaseInput.includes('check')) {
      detectedIntent = 'compliance_check';
    } else if (lowerCaseInput.includes('navigate') || lowerCaseInput.includes('go to') || lowerCaseInput.includes('show me')) { // <<< General Navigation LAST before fallback
      detectedIntent = 'general_navigation';
    } else if (lowerCaseInput.includes('manage') || lowerCaseInput.includes('edit')) { // Fallback for general manage/edit
        detectedIntent = 'manage_listing'; // Defaulting to listing management
    }

    console.log(`[AiChatInputBar] Detected Intent: ${detectedIntent}`);
    onIntentChange(detectedIntent);

  }, [inputValue, onIntentChange]);

  // === Handlers ===
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSendClick = () => {
    if (!inputValue.trim()) return;
    console.log("AI Input Send Clicked:", inputValue);
    // Placeholder: Call onSendMessage(inputValue) when implemented
    // setInputValue(''); // Decide if input should clear on send
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendClick();
    }
  };

  const handleMicClick = () => {
      console.log("AI Input Mic Clicked (Not Implemented)");
      // Placeholder for voice input functionality
  }

  // === Render ===
  return (
    <div className={cn(
        "bg-white rounded-full border border-gray-200 shadow-lg", // Slightly increased shadow
        "p-3 w-full max-w-3xl mx-auto", // Increased padding, increased max-width slightly
        "flex items-center gap-3" // Increased gap
        // Removed comment about margin - parent will handle positioning
    )}>
      <Input
        type="text"
        placeholder="What would you like to do today?"
        value={inputValue}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        className={cn(
            "flex-grow bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0",
            "text-lg text-gray-800 placeholder:text-gray-500 pl-4 pr-2 py-3" // Increased font size (text-lg), increased py
        )}
      />
      {/* Microphone Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleMicClick}
        className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full w-10 h-10" // Increased size
        aria-label="Use microphone (not implemented)"
      >
        <Mic className="h-6 w-6" /> {/* Increased icon size */}
      </Button>
      {/* Send Button */}
      <Button
        variant="default"
        size="icon"
        onClick={handleSendClick}
        disabled={!inputValue.trim()}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-11 h-11 disabled:opacity-60 flex-shrink-0" // Increased size, ensure it doesn't shrink
        aria-label="Send message"
      >
        <Send className="h-6 w-6" /> {/* Increased icon size */}
      </Button>
    </div>
  );
};

export default AiChatInputBar; 