import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from './ToastContext';

interface OfflineContextType {
  isOnline: boolean;
  isOffline: boolean;
  lastOnlineTime: Date | null;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(
    navigator.onLine ? new Date() : null
  );
  const { showToast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineTime(new Date());
      showToast({
        type: 'success',
        message: 'Połączenie przywrócone',
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast({
        type: 'offline',
        message: 'Utracono połączenie z internetem',
        duration: 0, // Don't auto-dismiss
        action: {
          label: 'Sprawdź połączenie',
          onClick: () => {
            // Could open network settings or provide guidance
            showToast({
              type: 'info',
              message: 'Sprawdź połączenie Wi-Fi lub dane komórkowe',
            });
          },
        },
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  const value: OfflineContextType = {
    isOnline,
    isOffline: !isOnline,
    lastOnlineTime,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
