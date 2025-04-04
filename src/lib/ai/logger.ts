// Server-compatible logger for AI operations
// This can be used in both client and server components

// Define the types for agent logs
type ActivityType = 'process' | 'analysis' | 'search' | 'storage' | 'decision' | 'complete' | 'error';

interface LogEntry {
  type: ActivityType;
  message: string;
  data?: any;
  timestamp: string;
}

// Simple server-compatible logger
class AILogger {
  logActivity(type: ActivityType, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    
    // Always log to console
    console.log(`[AI ${type.toUpperCase()}] ${message}`, data || '');
    
    // Return the log entry in case it's needed
    return {
      type,
      message,
      data,
      timestamp
    };
  }
  
  // Method to sync logs to client (will be implemented in syncLogs.ts)
  async syncToClient(type: ActivityType, message: string, data?: any) {
    // This is a placeholder that will be implemented by importing syncLogToClient
    // from syncLogs.ts when needed
    
    // We don't import it directly here to avoid circular dependencies
    // and to keep this module server-compatible
    
    // Log locally first
    this.logActivity(type, message, data);
    
    // The actual sync will happen when this method is called with the imported function
  }
}

// Create a singleton instance
export const aiLogger = new AILogger();

// Export types for use elsewhere
export type { ActivityType, LogEntry }; 