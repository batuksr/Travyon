import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import { Wallet, ArrowRight, Calendar, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import GlobeAnimation from '../components/GlobeAnimation';
import SamplePlanModal from '../components/SamplePlanModal';
import TravyonLogo from '../components/TravyonLogo';

const HERO_VIDEOS = [
  '/videos/334716.mp4',
  'https://videos.pexels.com/video-files/1437396/1437396-uhd_2560_1440_24fps.mp4',
  'https://videos.pexels.com/video-files/1093662/1093662-hd_1920_1080_30fps.mp4',
  'https://videos.pexels.com/video-files/3044534/3044534-hd_1920_1080_25fps.mp4',
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


const STEPS = [
  {
    num: '01',
    title: 'Hesabınızı oluşturun',
    desc: 'Dakikalar içinde ücretsiz hesap açın. Kredi kartı gerekmez, kurulum için teknik bilgi şart değil.',
  },
  {
    num: '02',
    title: 'Tercihlerini gir',
    desc: 'Destinasyon, tarih, bütçe ve seyahat tarzını belirle. Birkaç tıklama yeter.',
  },
  {
    num: '03',
    title: 'AI planı oluşturur',
    desc: 'Gemini AI, tercihlerine özel coğrafi olarak optimize edilmiş gün gün plan hazırlar.',
  },
  {
    num: '04',
    title: 'Rotanı keşfet',
    desc: 'İnteraktif haritada rotanı gör, harcamalarını takip et ve dilediğin zaman vibe değiştir.',
  },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { dark, toggle: toggleTheme } = useThemeStore();
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [scrollStage, setScrollStage] = useState(0); // 0→1→2→3→4

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 40)       setScrollStage(0);
      else if (y < 90)  setScrollStage(1);
      else if (y < 160) setScrollStage(2);
      else if (y < 260) setScrollStage(3);
      else              setScrollStage(4);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleCTA = () => {
    navigate(user ? '/onboarding' : '/register');
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
          NAVBAR — Floating Island
         ══════════════════════════════════════════ */}
      <div className={`fixed inset-x-0 z-50 flex justify-center transition-all duration-500 ease-out
        ${scrollStage === 0 ? 'top-3' : scrollStage <= 2 ? 'top-2' : 'top-1'}`}>
        <nav className={`flex items-center justify-between bg-white/10 backdrop-blur-sm border border-white/25 shadow-xl shadow-black/10 transition-all duration-500 ease-out
          ${scrollStage === 0
            ? 'w-[97%] max-w-[1300px] px-6 h-[72px] rounded-2xl'
            : scrollStage === 1
            ? 'w-[94%] max-w-[1230px] px-6 h-[64px] rounded-2xl'
            : scrollStage === 2
            ? 'w-[88%] max-w-[1100px] px-5 h-[56px] rounded-xl'
            : scrollStage === 3
            ? 'w-[80%] max-w-[980px] px-5 h-[48px] rounded-xl'
            : 'w-[72%] max-w-[850px] px-4 h-[42px] rounded-lg'
          }`}>

          {/* Logo */}
          <TravyonLogo
            size={scrollStage === 0 ? 56 : scrollStage === 1 ? 50 : scrollStage === 2 ? 44 : scrollStage === 3 ? 37 : 30}
          />

          {/* Auth butonları */}
          <div className="flex items-center gap-2">

            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`relative flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95
                ${scrollStage === 0 ? 'w-9 h-9' : scrollStage <= 2 ? 'w-8 h-8' : 'w-7 h-7'}
                ${dark ? 'bg-slate-700/80 text-yellow-300' : 'bg-slate-100/80 text-slate-600'}`}
              aria-label="Tema değiştir"
            >
              <span key={dark ? 'sun' : 'moon'} className="theme-icon-in">
                {dark ? <Sun size={scrollStage === 0 ? 16 : 14} /> : <Moon size={scrollStage === 0 ? 16 : 14} />}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className={`text-slate-600 hover:text-slate-900 font-semibold transition-all duration-500
                ${scrollStage === 0 ? 'text-sm px-4 py-2' : scrollStage <= 1 ? 'text-sm px-4 py-1.5' : scrollStage <= 3 ? 'text-xs px-3 py-1.5' : 'text-[11px] px-2.5 py-1'}`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className={`inline-flex items-center gap-1.5 font-bold text-white bg-[#f8981d] hover:bg-[#e08518] rounded-xl transition-all duration-500 shadow-lg shadow-[#f8981d]/20 hover:-translate-y-px
                ${scrollStage === 0 ? 'text-sm px-5 py-2' : scrollStage <= 1 ? 'text-sm px-5 py-1.5' : scrollStage <= 3 ? 'text-xs px-4 py-1.5' : 'text-[11px] px-3 py-1'}`}
            >
              Ücretsiz Başla
              <ArrowRight size={scrollStage <= 1 ? 13 : 11} />
            </button>
          </div>
        </nav>
      </div>

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

        {/* Overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent"
          style={{ zIndex: 2 }}
        />

        {/* İçerik */}
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-0" style={{ zIndex: 3 }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-12">
            <div className="max-w-xl">

              {/* Badge */}
              {/* Başlık */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight mt-5"
              >
                Hayalindeki<br />Seyahati<br />
                <span className="text-[#f8981d]">Planla.</span>
              </motion.h1>

              {/* Alt metin */}
              <motion.p
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-4 text-lg text-white/70 leading-relaxed max-w-md"
              >
                Bütçen, tempon ve zevklerine göre yapay zeka saniyeler içinde coğrafi olarak optimize edilmiş, kişisel seyahat planını oluşturur.
              </motion.p>

              {/* Butonlar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-7 flex flex-wrap items-center gap-3"
              >
                <button
                  type="button" onClick={handleCTA}
                  className="group inline-flex items-center gap-2 px-7 py-3 bg-[#f8981d] hover:bg-[#e08518] text-white font-semibold rounded-xl text-base transition-all shadow-xl shadow-[#f8981d]/30 hover:-translate-y-0.5"
                >
                  Ücretsiz Plan Oluştur
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>

              {/* İstatistikler */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-wrap items-center gap-6 mt-8 pt-6 border-t border-white/15"
              >
                {[['50+', 'Desteklenen Şehir'], ['15sn', 'Ortalama Plan Süresi'], ['%100', 'Kişiselleştirilmiş']].map(([val, label]) => (
                  <div key={label}>
                    <p className="text-2xl font-bold text-[#f8981d]">{val}</p>
                    <p className="text-sm text-white/60 mt-0.5">{label}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Dot indikatörleri */}
        {!showFallback && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 4 }}>
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
          BÖLÜM 2 — ÖRNEK PLANLAR
         ══════════════════════════════════════════ */}
      <section id="ornek-planlar" className="bg-slate-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Başlık */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="max-w-xl mb-10"
          >
            <span className="text-[#f8981d] text-xs font-semibold uppercase tracking-widest">Örnek Planlar</span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-2 leading-tight">İlham alın, kendinize özel planlayın</h2>
            <p className="text-slate-500 mt-3 text-sm leading-relaxed">
              Yapay zekanın ürettiği gerçek plan örnekleri. Kendi tercihlerinizle dakikalar içinde oluşturun.
            </p>
          </motion.div>

          {/* Kartlar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SAMPLE_PLANS.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="group bg-white rounded-xl overflow-hidden border border-slate-200 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60 transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedSampleId(plan.id)}
              >
                {/* Görsel */}
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={plan.image}
                    alt={plan.city}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  {/* Sol alt: bayrak + şehir */}
                  <div className="absolute bottom-3 left-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{plan.flag}</span>
                      <div>
                        <p className="text-white font-bold text-base leading-none">{plan.city}</p>
                        <p className="text-white/70 text-xs font-medium">{plan.country}</p>
                      </div>
                    </div>
                  </div>

                  {/* Sağ üst: badge */}
                  {plan.badge && (
                    <div className={`absolute top-2.5 right-2.5 ${plan.badgeColor} text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full`}>
                      {plan.badge}
                    </div>
                  )}
                </div>

                {/* İçerik */}
                <div className="p-4">

                  {/* Tema */}
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="text-sm">{plan.themeEmoji}</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{plan.theme}</span>
                  </div>

                  {/* Öne çıkan mekanlar */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {plan.highlights.map((h) => (
                      <span key={h} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                        {h}
                      </span>
                    ))}
                  </div>

                  {/* Alt: gün + bütçe + buton */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-[#187fe7]/10 rounded flex items-center justify-center">
                          <Calendar size={11} className="text-[#187fe7]" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{plan.days} Gün</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-[#f8981d]/10 rounded flex items-center justify-center">
                          <Wallet size={11} className="text-[#f8981d]" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{plan.currency}{plan.budget.toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedSampleId(plan.id); }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#187fe7] hover:text-[#156bc2] transition-colors group/btn"
                    >
                      Planı Gör
                      <ArrowRight size={11} className="group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          BÖLÜM 3 — NASIL ÇALIŞIR (Globe arka plan)
         ══════════════════════════════════════════ */}
      <section
        id="nasil-calisir"
        className="relative bg-white overflow-x-hidden"
        style={{ minHeight: 780 }}
      >

        {/* Globe — yatayda ve dikeyde ortalı */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div style={{ width: 500, height: 500 }}>
            <GlobeAnimation />
          </div>
        </div>

        {/* İçerik */}
        <div
          className="relative z-10 w-full mx-auto px-8 flex flex-col"
          style={{ minHeight: 780, maxWidth: 1280 }}
        >

          {/* Başlık — sol üst */}
          <div className="pt-1 pb-6">
            <span className="text-[#f8981d] text-xs font-semibold uppercase tracking-widest">SÜREÇ</span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
              Nasıl Çalışır?
            </h2>
            <p className="text-sm text-slate-700 mt-1.5 max-w-xs leading-relaxed">
              Hesap oluşturmaktan mükemmel seyahat planına dört adımda ulaşın.
            </p>
          </div>

          {/* 3 sütun: sol adımlar | boş merkez (dünya) | sağ adımlar */}
          {/* Merkez sütun tam globe genişliği → yazılar asla üstüne gelmiyor */}
          <div
            className="flex-1 grid pb-10"
            style={{ gridTemplateColumns: '1fr 520px 1fr' }}
          >

            {/* Sol — 01 ve 02 */}
            <div className="flex flex-col justify-start pt-35 gap-10 pr-7">
              {STEPS.slice(0, 2).map((step) => (
                <div key={step.num}>
                  <div className="text-[#f8981d] text-4xl font-bold mb-2 leading-none">{step.num}</div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>

            {/* Merkez — boş, sadece dünya görünür */}
            <div />

            {/* Sağ — 03 ve 04 */}
            <div className="flex flex-col justify-start pt-35 gap-10 pl-15">
              {STEPS.slice(2, 4).map((step) => (
                <div key={step.num}>
                  <div className="text-[#f8981d] text-4xl font-bold mb-2 leading-none">{step.num}</div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════
          ÖRNEK PLAN MODAL
         ══════════════════════════════════════════ */}
      <SamplePlanModal
        planId={selectedSampleId}
        onClose={() => setSelectedSampleId(null)}
        cityMeta={selectedSampleId ? (() => {
          const p = SAMPLE_PLANS.find((s) => s.id === selectedSampleId);
          return p ? { city: p.city, country: p.country, flag: p.flag, days: p.days, budget: p.budget, currency: p.currency, image: p.image } : null;
        })() : null}
      />

    </div>
  );
};

export default Home;
