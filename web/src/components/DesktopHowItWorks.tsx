import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Plane, Route, SlidersHorizontal, Sparkles, UserRoundPlus } from 'lucide-react';
import './DesktopHowItWorks.css';

const GlobeAnimation = lazy(() => import('./GlobeAnimation'));
const STEP_ICONS = [UserRoundPlus, SlidersHorizontal, Sparkles, Route];
const STEP_DURATION_MS = 2000;

const renderHeading = (text: string) => [...text].map((character, index) => (
  character === 'ş' || character === 'Ş'
    ? <span key={index} className="journey-sh-letter">{character}</span>
    : character
));

export default function DesktopHowItWorks() {
  const { t } = useTranslation();
  const id = useId();
  const sectionRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const nearViewport = useInView(sectionRef, { margin: '400px', once: true });
  const visible = useInView(sectionRef, { amount: 0.45 });
  const reducedMotion = useReducedMotion();
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [activeStep, setActiveStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [orbitAngle, setOrbitAngle] = useState(25);
  const steps = t('home.howItWorks.steps', { returnObjects: true }) as { label: string; title: string; desc: string }[];
  const playing = desktop && visible && pageVisible;

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const syncDesktop = () => setDesktop(media.matches);
    const syncVisibility = () => setPageVisible(!document.hidden);
    media.addEventListener('change', syncDesktop);
    document.addEventListener('visibilitychange', syncVisibility);
    return () => {
      media.removeEventListener('change', syncDesktop);
      document.removeEventListener('visibilitychange', syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setDirection(1);
      setOrbitAngle(angle => angle + 90);
      setActiveStep(step => (step + 1) % STEP_ICONS.length);
    }, STEP_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [playing, activeStep]);

  const selectStep = (index: number, delta = index - activeStep) => {
    const next = (index + STEP_ICONS.length) % STEP_ICONS.length;
    if (next === activeStep) return;
    setDirection(delta > 0 ? 1 : -1);
    setOrbitAngle(angle => angle + delta * 90);
    setActiveStep(next);
  };

  return (
    <div ref={sectionRef} className="desktop-journey">
      <motion.div
        className="relative -top-4 mx-auto max-w-lg text-center"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <span className="font-heading text-xs uppercase tracking-widest text-accent-700">
          {t('home.howItWorks.eyebrow')}
        </span>
        <h2 className="mt-2 font-heading text-3xl text-text" aria-label={t('home.howItWorks.title')}>
          {renderHeading(t('home.howItWorks.title'))}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          {t('home.howItWorks.subtitle')}
        </p>
      </motion.div>

      <motion.div
        className="journey-experience"
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 0.65, delay: 0.12, ease: 'easeOut' }}
      >
        <div className="journey-stage">
          <div className="journey-world" aria-hidden="true">
            <div className="journey-world-glow" />
            <div className="journey-orbit journey-orbit-outer" />
            <div className="journey-orbit journey-orbit-inner" />
            <div className="journey-earth">
              {desktop && nearViewport && (
                <Suspense fallback={<div className="journey-earth-placeholder" />}>
                  <GlobeAnimation animate={visible && pageVisible && !reducedMotion} />
                </Suspense>
              )}
            </div>
            {STEP_ICONS.map((_, index) => (
              <div key={index} className="journey-orbit-stop" style={{ transform: `rotate(${25 + index * 90}deg)` }}>
                <span data-active={activeStep === index} />
              </div>
            ))}
            <motion.div
              className="journey-traveler"
              initial={false}
              animate={{ rotate: orbitAngle }}
              transition={{ duration: reducedMotion ? 0 : 0.85, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="journey-plane"><Plane size={20} strokeWidth={1.8} /></span>
            </motion.div>
            <div className="journey-world-shadow" />
          </div>

          <div className="journey-story">
            <div
              className="journey-story-panel"
              id={`${id}-panel`}
              role="tabpanel"
              aria-labelledby={`${id}-step-${activeStep}`}
              tabIndex={0}
            >
              <AnimatePresence initial={false} mode="wait" custom={direction}>
                <motion.div
                  key={activeStep}
                  custom={direction}
                  variants={{
                    enter: (move: number) => ({ opacity: 0, x: reducedMotion ? 0 : move * 32 }),
                    center: { opacity: 1, x: 0 },
                    exit: (move: number) => ({ opacity: 0, x: reducedMotion ? 0 : move * -24 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: reducedMotion ? 0 : 0.24, ease: 'easeOut' }}
                >
                  <h3 className="journey-story-title" aria-label={steps[activeStep].title}>
                    {renderHeading(steps[activeStep].title)}
                  </h3>
                  <p className="journey-story-description">{steps[activeStep].desc}</p>
                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        </div>

        <div
          className="journey-stops"
          role="tablist"
          aria-label={t('home.howItWorks.stepsAriaLabel')}
          data-playing={playing}
        >
          {steps.map((step, index) => (
            <button
              key={index}
              ref={element => { tabRefs.current[index] = element; }}
              id={`${id}-step-${index}`}
              type="button"
              role="tab"
              aria-selected={activeStep === index}
              aria-controls={`${id}-panel`}
              tabIndex={activeStep === index ? 0 : -1}
              className="journey-stop"
              onClick={() => selectStep(index)}
              onKeyDown={event => {
                let next = index;
                if (event.key === 'ArrowRight') next = (index + 1) % steps.length;
                else if (event.key === 'ArrowLeft') next = (index + steps.length - 1) % steps.length;
                else if (event.key === 'Home') next = 0;
                else if (event.key === 'End') next = steps.length - 1;
                else return;
                event.preventDefault();
                selectStep(next);
                tabRefs.current[next]?.focus();
              }}
            >
              <span className="journey-stop-track" aria-hidden="true">
                <span className="journey-stop-progress" style={{ animationDuration: `${STEP_DURATION_MS}ms` }} />
              </span>
              <span className="journey-stop-number" aria-hidden="true">0{index + 1}</span>
              <span>{step.label}</span>
              <ArrowRight className="journey-stop-arrow" size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
