import AppIcon from './AppIcon';
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bed, CalendarDays, Heart, MapPin, Plane, Utensils, Wallet, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CITY_GUIDES } from '../data/cityGuides';
import type { OnboardingData } from '../store/useOnboardingStore';
import './OnboardingPostcard.css';

const TRAVEL_TYPES: Record<string, string> = {
  solo_macera: 'solo', romantik: 'romantic', balayi: 'honeymoon', aile: 'family',
  arkadas_grubu: 'friends', is_seyahati: 'business', sehir_kacamagi: 'cityEscape', klasik_tatil: 'classic',
};
const PACES: Record<string, string> = { rahat: 'relaxed', normal: 'normal', aktif: 'active', esnek: 'flexible' };
const FOOD_STYLES: Record<string, string> = {
  iconic: 'iconic', hidden_gems: 'hiddenGems', fine_dining: 'fineDining', street_food: 'streetFood', mixed: 'mixed',
};
const normalizeCity = (value: string) => value.trim().toLocaleLowerCase('tr')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');

// Reuse the guide photos; other destinations keep the illustrated postcard.
function destinationPhoto(city: string) {
  const normalized = normalizeCity(city);
  const alias = normalized === 'barselona' ? 'barcelona' : normalized;
  return CITY_GUIDES.find((guide) =>
    [guide.city.tr, guide.city.en, guide.slug].some((name) => normalizeCity(name) === alias),
  )?.image.replace('w=1800', 'w=1000');
}

function dateRange(start: string, end: string, locale: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return '';
  const from = new Date(`${start}T12:00:00`);
  const to = new Date(`${end}T12:00:00`);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to <= from) return '';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).formatRange(from, to);
}

function JourneyIllustration() {
  return (
    <svg className="postcard-illustration" viewBox="0 0 480 340" fill="none" aria-hidden="true">
      <circle cx="330" cy="103" r="46" fill="#ebd8b4" fillOpacity=".15" />
      <circle cx="330" cy="103" r="34" stroke="#ebd8b4" strokeOpacity=".55" />
      <path d="M-40 247C50 153 94 263 172 181S303 203 387 129 498 131 525 111" stroke="#f4ead7" strokeOpacity=".15" />
      <path d="M-40 268C50 174 94 284 172 202S303 224 387 150 498 152 525 132" stroke="#f4ead7" strokeOpacity=".12" />
      <path d="M-40 289C50 195 94 305 172 223S303 245 387 171 498 173 525 153" stroke="#f4ead7" strokeOpacity=".1" />
      <path d="M35 196 119 92 184 174 227 122 311 230" stroke="#e5d5b6" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m98 118 21-26 25 31-24-7-10 8Z" fill="#e5d5b6" fillOpacity=".2" />
      <path d="M82 197C153 265 262 96 362 152" stroke="#efbd88" strokeWidth="1.5" strokeDasharray="4 7" strokeLinecap="round" />
      <circle cx="82" cy="197" r="5" fill="#efbd88" />
      <circle cx="82" cy="197" r="11" stroke="#efbd88" strokeOpacity=".4" />
      <g transform="translate(350 138) rotate(20 12 12)">
        <Plane width="26" height="26" stroke="#f4ead7" strokeWidth="1.4" />
      </g>
      <path d="M59 70v20m-10-10h20M397 211v14m-7-7h14" stroke="#e5d5b6" strokeOpacity=".5" />
    </svg>
  );
}

function PostcardPhoto({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={src} alt={alt} decoding="async"
      className={`postcard-photo${loaded ? ' is-loaded' : ''}`}
      onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
    />
  );
}

interface OnboardingPostcardProps {
  data: OnboardingData;
  currentStep: number;
  isGenerating: boolean;
}

export default function OnboardingPostcard({ data, currentStep, isGenerating }: OnboardingPostcardProps) {
  const { t, i18n } = useTranslation();
  const reduceMotion = useReducedMotion();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'tr-TR';
  const [city, ...countryParts] = data.destination.trim().split(',');
  const country = countryParts.join(',').trim();
  const photo = city ? destinationPhoto(city) : undefined;
  const dates = dateRange(data.startDate, data.endDate, locale);
  const purposes = data.purposes.length ? data.purposes : data.tripPurpose ? [data.tripPurpose] : [];
  const hasStyle = Boolean(data.travelType || purposes.length);
  const translatedOption = (key: string) => i18n.exists(key) ? t(key) : '';
  const join = (parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' · ');

  const styleNote = join([
    data.travelType && translatedOption(`onboarding.step2.travelTypes.${TRAVEL_TYPES[data.travelType]}`),
    hasStyle && translatedOption(`onboarding.postcard.paces.${PACES[data.pace]}`),
    ...purposes.map((purpose) => translatedOption(`onboarding.step2.interestOptions.${purpose}.title`)),
  ]);
  const foodNote = join([
    data.foodPhilosophy && translatedOption(`onboarding.step3.foodPhilosophyOptions.${FOOD_STYLES[data.foodPhilosophy]}.title`),
    ...data.dietaryRestrictions.map((diet) => translatedOption(`onboarding.step3.diets.${diet}.label`)),
  ]);
  const stayNote = join([
    data.hasReservation === true
      ? data.accommodationAddress.split(',')[0].trim()
      : data.hasReservation === false && data.accommodation
        ? translatedOption(`onboarding.step4.accommodationOptions.${data.accommodation}.title`)
        : '',
    data.transport && translatedOption(`onboarding.step4.transportOptions.${data.transport}.title`),
  ]);
  const notes = [
    { step: 2, Icon: Heart, value: styleNote, placeholder: t('onboarding.postcard.stylePlaceholder') },
    { step: 3, Icon: Utensils, value: foodNote, placeholder: t('onboarding.postcard.foodPlaceholder') },
    { step: 4, Icon: Bed, value: stayNote, placeholder: t('onboarding.postcard.stayPlaceholder') },
  ];
  const routeProgress = isGenerating ? 1 : (currentStep - 1) / 3;
  const transition = { duration: reduceMotion ? 0 : 0.28 };

  return (
    <aside className="onboarding-postcard-panel" aria-label={t('onboarding.postcard.label')}>
      <div className="postcard-panel-inner">
        <div className="postcard-eyebrow">
          <Plane size={15} aria-hidden="true" />
          <span>{t('onboarding.postcard.label')}</span>
        </div>

        <motion.article
          className="travel-postcard"
          initial={reduceMotion ? false : { opacity: 0, y: 18, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.65, ease: 'easeOut' }}
        >
          <div className="postcard-scene">
            <JourneyIllustration />
            <AnimatePresence initial={false}>
              {photo && (
                <motion.div key={photo} className="postcard-photo-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
                  <PostcardPhoto src={photo} alt={t('onboarding.postcard.photoAlt', { city })} />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="postcard-scene-shade" />
            <div className="postcard-stamp" aria-hidden="true">
              <Plane size={22} strokeWidth={1.4} />
              <span>TRAVYON</span>
            </div>
            <div className="postcard-caption">
              <p>{city ? t('onboarding.postcard.nextStop') : t('onboarding.postcard.newStory')}</p>
              <h2 className={`font-heading${city ? '' : ' postcard-empty-title'}`}>{city || t('onboarding.postcard.emptyTitle')}</h2>
              {country && <span className="postcard-country"><MapPin size={12} aria-hidden="true" />{country}</span>}
            </div>
          </div>

          <div className="postcard-details">
            <div className="postcard-detail-heading">
              <span>{t('onboarding.postcard.notesTitle')}</span>
              <span className="postcard-personal-mark" aria-hidden="true"><AppIcon name="sparkles" /></span>
            </div>
            <dl className="postcard-trip-facts">
              <div className={`postcard-date${dates ? '' : ' is-pending'}`}>
                <dt><CalendarDays size={15} aria-hidden="true" /><span className="sr-only">{t('onboarding.step1.travelDates')}</span></dt>
                <dd>{dates || t('onboarding.postcard.datesPlaceholder')}</dd>
              </div>
              <div className={city ? '' : 'is-pending'}>
                <dt><Wallet size={15} aria-hidden="true" /><span className="sr-only">{t('onboarding.step1.totalBudget')}</span></dt>
                <dd>{city && Number.isFinite(data.budget) && data.budget > 0
                  ? `${data.currencySymbol}${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(data.budget)}`
                  : t('onboarding.postcard.budgetPlaceholder')}</dd>
              </div>
              <div className={city ? '' : 'is-pending'}>
                <dt><Users size={15} aria-hidden="true" /><span className="sr-only">{t('onboarding.step1.peopleCount')}</span></dt>
                <dd>{t('onboarding.postcard.travelers', { count: data.peopleCount })}</dd>
              </div>
            </dl>

            <ul className="postcard-notes">
              {notes.map(({ step, Icon, value, placeholder }) => (
                <li key={step} className={`${value ? 'is-filled' : 'is-pending'}${currentStep === step ? ' is-current' : ''}`}>
                  <Icon size={15} aria-hidden="true" />
                  <AnimatePresence initial={false} mode="wait">
                    <motion.p key={value || 'pending'} initial={{ opacity: 0, y: reduceMotion ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={transition}>
                      {value || placeholder}
                    </motion.p>
                  </AnimatePresence>
                </li>
              ))}
            </ul>
            <div className="postcard-signature"><span className="font-heading">travyon</span><span>{t('onboarding.postcard.madeForYou')}</span></div>
          </div>
        </motion.article>

        <div className="postcard-footnote">
          <svg className="postcard-route" viewBox="0 0 300 34" fill="none" aria-hidden="true">
            <path d="M10 17H290" stroke="currentColor" strokeOpacity=".2" strokeDasharray="3 6" />
            <motion.path d="M10 17H290" stroke="currentColor" strokeWidth="1.5" initial={false} animate={{ pathLength: routeProgress }} transition={{ duration: reduceMotion ? 0 : 0.65 }} />
            {[10, 103, 197, 290].map((cx, index) => (
              <circle key={cx} cx={cx} cy="17" r={index + 1 === currentStep ? 5 : 3.5} fill={index < currentStep ? 'currentColor' : 'var(--postcard-panel-bg)'} stroke="currentColor" />
            ))}
          </svg>
          <AnimatePresence initial={false} mode="wait">
            <motion.p key={isGenerating ? 'generating' : currentStep} initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={transition}>
              {t(`onboarding.postcard.${isGenerating ? 'generating' : `hints.step${currentStep}`}`)}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
