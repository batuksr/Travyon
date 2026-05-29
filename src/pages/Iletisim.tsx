import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Clock, ArrowLeft, Send, CheckCircle, Loader2 } from 'lucide-react';
import TravyonLogo from '../components/TravyonLogo';
import { useThemeStore } from '../store/useThemeStore';

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

const Iletisim: React.FC = () => {
  const { dark } = useThemeStore();
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
    <div className="min-h-screen bg-[#f5f0e8] dark:bg-slate-900">

      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/">
            <TravyonLogo size={36} />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Ana Sayfa
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        {/* Başlık */}
        <div className="mb-10 sm:mb-14">
          <p className="text-xs font-semibold text-[#f8981d] uppercase tracking-widest mb-2">Destek</p>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">İletişim</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-md">
            Sorularınız için bize yazın, en kısa sürede dönüş yapalım.
          </p>
        </div>

        {/* İki sütun layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-start">

          {/* Sol — Bilgi Kartları */}
          <div className="space-y-4">
            {INFO_CARDS.map(({ icon: Icon, title, value, href }) => (
              <div
                key={title}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-[#f8981d]/10 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-[#f8981d]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                    {title}
                  </p>
                  {href ? (
                    <a
                      href={href}
                      className="text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-[#f8981d] transition-colors"
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Alt açıklama */}
            <div className="bg-gradient-to-br from-[#f8981d]/10 to-[#f8981d]/5 border border-[#f8981d]/20 rounded-2xl p-5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Hızlı yanıt garantisi 🚀
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Çalışma saatleri içinde gönderilen mesajlara genellikle 2 saat içinde yanıt veriyoruz.
              </p>
            </div>
          </div>

          {/* Sağ — Form */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8">

            {sent ? (
              /* Başarı durumu */
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4">
                  <CheckCircle size={28} className="text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  Mesajınız iletildi!
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                  En kısa sürede size dönüş yapacağız. Teşekkür ederiz.
                </p>
                <button
                  type="button"
                  onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                  className="mt-6 text-sm font-semibold text-[#f8981d] hover:text-[#e08518] transition-colors"
                >
                  Yeni mesaj gönder →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Ad Soyad */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    Ad Soyad <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Adınız"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm placeholder-slate-400 outline-none focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 transition-all"
                  />
                </div>

                {/* E-posta */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    E-posta <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="ornek@sirket.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm placeholder-slate-400 outline-none focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 transition-all"
                  />
                </div>

                {/* Konu */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    Konu <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    required
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="Nasıl yardımcı olabiliriz?"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm placeholder-slate-400 outline-none focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 transition-all"
                  />
                </div>

                {/* Mesaj */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    Mesaj <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Mesajınızı buraya yazınız..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm placeholder-slate-400 outline-none focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 transition-all resize-none"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500 font-medium">{error}</p>
                )}

                {/* Gönder */}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3.5 bg-[#f8981d] hover:bg-[#e08518] disabled:opacity-60 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#f8981d]/20 hover:-translate-y-0.5 active:scale-95"
                >
                  {sending ? (
                    <><Loader2 size={15} className="animate-spin" /> Gönderiliyor...</>
                  ) : (
                    <><Send size={14} /> Gönder</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer mini */}
      <div className="border-t border-slate-200 dark:border-slate-800 mt-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>© 2026 Travyon. Tüm hakları saklıdır.</span>
          <div className="flex gap-4">
            <Link to="/sss" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">SSS</Link>
            <Link to="/gizlilik" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Gizlilik</Link>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Iletisim;
