'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = (): void => {
    // Attempt to recover by retrying the render
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Clear cache and reload if this is a chunk loading error
    if (this.state.error && this.state.error.message && 
        (this.state.error.message.includes('Loading chunk') || 
         this.state.error.message.includes('Failed to load'))) {
      // Clear browser cache for this page's assets
      if (window.caches) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      // Hard reload to get fresh chunks
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Check if this is a chunk loading error
      const isChunkError = this.state.error && 
                          (this.state.error.message?.includes('Loading chunk') || 
                           this.state.error.message?.includes('Failed to load'));
      
      const errorMessage = isChunkError
        ? 'A resource failed to load. This might be due to a connection issue or recent update.'
        : 'Something went wrong with this component.';
      
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="p-6 rounded-lg border border-red-200 bg-red-50 text-red-800 flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-center">{errorMessage}</h3>
          {this.state.error && (
            <p className="text-sm text-red-600 max-w-full overflow-hidden text-ellipsis">
              {this.state.error.toString().substring(0, 150)}
              {this.state.error.toString().length > 150 ? '...' : ''}
            </p>
          )}
          <Button 
            onClick={this.handleRetry}
            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {isChunkError ? 'Reload Page' : 'Try Again'}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary }; 