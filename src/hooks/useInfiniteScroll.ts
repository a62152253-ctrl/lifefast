import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  hasMore?: boolean;
  loadMore?: () => void;
  threshold?: number;
  rootMargin?: string;
}

export const useInfiniteScroll = (options: UseInfiniteScrollOptions = {}) => {
  const { hasMore = true, loadMore, threshold = 100, rootMargin = '0px' } = options;
  const [isFetching, setIsFetching] = useState(false);
  
  const handleScroll = useCallback(() => {
    if (isFetching || !hasMore || !loadMore) return;
    
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    
    if (scrollHeight - scrollTop - clientHeight < threshold) {
      setIsFetching(true);
      loadMore();
      // Add small delay to prevent multiple calls
      setTimeout(() => setIsFetching(false), 500);
    }
  }, [isFetching, hasMore, loadMore, threshold]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return { isFetching };
};

export const useInfiniteScrollWithIntersection = (
  options: UseInfiniteScrollOptions & { sentinelRef?: React.RefObject<HTMLDivElement> }
) => {
  const { hasMore = true, loadMore, sentinelRef, threshold = 1.0 } = options;
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!sentinelRef?.current) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !isFetching && loadMore) {
          setIsFetching(true);
          await loadMore();
          setTimeout(() => setIsFetching(false), 1000);
        }
      },
      { threshold }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [hasMore, isFetching, loadMore, threshold, sentinelRef]);

  return { isFetching };
};
