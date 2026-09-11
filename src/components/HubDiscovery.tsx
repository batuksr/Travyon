import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass, MapPin, Route, Users } from 'lucide-react';
import { CITY_GUIDE_VISUALS } from '../data/cityGuideVisuals';
import { useAuthStore } from '../store/useAuthStore';
import { getPublicFeed, type PublicPlan } from '../services/socialService';
import type { OnboardingData } from '../store/useOnboardingStore';

interface Props {
  onStart: (data: Partial<OnboardingData>) => void;
  onCommunity: () => void;
}

const IDEAS = [
  { key: 'roma', purpose: 'culture', pace: 'normal' },
  { key: 'istanbul', purpose: 'culture', pace: 'esnek' },
  { key: 'barcelona', purpose: 'relax', pace: 'rahat' },
] as const;

function CommunityPreview({ userId, onCommunity }: { userId: string; onCommunity: () => void }) {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<PublicPlan[]>([]);

  useEffect(() => {
    let active = true;
    // An unavailable feed must not hold up the first-plan experience.
    const timeout = setTimeout(() => { active = false; }, 8000);
    getPublicFeed(3).then(feed => {
      if (active) setPlans(feed.filter(plan => plan.feedVisible !== false).slice(0, 3));
    }).catch(() => {
      // Keep the community shortcut available; never substitute invented plans.
    }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); };
  }, [userId]);

  if (!plans.length) return null;

  return (
    <section aria-labelledby="hub-community-title" className="mt-9 border-t border-divider pt-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="hub-community-title" className="font-heading text-xl text-text">{t('hub.discovery.community.title')}</h3>
          <p className="mt-2 text-sm text-muted">{t('hub.discovery.community.subtitle')}</p>
        </div>
        <button type="button" onClick={onCommunity} className="inline-flex items-center gap-2 rounded-lg py-2 text-xs font-semibold text-accent hover:text-accent-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          {t('hub.discovery.community.all')}<ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
      <div className={`grid grid-cols-1 gap-4 ${plans.length === 1 ? '' : plans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        {plans.map(plan => {
          // A public itinerary does not imply permission to expose its author's identity.
          const name = plan.profilePublic && plan.userDisplayName.trim()
            ? plan.userDisplayName : t('community.defaultDisplayName');
          return (
            <Link key={plan.id} to={`/plan/${encodeURIComponent(plan.id)}`} className="group flex min-w-0 flex-col rounded-2xl border border-divider bg-surface p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
              <span className="mb-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted"><Users size={13} aria-hidden="true" />{t('hub.discovery.community.shared')}</span>
              <h4 className="break-words font-heading text-lg text-text">{plan.destination}</h4>
              <p className="mt-2 flex items-center gap-2 text-xs text-muted"><Route size={14} aria-hidden="true" />{t('community.card.days', { count: plan.dailyPlanCount })}</p>
              <div className="mt-5 flex items-center gap-2 border-t border-divider pt-4">
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage/15 text-xs font-semibold text-text">{name.trim().slice(0, 1).toLocaleUpperCase()}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">{name}</span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent">{t('hub.discovery.community.open')}<ArrowRight size={13} aria-hidden="true" className="transition-transform group-hover:translate-x-1" /></span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function HubDiscovery({ onStart, onCommunity }: Props) {
  const { t } = useTranslation();
  const userId = useAuthStore(state => state.user?.uid);

  return (
    <>
      <section aria-labelledby="hub-ideas-title" className="mt-9 border-t border-divider pt-7">
        <div className="mb-5">
          <h3 id="hub-ideas-title" className="font-heading text-xl text-text">{t('hub.discovery.title')}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t('hub.discovery.subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {IDEAS.map((idea, index) => (
            <button key={idea.key} type="button" onClick={() => onStart({
              destination: t(`hub.discovery.ideas.${idea.key}.destination`),
              purposes: [idea.purpose], tripPurpose: idea.purpose, pace: idea.pace,
            })} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-divider bg-surface text-left transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
              <div className="relative isolate h-44 w-full overflow-hidden bg-[#314b3f]">
                <Compass size={130} aria-hidden="true" className="absolute -right-4 top-3 text-white/10" />
                <img src={CITY_GUIDE_VISUALS[idea.key].highlights[0]} alt="" loading="lazy" decoding="async" onError={event => { event.currentTarget.style.display = 'none'; }} className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105" />
                <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-black/15" />
                <span className="absolute left-4 top-4 rounded-full border border-white/30 bg-black/25 px-3 py-1 text-[10px] font-semibold tracking-wider text-white backdrop-blur-sm">{t('hub.discovery.ideaLabel')} · 0{index + 1}</span>
                <span className="absolute bottom-4 left-4 right-4 flex items-center gap-2 font-heading text-xl text-white"><MapPin size={17} aria-hidden="true" />{t(`hub.discovery.ideas.${idea.key}.city`)}</span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h4 className="font-heading text-base text-text">{t(`hub.discovery.ideas.${idea.key}.title`)}</h4>
                <p className="mb-4 mt-2 text-xs leading-relaxed text-muted">{t(`hub.discovery.ideas.${idea.key}.description`)}</p>
                <span className="mb-4 self-start rounded-full bg-surface-2 px-3 py-1 text-[11px] text-muted">{t(`hub.discovery.ideas.${idea.key}.pace`)}</span>
                <span className="mt-auto flex items-center justify-between gap-3 border-t border-divider pt-4 text-xs font-semibold text-accent">{t('hub.discovery.cta')}<ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-1" /></span>
              </div>
            </button>
          ))}
        </div>
      </section>
      {userId && <CommunityPreview key={userId} userId={userId} onCommunity={onCommunity} />}
    </>
  );
}
