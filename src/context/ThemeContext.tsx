import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'default' | 'ocean' | 'forest' | 'sunset' | 'dark' | 'glass';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('lifeflow-theme') as Theme) || 'default';
  });

  useEffect(() => {
    localStorage.setItem('lifeflow-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Apply theme-specific background classes
    const colors = {
      default: '#FBFBFC',
      ocean: '#F0F9FF',
      forest: '#F0FDF4',
      sunset: '#FFF7ED',
      dark: '#0F0F12',
      glass: '#F8FAFC'
    };
    
    document.body.style.backgroundColor = colors[theme] || colors.default;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
