'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { translations, getTranslation, SUPPORTED_LANGUAGES } from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load language from localStorage on mount
    const savedLang = localStorage.getItem('pendulum-language');
    if (savedLang && translations[savedLang]) {
      setLanguage(savedLang);
    }
    setIsLoaded(true);
  }, []);

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
      localStorage.setItem('pendulum-language', lang);
    }
  };

  const t = (key) => getTranslation(language, key);

  return (
    <LanguageContext.Provider value={{ 
      language, 
      changeLanguage, 
      t, 
      isLoaded,
      languages: SUPPORTED_LANGUAGES 
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
