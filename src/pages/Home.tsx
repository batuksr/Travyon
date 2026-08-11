import React, { useRef, useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import { ArrowRight, Sun, Moon, Plane } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { toggleWithCircle } from '../utils/themeTransition';
import TravyonLogo from '../components/TravyonLogo';

// three.js + @react-three/fiber ağır olduğu için sadece bölüm görünüme
// yaklaşınca ve yalnızca masaüstünde yükleniyor — hero animasyonuyla çakışmasın.
const GlobeAnimation = lazy(() => import('../components/GlobeAnimation'));

/* ── Destinasyon kartı — hover'da video oynar ── */
interface DestData {
  city: string; planCount: number; img: string; video: string;
}

const DestinationCard: React.FC<{
  dest: DestData; index: number; onNavigate: () => void;
}> = ({ dest, index, onNavigate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);

  const handleEnter = () => {
    setHovered(true);
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    // Video hazırsa hemen oyna, değilse loadeddata olayını bekle
    if (v.readyState >= 3) {
      v.play().catch(() => {});
    } else {
      const onReady = () => { v.play().catch(() => {}); v.removeEventListener('loadeddata', onReady); };
      v.addEventListener('loadeddata', onReady);
      v.load();
    }
  };

  const handleLeave = () => {
    setHovered(false);
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      onClick={onNavigate}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="group relative rounded-3xl overflow-hidden cursor-pointer shadow-[0_10px_26px_rgba(46,43,37,0.16)]"
      style={{ aspectRatio: '5/3' }}
    >
      {/* Statik fotoğraf */}
      <img
        src={dest.img}
        alt={dest.city}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          hovered ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ filter: 'saturate(.72) contrast(.92) brightness(1.04)' }}
      />

      {/* Hover videosu */}
      <video
        ref={videoRef}
        src={dest.video}
        muted
        loop
        playsInline
        preload="metadata"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          hovered ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transform: 'scale(1.35)', objectPosition: 'center center', filter: 'saturate(.72) contrast(.92) brightness(1.04)' }}
      />

      {/* Alt gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/10 to-transparent" />

      {/* İçerik */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-5 flex items-end justify-between gap-1.5 sm:gap-2">
        <h3 className="font-heading text-sm sm:text-2xl text-white leading-tight">
          {dest.city}
        </h3>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigate(); }}
          className="shrink-0 bg-accent hover:brightness-105 text-white font-heading text-[9px] sm:text-xs px-2 py-1 sm:px-4 sm:py-2.5 rounded-full transition-all duration-200 whitespace-nowrap group-hover:scale-105 active:scale-95"
        >
          <span className="sm:hidden">Planla</span>
          <span className="hidden sm:inline">Hemen Planla</span>
        </button>
      </div>
    </motion.div>
  );
};

const HERO_VIDEOS = [
  '/videos/start.mp4',
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

  /* 3D glob — yalnızca "Nasıl Çalışır" bölümü görünüme yaklaşınca ve
     yalnızca masaüstünde (lg+) yüklensin; hero ilk açılışta onunla
     yarışmasın ve mobilde boşa WebGL render loop'u çalışmasın. */
  const globeSectionRef = useRef<HTMLElement>(null);
  const [loadGlobe, setLoadGlobe] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(min-width: 1024px)').matches) return;
    const el = globeSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoadGlobe(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
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
    <div className="bg-bg text-text overflow-x-hidden">

      {/* ══ MOBİL NAVBAR — sabit, scroll'dan etkilenmez ══ */}
      <div className="sm:hidden fixed inset-x-0 top-0 z-50 px-3 pt-2 pb-1">
        <nav className="flex items-center justify-between bg-white/15 backdrop-blur-md border border-white/25 shadow-lg shadow-black/15 h-14 px-4 rounded-2xl">
          <TravyonLogo size={36} dark />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => toggleWithCircle(toggleTheme, e)}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors
                ${dark ? 'bg-slate-700/80 text-yellow-300' : 'bg-slate-100/80 text-slate-600'}`}
              aria-label="Tema değiştir"
            >
              <span key={dark ? 'moon' : 'sun'} className="theme-icon-in">
                {dark ? <Moon size={14} /> : <Sun size={14} />}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-white/90 hover:text-white font-heading text-sm px-3 py-1.5 transition-colors"
            >
              Giriş
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-1 font-heading text-white bg-accent hover:brightness-105 rounded-full text-sm px-4 py-2 shadow-[0_8px_20px_rgba(198,113,57,0.3)] transition-colors"
            >
              Başla <ArrowRight size={13} />
            </button>
          </div>
        </nav>
      </div>

      {/* ══ DESKTOP NAVBAR — sabit, scroll'dan etkilenmez ══ */}
      <div className="hidden sm:flex fixed inset-x-0 top-3 z-50 justify-center">
        <nav className="flex items-center justify-between bg-white/10 backdrop-blur-sm border border-white/25 shadow-xl shadow-black/10 w-[97%] max-w-[1300px] px-6 h-[72px] rounded-3xl">
          <TravyonLogo dark size={56} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => toggleWithCircle(toggleTheme, e)}
              className={`relative flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 w-9 h-9
                ${dark ? 'bg-slate-700/80 text-yellow-300' : 'bg-slate-100/80 text-slate-600'}`}
              aria-label="Tema değiştir"
            >
              <span key={dark ? 'moon' : 'sun'} className="theme-icon-in">
                {dark ? <Moon size={16} /> : <Sun size={16} />}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-white/90 hover:text-white font-heading text-sm px-4 py-2 transition-colors"
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-1.5 font-heading text-white bg-accent hover:brightness-105 rounded-full text-sm px-5 py-2 shadow-[0_10px_22px_rgba(198,113,57,0.28)] hover:-translate-y-px transition-all"
            >
              Ücretsiz Başla
              <ArrowRight size={13} />
            </button>
          </div>
        </nav>
      </div>

      {/* ══════════════════════════════════════════
          BÖLÜM 1 — HERO (Video)
         ══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-[#1c140c]">

        {/* Video arka planlar */}
        {!showFallback && HERO_VIDEOS.map((src, i) => (
          <video
            key={src}
            ref={el => { videoRefs.current[i] = el; }}
            src={src}
            autoPlay={i === 0}
            muted
            playsInline
            preload={
              i === currentVideoIndex || i === (currentVideoIndex + 1) % HERO_VIDEOS.length
                ? 'auto'
                : 'none'
            }
            onEnded={i === currentVideoIndex ? handleVideoEnded : undefined}
            onError={i === currentVideoIndex ? handleVideoError : undefined}
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

        {/* Overlay — mobilde düz, desktop'ta soldan sağa */}
        <div
          className="absolute inset-0 bg-black/55 sm:bg-gradient-to-r sm:from-black/75 sm:via-black/40 sm:to-transparent"
          style={{ zIndex: 2 }}
        />

        {/* İçerik */}
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 sm:pt-20 sm:pb-16 lg:py-0" style={{ zIndex: 3 }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-12">
            <div className="max-w-xl lg:mt-16">

              {/* Başlık */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="font-heading text-4xl md:text-5xl lg:text-6xl text-white leading-[1.06] tracking-tight"
              >
                Hayalindeki<br />Seyahati<br />
                <span className="text-accent-200">Planla.</span>
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
                  className="group inline-flex items-center gap-2 px-7 py-3.5 bg-accent hover:brightness-105 text-white font-heading text-base rounded-full transition-all shadow-[0_12px_28px_rgba(198,113,57,0.3)] hover:-translate-y-0.5 active:translate-y-px"
                >
                  Ücretsiz Plan Oluştur
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>

              {/* İstatistikler */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/15"
              >
                {[['50+', 'Desteklenen Şehir'], ['15sn', 'Ortalama Plan Süresi'], ['%100', 'Kişiselleştirilmiş']].map(([val, label]) => (
                  <div key={label}>
                    <p className="font-heading text-2xl text-accent-200">{val}</p>
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
      <div className="bg-bg flex flex-col items-center justify-center pt-25 pb-0 gap-1.5">
        <span className="text-[11px] font-heading tracking-[0.25em] text-text uppercase select-none">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className="text-text"
        >
          <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
            <path d="M1 1L10 10L19 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════
          BÖLÜM 1.5 — ÜRÜN TANITIM VİDEOSU
         ══════════════════════════════════════════ */}
      <section className="bg-bg py-10 sm:py-20 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-12">

          {/* Başlık */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <span className="text-accent-700 font-heading text-xs uppercase tracking-widest">ÜRÜN</span>
            <h2 className="font-heading text-2xl md:text-3xl text-text mt-2">
              Travyon'u Keşfedin
            </h2>
            <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
              Dakikalar içinde kişiselleştirilmiş seyahat planın hazır.
            </p>
          </motion.div>

          {/* Video kartı */}
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative rounded-3xl overflow-hidden border border-divider shadow-[0_20px_50px_rgba(46,43,37,0.18)]"
          >
            {/* Browser şerit */}
            <div className="bg-surface-2 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-2.5 border-b border-divider">
              <div className="flex gap-1 sm:gap-1.5 shrink-0">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-surface rounded-md px-3 sm:px-4 py-1 text-[10px] sm:text-[11px] text-muted w-32 sm:w-48 text-center">
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
              className="w-full block bg-surface-2"
            />
          </motion.div>
        </div>
      </section>

      {/* ── PLANE DIVIDER ── */}
      <div className="bg-bg px-4 sm:px-12 py-2">
        <div className="flex items-center gap-4 max-w-6xl mx-auto">
          <div className="flex-1 h-px bg-divider" />
          <Plane size={15} className="text-muted -rotate-45 shrink-0" />
          <div className="flex-1 h-px bg-divider" />
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BÖLÜM 3 — NASIL ÇALIŞIR (Globe arka plan)
         ══════════════════════════════════════════ */}
      <section
        id="nasil-calisir"
        ref={globeSectionRef}
        className="relative bg-bg overflow-x-hidden"
      >

        {/* Globe — sadece lg+ ekranlarda, görünüme yaklaşınca yüklenir */}
        {loadGlobe && (
          <div className="hidden lg:flex absolute inset-0 items-center justify-center pointer-events-none">
            <div style={{ width: 500, height: 500 }}>
              <Suspense fallback={null}>
                <GlobeAnimation />
              </Suspense>
            </div>
          </div>
        )}

        {/* İçerik */}
        <div
          className="relative z-10 w-full mx-auto px-4 sm:px-8 flex flex-col lg:min-h-[800px]"
          style={{ maxWidth: 1280 }}
        >

          {/* Başlık */}
          <div className="pt-14 sm:pt-20 lg:pt-22 pb-2">
            <span className="text-accent-700 font-heading text-xs uppercase tracking-widest">SÜREÇ</span>
            <h2 className="font-heading text-2xl md:text-3xl text-text mt-1">
              Nasıl Çalışır?
            </h2>
            <p className="text-sm text-muted mt-1.5 max-w-xs leading-relaxed">
              Hesap oluşturmaktan mükemmel seyahat planına dört adımda ulaşın.
            </p>
          </div>

          {/* Mobil / tablet: 2 sütun grid */}
          <div className="lg:hidden grid grid-cols-2 gap-6 sm:gap-8 pt-8 pb-14">
            {STEPS.map((step) => (
              <div key={step.num}>
                <div className="font-heading text-accent text-3xl sm:text-4xl mb-2 leading-none">{step.num}</div>
                <h3 className="font-heading text-sm text-text mb-1">{step.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Desktop (lg+): 3-sütun globe layout */}
          <div
            className="hidden lg:grid flex-1 pb-10"
            style={{ gridTemplateColumns: '1fr 520px 1fr' }}
          >

            {/* Sol — 01 ve 02 */}
            <div className="flex flex-col justify-start pt-20 gap-10 pr-7">
              {STEPS.slice(0, 2).map((step) => (
                <div key={step.num}>
                  <div className="font-heading text-accent text-4xl mb-2 leading-none">{step.num}</div>
                  <h3 className="font-heading text-sm text-text mb-1">{step.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>

            {/* Merkez — boş, sadece dünya görünür */}
            <div />

            {/* Sağ — 03 ve 04 */}
            <div className="flex flex-col justify-start pt-20 gap-10 pl-15">
              {STEPS.slice(2, 4).map((step) => (
                <div key={step.num}>
                  <div className="font-heading text-accent text-4xl mb-2 leading-none">{step.num}</div>
                  <h3 className="font-heading text-sm text-text mb-1">{step.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── PLANE DIVIDER ── */}
      <div className="bg-bg px-4 sm:px-12 py-2">
        <div className="flex items-center gap-4 max-w-6xl mx-auto">
          <div className="flex-1 h-px bg-divider" />
          <Plane size={15} className="text-muted -rotate-45 shrink-0" />
          <div className="flex-1 h-px bg-divider" />
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BÖLÜM 3.5 — POPÜLER DESTİNASYONLAR
         ══════════════════════════════════════════ */}
      <section className="bg-bg py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <span className="text-accent-700 font-heading text-xs uppercase tracking-widest">Destinasyonlar</span>
            <h2 className="font-heading text-2xl md:text-3xl text-text mt-2">
              En Popüler Destinasyonlar
            </h2>
            <p className="text-sm text-muted mt-2">
              AI bu şehirlerde uzman — saniyeler içinde optimize planlar üretir.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {([
              {
                city: 'Roma',      planCount: 2400,
                img:   'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=800&auto=format&fit=crop',
                video: '/videos/roma.mp4',
              },
              {
                city: 'Paris',     planCount: 3100,
                img:   'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop',
                video: '/videos/paris.mp4',
              },
              {
                city: 'Tokyo',     planCount: 1800,
                img:   'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=800&auto=format&fit=crop',
                video: '/videos/tokyo.mp4',
              },
              {
                city: 'İstanbul',  planCount: 4200,
                img:   'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=800&auto=format&fit=crop',
                video: '/videos/istanbul.mp4',
              },
              {
                city: 'Barcelona', planCount: 1500,
                img:   'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=800&auto=format&fit=crop',
                video: '/videos/barselona.mp4',
              },
              {
                city: 'New York',  planCount: 2000,
                img:   'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=800&auto=format&fit=crop',
                video: '/videos/newyork.mp4',
              },
            ] as DestData[]).map((dest, i) => (
              <DestinationCard
                key={dest.city}
                dest={dest}
                index={i}
                onNavigate={() => navigate('/register')}
              />
            ))}
          </div>

        </div>
      </section>

      {/* ── PLANE DIVIDER ── */}
      <div className="bg-bg px-4 sm:px-12 py-2">
        <div className="flex items-center gap-4 max-w-6xl mx-auto">
          <div className="flex-1 h-px bg-divider" />
          <Plane size={15} className="text-muted -rotate-45 shrink-0" />
          <div className="flex-1 h-px bg-divider" />
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BÖLÜM 4 — FİYATLANDIRMA
         ══════════════════════════════════════════ */}
      <section className="bg-bg py-20 lg:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="text-accent-700 font-heading text-xs uppercase tracking-widest">Fiyatlandırma</span>
            <h2 className="font-heading text-2xl md:text-3xl text-text mt-2">
              Seyahatine uygun plan seç
            </h2>
            <p className="text-sm text-muted mt-2 max-w-md mx-auto">
              Ücretsiz başla, ihtiyacın büyüdükçe yükselt.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* FREE */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: 0 }}
              className="bg-surface border border-divider rounded-3xl p-6 flex flex-col"
            >
              <div className="mb-5">
                <span className="text-xs font-heading uppercase tracking-widest text-muted">Free</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="font-heading text-4xl text-text">₺0</span>
                  <span className="text-muted text-sm">/ay</span>
                </div>
                <p className="text-xs text-muted mt-1">Sonsuza kadar ücretsiz</p>
              </div>
              <div className="flex-1 space-y-3 mb-6">
                {['3 plan hakkı', 'Temel AI planlama', 'İnteraktif harita', 'Plan kaydetme'].map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-surface-2 flex items-center justify-center shrink-0">
                      <svg width="8" height="7" viewBox="0 0 8 7" fill="none"><path d="M1 3.5L3 5.5L7 1" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span className="text-sm text-text">{f}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="w-full py-3 rounded-full border-[1.5px] border-divider bg-transparent text-text font-heading text-sm hover:bg-surface-2 transition-all"
              >
                Ücretsiz Başla
              </button>
            </motion.div>

            {/* PRO — öne çıkan */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }}
              className="relative bg-accent rounded-3xl p-6 flex flex-col shadow-[0_22px_48px_rgba(198,113,57,0.34)] scale-[1.03]"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-accent-700 text-white text-[10px] font-heading uppercase tracking-widest px-3.5 py-1.5 rounded-full">
                  En Popüler
                </span>
              </div>
              <div className="mb-5">
                <span className="text-xs font-heading uppercase tracking-widest text-white/75">Pro</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="font-heading text-4xl text-white">₺99</span>
                  <span className="text-white/75 text-sm">/ay</span>
                </div>
                <p className="text-xs text-white/70 mt-1">Yıllık ödemede %20 indirim</p>
              </div>
              <div className="flex-1 space-y-3 mb-6">
                {['Sınırsız plan', 'Reklamsız deneyim', 'Gelişmiş AI modeli', 'Seyahat süreleri', 'Öncelikli destek'].map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-white/22 flex items-center justify-center shrink-0">
                      <svg width="8" height="7" viewBox="0 0 8 7" fill="none"><path d="M1 3.5L3 5.5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span className="text-sm text-white">{f}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="w-full py-3 rounded-full bg-white text-accent-700 font-heading text-sm hover:brightness-105 transition-all"
              >
                Pro'ya Geç →
              </button>
            </motion.div>

            {/* TEAM */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-surface border border-divider rounded-3xl p-6 flex flex-col"
            >
              <div className="mb-5">
                <span className="text-xs font-heading uppercase tracking-widest text-muted">Team</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="font-heading text-4xl text-text">₺299</span>
                  <span className="text-muted text-sm">/ay</span>
                </div>
                <p className="text-xs text-muted mt-1">5 kullanıcıya kadar</p>
              </div>
              <div className="flex-1 space-y-3 mb-6">
                {['5 kişiye kadar', 'Sınırsız plan', 'Ortak düzenleme', 'Paylaşılabilir planlar', 'Özel destek hattı'].map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-sage-200 flex items-center justify-center shrink-0">
                      <svg width="8" height="7" viewBox="0 0 8 7" fill="none"><path d="M1 3.5L3 5.5L7 1" stroke="var(--color-sage-700)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span className="text-sm text-text">{f}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="w-full py-3 rounded-full border-[1.5px] border-divider bg-transparent text-text font-heading text-sm hover:bg-surface-2 transition-all"
              >
                Team'e Başla
              </button>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── PLANE DIVIDER ── */}
      <div className="bg-bg px-4 sm:px-12 py-2">
        <div className="flex items-center gap-4 max-w-6xl mx-auto">
          <div className="flex-1 h-px bg-divider" />
          <Plane size={15} className="text-muted -rotate-45 shrink-0" />
          <div className="flex-1 h-px bg-divider" />
        </div>
      </div>

      {/* ══════════════════════════════════════════
          CTA TEKRARI
         ══════════════════════════════════════════ */}
      <section className="relative bg-bg py-20 lg:py-24 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative max-w-2xl mx-auto px-8 sm:px-10 py-16 text-center bg-sage rounded-[40px] overflow-hidden"
        >
          <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/12 pointer-events-none" />
          <div className="absolute -bottom-20 -left-8 w-52 h-52 rounded-full bg-white/10 pointer-events-none" />
          <p className="relative text-xs font-heading text-white/80 uppercase tracking-widest mb-3.5">Başlamaya hazır mısın?</p>
          <h2 className="relative font-heading text-3xl md:text-4xl lg:text-5xl text-white leading-tight">
            Sıradaki durağın<br />sadece bir tık ötede.
          </h2>
          <button
            type="button"
            onClick={handleCTA}
            className="relative mt-8 inline-flex items-center gap-2.5 px-8 py-4 bg-white hover:brightness-105 text-accent-700 font-heading text-base rounded-full transition-all shadow-[0_16px_34px_rgba(46,43,37,0.24)] active:scale-95"
          >
            Ücretsiz Plan Oluştur
            <ArrowRight size={18} />
          </button>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
         ══════════════════════════════════════════ */}
      <footer className="bg-surface border-t border-divider">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-0 sm:h-16 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">

          {/* Logo */}
          <TravyonLogo size={36} />

          {/* Linkler */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link to="/sss" className="text-sm text-muted hover:text-text transition-colors">SSS</Link>
            <Link to="/gizlilik" className="text-sm text-muted hover:text-text transition-colors">Gizlilik</Link>
            <Link to="/kullanim-kosullari" className="text-sm text-muted hover:text-text transition-colors">Kullanım Koşulları</Link>
            <Link to="/iletisim" className="text-sm text-muted hover:text-text transition-colors">İletişim</Link>
          </div>

          {/* Copyright */}
          <p className="text-xs sm:text-sm text-muted whitespace-nowrap text-center">
            © 2026 Travyon. Tüm hakları saklıdır.
          </p>

        </div>
      </footer>

    </div>
  );
};

export default Home;
