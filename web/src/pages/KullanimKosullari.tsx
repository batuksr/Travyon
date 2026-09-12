import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import TravyonLogo from '../components/TravyonLogo';

type LegalSection = { title: string; content: string };

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

const KullanimKosullari: React.FC = () => {
  const { t } = useTranslation();
  const SECTIONS = t('legal.terms.sections', { returnObjects: true }) as LegalSection[];
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
        <h1 className="font-heading text-3xl sm:text-4xl text-text">{t('legal.terms.title')}</h1>
        <p className="text-muted mt-3.5 text-sm">
          {t('legal.terms.subtitle')}
        </p>
        <PageTabs active="/kullanim-kosullari" />
      </div>

      {/* İçerik */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col gap-[26px]">
          <p className="text-sm text-muted leading-relaxed">
            {t('legal.terms.intro')}
          </p>

          {SECTIONS.map((section) => (
            <div key={section.title} className="bg-surface border border-divider rounded-3xl p-6 sm:p-7">
              <h2 className="font-heading text-xl text-text mb-2.5">{section.title}</h2>
              <p className="text-[15px] text-muted leading-[1.7] whitespace-pre-line">
                {section.content}
              </p>
            </div>
          ))}
          <p className="text-xs text-muted text-center">{t('legal.lastUpdated')}</p>
        </div>
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

export default KullanimKosullari;
