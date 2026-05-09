import React from 'react';

// Lazy loading utilities for better performance
export const lazyLoad = <T extends { default: React.ComponentType<any> }>(
  loader: () => Promise<T>,
  fallback?: React.ComponentType,
) =>
  React.lazy(async () => {
    try {
      return await loader();
    } catch (error) {
      console.error('Lazy loading failed:', error);
      return {
        default:
          fallback ??
          (() => React.createElement('div', null, 'Loading failed')),
      };
    }
  });

export const preloadComponent = (loader: () => Promise<unknown>) => {
  void loader();
};

export const LazyImage = ({
  src,
  alt = '',
  className = '',
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const image = imgRef.current;

    if (!image) {
      return undefined;
    }

    const handleLoad = () => {
      setIsLoaded(true);
      setHasError(false);
    };

    const handleError = () => {
      setHasError(true);
      setIsLoaded(false);
    };

    image.addEventListener('load', handleLoad);
    image.addEventListener('error', handleError);

    return () => {
      image.removeEventListener('load', handleLoad);
      image.removeEventListener('error', handleError);
    };
  }, [src]);

  return React.createElement('img', {
    ...props,
    ref: imgRef,
    src,
    alt,
    className: `transition-opacity duration-300 ${
      isLoaded && !hasError ? 'opacity-100' : 'opacity-0'
    } ${className}`.trim(),
  });
};
