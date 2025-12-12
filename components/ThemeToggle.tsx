import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'default' | 'floating';
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'default',
  className = ''
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('Error reading theme from localStorage:', error);
      // Fallback: check if dark class already exists
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    }
  }, []);

  const toggleTheme = () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      
      if (newTheme) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    } catch (error) {
      console.error('Error toggling theme:', error);
      // Fallback: just toggle class without localStorage
      if (isDarkMode) {
        document.documentElement.classList.remove('dark');
        setIsDarkMode(false);
      } else {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      }
    }
  };

  const baseClasses = variant === 'floating' 
    ? 'p-3 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700 transition-all shadow-sm'
    : 'p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors';

  return (
    <button 
      onClick={toggleTheme}
      className={`${baseClasses} ${className}`}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
};

export default ThemeToggle;
