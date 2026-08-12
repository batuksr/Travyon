import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import TopBar, { type PanelKind } from './TopBar';
import DayTabs from './DayTabs';
import DaySummary from './DaySummary';
import ActivityList from './ActivityList';
import AddActivityPanel from './AddActivityPanel';
import VibeBar from './VibeBar';
import GuidePanel from './GuidePanel';
import WeatherPanel from './WeatherPanel';
import type { RuntimeActivity } from './types';
import { DEMO_DAYS, DEMO_STAY, type DemoActivity } from '../../data/tripPlannerDemo';

// Leaflet + tile katmanı ağır olduğu için sadece bu bileşen görünüme geldiğinde yükleniyor.
const RealMap = lazy(() => import('./RealMap'));

const MapLoadingFallback: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center bg-[#e9dfc9]">
    <div className="w-8 h-8 rounded-full border-[3px] border-accent-200 border-t-accent animate-spin" />
  </div>
);

const toRuntime = (item: DemoActivity): RuntimeActivity => ({
  uid: item.id,
  sourceItemId: item.id,
  group: item.group,
  cost: item.cost,
  times: item.times,
  lat: item.lat,
  lng: item.lng,
});

const fmtDayDate = (dateStr: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(dateStr + 'T00:00:00'));

/* Landing sayfasına gömülü, üye olmadan denenebilen etkileşimli gezi planlayıcı demosu.
   `Roma Gezi Planlayıcı.dc.html` tasarım referansının React/TS + projenin kendi tasarım
   token'larıyla yeniden kurulmuş hali — bkz. 1.md. Veri sabit örnek (src/data/tripPlannerDemo.ts),
   gerçek kullanıcı planlarıyla aynı etkileşim setini (gün geçişi, aktivite ekle/sil/kopyala/
   sırala, Rehber/Hava panelleri, vibe çipleri, tema) sunar. */
const TripPlannerDemo: React.FC = () => {
  const { t } = useTranslation();

  const [daysState, setDaysState] = useState<RuntimeActivity[][]>(() => DEMO_DAYS.map((d) => d.items.map(toRuntime)));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(DEMO_DAYS.flatMap((d) => d.items.map((it) => it.id)))
  );
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelKind>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [vibes, setVibes] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const savedTimeoutRef = useRef<number | undefined>(undefined);

  /* Sol panel / harita arası sürüklenebilir ayraç — Dashboard.tsx'teki resize deseniyle aynı */
  const [leftWidthPct, setLeftWidthPct] = useState(45);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(45);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartWidth.current = leftWidthPct;

    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current) return;
      const totalW = containerRef.current.offsetWidth;
      const delta = ev.clientX - dragStartX.current;
      const newPct = Math.min(72, Math.max(28, dragStartWidth.current + (delta / totalW) * 100));
      setLeftWidthPct(newPct);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [leftWidthPct]);

  useEffect(() => () => { if (savedTimeoutRef.current) window.clearTimeout(savedTimeoutRef.current); }, []);

  const mutateActiveDay = (fn: (items: RuntimeActivity[]) => RuntimeActivity[]) => {
    setDaysState((prev) => prev.map((items, i) => (i === activeDayIdx ? fn(items) : items)));
  };

  const selectDay = (i: number) => {
    setActiveDayIdx(i);
    setPanel(null);
    setAddOpen(false);
    setActiveMapId(null);
  };

  const handleMove = (uid: string, dir: -1 | 1) => {
    mutateActiveDay((items) => {
      const i = items.findIndex((it) => it.uid === uid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= items.length) return items;
      const copy = items.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  };

  const handleDelete = (uid: string) => {
    mutateActiveDay((items) => items.filter((it) => it.uid !== uid));
    setExpandedIds((prev) => { const next = new Set(prev); next.delete(uid); return next; });
    setActiveMapId((cur) => (cur === uid ? null : cur));
  };

  const handleToggleOpen = (uid: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const handleSave = () => {
    setSaved(true);
    if (savedTimeoutRef.current) window.clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = window.setTimeout(() => setSaved(false), 1800);
  };

  const toggleVibe = (key: string) => setVibes((prev) => ({ ...prev, [key]: !prev[key] }));

  const activeItems = daysState[activeDayIdx];
  const total = daysState.flat().reduce((s, it) => s + it.cost, 0);
  const dayEstimate = activeItems.reduce((s, it) => s + it.cost, 0);
  const { i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-US' : 'tr-TR';

  const pins = activeItems.map((it) => ({
    id: it.uid,
    lat: it.lat,
    lng: it.lng,
    label: it.sourceItemId ? t(`home.product.demo.items.${it.sourceItemId}.title`) : (it.customTitle ?? ''),
  }));

  return (
    <div className="flex flex-col h-[640px] sm:h-[680px] bg-surface">
      <TopBar
        dayCount={DEMO_DAYS.length}
        total={total}
        panel={panel}
        onTabChange={setPanel}
        saved={saved}
        onSave={handleSave}
        onReset={() => selectDay(0)}
      />

      <div ref={containerRef} className="flex-1 min-h-0 relative flex flex-col md:flex-row">
        {/* SOL SÜTUN */}
        <div
          className="relative flex flex-col min-h-0 w-full h-[340px] md:h-auto border-b md:border-b-0 md:border-r border-divider bg-surface"
          style={typeof window !== 'undefined' && window.innerWidth >= 768 ? { width: `${leftWidthPct}%`, minWidth: 320 } : undefined}
        >
          <DayTabs
            labels={DEMO_DAYS.map((d) => d.tab)}
            counts={daysState.map((items) => items.length)}
            activeIdx={activeDayIdx}
            onSelect={selectDay}
          />
          <DaySummary
            dateLabel={fmtDayDate(DEMO_DAYS[activeDayIdx].date, locale)}
            summary={t(`home.product.demo.summaries.day${activeDayIdx + 1}`)}
            estimate={dayEstimate}
          />
          <ActivityList
            items={activeItems}
            expandedIds={expandedIds}
            onToggleOpen={handleToggleOpen}
            onMove={handleMove}
            onDelete={handleDelete}
            onOpenAdd={() => setAddOpen(true)}
          />

          {addOpen && <AddActivityPanel onClose={() => setAddOpen(false)} />}

          <VibeBar active={vibes} onToggle={toggleVibe} />
        </div>

        {/* SÜRÜKLENEBİLİR AYRAÇ */}
        <div
          className="hidden md:flex w-[5px] relative cursor-col-resize shrink-0 bg-divider hover:bg-accent/40 transition-colors"
          onMouseDown={handleResizeMouseDown}
        />

        {/* HARİTA — isolate: Leaflet'in kendi iç katmanları (z-index ~1000'e kadar) bu
            kapsayıcının dışına taşıp Rehber/Hava panellerinin üstüne çıkmasın diye */}
        <div className="flex-1 relative min-h-[220px] isolate">
          <Suspense fallback={<MapLoadingFallback />}>
            <RealMap
              pins={pins}
              stay={DEMO_STAY}
              activeId={activeMapId}
              onSelect={(id) => setActiveMapId((cur) => (cur === id ? null : id))}
            />
          </Suspense>
        </div>

        <AnimatePresence>
          {panel === 'guide' && <GuidePanel key="guide" onClose={() => setPanel(null)} />}
          {panel === 'weather' && <WeatherPanel key="weather" onClose={() => setPanel(null)} />}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TripPlannerDemo;
