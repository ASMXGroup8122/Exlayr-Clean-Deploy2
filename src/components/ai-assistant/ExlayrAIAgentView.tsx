'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';

interface LogEntry {
  type: string;
  message: string;
  timestamp: Date;
  data?: {
    isCompliant?: boolean;
    score?: number;
    suggestions?: string[];
    agent?: string;
    suggestionCount?: number;
  };
}

class AIAgentLogger {
  private subscribers: ((entry: LogEntry) => void)[] = [];
  private logEntries: LogEntry[] = [];

  subscribe(callback: (entry: LogEntry) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  logActivity(type: string, message: string, data?: any) {
    const entry: LogEntry = {
      type,
      message,
      timestamp: new Date(),
      data
    };
    this.logEntries.push(entry);
    this.subscribers.forEach(callback => callback(entry));
    console.log(`[${type}] ${message}`, data);
  }

  clearLogs() {
    this.logEntries = [];
    this.subscribers.forEach(callback => callback({
      type: 'clear',
      message: 'Logs cleared',
      timestamp: new Date()
    }));
  }

  getLogs() {
    return this.logEntries;
  }
}

export const aiAgentLogger = new AIAgentLogger();

interface AIAgentViewButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export const AIAgentViewButton: React.FC<AIAgentViewButtonProps> = ({ onClick, isOpen }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 bg-gray-900 text-green-400 p-3 rounded-full shadow-lg hover:bg-gray-800 transition-colors"
      aria-label={isOpen ? 'Close Agent View' : 'Open Agent View'}
    >
      <Activity className="w-6 h-6" />
    </button>
  );
};

interface ExlayrAIAgentViewProps {
  onClose?: () => void;
}

export const ExlayrAIAgentView: React.FC<ExlayrAIAgentViewProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = aiAgentLogger.subscribe((entry) => {
      setLogs(prevLogs => [...prevLogs, entry]);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'analysis':
        return 'text-blue-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      default:
        return 'text-green-400';
    }
  };

  const renderLogEntry = (entry: LogEntry) => {
    const logColor = getLogColor(entry.type);
    return (
      <div key={entry.timestamp.getTime()} className="mb-2">
        <span className="text-yellow-400">[{formatTimestamp(entry.timestamp)}]</span>{' '}
        <span className={logColor}>{entry.message}</span>
        {entry.data && (
          <div className="ml-4 mt-1 bg-gray-800 p-2 rounded">
            {entry.data.isCompliant !== undefined && (
              <div className="flex items-center space-x-2">
                <span className={entry.data.isCompliant ? 'text-green-400' : 'text-red-400'}>
                  {entry.data.isCompliant ? '✓ Compliant' : '✗ Non-compliant'}
                </span>
                {entry.data.score !== undefined && (
                  <span className="text-gray-400">
                    (Score: {(entry.data.score * 100).toFixed(1)}%)
                  </span>
                )}
              </div>
            )}
            {entry.data.agent && (
              <div className="text-blue-400">
                Agent: {entry.data.agent}
              </div>
            )}
            {entry.data.suggestions && entry.data.suggestions.length > 0 && (
              <div className="mt-1">
                <div className="text-yellow-400">Suggestions:</div>
                <ul className="list-disc list-inside text-gray-300">
                  {entry.data.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const toggleView = () => {
    setIsOpen(!isOpen);
    if (!isOpen && onClose) {
      onClose();
    }
  };

  if (!isOpen) {
    return <AIAgentViewButton onClick={toggleView} isOpen={isOpen} />;
  }

  return (
    <div className="fixed inset-0 bg-gray-900 text-green-400 font-mono p-4 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">AI Agent Analysis</h2>
        <button
          onClick={toggleView}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1">
          {logs.map(renderLogEntry)}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default ExlayrAIAgentView; 