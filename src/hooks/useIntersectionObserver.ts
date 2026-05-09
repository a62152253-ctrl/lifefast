import { useState, useEffect, useCallback, useRef } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

export const useIntersectionObserver = (
  options: UseIntersectionObserverOptions = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const elementRef = useRef<Element | null>(null);
  const frozen = useRef(false);

  const { threshold = 0, root = null, rootMargin = '0px', freezeOnceVisible = false } = options;

  const updateEntry = useCallback(([entry]: IntersectionObserverEntry[]) => {
    const isElementIntersecting = entry.isIntersecting;

    if (freezeOnceVisible && isElementIntersecting) {
      frozen.current = true;
    }

    if (frozen.current && !isElementIntersecting) {
      return;
    }

    setIsIntersecting(isElementIntersecting);
    setEntry(entry);
  }, [freezeOnceVisible]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(updateEntry, {
      threshold,
      root,
      rootMargin,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, updateEntry]);

  return {
    ref: elementRef,
    isIntersecting,
    entry,
  };
};
