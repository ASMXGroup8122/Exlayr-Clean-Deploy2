'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AIAssistantContextType {
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  isAdvancedMode: boolean;
  toggleAdvancedMode: () => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState(true); // Default to advanced mode

  const toggleAdvancedMode = useCallback(() => {
    setIsAdvancedMode(prev => !prev);
  }, []);

  return (
    <AIAssistantContext.Provider
      value={{
        isProcessing,
        setIsProcessing,
        isAdvancedMode,
        toggleAdvancedMode
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistant() {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
} 