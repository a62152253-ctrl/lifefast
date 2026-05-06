import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type DeviceType = 'desktop' | 'mobile';

interface DeviceContextType {
  deviceType: DeviceType;
  setDeviceType: (type: DeviceType) => void;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider = ({ children }: { children: ReactNode }) => {
  const [deviceType, setDeviceTypeState] = useState<DeviceType>(() => {
    const saved = localStorage.getItem('lifeflow_device_type');
    return (saved as DeviceType) || 'desktop';
  });

  const setDeviceType = (type: DeviceType) => {
    setDeviceTypeState(type);
    localStorage.setItem('lifeflow_device_type', type);
  };

  return (
    <DeviceContext.Provider value={{ deviceType, setDeviceType }}>
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (!context) throw new Error('useDevice must be used within DeviceProvider');
  return context;
};
