// Image optimization utilities

export const optimizeImage = (
  src: string,
  options: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    format?: 'webp' | 'avif' | 'jpeg' | 'png';
  } = {}
): Promise<string> => {
  const { quality = 80, maxWidth = 1920, maxHeight = 1080, format = 'webp' } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Calculate dimensions
      let { width, height } = img;
      const aspectRatio = width / height;

      if (width > maxWidth) {
        width = maxWidth;
        height = maxWidth / aspectRatio;
      }

      if (height > maxHeight) {
        height = maxHeight;
        width = maxHeight * aspectRatio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and optimize
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to desired format
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            resolve(url);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        `image/${format}`,
        quality / 100
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
};

export const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

export const createImageSet = (
  src: string,
  sizes: number[] = [320, 640, 960, 1280, 1920]
): string => {
  return sizes
    .map(size => `${src}?w=${size} ${size}w`)
    .join(', ');
};

export const lazyLoadImages = () => {
  if ('loading' in HTMLImageElement.prototype) {
    return;
  }

  // Custom lazy loading for browsers that don't support it natively
  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      }
    });
  });

  images.forEach(img => imageObserver.observe(img));
};
