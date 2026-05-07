import React, { useState, useRef, useEffect, useCallback } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function VirtualList<T>({ 
  items, 
  itemHeight, 
  containerHeight, 
  renderItem, 
  className 
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (scrollElementRef.current) {
      setScrollTop(scrollElementRef.current.scrollTop);
    }
  }, []);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = items.slice(visibleStart, visibleEnd);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;

  return (
    <div
      ref={scrollElementRef}
      className={className}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={visibleStart + index} style={{ height: itemHeight }}>
              {renderItem(item, visibleStart + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
