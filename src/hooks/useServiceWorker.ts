import { useState, useEffect, useCallback } from 'react';

interface ServiceWorkerStatus {
  isSupported: boolean;
  isInstalled: boolean;
  isActivated: boolean;
  needsUpdate: boolean;
}

export const useServiceWorker = () => {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    isSupported: false,
    isInstalled: false,
    isActivated: false,
    needsUpdate: false,
  });

  useEffect(() => {
    // Check if service worker is supported
    if ('serviceWorker' in navigator) {
      setStatus(prev => ({ ...prev, isSupported: true }));

      // Register service worker
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
          setStatus(prev => ({ ...prev, isInstalled: true, isActivated: true }));
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            setStatus(prev => ({ ...prev, needsUpdate: true }));
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
          setStatus(prev => ({ ...prev, isInstalled: false }));
        });
    } else {
      setStatus(prev => ({ ...prev, isSupported: false }));
    }
  }, []);

  const activateUpdate = useCallback(() => {
    if (status.needsUpdate && status.isActivated) {
      // Send message to service worker to skip waiting
      navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
      setStatus(prev => ({ ...prev, needsUpdate: false }));
    }
  }, [status.needsUpdate, status.isActivated]);

  return {
    ...status,
    activateUpdate,
  };
};
