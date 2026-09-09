import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, BookOpen, CalendarDays, Clock3, ExternalLink,
  Languages, Landmark, MapPin, Navigation, Route,
  Train, Utensils, WalletCards,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TravyonLogo from '../components/TravyonLogo';
import { getCityGuide, type GuideLocale, type LocalizedText } from '../data/cityGuides';
import { CITY_GUIDE_VISUALS } from '../data/cityGuideVisuals';
import { useAuthStore } from '../store/useAuthStore';
import { useOnboardingStore } from '../store/useOnboardingStore';

const COPY = {
  tr: {
    back: 'Popüler destinasyonlara dön', guide: 'Şehir rehberi', plan: 'Bu şehir için plan oluştur',
    introEyebrow: 'Kısa bakış', introTitle: 'Şehri tanı, sonra kendi rotanı oluştur',
    stay: 'İdeal süre', season: 'En iyi dönem', language: 'Dil', currency: 'Para birimi',
    highlightsEyebrow: 'Kaçırma', highlightsTitle: 'İlk kez gelenler için öne çıkanlar',
    foodEyebrow: 'Yerel tatlar', foodTitle: 'Şehri masada keşfet',
    neighborhoodEyebrow: 'Mahalleler', neighborhoodTitle: 'Hangi bölgede hangi ruh var?',
    transportEyebrow: 'Şehir içinde', transportTitle: 'Ulaşımı kolaylaştıran kısa notlar',
    routeEyebrow: 'Örnek akış', routeTitle: 'Bir güne sığan dengeli rota',
    sourcePrefix: 'Güncel ziyaret ve ulaşım bilgileri için', source: 'resmî turizm kaynağını aç',
    ctaEyebrow: 'Sıra sende', ctaTitle: 'Bu rehberi sana özel bir seyahat planına dönüştür',
    ctaBody: 'Tarihlerini, bütçeni ve seyahat tarzını seç; Travyon rotanı gün gün hazırlasın.',
    notFound: 'Bu şehir rehberi bulunamadı.', home: 'Ana sayfaya dön', openGuide: 'rehberini aç',
    contents: 'Bu rehberde', duration: 'Ayır', bestTime: 'En iyi zaman',
    nav: ['Öne çıkanlar', 'Yerel tatlar', 'Bölgeler', 'Ulaşım', 'Günlük rota'],
  },
  en: {
    back: 'Back to popular destinations', guide: 'City guide', plan: 'Create a plan for this city',
    introEyebrow: 'At a glance', introTitle: 'Know the city, then shape your own route',
    stay: 'Ideal stay', season: 'Best season', language: 'Language', currency: 'Currency',
    highlightsEyebrow: 'Do not miss', highlightsTitle: 'Highlights for a first visit',
    foodEyebrow: 'Local flavors', foodTitle: 'Discover the city at the table',
    neighborhoodEyebrow: 'Neighborhoods', neighborhoodTitle: 'Find the character of each area',
    transportEyebrow: 'Getting around', transportTitle: 'Short notes that make transport easier',
    routeEyebrow: 'Sample flow', routeTitle: 'A balanced route for one day',
    sourcePrefix: 'For current visitor and transport information,', source: 'open the official tourism source',
    ctaEyebrow: 'Your turn', ctaTitle: 'Turn this guide into a trip designed for you',
    ctaBody: 'Choose your dates, budget and travel style; let Travyon build your day-by-day route.',
    notFound: 'This city guide could not be found.', home: 'Return home', openGuide: 'open guide',
    contents: 'In this guide', duration: 'Allow', bestTime: 'Best time',
    nav: ['Highlights', 'Local flavors', 'Areas', 'Transport', 'Day route'],
  },
} as const;

const VISIT_META = {
  tr: [
    { duration: '2–3 saat', time: 'Sabah erken' },
    { duration: '1,5–2 saat', time: 'Öğleden sonra' },
    { duration: '1–2 saat', time: 'Sabah veya gün batımı' },
    { duration: '2–3 saat', time: 'Günün ikinci yarısı' },
  ],
  en: [
    { duration: '2–3 hours', time: 'Early morning' },
    { duration: '1.5–2 hours', time: 'Afternoon' },
    { duration: '1–2 hours', time: 'Morning or sunset' },
    { duration: '2–3 hours', time: 'Later in the day' },
  ],
} as const;

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.5, ease: 'easeOut' as const },
};

export default function CityGuide() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user } = useAuthStore();
  const updateOnboarding = useOnboardingStore((state) => state.updateData);
  const setOnboardingStep = useOnboardingStore((state) => state.setStep);
  const locale: GuideLocale = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'tr';
  const copy = COPY[locale];
  const guide = getCityGuide(slug);
  const pick = (value: LocalizedText) => value[locale];

  useEffect(() => {
    if (!guide) return;
    document.title = `${pick(guide.city)} | Travyon`;
    return () => { document.title = 'Travyon'; };
  }, [guide, locale]);

  if (!guide) {
    return (
      <div className="min-h-screen bg-bg px-5 flex flex-col items-center justify-center text-center text-text">
        <BookOpen size={40} className="text-accent mb-5" />
        <h1 className="font-heading text-2xl">{copy.notFound}</h1>
        <Link to="/" className="mt-5 text-sm font-semibold text-accent">{copy.home}</Link>
      </div>
    );
  }

  const beginPlan = () => {
    updateOnboarding({ destination: pick(guide.destination) });
    setOnboardingStep(1);
    navigate(user ? '/onboarding' : '/register');
  };

  const visuals = CITY_GUIDE_VISUALS[guide.slug];
  const sectionIds = ['one-cikanlar', 'yerel-tatlar', 'bolgeler', 'ulasim', 'gunluk-rota'];

  const facts = [
    { icon: Clock3, label: copy.stay, value: pick(guide.idealStay) },
    { icon: CalendarDays, label: copy.season, value: pick(guide.bestSeason) },
    { icon: Languages, label: copy.language, value: pick(guide.language) },
    { icon: WalletCards, label: copy.currency, value: pick(guide.currency) },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-bg text-text">
      <header className="sticky top-0 z-50 border-b border-divider bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to={user ? '/hub' : '/'} aria-label="Travyon">
            <TravyonLogo size={48} />
          </Link>
        </div>
      </header>

      <main>
        <section className="relative mx-auto max-w-[1500px] px-3 pt-3 sm:px-6 sm:pt-6">
          <div className="relative min-h-[520px] overflow-hidden rounded-[28px] sm:min-h-[600px] lg:min-h-[650px]">
            <img src={guide.image} alt={`${pick(guide.city)}, ${pick(guide.country)}`} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 sm:p-8">
              <Link to={user ? '/hub' : '/#destinasyonlar'} className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md hover:bg-black/35">
                <ArrowLeft size={15} /> {copy.back}
              </Link>
              <span className="hidden rounded-full border border-white/25 bg-black/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[.2em] text-white/85 backdrop-blur-md sm:block">
                {copy.guide}
              </span>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-x-0 bottom-0 max-w-4xl p-6 text-white sm:p-10 lg:p-14"
            >
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-white/75">
                <MapPin size={15} /> {pick(guide.country)}
              </div>
              <h1 className="font-heading text-5xl leading-none sm:text-7xl lg:text-8xl">{pick(guide.city)}</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">{pick(guide.tagline)}</p>
            </motion.div>
          </div>
        </section>

        <section className="relative z-10 mx-auto -mt-5 grid max-w-6xl grid-cols-2 gap-3 px-5 sm:-mt-8 sm:grid-cols-4 sm:px-8">
          {facts.map(({ icon: Icon, label, value }, index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 + index * 0.06, duration: 0.4 }}
              className="rounded-2xl border border-divider bg-surface p-4 shadow-[0_12px_30px_rgba(46,43,37,.09)] sm:p-5"
            >
              <Icon size={18} className="text-accent" />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
              <p className="mt-1 text-sm font-semibold leading-snug text-text">{value}</p>
            </motion.div>
          ))}
        </section>

        <nav aria-label={copy.contents} className="mx-auto mt-8 max-w-6xl px-5 sm:px-8">
          <div className="flex snap-x gap-2 overflow-x-auto rounded-2xl border border-divider bg-surface p-2 shadow-[0_8px_24px_rgba(46,43,37,.05)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="hidden shrink-0 items-center px-3 text-[10px] font-bold uppercase tracking-[.16em] text-muted lg:flex">
              {copy.contents}
            </span>
            {copy.nav.map((label, index) => (
              <a
                key={sectionIds[index]}
                href={`#${sectionIds[index]}`}
                className="shrink-0 snap-start rounded-xl px-3.5 py-2.5 text-xs font-semibold text-text transition-colors hover:bg-accent-100 hover:text-accent-700"
              >
                {label}
              </a>
            ))}
          </div>
        </nav>

        <motion.section {...reveal} className="mx-auto grid max-w-6xl gap-8 px-5 py-20 sm:px-8 lg:grid-cols-[.72fr_1.28fr] lg:items-start lg:py-28">
          <div>
            <span className="font-heading text-xs uppercase tracking-[.2em] text-accent-700">{copy.introEyebrow}</span>
            <h2 className="mt-3 font-heading text-3xl leading-tight sm:text-4xl">{copy.introTitle}</h2>
          </div>
          <p className="text-base leading-8 text-muted sm:text-lg">{pick(guide.introduction)}</p>
        </motion.section>

        <motion.section id="one-cikanlar" {...reveal} className="scroll-mt-24 mx-auto max-w-6xl px-5 pb-20 sm:px-8 lg:pb-28">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <span className="font-heading text-xs uppercase tracking-[.2em] text-accent-700">{copy.highlightsEyebrow}</span>
              <h2 className="mt-3 font-heading text-3xl sm:text-4xl">{copy.highlightsTitle}</h2>
            </div>
            <Landmark size={28} className="hidden text-accent sm:block" />
          </div>
          <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 sm:[scrollbar-width:auto] [&::-webkit-scrollbar]:hidden">
            {guide.highlights.map((highlight, index) => (
              <article key={pick(highlight.title)} className="group w-[84vw] max-w-[360px] shrink-0 snap-center overflow-hidden rounded-[28px] border border-divider bg-surface transition-all hover:-translate-y-1 hover:border-accent/45 hover:shadow-[0_18px_36px_rgba(46,43,37,.09)] sm:w-auto sm:max-w-none">
                <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
                  <img
                    src={visuals?.highlights[index] ?? guide.image}
                    alt={pick(highlight.title)}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-black/30 font-heading text-sm text-white backdrop-blur-md">0{index + 1}</span>
                </div>
                <div className="p-5 sm:p-6">
                  <h3 className="font-heading text-xl leading-tight sm:text-2xl">{pick(highlight.title)}</h3>
                  <p className="mt-2 min-h-[48px] text-sm leading-6 text-muted">{pick(highlight.description)}</p>

                  <div className="mt-5 grid grid-cols-2 gap-2 border-y border-divider py-4">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[.14em] text-muted">{copy.duration}</p>
                      <p className="mt-1 text-xs font-semibold text-text">{VISIT_META[locale][index].duration}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[.14em] text-muted">{copy.bestTime}</p>
                      <p className="mt-1 text-xs font-semibold text-text">{VISIT_META[locale][index].time}</p>
                    </div>
                  </div>

                </div>
              </article>
            ))}
          </div>
        </motion.section>

        <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-20 sm:px-8 lg:grid-cols-2 lg:pb-28">
          <motion.div id="yerel-tatlar" {...reveal} className="scroll-mt-24 rounded-[30px] border border-divider bg-surface p-6 sm:p-8">
            <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100 text-accent-700"><Utensils size={22} /></div>
            <span className="font-heading text-xs uppercase tracking-[.2em] text-accent-700">{copy.foodEyebrow}</span>
            <h2 className="mt-2 font-heading text-2xl">{copy.foodTitle}</h2>
            <div className="mt-7 space-y-3">
              {guide.foods.map((food, index) => (
                <article key={pick(food.title)} className="group grid grid-cols-[96px_1fr] items-center gap-4 overflow-hidden rounded-2xl border border-divider bg-bg/60 p-2 sm:grid-cols-[112px_1fr]">
                  <img
                    src={visuals?.foods[index] ?? guide.image}
                    alt={pick(food.title)}
                    loading="lazy"
                    className="h-24 w-24 rounded-xl object-cover transition-transform duration-500 group-hover:scale-[1.03] sm:h-28 sm:w-28"
                  />
                  <div className="py-2 pr-2">
                    <h3 className="font-heading text-lg">{pick(food.title)}</h3>
                    <p className="mt-1.5 text-xs leading-5 text-muted sm:text-sm sm:leading-6">{pick(food.description)}</p>
                  </div>
                </article>
              ))}
            </div>
          </motion.div>

          <motion.div id="bolgeler" {...reveal} className="scroll-mt-24 rounded-[30px] border border-divider bg-surface-2 p-6 sm:p-8">
            <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-sage-700"><Navigation size={22} /></div>
            <span className="font-heading text-xs uppercase tracking-[.2em] text-sage-700">{copy.neighborhoodEyebrow}</span>
            <h2 className="mt-2 font-heading text-2xl">{copy.neighborhoodTitle}</h2>
            <div className="mt-7 space-y-3">
              {guide.neighborhoods.map((area) => (
                <article key={pick(area.title)} className="rounded-2xl border border-divider bg-bg/70 p-4">
                  <h3 className="font-heading text-base">{pick(area.title)}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{pick(area.description)}</p>
                </article>
              ))}
            </div>
          </motion.div>
        </section>

        <motion.section id="ulasim" {...reveal} className="scroll-mt-24 mx-auto max-w-6xl px-5 pb-20 sm:px-8 lg:pb-28">
          <div className="relative overflow-hidden rounded-[32px] bg-sage-700 p-7 text-bg sm:p-10 lg:p-12">
            <Train className="absolute -right-8 -top-8 h-40 w-40 opacity-[.05]" />
            <span className="font-heading text-xs uppercase tracking-[.2em] text-accent-200">{copy.transportEyebrow}</span>
            <h2 className="mt-3 max-w-lg font-heading text-3xl leading-tight">{copy.transportTitle}</h2>
            <div className="mt-8 grid gap-3 lg:grid-cols-3">
              {guide.transport.map((note, index) => (
                <div key={note.tr} className="rounded-2xl border border-bg/15 bg-bg/5 p-5">
                  <span className="font-heading text-sm text-accent-200">0{index + 1}</span>
                  <p className="mt-3 text-sm leading-6 text-bg/70">{pick(note)}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section id="gunluk-rota" {...reveal} className="scroll-mt-24 mx-auto grid max-w-6xl gap-10 px-5 pb-20 sm:px-8 lg:grid-cols-[.75fr_1.25fr] lg:pb-28">
          <div>
            <Route size={28} className="mb-5 text-accent" />
            <span className="font-heading text-xs uppercase tracking-[.2em] text-accent-700">{copy.routeEyebrow}</span>
            <h2 className="mt-3 font-heading text-3xl leading-tight sm:text-4xl">{copy.routeTitle}</h2>
          </div>
          <div className="relative space-y-3 before:absolute before:bottom-6 before:left-5 before:top-6 before:w-px before:bg-divider">
            {guide.dayRoute.map((stop, index) => (
              <article key={pick(stop.title)} className="relative flex gap-5 rounded-2xl border border-divider bg-surface p-5">
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-sm text-white">{index + 1}</span>
                <div>
                  <h3 className="font-heading text-base">{pick(stop.title)}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{pick(stop.description)}</p>
                </div>
              </article>
            ))}
          </div>
        </motion.section>

        <div className="mx-auto max-w-6xl px-5 pb-10 text-center text-xs text-muted sm:px-8">
          {copy.sourcePrefix}{' '}
          <a href={guide.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent hover:text-accent-700">
            {copy.source}<ExternalLink size={12} />
          </a>.
        </div>

        <section className="px-3 pb-3 sm:px-6 sm:pb-6">
          <motion.div {...reveal} className="mx-auto max-w-[1450px] overflow-hidden rounded-[30px] bg-accent px-6 py-14 text-center text-white sm:px-10 sm:py-20">
            <span className="font-heading text-xs uppercase tracking-[.2em] text-white/70">{copy.ctaEyebrow}</span>
            <h2 className="mx-auto mt-3 max-w-2xl font-heading text-3xl leading-tight sm:text-5xl">{copy.ctaTitle}</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/75">{copy.ctaBody}</p>
            <button type="button" onClick={beginPlan} className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-heading text-sm text-accent shadow-xl transition-transform hover:-translate-y-1">
              {copy.plan}<ArrowRight size={16} />
            </button>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
