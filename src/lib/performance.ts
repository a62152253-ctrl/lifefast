// Performance optimization utilities

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

export const memoize = <T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T => {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    // Clear cache after 5 minutes to prevent memory leaks
    setTimeout(() => cache.delete(key), 5 * 60 * 1000);
    
    return result;
  }) as T;
};

// Virtual scrolling helper for large lists
export const getVisibleItems = <T>(
  items: T[],
  scrollTop: number,
  itemHeight: number,
  containerHeight: number,
  buffer: number = 5
) => {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
  );
  
  return {
    items: items.slice(startIndex, endIndex),
    startIndex,
    endIndex,
    offsetY: startIndex * itemHeight
  };
};

// Performance monitoring
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
  }
  
  return end - start;
};
