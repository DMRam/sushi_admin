import { useTranslation } from "react-i18next";

export const FooterLanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language);

  return (
    <div className="mt-6 pt-4 border-t border-gray-800">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-xs font-light tracking-wide">
          Current: <span className="text-white">{currentLanguage?.name}</span>
        </span>
        <div className="flex space-x-3">
          {languages
            .filter(lang => lang.code !== i18n.language)
            .map((language) => (
              <button
                key={language.code}
                onClick={() => i18n.changeLanguage(language.code)}
                className="text-gray-500 hover:text-white text-xs font-light transition-colors duration-300"
              >
                Switch to {language.name}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}