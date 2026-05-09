import { useState, useEffect, useMemo, useRef } from 'react';
import { getVisibleItems } from '../lib/performance';

interface UseVirtualListOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  scrollElement?: HTMLElement | Window;
}

export const useVirtualList = <T>(
  items: T[],
  options: UseVirtualListOptions
) => {
  const { itemHeight, containerHeight, overscan = 5, scrollElement = window } = options;
  
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLElement | Window>(scrollElement);
  
  useEffect(() => {
    const element = scrollElementRef.current;
    
    const handleScroll = () => {
      const top = element === window 
        ? window.scrollY 
        : (element as HTMLElement).scrollTop;
      setScrollTop(top);
    };
    
    element.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [scrollElement]);
  
  const visibleItems = useMemo(() => {
    return getVisibleItems(items, scrollTop, itemHeight, containerHeight, overscan);
  }, [items, scrollTop, itemHeight, containerHeight, overscan]);
  
  const totalHeight = items.length * itemHeight;
  
  return {
    visibleItems: visibleItems.items,
    totalHeight,
    startIndex: visibleItems.startIndex,
    endIndex: visibleItems.endIndex,
    offsetY: visibleItems.offsetY,
    scrollTop,
  };
};
