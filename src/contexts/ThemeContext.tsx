import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser } from '../app/lib/auth';

// Definição dos temas disponíveis
export const TEACHER_THEMES = [
  {
    id: 'blue',
    name: 'Azul Profissional',
    primary: '#3b82f6',
    secondary: '#dbeafe',
    hover: '#2563eb',
    text: '#1e40af',
    bg: '#eff6ff',
    border: '#bfdbfe',
    gradient: 'from-blue-600 to-blue-400',
    dark: {
      primary: '#60a5fa',
      secondary: '#1e3a8a',
      hover: '#3b82f6',
      text: '#93c5fd',
      bg: '#172554',
      border: '#1e40af',
    }
  },
  {
    id: 'green',
    name: 'Verde Natureza',
    primary: '#10b981',
    secondary: '#d1fae5',
    hover: '#059669',
    text: '#065f46',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    gradient: 'from-green-600 to-green-400',
    dark: {
      primary: '#34d399',
      secondary: '#064e3b',
      hover: '#10b981',
      text: '#6ee7b7',
      bg: '#022c22',
      border: '#065f46',
    }
  },
  {
    id: 'purple',
    name: 'Roxo Criativo',
    primary: '#8b5cf6',
    secondary: '#ede9fe',
    hover: '#7c3aed',
    text: '#5b21b6',
    bg: '#f5f3ff',
    border: '#c4b5fd',
    gradient: 'from-purple-600 to-purple-400',
    dark: {
      primary: '#a78bfa',
      secondary: '#4c1d95',
      hover: '#8b5cf6',
      text: '#c4b5fd',
      bg: '#2e1065',
      border: '#5b21b6',
    }
  },
  {
    id: 'orange',
    name: 'Laranja Energia',
    primary: '#f97316',
    secondary: '#ffedd5',
    hover: '#ea580c',
    text: '#9a3412',
    bg: '#fff7ed',
    border: '#fed7aa',
    gradient: 'from-orange-600 to-orange-400',
    dark: {
      primary: '#fb923c',
      secondary: '#7c2d12',
      hover: '#f97316',
      text: '#fdba74',
      bg: '#431407',
      border: '#9a3412',
    }
  },
  {
    id: 'pink',
    name: 'Rosa Suave',
    primary: '#ec4899',
    secondary: '#fce7f3',
    hover: '#db2777',
    text: '#9d174d',
    bg: '#fdf2f8',
    border: '#fbcfe8',
    gradient: 'from-pink-600 to-pink-400',
    dark: {
      primary: '#f472b6',
      secondary: '#831843',
      hover: '#ec4899',
      text: '#f9a8d4',
      bg: '#500724',
      border: '#9d174d',
    }
  },
  {
    id: 'indigo',
    name: 'Índigo Profundo',
    primary: '#6366f1',
    secondary: '#e0e7ff',
    hover: '#4f46e5',
    text: '#3730a3',
    bg: '#eef2ff',
    border: '#c7d2fe',
    gradient: 'from-indigo-600 to-indigo-400',
    dark: {
      primary: '#818cf8',
      secondary: '#312e81',
      hover: '#6366f1',
      text: '#a5b4fc',
      bg: '#1e1b4b',
      border: '#3730a3',
    }
  },
  {
    id: 'red',
    name: 'Vermelho Paixão',
    primary: '#ef4444',
    secondary: '#fee2e2',
    hover: '#dc2626',
    text: '#991b1b',
    bg: '#fef2f2',
    border: '#fecaca',
    gradient: 'from-red-600 to-red-400',
    dark: {
      primary: '#f87171',
      secondary: '#7f1d1d',
      hover: '#ef4444',
      text: '#fca5a5',
      bg: '#450a0a',
      border: '#991b1b',
    }
  },
  {
    id: 'teal',
    name: 'Teal Moderno',
    primary: '#14b8a6',
    secondary: '#ccfbf1',
    hover: '#0d9488',
    text: '#115e59',
    bg: '#f0fdf9',
    border: '#99f6e4',
    gradient: 'from-teal-600 to-teal-400',
    dark: {
      primary: '#2dd4bf',
      secondary: '#134e4a',
      hover: '#14b8a6',
      text: '#5eead4',
      bg: '#042f2e',
      border: '#115e59',
    }
  },
  {
    id: 'amber',
    name: 'Âmbar Quente',
    primary: '#f59e0b',
    secondary: '#fef3c7',
    hover: '#d97706',
    text: '#92400e',
    bg: '#fffbeb',
    border: '#fde68a',
    gradient: 'from-amber-600 to-amber-400',
    dark: {
      primary: '#fbbf24',
      secondary: '#78350f',
      hover: '#f59e0b',
      text: '#fcd34d',
      bg: '#422006',
      border: '#92400e',
    }
  },
  {
    id: 'cyan',
    name: 'Ciano Gelado',
    primary: '#06b6d4',
    secondary: '#cffafe',
    hover: '#0891b2',
    text: '#155e75',
    bg: '#ecfeff',
    border: '#a5f3fc',
    gradient: 'from-cyan-600 to-cyan-400',
    dark: {
      primary: '#22d3ee',
      secondary: '#164e63',
      hover: '#06b6d4',
      text: '#7dd3fc',
      bg: '#083344',
      border: '#155e75',
    }
  },
  {
    id: 'custom',
    name: 'Personalizado',
    primary: '#3b82f6',
    secondary: '#dbeafe',
    hover: '#2563eb',
    text: '#1e40af',
    bg: '#eff6ff',
    border: '#bfdbfe',
    gradient: 'from-blue-600 to-blue-400',
    dark: {
      primary: '#60a5fa',
      secondary: '#1e3a8a',
      hover: '#3b82f6',
      text: '#93c5fd',
      bg: '#172554',
      border: '#1e40af',
    }
  },
];

type ThemeContextType = {
  theme: typeof TEACHER_THEMES[0];
  setTheme: (themeId: string) => void;
  customTheme: typeof TEACHER_THEMES[0];
  setCustomTheme: (theme: typeof TEACHER_THEMES[0]) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  isTeacher: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_THEME_KEY = 'teacherTheme_preference';
const STORAGE_DARK_KEY = 'darkMode_preference';
const STORAGE_CUSTOM_THEME_KEY = 'customTheme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();
  const isTeacher = user?.role === 'professor';
  
  const [customTheme, setCustomThemeState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_CUSTOM_THEME_KEY);
    return saved ? JSON.parse(saved) : TEACHER_THEMES.find(t => t.id === 'custom')!;
  });

  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'custom') {
      const customSaved = localStorage.getItem(STORAGE_CUSTOM_THEME_KEY);
      return customSaved ? JSON.parse(customSaved) : TEACHER_THEMES.find(t => t.id === 'custom')!;
    }
    const defaultTheme = TEACHER_THEMES.find(t => t.id === saved) || TEACHER_THEMES[0];
    return defaultTheme;
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(STORAGE_DARK_KEY);
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    // Aplicar classe dark ao HTML
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Salvar preferência
    localStorage.setItem(STORAGE_DARK_KEY, JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    // Aplicar cores do tema às variáveis CSS
    const root = document.documentElement;
    const currentTheme = darkMode ? theme.dark : theme;

    // Atualizar variáveis CSS do Tailwind
    root.style.setProperty('--primary', currentTheme.primary);
    root.style.setProperty('--secondary', currentTheme.secondary);
    root.style.setProperty('--accent', currentTheme.hover);
    root.style.setProperty('--accent-foreground', currentTheme.text);
    root.style.setProperty('--background', currentTheme.bg);
    root.style.setProperty('--border', currentTheme.border);
    root.style.setProperty('--foreground', currentTheme.text);
    
    // Para componentes específicos, podemos adicionar mais variáveis se necessário
    root.style.setProperty('--theme-primary', currentTheme.primary);
    root.style.setProperty('--theme-secondary', currentTheme.secondary);
    root.style.setProperty('--theme-hover', currentTheme.hover);
    root.style.setProperty('--theme-text', currentTheme.text);
    root.style.setProperty('--theme-bg', currentTheme.bg);
    root.style.setProperty('--theme-border', currentTheme.border);
  }, [theme, darkMode]);

  const setTheme = (themeId: string) => {
    let newTheme;
    if (themeId === 'custom') {
      newTheme = customTheme;
    } else {
      newTheme = TEACHER_THEMES.find(t => t.id === themeId) || TEACHER_THEMES[0];
    }
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_THEME_KEY, themeId);
    
    // Disparar evento para outros componentes
    window.dispatchEvent(new CustomEvent('themeChange', { detail: newTheme }));
  };

  const setCustomTheme = (newCustomTheme: typeof TEACHER_THEMES[0]) => {
    setCustomThemeState(newCustomTheme);
    localStorage.setItem(STORAGE_CUSTOM_THEME_KEY, JSON.stringify(newCustomTheme));
    if (theme.id === 'custom') {
      setThemeState(newCustomTheme);
      window.dispatchEvent(new CustomEvent('themeChange', { detail: newCustomTheme }));
    }
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, customTheme, setCustomTheme, darkMode, toggleDarkMode, isTeacher }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}