import { useEffect, useCallback, useRef } from 'react';

interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  timestamp: number;
}

export const usePerformanceTracking = () => {
  const entriesRef = useRef<PerformanceEntry[]>([]);
  const isTrackingRef = useRef(false);

  const startTracking = useCallback((name: string) => {
    if (isTrackingRef.current) return;
    
    const entry: PerformanceEntry = {
      name,
      startTime: performance.now(),
      duration: 0,
      timestamp: Date.now(),
    };
    
    entriesRef.current.push(entry);
    isTrackingRef.current = true;
    
    return () => {
      entry.duration = performance.now() - entry.startTime;
      isTrackingRef.current = false;
      
      // Log performance data in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 ${name}: ${entry.duration.toFixed(2)}ms`);
      }
    };
  }, []);

  const getPerformanceReport = useCallback(() => {
    const entries = entriesRef.current;
    
    if (entries.length === 0) {
      return {
        totalOperations: 0,
        averageTime: 0,
        slowestOperation: null,
        fastestOperation: null,
        operations: [],
      };
    }

    const totalOperations = entries.length;
    const totalTime = entries.reduce((sum, entry) => sum + entry.duration, 0);
    const averageTime = totalTime / totalOperations;
    
    const sortedEntries = [...entries].sort((a, b) => b.duration - a.duration);
    const slowestOperation = sortedEntries[0];
    const fastestOperation = sortedEntries[sortedEntries.length - 1];

    // Performance analysis
    const slowOperations = entries.filter(entry => entry.duration > 100); // > 100ms
    const fastOperations = entries.filter(entry => entry.duration < 16); // < 16ms (60fps)

    return {
      totalOperations,
      averageTime,
      slowestOperation,
      fastestOperation,
      operations: entries,
      slowOperations: slowOperations.length,
      fastOperations: fastOperations.length,
      performanceScore: Math.max(0, 100 - (slowOperations.length / totalOperations * 100)),
    };
  }, []);

  const clearPerformanceData = useCallback(() => {
    entriesRef.current = [];
    isTrackingRef.current = false;
  }, []);

  // Auto-cleanup old entries (keep only last 100)
  useEffect(() => {
    const interval = setInterval(() => {
      if (entriesRef.current.length > 100) {
        entriesRef.current = entriesRef.current.slice(-100);
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  return {
    startTracking,
    getPerformanceReport,
    clearPerformanceData,
    isTracking: isTrackingRef.current,
  };
};
