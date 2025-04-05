# Python Server Integration

## Overview

The Python server is a critical component of the Exlayr.AI platform that provides advanced AI capabilities for document analysis. It runs as a separate process and communicates with the Next.js application through API endpoints. This document explains how the Python server is integrated, how it's managed, and how it's automatically started when needed.

## Architecture

The Python server integration consists of the following components:

1. **Python Server**: A Flask application that provides AI capabilities through API endpoints
2. **Server Management**: Functions for starting, stopping, and checking the status of the server
3. **Context Provider**: React context for managing server state and providing it to components
4. **API Routes**: Next.js API routes for communicating with the Python server
5. **UI Components**: React components that use the Python server capabilities

## Automatic Server Startup

The Python server is now automatically started when needed, specifically when the AI Assistant is opened. This improves the user experience by eliminating the need for manual server activation.

### How It Works

1. When the AI Assistant component is mounted and `isOpen` is true, it checks if the Python server is running
2. If the server is not running and not already starting, it automatically initiates the server startup process
3. The UI shows a "Starting advanced mode..." indicator while the server is starting
4. Once the server is running, the UI updates to show "Advanced mode" with a green checkmark

### Implementation Details

The automatic startup is implemented in the `ListingAIAssistant.tsx` component:

```typescript
// Add an effect to start the Python server when the component is opened
useEffect(() => {
  if (isOpen) {
    // Check if the server is already running
    const checkAndStartServer = async () => {
      const isAvailable = await checkServerStatus();
      if (!isAvailable && !isServerStarting) {
        console.log('AI Assistant opened: Starting Python server...');
        handleStartServer();
      }
    };
    
    checkAndStartServer();
  }
}, [isOpen, isServerAvailable, isServerStarting, checkServerStatus, handleStartServer]);
```

## Server Management

The Python server is managed through the following functions in `src/lib/ai/startPythonServer.ts`:

### `checkServerStatus()`

Checks if the Python server is running by making a request to the `/api/python-server/status` endpoint.

```typescript
export async function checkServerStatus(): Promise<boolean> {
  try {
    // Add a timeout to the fetch request to prevent long waiting times
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    // Call a server API route to check the Python server status
    const response = await fetch('/api/python-server/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.available;
  } catch (error) {
    // Only log detailed errors if they're not connection-related
    if (!(error instanceof TypeError && error.message.includes('Failed to fetch'))) {
      console.error('Error checking Python API availability:', error);
    }
    return false;
  }
}
```

### `startPythonServer()`

Starts the Python server by making a request to the `/api/python-server/start` endpoint. Includes retry logic for reliability.

```typescript
export async function startPythonServer(): Promise<boolean> {
  const maxRetries = 2;
  let retries = 0;
  let success = false;

  while (retries <= maxRetries && !success) {
    try {
      // Add a timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for starting
      
      // Call a server API route to start the Python server
      const response = await fetch('/api/python-server/start', {
        method: 'POST',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to start Python server: ${response.status}`);
      }
      
      const data = await response.json();
      success = data.success;
      
      if (success) {
        console.log('Python server started successfully');
        return true;
      } else {
        console.warn(`Failed to start Python server (attempt ${retries + 1}/${maxRetries + 1}): ${data.message}`);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.warn(`Request to start Python server timed out (attempt ${retries + 1}/${maxRetries + 1})`);
      } else {
        console.error(`Error starting Python server (attempt ${retries + 1}/${maxRetries + 1}):`, error);
      }
    }
    
    retries++;
    
    // Wait before retrying
    if (retries <= maxRetries && !success) {
      console.log(`Retrying to start Python server in 2 seconds (attempt ${retries + 1}/${maxRetries + 1})...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return success;
}
```

### `stopPythonServer()`

Stops the Python server by making a request to the `/api/python-server/stop` endpoint.

## Context Provider

The `PythonServerProvider` in `src/contexts/PythonServerContext.tsx` manages the server state and provides it to components through the `usePythonServer` hook.

### State Management

The provider maintains the following state:

- `isServerAvailable`: Whether the Python server is currently running
- `isServerStarting`: Whether the Python server is in the process of starting

### Exposed Functions

The provider exposes the following functions through the context:

- `startServer()`: Start the Python server
- `stopServer()`: Stop the Python server
- `checkServerStatus()`: Check if the Python server is running

### Periodic Status Checking

The provider periodically checks the server status to keep the state up-to-date:

```typescript
// Just check server status on mount, but don't auto-start
useEffect(() => {
  // Initial check with a small delay to allow the app to load fully
  const initialCheckTimeout = setTimeout(() => {
    checkServerStatusInternal();
  }, 2000);
  
  // Set up interval to check server status periodically
  const interval = setInterval(async () => {
    await checkServerStatusInternal();
  }, 60000); // Check every minute
  
  return () => {
    clearTimeout(initialCheckTimeout);
    clearInterval(interval);
  };
}, []);
```

## API Routes

The following API routes are used for Python server management:

- `/api/python-server/status`: Check if the Python server is running
- `/api/python-server/start`: Start the Python server
- `/api/python-server/stop`: Stop the Python server
- `/api/python-server/agent`: Forward requests to the Python server's agent endpoint

## UI Integration

The Python server status is integrated into the UI in the following ways:

1. **Status Indicator**: Shows whether the server is available or starting
2. **Automatic Startup**: Starts the server automatically when the AI Assistant is opened
3. **Error Handling**: Gracefully handles cases where the server fails to start

## Best Practices

### For Developers

1. **Error Handling**: Always handle errors when interacting with the Python server
2. **Timeouts**: Use timeouts for all requests to prevent hanging
3. **Fallbacks**: Provide fallback functionality when the server is not available
4. **Status Checking**: Check the server status before making requests
5. **User Feedback**: Provide clear feedback to users about the server status

### For Users

1. **Patience**: The server may take a few seconds to start
2. **Status Indicators**: Check the status indicators to see if the server is running
3. **Fallback Features**: Basic features will still work even if the server is not available

## Troubleshooting

### Common Issues

1. **Server Won't Start**: Check the console for error messages
2. **Timeout Errors**: The server may be taking too long to start
3. **Connection Errors**: The server may be running but not responding

### Debugging

1. **Check Logs**: Look for error messages in the console
2. **Check Status**: Use the `/api/python-server/status` endpoint to check the server status
3. **Restart Server**: Try stopping and starting the server

## Future Enhancements

1. **Improved Startup Performance**: Optimize the server startup process
2. **Health Monitoring**: Add more sophisticated health monitoring
3. **Auto-Restart**: Automatically restart the server if it crashes
4. **Resource Management**: Better management of server resources
5. **Distributed Deployment**: Support for distributed deployment of the Python server 