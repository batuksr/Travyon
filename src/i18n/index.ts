import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import tr from './locales/tr.json';
import en from './locales/en.json';

// Ayarlar'daki "Dil" seçici bu etiketleri kullanıyor — i18next kodlarına eşle.
export const LANGUAGE_TO_CODE: Record<string, string> = {
  'Türkçe': 'tr',
  'English': 'en',
};
export const CODE_TO_LANGUAGE: Record<string, string> = {
  tr: 'Türkçe',
  en: 'English',
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    lng: 'tr',
    fallbackLng: 'tr',
    interpolation: { escapeValue: false },
  });

export default i18n;
