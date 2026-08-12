import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, MapPin, Clock, ArrowLeft, Send, CheckCircle, Loader2 } from 'lucide-react';
import TravyonLogo from '../components/TravyonLogo';

const INFO_CARD_META = [
  { icon: Mail, key: 'email', href: 'mailto:iletisim@travyon.app' },
  { icon: MapPin, key: 'address', href: null },
  { icon: Clock, key: 'hours', href: null },
] as const;

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

const Iletisim: React.FC = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      // Gerçek entegrasyon için EmailJS veya backend eklenebilir
      setSent(true);
    } catch {
      setError(t('legal.contact.form.errorGeneric'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">

      {/* Header */}
      <header className="bg-surface border-b border-divider sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[74px] flex items-center justify-between">
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
        <h1 className="font-heading text-3xl sm:text-4xl text-text">{t('legal.contact.title')}</h1>
        <p className="text-muted mt-3.5 text-sm max-w-md mx-auto">
          {t('legal.contact.subtitle')}
        </p>
        <PageTabs active="/iletisim" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">

        {/* İki sütun layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-start">

          {/* Sol — Bilgi Kartları */}
          <div className="space-y-4">
            {INFO_CARD_META.map(({ icon: Icon, key, href }) => (
              <div
                key={key}
                className="bg-surface border border-divider rounded-3xl p-5 flex items-center gap-4"
              >
                <div className="w-11 h-11 rounded-2xl bg-accent-100 flex items-center justify-center shrink-0 text-accent-700">
                  <Icon size={19} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-xs font-heading text-muted uppercase tracking-wider mb-0.5">
                    {t(`legal.contact.infoCards.${key}.title`)}
                  </p>
                  {href ? (
                    <a
                      href={href}
                      className="text-sm font-semibold text-text hover:text-accent transition-colors"
                    >
                      {t(`legal.contact.infoCards.${key}.value`)}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-text">{t(`legal.contact.infoCards.${key}.value`)}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Alt açıklama */}
            <div className="bg-gradient-to-br from-accent-100 to-accent-100/60 border border-accent-200 rounded-3xl p-5">
              <p className="text-sm font-semibold text-text mb-1">
                {t('legal.contact.quickReplyTitle')}
              </p>
              <p className="text-xs text-muted leading-relaxed">
                {t('legal.contact.quickReplyDesc')}
              </p>
            </div>
          </div>

          {/* Sağ — Form */}
          <div className="bg-surface border border-divider rounded-3xl p-6 sm:p-8">

            {sent ? (
              /* Başarı durumu */
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                  <CheckCircle size={28} className="text-emerald-500" />
                </div>
                <h3 className="font-heading text-lg text-text mb-1.5">
                  {t('legal.contact.form.successTitle')}
                </h3>
                <p className="text-sm text-muted max-w-xs leading-relaxed">
                  {t('legal.contact.form.successDesc')}
                </p>
                <button
                  type="button"
                  onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                  className="mt-6 text-sm font-heading text-accent hover:text-accent-700 transition-colors"
                >
                  {t('legal.contact.form.newMessageButton')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Ad Soyad */}
                <div>
                  <label className="block text-sm font-semibold text-text mb-1.5">
                    {t('legal.contact.form.nameLabel')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder={t('legal.contact.form.namePlaceholder')}
                    className="w-full px-4 py-3.5 rounded-2xl border-[1.5px] border-divider bg-surface-2 text-text text-sm placeholder:text-muted outline-none focus:border-accent transition-all"
                  />
                </div>

                {/* E-posta */}
                <div>
                  <label className="block text-sm font-semibold text-text mb-1.5">
                    {t('legal.contact.form.emailLabel')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder={t('legal.contact.form.emailPlaceholder')}
                    className="w-full px-4 py-3.5 rounded-2xl border-[1.5px] border-divider bg-surface-2 text-text text-sm placeholder:text-muted outline-none focus:border-accent transition-all"
                  />
                </div>

                {/* Konu */}
                <div>
                  <label className="block text-sm font-semibold text-text mb-1.5">
                    {t('legal.contact.form.subjectLabel')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    required
                    value={form.subject}
                    onChange={handleChange}
                    placeholder={t('legal.contact.form.subjectPlaceholder')}
                    className="w-full px-4 py-3.5 rounded-2xl border-[1.5px] border-divider bg-surface-2 text-text text-sm placeholder:text-muted outline-none focus:border-accent transition-all"
                  />
                </div>

                {/* Mesaj */}
                <div>
                  <label className="block text-sm font-semibold text-text mb-1.5">
                    {t('legal.contact.form.messageLabel')} <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    placeholder={t('legal.contact.form.messagePlaceholder')}
                    className="w-full px-4 py-3.5 rounded-2xl border-[1.5px] border-divider bg-surface-2 text-text text-sm placeholder:text-muted outline-none focus:border-accent transition-all resize-none"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500 font-medium">{error}</p>
                )}

                {/* Gönder */}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3.5 bg-accent hover:brightness-105 disabled:opacity-60 text-white font-heading rounded-full text-sm flex items-center justify-center gap-2 transition-all shadow-[0_10px_22px_rgba(198,113,57,0.28)] active:translate-y-px"
                >
                  {sending ? (
                    <><Loader2 size={15} className="animate-spin" /> {t('legal.contact.form.sendingButton')}</>
                  ) : (
                    <><Send size={14} strokeWidth={2.75} /> {t('legal.contact.form.sendButton')}</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer mini */}
      <footer className="border-t border-divider mt-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-[22px] flex flex-wrap items-center justify-between gap-3">
          <TravyonLogo size={28} />
          <span className="text-xs text-muted">{t('footer.copyright')}</span>
        </div>
      </footer>

    </div>
  );
};

export default Iletisim;
