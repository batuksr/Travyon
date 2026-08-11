import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Clock, ArrowLeft, Send, CheckCircle, Loader2 } from 'lucide-react';
import TravyonLogo from '../components/TravyonLogo';

const INFO_CARDS = [
  {
    icon: Mail,
    title: 'E-posta',
    value: 'iletisim@travyon.app',
    href: 'mailto:iletisim@travyon.app',
  },
  {
    icon: MapPin,
    title: 'Adres',
    value: 'İstanbul, Türkiye',
    href: null,
  },
  {
    icon: Clock,
    title: 'Çalışma Saatleri',
    value: 'Pazartesi – Cuma, 09:00 – 18:00',
    href: null,
  },
];

const TABS = [
  { to: '/sss', label: 'SSS' },
  { to: '/gizlilik', label: 'Gizlilik' },
  { to: '/kullanim-kosullari', label: 'Kullanım Koşulları' },
  { to: '/iletisim', label: 'İletişim' },
];

const PageTabs: React.FC<{ active: string }> = ({ active }) => (
  <div className="flex gap-1.5 flex-wrap justify-center bg-surface-2 p-[5px] rounded-full w-fit mx-auto mt-6">
    {TABS.map(t => (
      <Link
        key={t.to}
        to={t.to}
        className={`font-heading text-sm px-5 py-2.5 rounded-full whitespace-nowrap transition-colors ${
          active === t.to ? 'bg-accent text-white' : 'text-muted hover:text-text'
        }`}
      >
        {t.label}
      </Link>
    ))}
  </div>
);

const Iletisim: React.FC = () => {
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
      setError('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
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
            Ana Sayfa
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="text-center py-10 sm:py-12 px-4 sm:px-6">
        <p className="text-xs font-heading text-accent-700 uppercase tracking-widest mb-2">Yardım & Yasal</p>
        <h1 className="font-heading text-3xl sm:text-4xl text-text">İletişim</h1>
        <p className="text-muted mt-3.5 text-sm max-w-md mx-auto">
          Sorularını, önerilerini veya iş birliklerini bize ilet.
        </p>
        <PageTabs active="/iletisim" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">

        {/* İki sütun layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-start">

          {/* Sol — Bilgi Kartları */}
          <div className="space-y-4">
            {INFO_CARDS.map(({ icon: Icon, title, value, href }) => (
              <div
                key={title}
                className="bg-surface border border-divider rounded-3xl p-5 flex items-center gap-4"
              >
                <div className="w-11 h-11 rounded-2xl bg-accent-100 flex items-center justify-center shrink-0 text-accent-700">
                  <Icon size={19} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-xs font-heading text-muted uppercase tracking-wider mb-0.5">
                    {title}
                  </p>
                  {href ? (
                    <a
                      href={href}
                      className="text-sm font-semibold text-text hover:text-accent transition-colors"
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-text">{value}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Alt açıklama */}
            <div className="bg-gradient-to-br from-accent-100 to-accent-100/60 border border-accent-200 rounded-3xl p-5">
              <p className="text-sm font-semibold text-text mb-1">
                Hızlı yanıt garantisi 🚀
              </p>
              <p className="text-xs text-muted leading-relaxed">
                Çalışma saatleri içinde gönderilen mesajlara genellikle 2 saat içinde yanıt veriyoruz.
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
                  Mesajınız iletildi!
                </h3>
                <p className="text-sm text-muted max-w-xs leading-relaxed">
                  En kısa sürede size dönüş yapacağız. Teşekkür ederiz.
                </p>
                <button
                  type="button"
                  onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                  className="mt-6 text-sm font-heading text-accent hover:text-accent-700 transition-colors"
                >
                  Yeni mesaj gönder →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Ad Soyad */}
                <div>
                  <label className="block text-sm font-semibold text-text mb-1.5">
                    Ad Soyad <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Adınız"
                    className="w-full px-4 py-3.5 rounded-2xl border-[1.5px] border-divider bg-surface-2 text-text text-sm placeholder:text-muted outline-none focus:border-accent transition-all"
                  />
                </div>

                {/* E-posta */}
                <div>
                  <label className="block text-sm font-semibold text-text mb-1.5">
                    E-posta <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="ornek@sirket.com"
                    className="w-full px-4 py-3.5 rounded-2xl border-[1.5px] border-divider bg-surface-2 text-text text-sm placeholder:text-muted outline-none focus:border-accent transition-all"
                  />
                </div>

                {/* Konu */}
                <div>
                  <label className="block text-sm font-semibold text-text mb-1.5">
                    Konu <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    required
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="Nasıl yardımcı olabiliriz?"
                    className="w-full px-4 py-3.5 rounded-2xl border-[1.5px] border-divider bg-surface-2 text-text text-sm placeholder:text-muted outline-none focus:border-accent transition-all"
                  />
                </div>

                {/* Mesaj */}
                <div>
                  <label className="block text-sm font-semibold text-text mb-1.5">
                    Mesaj <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Mesajınızı buraya yazınız..."
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
                    <><Loader2 size={15} className="animate-spin" /> Gönderiliyor...</>
                  ) : (
                    <><Send size={14} strokeWidth={2.75} /> Gönder</>
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
          <span className="text-xs text-muted">© 2026 Travyon. Tüm hakları saklıdır.</span>
        </div>
      </footer>

    </div>
  );
};

export default Iletisim;
