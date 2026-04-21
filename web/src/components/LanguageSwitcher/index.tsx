import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="btn-modern text-sm px-3 py-1.5"
      style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}
      title={i18n.language === 'zh' ? 'Switch to English' : '切换为中文'}
    >
      {i18n.language === 'zh' ? 'EN' : '中文'}
    </button>
  );
}
