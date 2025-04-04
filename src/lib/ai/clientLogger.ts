'use client';

// Client-side wrapper for the AI Agent Logger
// This ensures that the logger works properly in the client

import { ActivityType } from './logger';
import { syncLogToServer } from './syncLogs';

// This is a client-side only module
let aiAgentLogger: any;

// Try to import the client-side logger
try {
  // Dynamic import to avoid SSR issues
  aiAgentLogger = require('@/components/ai-assistant/ExlayrAIAgentView').aiAgentLogger;
} catch (error) {
  console.warn('AI Agent Logger not available in client, using fallback');
  
  // Create a fallback logger if the real one isn't available
  aiAgentLogger = {
    logActivity: (type: ActivityType, message: string, data?: any) => {
      console.log(`[AI ${type.toUpperCase()}] ${message}`, data || '');
    }
  };
}

// Enhanced client logger that syncs with the server
export const clientLogger = {
  logActivity: async (type: ActivityType, message: string, data?: any) => {
    // Log to the client-side logger
    aiAgentLogger.logActivity(type, message, data);
    
    // Sync to the server
    await syncLogToServer(type, message, data);
  }
}; 