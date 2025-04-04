type LogActivity = 'start' | 'section' | 'analysis' | 'error' | 'complete' | 'process' | 'search';

interface LogEntry {
  timestamp: string;
  activity: LogActivity;
  message: string;
  metadata?: any;
}

class AILogger {
  private logs: LogEntry[] = [];
  private subscribers: ((entry: LogEntry) => void)[] = [];

  logActivity(activity: LogActivity, message: string, metadata?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      activity,
      message,
      metadata
    };

    this.logs.push(entry);
    this.notifySubscribers(entry);
    console.log(`[AI ${activity.toUpperCase()}] ${message}`, metadata || '');
  }

  subscribe(callback: (entry: LogEntry) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notifySubscribers(entry: LogEntry) {
    this.subscribers.forEach(callback => {
      try {
        callback(entry);
      } catch (error) {
        console.error('Error in AI logger subscriber:', error);
      }
    });
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const aiLogger = new AILogger(); 