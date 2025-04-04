// Utility function to synchronize logs between server and client

import { ActivityType } from './logger';

/**
 * Send a log entry from the server to the client
 * This function should be called from server components or API routes
 * to ensure logs are visible in the client UI
 */
export async function syncLogToClient(type: ActivityType, message: string, data?: any) {
  // Only run in server environment
  if (typeof window !== 'undefined') {
    return;
  }
  
  try {
    // Send the log to the client via the API
    await fetch('/api/ai/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        message,
        data
      }),
    });
  } catch (error) {
    console.error('Failed to sync log to client:', error);
  }
}

/**
 * Send a log entry from the client to the server
 * This function should be called from client components
 * to ensure logs are visible in the server logs
 */
export async function syncLogToServer(type: ActivityType, message: string, data?: any) {
  // Only run in client environment
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    // Send the log to the server via the API
    await fetch('/api/ai/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        message: `[Client] ${message}`,
        data
      }),
    });
  } catch (error) {
    console.error('Failed to sync log to server:', error);
  }
} 