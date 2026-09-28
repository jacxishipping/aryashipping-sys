import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import language resources
import en from '../locales/en/common.json';
import dr from '../locales/dr/common.json';
import ps from '../locales/ps/common.json';

const resources = {
  en: {
    translation: en,
  },
  dr: {
    translation: dr,
  },
  ps: {
    translation: ps,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
