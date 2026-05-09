import React, { useMemo } from 'react';
import { useVirtualList } from '../hooks/useVirtualList';

interface VListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VList<T>({ 
  items, 
  itemHeight, 
  containerHeight, 
  renderItem, 
  overscan = 5,
  className = ''
}: VListProps<T>) {
  const {
    visibleItems,
    totalHeight,
    startIndex,
    offsetY,
  } = useVirtualList(items, {
    itemHeight,
    containerHeight,
    overscan,
  });

  return (
    <div 
      className={className}
      style={{ height: containerHeight, overflow: 'auto' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={typeof item === 'object' && item !== null ? (item as any).id : index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
