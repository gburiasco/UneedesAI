import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  
  // 2. Fallback di sicurezza
  if (!locale) {
    locale = 'it';
  }
  
  return {
    locale,
    // 3. Importa dinamicamente il file corretto
    messages: (await import(`../i18n/messages/${locale}.json`)).default
  };
});