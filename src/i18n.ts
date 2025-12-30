import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import your translation files
import en from "./locales/en/en.json";
import fr from "./locales/fr/fr.json";
import es from "./locales/es/es.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "fr", "es"],

    // This converts fr-CA to fr, es-MX to es, etc.
    load: "languageOnly",

    interpolation: {
      escapeValue: false,
    },

    resources: {
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
    },

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
  });

// Smart language initialization based on navigator.language
i18n.on("initialized", () => {
  const browserLang = navigator.language;
  const currentLang = i18n.language;

  console.log("🌐 Browser language:", browserLang);
  console.log("🌐 Current i18n language:", currentLang);

  // If browser is French and we're not already in French, switch
  if (browserLang.startsWith("fr") && currentLang !== "fr") {
    console.log("🔄 Switching to French (browser preference)");
    i18n.changeLanguage("fr");
  }
  // If browser is Spanish and we're not already in Spanish, switch
  else if (browserLang.startsWith("es") && currentLang !== "es") {
    console.log("🔄 Switching to Spanish (browser preference)");
    i18n.changeLanguage("es");
  }
});

export default i18n;
