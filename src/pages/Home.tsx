import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import { ArrowRight, Sun, Moon, Plane } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { toggleWithCircle } from '../utils/themeTransition';
import GlobeAnimation from '../components/GlobeAnimation';
import TravyonLogo from '../components/TravyonLogo';

const HERO_VIDEOS = [
  '/videos/334716.mp4',
  'https://videos.pexels.com/video-files/1437396/1437396-uhd_2560_1440_24fps.mp4',
  'https://videos.pexels.com/video-files/1093662/1093662-hd_1920_1080_30fps.mp4',
  'https://videos.pexels.com/video-files/3044534/3044534-hd_1920_1080_25fps.mp4',
];

const HERO_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=2035&auto=format&fit=crop';


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
    <div className="bg-[#f5f0e8] dark:bg-slate-900 text-[#1a1a1a] dark:text-white overflow-x-hidden">

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
              onClick={(e) => toggleWithCircle(toggleTheme, e)}
              className={`relative flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95
                ${scrollStage === 0 ? 'w-9 h-9' : scrollStage <= 2 ? 'w-8 h-8' : 'w-7 h-7'}
                ${dark ? 'bg-slate-700/80 text-yellow-300' : 'bg-slate-100/80 text-slate-600'}`}
              aria-label="Tema değiştir"
            >
              <span key={dark ? 'moon' : 'sun'} className="theme-icon-in">
                {dark ? <Moon size={scrollStage === 0 ? 16 : 14} /> : <Sun size={scrollStage === 0 ? 16 : 14} />}
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
          SCROLL İNDİKATÖRÜ
         ══════════════════════════════════════════ */}
      <div className="bg-[#f5f0e8] dark:bg-slate-900 flex flex-col items-center justify-center pt-25 pb-0 gap-1.5">
        <span className="text-[11px] font-semibold tracking-[0.25em] text-slate-900 dark:text-white uppercase select-none">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className="text-slate-900 dark:text-white"
        >
          <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
            <path d="M1 1L10 10L19 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════
          BÖLÜM 1.5 — ÜRÜN TANITIM VİDEOSU
         ══════════════════════════════════════════ */}
      <section className="bg-[#f5f0e8] dark:bg-slate-900 py-20 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-12">

          {/* Başlık */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <span className="text-[#f8981d] text-xs font-semibold uppercase tracking-widest">ÜRÜN</span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-2">
              Travyon'u Keşfedin
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              Dakikalar içinde kişiselleştirilmiş seyahat planın hazır.
            </p>
          </motion.div>

          {/* Video kartı */}
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative rounded-2xl overflow-hidden border border-slate-300/70 dark:border-slate-700 shadow-2xl shadow-slate-400/25 dark:shadow-black/50"
          >
            {/* Browser şerit */}
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-700">
              <div className="flex gap-1.5 shrink-0">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white dark:bg-slate-700 rounded-md px-4 py-1 text-[11px] text-slate-400 dark:text-slate-400 w-48 text-center">
                  travyon.app
                </div>
              </div>
            </div>

            <video
              src="/videos/travyon.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full block bg-slate-900"
            />
          </motion.div>
        </div>
      </section>

      {/* ── PLANE DIVIDER ── */}
      <div className="bg-[#f5f0e8] dark:bg-slate-900 px-12 py-2">
        <div className="flex items-center gap-4 max-w-6xl mx-auto">
          <div className="flex-1 h-px bg-slate-400/40 dark:bg-slate-600" />
          <Plane size={15} className="text-slate-400 dark:text-slate-500 -rotate-45 shrink-0" />
          <div className="flex-1 h-px bg-slate-400/40 dark:bg-slate-600" />
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BÖLÜM 3 — NASIL ÇALIŞIR (Globe arka plan)
         ══════════════════════════════════════════ */}
      <section
        id="nasil-calisir"
        className="relative bg-[#f5f0e8] dark:bg-slate-900 overflow-x-hidden"
        style={{ minHeight: 580 }}
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
          style={{ minHeight: 800, maxWidth: 1280 }}
        >

          {/* Başlık — sol üst */}
          <div className="pt-22 pb-2">
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
            <div className="flex flex-col justify-start pt-20 gap-10 pr-7">
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
            <div className="flex flex-col justify-start pt-20 gap-10 pl-15">
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

      {/* ── PLANE DIVIDER ── */}
      <div className="bg-[#f5f0e8] dark:bg-slate-900 px-12 py-2">
        <div className="flex items-center gap-4 max-w-6xl mx-auto">
          <div className="flex-1 h-px bg-slate-400/40 dark:bg-slate-600" />
          <Plane size={15} className="text-slate-400 dark:text-slate-500 -rotate-45 shrink-0" />
          <div className="flex-1 h-px bg-slate-400/40 dark:bg-slate-600" />
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BÖLÜM 3.5 — POPÜLER DESTİNASYONLAR
         ══════════════════════════════════════════ */}
      <section className="bg-[#f5f0e8] dark:bg-slate-900 py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <span className="text-[#f8981d] text-xs font-semibold uppercase tracking-widest">Destinasyonlar</span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-2">
              En Popüler Destinasyonlar
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              AI bu şehirlerde uzman — saniyeler içinde optimize planlar üretir.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { city: 'Roma',      country: 'İtalya',    flag: '🇮🇹', count: '2.4k', img: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=600&auto=format&fit=crop' },
              { city: 'Paris',     country: 'Fransa',    flag: '🇫🇷', count: '3.1k', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop' },
              { city: 'Tokyo',     country: 'Japonya',   flag: '🇯🇵', count: '1.8k', img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=600&auto=format&fit=crop' },
              { city: 'İstanbul',  country: 'Türkiye',   flag: '🇹🇷', count: '4.2k', img: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=600&auto=format&fit=crop' },
              { city: 'Barcelona', country: 'İspanya',   flag: '🇪🇸', count: '1.5k', img: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=600&auto=format&fit=crop' },
              { city: 'New York',  country: 'ABD',       flag: '🇺🇸', count: '2.0k', img: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=600&auto=format&fit=crop' },
              { city: 'Bangkok',   country: 'Tayland',   flag: '🇹🇭', count: '1.2k', img: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=600&auto=format&fit=crop' },
              { city: 'Dubai',     country: 'BAE',       flag: '🇦🇪', count: '1.7k', img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=600&auto=format&fit=crop' },
            ].map((dest, i) => (
              <motion.button
                key={dest.city}
                type="button"
                onClick={() => navigate('/register')}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
                className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#f8981d]/50 dark:hover:border-[#f8981d]/40 hover:shadow-xl hover:shadow-slate-300/40 dark:hover:shadow-black/40 rounded-2xl overflow-hidden text-left transition-all duration-300 hover:-translate-y-1"
              >
                {/* Fotoğraf */}
                <div className="relative h-34 overflow-hidden">
                  <img
                    src={dest.img}
                    alt={dest.city}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {/* Plan sayısı — fotoğraf üstünde */}
                  <span className="absolute top-2 right-2 text-[10px] font-bold text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    {dest.count} plan
                  </span>
                  {/* Bayrak */}
                  <span className="absolute bottom-2 left-2.5 text-xl leading-none drop-shadow">
                    {dest.flag}
                  </span>
                </div>

                {/* Alt bilgi */}
                <div className="px-3.5 py-3">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{dest.city}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{dest.country}</p>
                  <p className="text-[10px] text-[#f8981d] font-semibold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    Plan oluştur →
                  </p>
                </div>
              </motion.button>
            ))}
          </div>

        </div>
      </section>

      {/* ── PLANE DIVIDER ── */}
      <div className="bg-[#f5f0e8] dark:bg-slate-900 px-12 py-2">
        <div className="flex items-center gap-4 max-w-6xl mx-auto">
          <div className="flex-1 h-px bg-slate-400/40 dark:bg-slate-600" />
          <Plane size={15} className="text-slate-400 dark:text-slate-500 -rotate-45 shrink-0" />
          <div className="flex-1 h-px bg-slate-400/40 dark:bg-slate-600" />
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BÖLÜM 4 — FİYATLANDIRMA
         ══════════════════════════════════════════ */}
      <section className="bg-[#f5f0e8] dark:bg-slate-900 py-20 lg:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="text-[#f8981d] text-xs font-semibold uppercase tracking-widest">Fiyatlandırma</span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-2">
              Seyahatine uygun plan seç
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
              Ücretsiz başla, ihtiyacın büyüdükçe yükselt.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* FREE */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col"
            >
              <div className="mb-5">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Free</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">₺0</span>
                  <span className="text-slate-400 text-sm">/ay</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Sonsuza kadar ücretsiz</p>
              </div>
              <div className="flex-1 space-y-3 mb-6">
                {['3 plan hakkı', 'Temel AI planlama', 'İnteraktif harita', 'Plan kaydetme'].map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <svg width="8" height="7" viewBox="0 0 8 7" fill="none"><path d="M1 3.5L3 5.5L7 1" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{f}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="w-full py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                Ücretsiz Başla
              </button>
            </motion.div>

            {/* PRO — öne çıkan */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }}
              className="relative bg-gradient-to-b from-[#f8981d] to-[#e08518] rounded-2xl p-6 flex flex-col shadow-2xl shadow-[#f8981d]/30 scale-[1.03]"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow">
                  En Popüler
                </span>
              </div>
              <div className="mb-5">
                <span className="text-xs font-bold uppercase tracking-widest text-white/70">Pro</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black text-white">₺99</span>
                  <span className="text-white/70 text-sm">/ay</span>
                </div>
                <p className="text-xs text-white/60 mt-1">Yıllık ödemede %20 indirim</p>
              </div>
              <div className="flex-1 space-y-3 mb-6">
                {['Sınırsız plan', 'Reklamsız deneyim', 'Gelişmiş AI modeli', 'Seyahat süreleri', 'Öncelikli destek'].map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <svg width="8" height="7" viewBox="0 0 8 7" fill="none"><path d="M1 3.5L3 5.5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span className="text-sm text-white">{f}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="w-full py-2.5 rounded-xl bg-white text-[#e08518] text-sm font-bold hover:bg-white/90 transition-all shadow-lg"
              >
                Pro'ya Geç →
              </button>
            </motion.div>

            {/* TEAM */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col"
            >
              <div className="mb-5">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Team</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">₺299</span>
                  <span className="text-slate-400 text-sm">/ay</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">5 kullanıcıya kadar</p>
              </div>
              <div className="flex-1 space-y-3 mb-6">
                {['5 kişiye kadar', 'Sınırsız plan', 'Ortak düzenleme', 'Paylaşılabilir planlar', 'Özel destek hattı'].map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <svg width="8" height="7" viewBox="0 0 8 7" fill="none"><path d="M1 3.5L3 5.5L7 1" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{f}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="w-full py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:border-[#f8981d]/40 hover:bg-orange-50 dark:hover:bg-slate-700 transition-all"
              >
                Team'e Başla
              </button>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── PLANE DIVIDER ── */}
      <div className="bg-[#f5f0e8] dark:bg-slate-900 px-12 py-2">
        <div className="flex items-center gap-4 max-w-6xl mx-auto">
          <div className="flex-1 h-px bg-slate-400/40 dark:bg-slate-600" />
          <Plane size={15} className="text-slate-400 dark:text-slate-500 -rotate-45 shrink-0" />
          <div className="flex-1 h-px bg-slate-400/40 dark:bg-slate-600" />
        </div>
      </div>

      {/* ══════════════════════════════════════════
          CTA TEKRARI
         ══════════════════════════════════════════ */}
      <section className="bg-[#f5f0e8] dark:bg-slate-900 py-20 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto px-6 text-center"
        >
          <p className="text-xs font-semibold text-[#f8981d] uppercase tracking-widest mb-4">Başlamaya hazır mısın?</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-tight">
            Hayalindeki seyahat<br />sadece <span className="text-[#f8981d]">1 tık</span> ötede.
          </h2>
          <p className="mt-4 text-slate-500 dark:text-slate-400 text-base leading-relaxed">
            Kredi kartı gerekmez. Dakikalar içinde ücretsiz planını oluştur.
          </p>
          <button
            type="button"
            onClick={handleCTA}
            className="mt-8 inline-flex items-center gap-2.5 px-8 py-4 bg-[#f8981d] hover:bg-[#e08518] text-white font-bold rounded-2xl text-base transition-all shadow-2xl shadow-[#f8981d]/30 hover:-translate-y-0.5 active:scale-95"
          >
            Ücretsiz Plan Oluştur
            <ArrowRight size={18} />
          </button>
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            50.000+ gezgin zaten kullanıyor ✈️
          </p>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
         ══════════════════════════════════════════ */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <TravyonLogo size={40} />

          {/* Linkler */}
          <div className="flex items-center gap-6">
            <Link to="/sss" className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">SSS</Link>
            <Link to="/gizlilik" className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">Gizlilik</Link>
            <Link to="/kullanim-kosullari" className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">Kullanım Koşulları</Link>
            <a href="mailto:iletisim@travyon.app" className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">İletişim</a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-slate-400 whitespace-nowrap">
            © 2026 Travyon. Tüm hakları saklıdır.
          </p>

        </div>
      </footer>

    </div>
  );
};

export default Home;
