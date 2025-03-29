import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@/constants/theme';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextProps {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  colors: typeof COLORS.light;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);
const THEME_STORAGE_KEY = '@app_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const systemColorScheme = Appearance.getColorScheme() || 'light';
  
  // Cargar tema guardado al inicio
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme) {
          setThemeState(savedTheme as Theme);
        }
      } catch (error) {
        console.log('Error al cargar el tema:', error);
      }
    };
    
    loadTheme();
  }, []);
  
  // Guardar tema cuando cambie
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.log('Error al guardar el tema:', error);
    }
  };
  
  // Determinar tema actual basado en la preferencia
  const actualTheme = theme === 'system' ? systemColorScheme : theme;
  const colors = COLORS[actualTheme as 'light' | 'dark'];
  
  // Escuchar cambios en el tema del sistema
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Solo refrescamos el estado para que los componentes se actualicen
    });
    
    return () => subscription.remove();
  }, []);
  
  return (
    <ThemeContext.Provider value={{ 
      theme, 
      actualTheme: actualTheme as 'light' | 'dark', 
      setTheme,
      colors 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
}