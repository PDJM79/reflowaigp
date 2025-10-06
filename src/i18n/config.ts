import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import cyTranslations from './locales/cy.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      cy: { translation: cyTranslations }
    },
    lng: localStorage.getItem('app-language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
