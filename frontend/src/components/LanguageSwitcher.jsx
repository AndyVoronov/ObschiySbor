import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const languages = [
    { code: 'ru', name: 'RU', flag: '🇷🇺' },
    { code: 'en', name: 'EN', flag: '🇬🇧' }
  ];

  return (
    <div className="language-switcher">
      {languages.map((lang) => (
        <button
          key={lang.code}
          className={`lang-btn ${i18n.language === lang.code ? 'active' : ''}`}
          onClick={() => changeLanguage(lang.code)}
          title={lang.name}
        >
          <span className="lang-flag">{lang.flag}</span>
          <span className="lang-code">{lang.name}</span>
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
