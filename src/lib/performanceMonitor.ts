// Performance monitoring and optimization utilities

interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  reRenderCount: number;
  memoryUsage: number;
  bundleSize: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    renderTime: 0,
    componentCount: 0,
    reRenderCount: 0,
    memoryUsage: 0,
    bundleSize: 0,
  };

  private startTime: number = 0;
  private observers: MutationObserver[] = [];

  constructor() {
    this.startTime = performance.now();
    this.setupObservers();
  }

  private setupObservers() {
    // Monitor DOM mutations
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        this.metrics.reRenderCount += mutations.length;
        this.logPerformance();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
      });

      this.observers.push(observer);
    }

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
      }, 1000);
    }

    // Monitor render performance
    this.monitorRenderPerformance();
  }

  private monitorRenderPerformance() {
    let lastTime = performance.now();
    
    const measureRender = () => {
      const now = performance.now();
      const frameTime = now - lastTime;
      this.metrics.renderTime = Math.max(this.metrics.renderTime, frameTime);
      lastTime = now;
      
      requestAnimationFrame(measureRender);
    };

    requestAnimationFrame(measureRender);
  }

  private logPerformance() {
    if (process.env.NODE_ENV === 'development') {
      console.group('🚀 Performance Metrics');
      console.log('Render Time:', this.metrics.renderTime.toFixed(2) + 'ms');
      console.log('Re-renders:', this.metrics.reRenderCount);
      console.log('Memory Usage:', (this.metrics.memoryUsage / 1024 / 1024).toFixed(2) + 'MB');
      console.log('Component Count:', this.metrics.componentCount);
      console.log('Bundle Size:', this.metrics.bundleSize + 'KB');
      console.groupEnd();

      // Performance warnings
      if (this.metrics.renderTime > 16.67) { // 60fps threshold
        console.warn('⚠️ Slow render detected:', this.metrics.renderTime.toFixed(2) + 'ms');
      }

      if (this.metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB threshold
        console.warn('⚠️ High memory usage:', (this.metrics.memoryUsage / 1024 / 1024).toFixed(2) + 'MB');
      }
    }
  }

  public trackComponentRender(componentName: string) {
    this.metrics.componentCount++;
    this.logPerformance();
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public reset() {
    this.metrics = {
      renderTime: 0,
      componentCount: 0,
      reRenderCount: 0,
      memoryUsage: 0,
      bundleSize: 0,
    };
  }

  public cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Performance optimization suggestions
export const getPerformanceSuggestions = (metrics: PerformanceMetrics): string[] => {
  const suggestions: string[] = [];

  if (metrics.renderTime > 16.67) {
    suggestions.push('Consider using React.memo() to prevent unnecessary re-renders');
  }

  if (metrics.reRenderCount > 100) {
    suggestions.push('High re-render count detected. Check dependency arrays and useCallback usage');
  }

  if (metrics.memoryUsage > 50 * 1024 * 1024) {
    suggestions.push('High memory usage. Consider implementing virtual scrolling or pagination');
  }

  if (metrics.bundleSize > 1000) {
    suggestions.push('Large bundle size. Consider code splitting and tree shaking');
  }

  return suggestions;
};

// Performance testing utilities
export const measureComponentPerformance = (componentName: string, renderFunction: () => void) => {
  const start = performance.now();
  renderFunction();
  const end = performance.now();
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`⏱️ ${componentName} render time: ${(end - start).toFixed(2)}ms`);
  }

  return end - start;
};

export const debounceWithTracking = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  name: string
): T => {
  let timeoutId: NodeJS.Timeout;
  let callCount = 0;

  return ((...args: Parameters<T>) => {
    callCount++;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 ${name} called ${callCount} times`);
    }

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
};
