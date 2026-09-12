import AppIcon from '../AppIcon';
import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, ChevronRight, CloudSun, MapPin, Route, Sparkles, Wallet,
} from 'lucide-react';

const cardClass = 'relative snap-center shrink-0 basis-[88%] min-h-[430px] overflow-hidden rounded-[26px] border border-divider bg-surface shadow-[0_16px_40px_rgba(46,43,37,0.12)]';

const MobileProductTour: React.FC = () => {
  const { t } = useTranslation();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = useState(0);
  const cardCount = 4;

  const scrollToCard = (index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const card = scroller.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  const handleScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const viewportCenter = scroller.scrollLeft + scroller.clientWidth / 2;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    Array.from(scroller.children).forEach((child, index) => {
      const card = child as HTMLElement;
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - viewportCenter);
      if (distance < nearestDistance) {
        nearestIndex = index;
        nearestDistance = distance;
      }
    });
    setActiveCard(nearestIndex);
  };

  return (
    <div className="bg-bg py-5">
      <div className="flex items-center justify-between gap-3 px-5 pb-4">
        <div>
          <p className="font-heading text-base text-text">{t('home.product.mobileTour.title')}</p>
          <p className="mt-0.5 text-xs text-muted">{t('home.product.mobileTour.swipeHint')}</p>
        </div>
        <span className="rounded-full bg-accent-100 px-2.5 py-1 text-[10px] font-bold text-accent-700">
          {activeCard + 1}/{cardCount}
        </span>
      </div>

      <div
        ref={scrollerRef}
        role="region"
        aria-label={t('home.product.mobileTour.ariaLabel')}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-4 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <article className={cardClass}>
          <div className="flex h-full flex-col p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
                <Sparkles size={19} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-700">{t('home.product.mobileTour.plan.eyebrow')}</p>
                <h3 className="font-heading text-lg text-text">{t('home.product.mobileTour.plan.title')}</h3>
              </div>
            </div>

            <div className="mt-5 flex gap-2 overflow-hidden">
              {[1, 2, 3].map((day) => (
                <span key={day} className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold ${day === 1 ? 'border-accent bg-accent text-white' : 'border-divider bg-surface-2 text-muted'}`}>
                  {t('home.product.mobileTour.plan.day', { day })}
                </span>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-surface-2 p-3.5">
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>{t('home.product.mobileTour.plan.date')}</span>
                <span>{t('home.product.mobileTour.plan.estimate')}</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold leading-snug text-text">{t('home.product.mobileTour.plan.summary')}</p>
            </div>

            <div className="mt-3 space-y-2.5">
              {(['colosseum', 'park', 'food'] as const).map((place, index) => (
                <div key={place} className="flex items-center gap-3 rounded-2xl border border-divider bg-surface px-3 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/30 text-xs font-bold text-accent-700">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-text">{t(`home.product.mobileTour.plan.places.${place}`)}</p>
                    <p className="mt-0.5 text-[10px] text-muted">{t(`home.product.mobileTour.plan.times.${place}`)}</p>
                  </div>
                  <ChevronRight size={15} className="shrink-0 text-muted" />
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className={cardClass}>
          <div className="flex h-full flex-col p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e8f1e8] text-sage-700">
                <Route size={19} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sage-700">{t('home.product.mobileTour.map.eyebrow')}</p>
                <h3 className="font-heading text-lg text-text">{t('home.product.mobileTour.map.title')}</h3>
              </div>
            </div>

            <div className="relative mt-5 flex-1 overflow-hidden rounded-3xl border border-divider bg-[#e9eee5]">
              <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(35deg,transparent_46%,#fff_47%,#fff_52%,transparent_53%),linear-gradient(125deg,transparent_46%,#d7cbb8_47%,#d7cbb8_50%,transparent_51%)] [background-size:72px_72px,56px_56px]" />
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 290" fill="none" aria-hidden="true">
                <path d="M60 238 C92 205, 77 156, 125 144 S190 124, 226 63" stroke="#c67139" strokeWidth="4" strokeLinecap="round" strokeDasharray="3 9" />
              </svg>
              {[
                { n: 1, left: '16%', top: '72%' },
                { n: 2, left: '36%', top: '44%' },
                { n: 3, left: '69%', top: '17%' },
              ].map((pin) => (
                <span key={pin.n} style={{ left: pin.left, top: pin.top }} className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-accent font-heading text-xs text-white shadow-lg">
                  {pin.n}
                </span>
              ))}
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/70 bg-surface/90 p-3 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-accent" />
                  <p className="text-xs font-semibold text-text">{t('home.product.mobileTour.map.routeReady')}</p>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">{t('home.product.mobileTour.map.description')}</p>
              </div>
            </div>
          </div>
        </article>

        <article className={cardClass}>
          <div className="flex h-full flex-col p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#efe9fb] text-violet-600">
                <Wallet size={19} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">{t('home.product.mobileTour.budget.eyebrow')}</p>
                <h3 className="font-heading text-lg text-text">{t('home.product.mobileTour.budget.title')}</h3>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-[#29251f] p-5 text-white shadow-xl">
              <p className="text-xs text-white/60">{t('home.product.mobileTour.budget.total')}</p>
              <p className="mt-1 font-heading text-3xl">€300</p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full w-[62%] rounded-full bg-accent" />
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-white/60">
                <span>{t('home.product.mobileTour.budget.spent', { amount: '€186' })}</span>
                <span>{t('home.product.mobileTour.budget.left', { amount: '€114' })}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {(['museum', 'food', 'transport'] as const).map((item, index) => (
                <div key={item} className="flex items-center justify-between rounded-2xl border border-divider px-3.5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-accent' : index === 1 ? 'bg-sage' : 'bg-violet-400'}`} />
                    <span className="text-xs font-medium text-text">{t(`home.product.mobileTour.budget.items.${item}`)}</span>
                  </div>
                  <span className="text-xs font-bold text-text">{['€72', '€84', '€30'][index]}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className={cardClass}>
          <div className="flex h-full flex-col p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e7f0fa] text-blue-600">
                <CloudSun size={19} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">{t('home.product.mobileTour.guide.eyebrow')}</p>
                <h3 className="font-heading text-lg text-text">{t('home.product.mobileTour.guide.title')}</h3>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {['22°', '24°', '21°'].map((temp, index) => (
                <div key={temp} className="rounded-2xl bg-surface-2 p-3 text-center">
                  <AppIcon name={index === 1 ? 'sun' : 'cloud-sun'} size={24} className="text-sage-700" />
                  <p className="mt-1 text-xs font-bold text-text">{temp}</p>
                  <p className="text-[9px] text-muted">{t(`home.product.mobileTour.guide.days.${index + 1}`)}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-2xl border border-divider p-4">
              <div className="flex items-center gap-2 text-accent-700">
                <BookOpen size={15} />
                <p className="text-xs font-bold">{t('home.product.mobileTour.guide.tipTitle')}</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{t('home.product.mobileTour.guide.tip')}</p>
            </div>

            <div className="mt-auto pt-5">
              <p className="text-center text-xs leading-relaxed text-muted">{t('home.product.mobileTour.guide.ctaText')}</p>
              <Link to="/register" className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3.5 font-heading text-sm text-white shadow-[0_10px_24px_rgba(198,113,57,0.28)]">
                {t('home.product.mobileTour.guide.cta')} <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </article>
      </div>

      <div className="flex items-center justify-center gap-2 pt-1" aria-label={t('home.product.mobileTour.pagination')}>
        {Array.from({ length: cardCount }, (_, index) => (
          <button
            key={index}
            type="button"
            aria-label={t('home.product.mobileTour.goToCard', { card: index + 1 })}
            aria-current={activeCard === index ? 'step' : undefined}
            onClick={() => scrollToCard(index)}
            className={`h-2 rounded-full transition-all ${activeCard === index ? 'w-7 bg-accent' : 'w-2 bg-divider'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default MobileProductTour;
