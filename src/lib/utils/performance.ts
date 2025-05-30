export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 100;

  startTimer(operation: string) {
    const startTime = performance.now();
    return {
      end: (success: boolean = true, error?: string) => {
        const duration = performance.now() - startTime;
        this.recordMetric({
          operation,
          duration,
          timestamp: new Date(),
          success,
          error
        });
        
        // Log slow operations
        if (duration > 5000) {
          console.warn(`🐌 Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
        }
        
        return duration;
      }
    };
  }

  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getSlowOperations(thresholdMs: number = 3000): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration > thresholdMs);
  }

  getAverageTime(operation: string): number {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);
    if (operationMetrics.length === 0) return 0;
    
    const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / operationMetrics.length;
  }

  getFailureRate(operation: string): number {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);
    if (operationMetrics.length === 0) return 0;
    
    const failures = operationMetrics.filter(m => !m.success).length;
    return failures / operationMetrics.length;
  }

  logSummary() {
    const slowOps = this.getSlowOperations();
    if (slowOps.length > 0) {
      console.group('📊 Performance Summary');
      console.log(`Slow operations (>3s): ${slowOps.length}`);
      slowOps.forEach(op => {
        console.log(`  ${op.operation}: ${op.duration.toFixed(2)}ms ${op.success ? '✅' : '❌'}`);
      });
      console.groupEnd();
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Enhanced timeout wrapper with performance tracking
export async function monitoredOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  timeoutMs: number = 15000
): Promise<T> {
  const timer = performanceMonitor.startTimer(operationName);
  
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const result = await Promise.race([operation(), timeoutPromise]);
    timer.end(true);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    timer.end(false, errorMessage);
    throw error;
  }
} 