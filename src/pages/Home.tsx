import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import { Wallet, ArrowRight, Sparkles, Calendar, Check, ShieldCheck } from 'lucide-react';

const HERO_VIDEOS = [
  '/videos/video1.mp4',
  '/videos/video2.mp4',
  '/videos/video3.mp4',
];

const HERO_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=2035&auto=format&fit=crop';

const SAMPLE_PLANS = [
  {
    id: 'rome',
    city: 'Roma',
    country: 'İtalya',
    flag: '🇮🇹',
    days: 4,
    budget: 1200,
    currency: '€',
    theme: 'Kültür & Tarih',
    themeEmoji: '🏛️',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=800&auto=format&fit=crop',
    highlights: ['Kolezyum', 'Vatikan Müzesi', 'Trevi Çeşmesi'],
    badge: 'En Popüler',
    badgeColor: 'bg-orange-500',
  },
  {
    id: 'paris',
    city: 'Paris',
    country: 'Fransa',
    flag: '🇫🇷',
    days: 5,
    budget: 1800,
    currency: '€',
    theme: 'Romantik Kaçış',
    themeEmoji: '💕',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop',
    highlights: ['Eyfel Kulesi', 'Louvre', 'Montmartre'],
    badge: 'Trend',
    badgeColor: 'bg-pink-500',
  },
  {
    id: 'istanbul',
    city: 'İstanbul',
    country: 'Türkiye',
    flag: '🇹🇷',
    days: 3,
    budget: 8500,
    currency: '₺',
    theme: 'Kültür & Lezzet',
    themeEmoji: '🕌',
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=800&auto=format&fit=crop',
    highlights: ['Ayasofya', 'Kapalıçarşı', 'Boğaz Turu'],
    badge: 'Yerel Favorisi',
    badgeColor: 'bg-red-500',
  },
  {
    id: 'barcelona',
    city: 'Barcelona',
    country: 'İspanya',
    flag: '🇪🇸',
    days: 4,
    budget: 1400,
    currency: '€',
    theme: 'Sanat & Mimari',
    themeEmoji: '🎨',
    image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=800&auto=format&fit=crop',
    highlights: ['Sagrada Familia', 'Park Güell', 'Gothic Quarter'],
    badge: null,
    badgeColor: '',
  },
  {
    id: 'tokyo',
    city: 'Tokyo',
    country: 'Japonya',
    flag: '🇯🇵',
    days: 7,
    budget: 2500,
    currency: '€',
    theme: 'Doğa & Teknoloji',
    themeEmoji: '🌸',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=800&auto=format&fit=crop',
    highlights: ['Senso-ji', 'Shibuya', 'teamLab'],
    badge: 'Egzotik',
    badgeColor: 'bg-purple-500',
  },
  {
    id: 'amsterdam',
    city: 'Amsterdam',
    country: 'Hollanda',
    flag: '🇳🇱',
    days: 3,
    budget: 900,
    currency: '€',
    theme: 'Müze & Kanal',
    themeEmoji: '🚲',
    image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?q=80&w=800&auto=format&fit=crop',
    highlights: ['Rijksmuseum', 'Anne Frank Evi', 'Kanal Turu'],
    badge: null,
    badgeColor: '',
  },
];



const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showFallback, setShowFallback] = useState(false);

  const handleCTA = () => {
    navigate(user ? '/onboarding' : '/register');
  };

  const scrollToHowItWorks = () => {
    document.getElementById('nasil-calisir')?.scrollIntoView({ behavior: 'smooth' });
  };

  const goToVideo = useCallback((index: number) => {
    const current = videoRefs.current[currentVideoIndex];
    if (current) {
      current.pause();
      current.currentTime = 0;
    }
    setCurrentVideoIndex(index);
    setTimeout(() => {
      const next = videoRefs.current[index];
      if (next) next.play().catch(() => setShowFallback(true));
    }, 50);
  }, [currentVideoIndex]);

  const handleVideoEnded = useCallback(() => {
    const nextIndex = (currentVideoIndex + 1) % HERO_VIDEOS.length;
    goToVideo(nextIndex);
  }, [currentVideoIndex, goToVideo]);

  const handleVideoError = useCallback(() => {
    setShowFallback(true);
  }, []);

  return (
    <div className="bg-[#fafaf9] text-[#1a1a1a] overflow-x-hidden">

      {/* ══════════════════════════════════════════
          BÖLÜM 1 — HERO (Video)
         ══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">

        {/* Video arka planlar */}
        {!showFallback && HERO_VIDEOS.map((src, i) => (
          <video
            key={src}
            ref={el => { videoRefs.current[i] = el; }}
            src={src}
            autoPlay={i === 0}
            muted
            playsInline
            preload="auto"
            onEnded={i === currentVideoIndex ? handleVideoEnded : undefined}
            onError={handleVideoError}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
            style={{
              opacity: i === currentVideoIndex ? 1 : 0,
              zIndex: i === currentVideoIndex ? 1 : 0,
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Fallback fotoğraf */}
        {showFallback && (
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${HERO_FALLBACK_IMAGE}')` }}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
        )}

        {/* Overlay — solda koyu, sağda saydam */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent"
          style={{ zIndex: 2 }}
        />

        {/* İçerik */}
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-0" style={{ zIndex: 3 }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12 lg:gap-16">
            <div className="max-w-2xl">

              {/* Badge */}
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#f8981d] rounded-full text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#f8981d]/30">
                  <Sparkles size={12} /> Yapay Zeka Destekli
                </span>
              </motion.div>

              {/* Başlık */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mt-6"
              >
                Hayalindeki<br />Seyahati<br />
                <span className="text-[#f8981d]">Planla.</span>
              </motion.h1>

              {/* Alt metin */}
              <motion.p
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-6 text-lg text-white/70 leading-relaxed max-w-lg"
              >
                Bütçen, tempon ve zevklerine göre yapay zeka saniyeler içinde coğrafi olarak optimize edilmiş, kişisel seyahat planını oluşturur.
              </motion.p>

              {/* Butonlar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-10 flex flex-wrap items-center gap-4"
              >
                <button
                  type="button" onClick={handleCTA}
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-[#f8981d] hover:bg-[#e08518] text-white font-bold rounded-xl text-base transition-all shadow-xl shadow-[#f8981d]/30 hover:-translate-y-0.5"
                >
                  Ücretsiz Plan Oluştur
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  type="button" onClick={scrollToHowItWorks}
                  className="inline-flex items-center gap-2 px-8 py-4 border border-white/30 text-white/90 hover:text-white hover:border-white/50 font-semibold rounded-xl text-base transition-all backdrop-blur-sm"
                >
                  Nasıl Çalışır?
                </button>
              </motion.div>

              {/* İstatistikler */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-wrap items-center gap-6 sm:gap-8 mt-12 pt-8 border-t border-white/15"
              >
                {[['50+', 'Desteklenen Şehir'], ['15sn', 'Ortalama Plan Süresi'], ['%100', 'Kişiselleştirilmiş']].map(([val, label]) => (
                  <div key={label}>
                    <p className="text-2xl font-black text-[#f8981d]">{val}</p>
                    <p className="text-xs text-white/60 mt-0.5">{label}</p>
                  </div>
                ))}
              </motion.div>
            </div>

          </div>
        </div>

        {/* Dot indikatörleri */}
        {!showFallback && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 4 }}>
            {HERO_VIDEOS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}. videoya geç`}
                onClick={() => goToVideo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === currentVideoIndex
                    ? 'bg-white w-6 h-1.5'
                    : 'bg-white/40 w-1.5 h-1.5 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </section>


      {/* ══════════════════════════════════════════
          BÖLÜM 3 — HAZIR PLAN ÖRNEKLERİ
         ══════════════════════════════════════════ */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Başlık */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="max-w-xl mb-14"
          >
            <span className="text-[#f8981d] text-sm font-bold uppercase tracking-widest">Örnek Planlar</span>
            <h2 className="text-4xl font-black text-slate-900 mt-2 leading-tight">İlham alın, kendinize özel planlayın</h2>
            <p className="text-slate-500 mt-4 text-lg leading-relaxed">
              Yapay zekanın ürettiği gerçek plan örnekleri. Kendi tercihlerinizle dakikalar içinde oluşturun.
            </p>
          </motion.div>

          {/* Kartlar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SAMPLE_PLANS.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 cursor-pointer"
                onClick={handleCTA}
              >
                {/* Görsel */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={plan.image}
                    alt={plan.city}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  {/* Sol alt: bayrak + şehir */}
                  <div className="absolute bottom-3 left-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{plan.flag}</span>
                      <div>
                        <p className="text-white font-black text-lg leading-none">{plan.city}</p>
                        <p className="text-white/70 text-xs font-medium">{plan.country}</p>
                      </div>
                    </div>
                  </div>

                  {/* Sağ üst: badge */}
                  {plan.badge && (
                    <div className={`absolute top-3 right-3 ${plan.badgeColor} text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full`}>
                      {plan.badge}
                    </div>
                  )}
                </div>

                {/* İçerik */}
                <div className="p-5">

                  {/* Tema */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-sm">{plan.themeEmoji}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{plan.theme}</span>
                  </div>

                  {/* Öne çıkan mekanlar */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {plan.highlights.map((h) => (
                      <span key={h} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg font-medium">
                        {h}
                      </span>
                    ))}
                  </div>

                  {/* Alt: gün + bütçe + buton */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 bg-[#187fe7]/10 rounded-lg flex items-center justify-center">
                          <Calendar size={12} className="text-[#187fe7]" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{plan.days} Gün</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 bg-[#f8981d]/10 rounded-lg flex items-center justify-center">
                          <Wallet size={12} className="text-[#f8981d]" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{plan.currency}{plan.budget.toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleCTA(); }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#187fe7] hover:text-[#156bc2] transition-colors group/btn"
                    >
                      Benzerini Planla
                      <ArrowRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          BÖLÜM 4 — VİDEO ARKALI SOCIAL PROOF / CTA
         ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden">

        {/* Arka plan video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source
            src="https://videos.pexels.com/video-files/1437396/1437396-uhd_2560_1440_24fps.mp4"
            type="video/mp4"
          />
        </video>

        {/* Koyu overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
        {/* Mavi accent overlay */}
        <div className="absolute inset-0 bg-[#187fe7]/10" />

        {/* İçerik */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Sol: Başlık + liste + CTA */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {/* Üst etiket */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f8981d]/15 border border-[#f8981d]/30 rounded-full text-[#f8981d] text-xs font-bold uppercase tracking-widest mb-6">
                <Sparkles size={11} />
                Yapay Zeka ile Planlama
              </div>

              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-8">
                Planlamayı<br />
                <span className="text-[#f8981d]">Bize Bırakın</span>
              </h2>

              {/* Madde listesi */}
              <div className="space-y-4 mb-10">
                {[
                  'Destinasyon, tarih ve grup bilgilerinizi girin',
                  'Yapay zekamız size özel optimize bir plan oluşturur',
                  'Harita üzerinde rotanızı görün ve harcamalarınızı takip edin',
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-6 h-6 bg-[#187fe7] rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={13} className="text-white" />
                    </div>
                    <p className="text-white/80 text-base leading-relaxed font-medium">{item}</p>
                  </motion.div>
                ))}
              </div>

              {/* CTA buton grubu */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <button
                  type="button"
                  onClick={handleCTA}
                  className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#f8981d] hover:bg-[#e08518] text-white font-bold rounded-xl text-base transition-all shadow-2xl shadow-[#f8981d]/30 hover:-translate-y-0.5"
                >
                  Planımı Oluştur
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="flex items-center gap-2 text-white/40 text-sm">
                  <ShieldCheck size={15} className="text-emerald-400" />
                  Ücretsiz • Kredi kartı gerekmez
                </p>
              </div>
            </motion.div>

            {/* Sağ: İstatistik kartları */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:grid grid-cols-2 gap-4"
            >
              {[
                { icon: '🌍', value: '50+',   label: 'Desteklenen Şehir',    color: 'from-blue-500/20 to-blue-600/10',       border: 'border-blue-500/20' },
                { icon: '⚡', value: '15sn',  label: 'Ortalama Plan Süresi', color: 'from-[#f8981d]/20 to-[#f8981d]/10',     border: 'border-[#f8981d]/20' },
                { icon: '🗺️', value: '%100',  label: 'Kişiselleştirilmiş',  color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/20' },
                { icon: '🤖', value: 'AI',    label: 'Gemini Destekli',      color: 'from-purple-500/20 to-purple-600/10',   border: 'border-purple-500/20' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                  className={`bg-gradient-to-br ${stat.color} backdrop-blur-md border ${stat.border} rounded-2xl p-6 text-center`}
                >
                  <div className="text-3xl mb-3">{stat.icon}</div>
                  <p className="text-3xl font-black text-white mb-1">{stat.value}</p>
                  <p className="text-white/50 text-xs font-medium leading-tight">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>

          </div>
        </div>
      </section>


    </div>
  );
};

export default Home;
