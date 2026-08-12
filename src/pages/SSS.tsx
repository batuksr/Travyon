import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import TravyonLogo from '../components/TravyonLogo';

type FaqSection = { category: string; items: { q: string; a: string }[] };

const TABS = [
  { to: '/sss', key: 'faq' },
  { to: '/gizlilik', key: 'privacy' },
  { to: '/kullanim-kosullari', key: 'terms' },
  { to: '/iletisim', key: 'contact' },
] as const;

const PageTabs: React.FC<{ active: string }> = ({ active }) => {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1.5 flex-wrap justify-center bg-surface-2 p-[5px] rounded-full w-fit mx-auto mt-6">
      {TABS.map(tab => (
        <Link
          key={tab.to}
          to={tab.to}
          className={`font-heading text-sm px-5 py-2.5 rounded-full whitespace-nowrap transition-colors ${
            active === tab.to ? 'bg-accent text-white' : 'text-muted hover:text-text'
          }`}
        >
          {t(`legal.tabs.${tab.key}`)}
        </Link>
      ))}
    </div>
  );
};

const SSS: React.FC = () => {
  const { t } = useTranslation();
  const FAQ_ITEMS = t('legal.faq.sections', { returnObjects: true }) as FaqSection[];
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggle = (key: string) => setOpenItem(prev => prev === key ? null : key);

  return (
    <div className="min-h-screen bg-bg">

      {/* Header */}
      <header className="bg-surface border-b border-divider sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-[74px] flex items-center justify-between">
          <Link to="/">
            <TravyonLogo size={36} />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-text bg-surface-2 border border-divider rounded-full px-4 py-2.5 hover:bg-surface transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            {t('legal.backHome')}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="text-center py-10 sm:py-12 px-4 sm:px-6">
        <p className="text-xs font-heading text-accent-700 uppercase tracking-widest mb-2">{t('legal.eyebrow')}</p>
        <h1 className="font-heading text-3xl sm:text-4xl text-text">{t('legal.faq.title')}</h1>
        <p className="text-muted mt-3.5 text-sm max-w-lg mx-auto">
          {t('legal.faq.subtitle')}
        </p>
        <PageTabs active="/sss" />
      </div>

      {/* İçerik */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {FAQ_ITEMS.map((section) => (
          <div key={section.category}>
            <h2 className="text-xs font-heading uppercase tracking-widest text-accent mb-4">
              {section.category}
            </h2>
            <div className="flex flex-col gap-2.5">
              {section.items.map((item, i) => {
                const key = `${section.category}-${i}`;
                const isOpen = openItem === key;
                return (
                  <div key={key} className="bg-surface border border-divider rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggle(key)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-2 transition-colors group"
                    >
                      <span className="font-heading text-[15.5px] text-text pr-4">
                        {item.q}
                      </span>
                      <span className={`shrink-0 text-accent text-lg transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>+</span>
                    </button>
                    {isOpen && (
                      <p className="px-5 pb-[18px] text-[14.5px] text-muted leading-relaxed">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer mini */}
      <footer className="border-t border-divider mt-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-[22px] flex flex-wrap items-center justify-between gap-3">
          <TravyonLogo size={28} />
          <span className="text-xs text-muted">{t('footer.copyright')}</span>
        </div>
      </footer>

    </div>
  );
};

export default SSS;
