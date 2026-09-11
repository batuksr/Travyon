import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { ArrowRight, CalendarDays, Check, Compass, Hotel, Landmark, MapPin, Plane, Route, Send, Share2, Sparkles, Ticket, UserRound, Users, WalletCards } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './TravelWalletPocket.css';
import './HomeTravelJourney.css';

const STEPS = [
  { key: 'account', Icon: UserRound },
  { key: 'plan', Icon: Route },
  { key: 'wallet', Icon: WalletCards },
  { key: 'travel', Icon: Compass },
  { key: 'community', Icon: Users },
] as const;
const STEP_DURATION = 6500;
type StepKey = typeof STEPS[number]['key'];

function JourneyScene({ step }: { step: StepKey }) {
  const { t } = useTranslation();
  const text = (key: string) => t(`home.journeyGuide.art.${key}`);

  return (
    <div className={`journey-guide-art journey-guide-art--${step}`} aria-hidden="true">
      {step === 'account' && <>
        <div className="journey-guide-passport"><span>TRAVYON</span><Compass size={58} strokeWidth={.8} /><small>{text('journeyBegins')}</small></div>
        <div className="journey-guide-member">
          <div className="journey-guide-card-top"><span>{text('travelerCard')}</span><span>NO. 001</span></div>
          <div className="journey-guide-avatar"><UserRound size={38} strokeWidth={1.2} /><i><Check size={12} /></i></div>
          <h3>{text('welcome')}</h3><p>{text('personalSpace')}</p>
          <div className="journey-guide-member-lines"><span /><span /></div>
          <div className="journey-guide-member-bottom"><Send size={15} /><span>travyon</span><div className="journey-guide-barcode" /></div>
        </div>
        <div className="journey-guide-floating journey-guide-account-note"><Check size={16} /><span>{text('accountReady')}</span></div>
      </>}

      {step === 'plan' && <>
        <div className="journey-guide-preferences">
          <span><MapPin size={14} />{text('rome')}</span>
          <span><CalendarDays size={14} />{text('threeDays')}</span>
          <span><Landmark size={14} />{text('culture')}</span>
        </div>
        <div className="journey-guide-route-card">
          <div className="journey-guide-card-top"><span>{text('personalRoute')}</span><Sparkles size={16} /></div>
          <h3>{text('romeJourney')}</h3><p>{text('shapedForYou')}</p>
          <div className="journey-guide-plan-stops">
            {[['09:30', 'colosseum'], ['12:00', 'localFood'], ['15:00', 'cityWalk']].map(([time, key], index) => (
              <div key={key} style={{ animationDelay: `${.9 + index * .35}s` }}><time>{time}</time><i /><span>{text(key)}</span></div>
            ))}
          </div>
          <div className="journey-guide-plan-footer"><Route size={13} /><span>{text('yourPace')}</span><Check size={13} /></div>
        </div>
        <div className="journey-guide-floating journey-guide-plan-note"><Sparkles size={16} /><span>{text('planReady')}</span></div>
      </>}

      {step === 'wallet' && <>
        <div className="journey-guide-wallet wallet-scene">
          <div className="wallet-ground-shadow" /><div className="wallet-leather wallet-back" /><div className="wallet-lining" />
          {([{ key: 'flight', Icon: Plane, sample: 'flightSample' }, { key: 'stay', Icon: Hotel, sample: 'staySample' }, { key: 'ticket', Icon: Ticket, sample: 'ticketSample' }] as const).map(({ key, Icon, sample }, index) => (
            <div className={`wallet-pocket-card wallet-tone-${key} journey-guide-wallet-card`} key={key} style={{ top: `${17 + index * 14}%`, zIndex: index + 2, animationDelay: `${.35 + index * .65}s` }}>
              <span className="wallet-pocket-card-icon"><Icon size={16} /></span><span className="wallet-pocket-card-text"><span className="wallet-pocket-card-category">{text(key)}</span><span className="wallet-pocket-card-title">{text(sample)}</span></span><span className="wallet-pocket-card-rule" />
            </div>
          ))}
          <div className="wallet-leather wallet-front"><div className="wallet-stitching" /><div className="wallet-embossed-logo"><Send size={24} strokeWidth={1.2} /><span>travyon</span></div><div className="wallet-embossed-footer"><span>{text('yourWallet')}</span><span>ROMA</span></div></div>
          <div className="wallet-leather wallet-strap"><span className="wallet-snap" /></div>
        </div>
        <div className="journey-guide-floating journey-guide-wallet-note"><Check size={16} /><span>{text('together')}</span></div>
      </>}

      {step === 'travel' && <>
        <div className="journey-guide-map-card">
          <div className="journey-guide-card-top"><span><MapPin size={13} />{text('rome')}</span><span>{text('dayOne')}</span></div>
          <svg viewBox="0 0 360 240" fill="none" focusable="false">
            <rect width="360" height="240" fill="#e3e8d6" />
            <path d="M-10 44 120 69 265-20M-10 182 123 161 345 253M45 253 116 69 370 119M179-20 220 124 198 250M303-10 276 157 370 196" stroke="#cbd2bf" strokeWidth="16" />
            <path d="M-10 44 120 69 265-20M-10 182 123 161 345 253M45 253 116 69 370 119M179-20 220 124 198 250M303-10 276 157 370 196" stroke="#faf8ed" strokeWidth="11" />
            <path d="M52 205 90 137 166 157 220 124 287 57" stroke="#c67139" strokeWidth="3" pathLength="1" className="journey-guide-drawn-route" />
            {[[52, 205], [166, 157], [287, 57]].map(([x, y], index) => <g key={x}><circle cx={x} cy={y} r="10" fill="#344a3c" stroke="#fffaf0" strokeWidth="3" /><text x={x} y={y + 3} fill="#fffaf0" fontSize="9" textAnchor="middle">{index + 1}</text></g>)}
          </svg>
        </div>
        <div className="journey-guide-budget">
          <span><WalletCards size={14} />{text('budget')}</span><strong>€120 <small>/ €450</small></strong><div className="journey-guide-budget-track"><i /></div><p>{text('expensesTogether')}</p>
        </div>
        <div className="journey-guide-floating journey-guide-travel-note"><Route size={16} /><span>{text('inControl')}</span></div>
      </>}

      {step === 'community' && <>
        <div className="journey-guide-community-card">
          <div className="journey-guide-card-top"><span><Users size={15} />{text('communityTitle')}</span><Compass size={15} /></div>
          <h3>{text('sharedJourneys')}</h3>
          <div className="journey-guide-community-plans">
            <div className="journey-guide-community-plan journey-guide-community-plan--own">
              <div className="journey-guide-city-art"><Landmark size={31} strokeWidth={1} /><span>ROMA</span></div>
              <div><small>{text('yourPlan')}</small><strong>{text('romeJourney')}</strong><span className="journey-guide-shared"><Check size={11} />{text('shared')}</span></div>
            </div>
            <div className="journey-guide-community-plan journey-guide-community-plan--discover">
              <div className="journey-guide-city-art journey-guide-city-art--paris"><MapPin size={31} strokeWidth={1} /><span>PARIS</span></div>
              <div><small>{text('fromTravelers')}</small><strong>{text('parisWeekend')}</strong><span>{text('explorePlan')}<ArrowRight size={11} /></span></div>
            </div>
          </div>
        </div>
        <div className="journey-guide-floating journey-guide-share-note"><Share2 size={15} /><span>{text('shareYourRoute')}</span></div>
        <div className="journey-guide-floating journey-guide-discover-note"><Compass size={15} /><span>{text('discoverTogether')}</span></div>
      </>}
    </div>
  );
}

export default function HomeTravelJourney() {
  const { t } = useTranslation();
  const id = useId();
  const sectionRef = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const visible = useInView(sectionRef, { amount: .2 });
  const [selection, setSelection] = useState({ index: 0, cycle: 0 });
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [focused, setFocused] = useState(false);
  const { index: active, cycle } = selection;
  const playing = visible && pageVisible && !focused;
  const step = STEPS[active];
  const text = (key: string) => t(`home.journeyGuide.${key}`);

  useEffect(() => {
    const sync = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setSelection(current => ({ index: (current.index + 1) % STEPS.length, cycle: current.cycle + 1 })), STEP_DURATION);
    return () => window.clearTimeout(timer);
  }, [playing, selection]);

  const select = (index: number) => setSelection(current => ({ index, cycle: current.cycle + 1 }));

  return (
    <div ref={sectionRef} className="journey-guide" aria-labelledby={`${id}-title`}
      onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div className="journey-guide-copy">
        <p className="journey-guide-eyebrow">{text('eyebrow')}</p>
        <h2 id={`${id}-title`}>{text('title')}</h2>
        <p className="journey-guide-intro">{text('intro')}</p>
        <div className="journey-guide-tabs" role="tablist" aria-label={text('stepsLabel')} aria-orientation="vertical">
          {STEPS.map(({ key, Icon }, index) => <button key={key} ref={element => { tabs.current[index] = element; }}
            id={`${id}-tab-${index}`} type="button" role="tab" aria-selected={active === index} aria-controls={`${id}-panel-${index}`}
            tabIndex={active === index ? 0 : -1} className={`journey-guide-tab${active === index ? ' is-active' : ''}`}
            onClick={() => select(index)} onKeyDown={event => {
              let next = index;
              if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % STEPS.length;
              else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + STEPS.length - 1) % STEPS.length;
              else if (event.key === 'Home') next = 0;
              else if (event.key === 'End') next = STEPS.length - 1;
              else return;
              event.preventDefault(); select(next); tabs.current[next]?.focus();
            }}>
            <span className="journey-guide-tab-icon"><Icon size={19} strokeWidth={1.5} /></span>
            <span className="journey-guide-tab-text"><strong>{text(`${key}.title`)}</strong><small>{text(`${key}.description`)}</small></span>
            <ArrowRight size={15} className="journey-guide-tab-arrow" />
          </button>)}
        </div>
      </div>
      <div className="journey-guide-exhibit" data-playing={playing} data-on-screen={visible && pageVisible}>
        <div className="journey-guide-exhibit-top"><span>TRAVYON / {text('tour')}</span><span>{String(active + 1).padStart(2, '0')}<i> / {String(STEPS.length).padStart(2, '0')}</i></span></div>
        <div className="journey-guide-stage">
          <div className="journey-guide-orbit" aria-hidden="true" />
          <AnimatePresence initial={false} mode="wait">
            <motion.div className="journey-guide-scene" key={step.key} initial={{ opacity: 0, y: 18, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: .98 }} transition={{ duration: .4, ease: [0.22, 1, 0.36, 1] }}>
              <JourneyScene step={step.key} />
            </motion.div>
          </AnimatePresence>
        </div>
        {STEPS.map(({ key }, index) => <div key={key} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={active !== index} className="journey-guide-panel" tabIndex={0}>
          <span className="journey-guide-panel-label">{text(`${key}.resultLabel`)}</span><p>{text(`${key}.result`)}</p>
        </div>)}
        <div className="journey-guide-exhibit-bottom"><span>{text('sample')}</span><div className="journey-guide-progress" aria-hidden="true">{STEPS.map(({ key }, index) => <span key={`${key}-${cycle}-${playing}`} className={active === index ? 'is-active' : index < active ? 'is-complete' : ''}><i style={{ animationDuration: `${STEP_DURATION}ms` }} /></span>)}</div></div>
      </div>
    </div>
  );
}
