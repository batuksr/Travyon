import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { Loader2, Edit2, Check, Trash2, ChevronUp, ChevronDown, Plus, Sparkles, X, StickyNote } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { DailyPlan, DailyActivity } from '../services/aiService';
import { regenerateDayWithVibe, suggestSingleActivity } from '../services/aiService';
import { usePlanStore } from '../store/usePlanStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { haversineDistance } from '../utils/geoOptimization';
export type VibeType = 'rest' | 'indoor' | 'budget' | 'explore' | null;
import { useAppSettingsStore } from '../store/useAppSettingsStore';

const LIBRARIES: ('places')[] = ['places'];

interface TravelSegment {
  walking:  number | null;
  cycling:  number | null;
  driving:  number | null;
  transit:  number | null;
  loading:  boolean;
}

type TravelMode = keyof Omit<TravelSegment, 'loading'>;

interface Props {
  day: DailyPlan;
  onActivityClick?: (place: { placeName: string; lat: number; lng: number }) => void;
}

const TRAVEL_MODES: TravelMode[] = ['driving', 'transit', 'walking', 'cycling'];
const TRAVEL_ICONS: Record<TravelMode, string> = { driving: '🚗', transit: '🚌', walking: '🚶', cycling: '🚲' };
const GMAPS_MODE: Record<TravelMode, string> = { driving: 'driving', transit: 'transit', walking: 'walking', cycling: 'bicycling' };

/* Period değerleri backend/AI tarafından üretilen sabit Türkçe etiketlerdir (bkz. aiService.ts);
   sadece görüntülenen metin i18n anahtarına çevrilir, saklanan/karşılaştırılan değer değişmez. */
const PERIODS = ['Sabah', 'Öğle', 'Öğleden Sonra', 'Akşam', 'Gece'] as const;
type Period = typeof PERIODS[number];
const PERIOD_I18N_KEYS: Record<Period, string> = {
  'Sabah': 'morning',
  'Öğle': 'noon',
  'Öğleden Sonra': 'afternoon',
  'Akşam': 'evening',
  'Gece': 'night',
};
const periodLabelKey = (period: string): string => PERIOD_I18N_KEYS[period as Period] ?? period;

/* Period sırasına göre doğru ekleme indexi */
const getInsertIndex = (activities: DailyActivity[], newPeriod: string): number => {
  const order = ['Sabah', 'Öğle', 'Öğleden Sonra', 'Akşam', 'Gece'];
  const newIdx = order.indexOf(newPeriod);
  for (let i = 0; i < activities.length; i++) {
    if (order.indexOf(activities[i].period) > newIdx) return i;
  }
  return activities.length;
};

/* Günün aktivite koordinatlarından merkez hesapla */
const calcCentroid = (activities: DailyActivity[]): { lat: number; lng: number } | undefined => {
  const valid = activities.filter(a => Math.abs(a.coordinates.lat) > 0.001);
  if (valid.length === 0) return undefined;
  return {
    lat: valid.reduce((s, a) => s + a.coordinates.lat, 0) / valid.length,
    lng: valid.reduce((s, a) => s + a.coordinates.lng, 0) / valid.length,
  };
};

const fmtMin = (mins: number, t: TFunction) => {
  if (mins < 60) return t('dashboard.dailyPlanView.minutesShort', { mins });
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0
    ? t('dashboard.dailyPlanView.hoursMinutesShort', { h, m })
    : t('dashboard.dailyPlanView.hoursShort', { h });
};

/* ── TravelStrip ── */
interface TravelStripProps {
  origin:      { lat: number; lng: number };
  destination: { lat: number; lng: number };
  seg:         TravelSegment | undefined;
  distText:    string | null;
}
const TravelStrip: React.FC<TravelStripProps> = ({ origin, destination, seg, distText }) => {
  const { t } = useTranslation();
  const [pending, setPending] = useState<TravelMode | null>(null);
  const confirmOpen = () => {
    if (!pending) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=${GMAPS_MODE[pending]}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setPending(null);
  };
  if (!seg || seg.loading) return (
    <div className="flex items-center gap-2 mt-1.5">
      {distText && <span className="text-[10px] text-muted">↕ {distText}</span>}
      <span className="text-[10px] text-muted animate-pulse">⏱ {t('dashboard.dailyPlanView.calculating')}</span>
    </div>
  );
  const available = TRAVEL_MODES.filter(m => seg[m] != null);
  if (available.length === 0) return distText ? <p className="text-[10px] text-muted mt-1">↕ {distText}</p> : null;
  const fastest = available.reduce<TravelMode>((best, m) => (seg[m] as number) < (seg[best] as number) ? m : best, available[0]);
  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        {distText && (<><span className="text-[10px] text-muted">↕ {distText}</span><span className="text-muted text-[10px]">·</span></>)}
        {TRAVEL_MODES.map(mode => {
          const mins = seg[mode];
          if (mins == null) return null;
          const isFastest = mode === fastest;
          const isSelected = pending === mode;
          return (
            <button key={mode} onClick={() => setPending(isSelected ? null : mode)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all hover:scale-105 active:scale-95 select-none ${
                isSelected ? 'bg-accent text-white border-accent'
                  : isFastest ? 'bg-accent-100 text-accent-700 border-accent/25 hover:bg-accent-200'
                  : 'bg-surface-2 text-muted border-divider hover:bg-surface-2/70'}`}>
              <span className="text-[11px] leading-none">{TRAVEL_ICONS[mode]}</span>
              {fmtMin(mins, t)}
            </button>
          );
        })}
      </div>
      {pending && (
        <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-divider rounded-2xl shadow-sm">
          <span className="text-base leading-none">{TRAVEL_ICONS[pending]}</span>
          <p className="flex-1 text-[11px] text-muted leading-tight">
            <Trans
              i18nKey="dashboard.dailyPlanView.openInGoogleMaps"
              values={{ mode: t(`dashboard.dailyPlanView.travelModes.${pending}`) }}
              components={{ b: <span className="font-semibold text-text" /> }}
            />
          </p>
          <button onClick={() => setPending(null)} className="text-[10px] font-semibold text-muted hover:text-text transition-colors px-1">{t('dashboard.dailyPlanView.cancel')}</button>
          <button onClick={confirmOpen} className="text-[10px] font-semibold text-white bg-accent hover:brightness-105 px-2.5 py-1 rounded-lg transition-colors">{t('dashboard.dailyPlanView.open')}</button>
        </div>
      )}
    </div>
  );
};

/* ── Period color ── */
const getPeriodColor = (period: string) => {
  if (period === 'Sabah')         return { border: 'border-amber-300',  bg: 'bg-amber-50',  text: 'text-amber-600' };
  if (period === 'Öğle')          return { border: 'border-accent-600', bg: 'bg-accent-100', text: 'text-accent-700' };
  if (period === 'Öğleden Sonra') return { border: 'border-blue-300',   bg: 'bg-blue-50',   text: 'text-blue-600' };
  if (period === 'Akşam')         return { border: 'border-sage',       bg: 'bg-sage-200',  text: 'text-sage-700' };
  if (period === 'Gece')          return { border: 'border-divider',   bg: 'bg-surface-2', text: 'text-muted' };
  return { border: 'border-divider', bg: 'bg-surface-2', text: 'text-muted' };
};

/* Vibe anahtarları (rest/indoor/budget/explore) nötr, dile bağımlı değil — sadece etiket i18n'den okunur */
const VIBE_KEYS: Array<'rest' | 'indoor' | 'budget' | 'explore'> = ['rest', 'indoor', 'budget', 'explore'];
const VIBE_EMOJIS: Record<'rest' | 'indoor' | 'budget' | 'explore', string> = {
  rest:    '😴',
  indoor:  '🌧️',
  budget:  '💰',
  explore: '🎉',
};

/* ════════════════════════════════════════
   AddActivityPanel
════════════════════════════════════════ */
interface AddPanelProps {
  day: DailyPlan;
  destination: string;
  currencyCode: string;
  currencySymbol: string;
  onClose: () => void;
  onAdd: (activity: DailyActivity, period: string) => void;
}

const AddActivityPanel: React.FC<AddPanelProps> = ({
  day, destination, currencyCode, currencySymbol, onClose, onAdd,
}) => {
  const { t, i18n } = useTranslation();
  const [period, setPeriod]       = useState<Period>('Sabah');
  const [query, setQuery]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [preview, setPreview]     = useState<DailyActivity | null>(null);
  const [error, setError]         = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const existingPlaces = day.activities.map(a => a.placeName);

  const handleSuggest = async () => {
    if (!query.trim()) return;
    setError('');
    setLoading(true);
    setPreview(null);
    try {
      const nearbyCoords = calcCentroid(day.activities);
      const activity = await suggestSingleActivity(
        destination, period, query.trim(),
        existingPlaces, currencyCode, currencySymbol,
        nearbyCoords,
        i18n.language === 'en' ? 'en' : 'tr',
      );
      setPreview(activity);
    } catch (e) {
      setError((e as Error).message || t('dashboard.dailyPlanView.addActivity.suggestError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!preview) return;
    onAdd(preview, period);
    onClose();
  };

  return (
    <div className="border-t border-divider bg-surface px-3 sm:px-5 py-3 space-y-3">

      {/* Başlık */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-heading text-text flex items-center gap-1.5">
          <Plus size={13} strokeWidth={2.5} className="text-accent" /> {t('dashboard.dailyPlanView.addActivity.title')}
        </p>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-2 transition-colors">
          <X size={13} strokeWidth={2.5} className="text-muted" />
        </button>
      </div>

      {/* Period seçimi */}
      <div className="flex gap-1.5 flex-wrap">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`text-[10px] font-heading px-2.5 py-1 rounded-full border transition-all ${
              period === p
                ? 'bg-accent text-white border-accent'
                : 'bg-surface text-muted border-divider hover:border-accent/40'
            }`}
          >
            {t(`dashboard.dailyPlanView.periods.${PERIOD_I18N_KEYS[p]}`)}
          </button>
        ))}
      </div>

      {/* Arama input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setPreview(null); }}
          onKeyDown={e => e.key === 'Enter' && handleSuggest()}
          placeholder={t('dashboard.dailyPlanView.addActivity.placeholder')}
          className="flex-1 px-3 py-2 text-xs rounded-xl border border-divider bg-surface-2 text-text placeholder:text-muted outline-none focus:border-accent transition-all"
        />
        <button
          onClick={handleSuggest}
          disabled={loading || !query.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-accent hover:brightness-105 disabled:opacity-50 text-white text-xs font-heading rounded-xl transition-all shrink-0"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          <span className="hidden sm:inline">{loading ? t('dashboard.dailyPlanView.addActivity.thinking') : t('dashboard.dailyPlanView.addActivity.suggestAI')}</span>
          <span className="sm:hidden">{loading ? '...' : t('dashboard.dailyPlanView.addActivity.suggestShort')}</span>
        </button>
      </div>

      {/* Hata */}
      {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}

      {/* Önizleme kartı */}
      {preview && (
        <div className="bg-surface-2 border border-divider rounded-xl p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-text leading-tight">{preview.placeName}</p>
              <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{preview.description}</p>
            </div>
            <span className="text-[11px] font-bold text-accent bg-accent-100 px-2 py-0.5 rounded-full shrink-0">
              {currencySymbol}{preview.estimatedCost}
            </span>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              className="flex-1 py-1.5 bg-accent hover:brightness-105 text-white text-xs font-heading rounded-lg transition-all"
            >
              ✓ {t('dashboard.dailyPlanView.addActivity.addToPlan')}
            </button>
            <button
              onClick={() => setPreview(null)}
              className="px-3 py-1.5 bg-surface text-muted text-xs font-semibold border border-divider rounded-lg hover:bg-surface-2 transition-all"
            >
              {t('dashboard.dailyPlanView.addActivity.suggestDifferent')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════
   Main Component
════════════════════════════════════════ */
const DailyPlanView: React.FC<Props> = ({ day, onActivityClick }) => {
  const { t, i18n } = useTranslation();
  const { plan, updateDayPlan, updateActivityActualCost, deleteActivity, moveActivity, addActivity, updateActivityNote } = usePlanStore();
  const { data: tripData } = useOnboardingStore();
  const { distanceKm: distKm } = useAppSettingsStore();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeVibe, setActiveVibe]         = useState<VibeType>(null);
  const [editingIndex, setEditingIndex]     = useState<number | null>(null);
  const [tempCost, setTempCost]             = useState<string>('');
  const [travelTimes, setTravelTimes]       = useState<Record<number, TravelSegment>>({});
  const [deletingIndex, setDeletingIndex]   = useState<number | null>(null);
  const [showAddPanel, setShowAddPanel]     = useState(false);
  const [noteIndex, setNoteIndex]           = useState<number | null>(null);
  const [noteText, setNoteText]             = useState('');

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const currencySymbol = plan?.currencySymbol ?? '₺';
  const currencyCode   = plan?.dailyPlans[0]?.activities[0] ? 'TRY' : 'TRY'; // store'dan gelmesi idealdir

  const activitiesKey = useMemo(
    () => day.activities.map(a => `${a.coordinates.lat},${a.coordinates.lng}`).join('|'),
    [day.activities]
  );
  const prevKeyRef = useRef<string>('');

  useEffect(() => {
    if (!isLoaded || !window.google?.maps?.DirectionsService) return;
    if (activitiesKey === prevKeyRef.current) return;
    prevKeyRef.current = activitiesKey;
    setTravelTimes({});

    const service = new window.google.maps.DirectionsService();
    const gmModes: Array<{ key: TravelMode; mode: google.maps.TravelMode }> = [
      { key: 'driving', mode: window.google.maps.TravelMode.DRIVING   },
      { key: 'transit', mode: window.google.maps.TravelMode.TRANSIT   },
      { key: 'walking', mode: window.google.maps.TravelMode.WALKING   },
      { key: 'cycling', mode: window.google.maps.TravelMode.BICYCLING },
    ];

    day.activities.forEach((activity, index) => {
      if (index === day.activities.length - 1) return;
      const next = day.activities[index + 1];
      const origin      = { lat: activity.coordinates.lat, lng: activity.coordinates.lng };
      const destination = { lat: next.coordinates.lat,     lng: next.coordinates.lng };
      const seg: TravelSegment = { driving: null, transit: null, walking: null, cycling: null, loading: true };
      let remaining = gmModes.length;
      gmModes.forEach(({ key, mode }) => {
        service.route({
          origin, destination, travelMode: mode,
          ...(mode === window.google.maps.TravelMode.DRIVING && {
            drivingOptions: { departureTime: new Date(), trafficModel: google.maps.TrafficModel.BEST_GUESS },
          }),
        }, (result, status) => {
          const leg = result?.routes?.[0]?.legs?.[0];
          const durationSec = key === 'driving'
            ? (leg?.duration_in_traffic?.value ?? leg?.duration?.value)
            : leg?.duration?.value;
          seg[key] = status === 'OK' && durationSec ? Math.ceil(durationSec / 60) : null;
          remaining--;
          if (remaining === 0) { seg.loading = false; setTravelTimes(prev => ({ ...prev, [index]: { ...seg } })); }
        });
      });
    });
  }, [isLoaded, activitiesKey, day.activities]);

  const handleVibeSelect = async (vibe: VibeType) => {
    const newVibe = activeVibe === vibe ? null : vibe;
    setActiveVibe(newVibe);
    if (!newVibe || !plan) return;
    setIsRegenerating(true);
    try {
      const newDay = await regenerateDayWithVibe(
        day, plan.dailyPlans, plan.destination, newVibe,
        tripData.startDate, tripData.arrivalTime,
        tripData.endDate,   tripData.departureTime,
        (updatedDay) => updateDayPlan(day.dayNumber, updatedDay),
        i18n.language === 'en' ? 'en' : 'tr',
      );
      updateDayPlan(day.dayNumber, newDay);
      setActiveVibe(null);
    } catch (error: unknown) {
      alert(t('dashboard.dailyPlanView.vibeUpdateError', { message: error instanceof Error ? error.message : t('dashboard.dailyPlanView.unknownError') }));
      setActiveVibe(null);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveCost = (index: number) => {
    const cost = parseFloat(tempCost);
    if (!isNaN(cost)) updateActivityActualCost(day.dayNumber, index, cost);
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    if (deletingIndex === index) {
      deleteActivity(day.dayNumber, index);
      setDeletingIndex(null);
    } else {
      setDeletingIndex(index);
    }
  };

  const handleMove = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= day.activities.length) return;
    moveActivity(day.dayNumber, fromIndex, toIndex);
  };

  const handleAdd = (activity: DailyActivity, period: string) => {
    const insertIndex = getInsertIndex(day.activities, period);
    addActivity(day.dayNumber, activity, insertIndex);
  };

  const openNote = (index: number) => {
    setNoteIndex(index);
    setNoteText(day.activities[index].note ?? '');
    setDeletingIndex(null);
    setEditingIndex(null);
  };

  const saveNote = (index: number) => {
    updateActivityNote(day.dayNumber, index, noteText);
    setNoteIndex(null);
  };

  return (
    <div className="flex flex-col h-full relative">

      {/* ── OVERLAY ── */}
      {isRegenerating && (
        <div className="absolute inset-0 bg-surface/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-accent-700 text-white rounded-full text-sm font-heading shadow-lg">
            <Loader2 size={14} className="animate-spin" />
            {t('dashboard.dailyPlanView.regenerating')}
          </div>
        </div>
      )}

      {/* ── TİMLİNE ── */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 pt-4 pb-2">
        {day.activities.map((activity, index) => {
          const isLast       = index === day.activities.length - 1;
          const nextActivity = !isLast ? day.activities[index + 1] : null;
          const rawDistKm    = nextActivity
            ? haversineDistance(activity.coordinates.lat, activity.coordinates.lng, nextActivity.coordinates.lat, nextActivity.coordinates.lng)
            : null;
          const distText = rawDistKm != null
            ? distKm ? `${rawDistKm.toFixed(1)} km` : `${(rawDistKm * 0.621371).toFixed(1)} mi`
            : null;
          const colors          = getPeriodColor(activity.period);
          const prevPeriod      = index > 0 ? day.activities[index - 1].period : null;
          const showPeriodLabel = activity.period !== prevPeriod;
          const isDeleting      = deletingIndex === index;

          return (
            <div key={index}>
              {showPeriodLabel && (
                <p className={`text-[10px] font-heading uppercase tracking-wider mb-1.5 ml-9 ${index > 0 ? 'mt-4' : ''} ${colors.text}`}>
                  {t(`dashboard.dailyPlanView.periods.${periodLabelKey(activity.period)}`)}
                </p>
              )}

              <div className={`flex gap-3 rounded-xl transition-colors ${isDeleting ? 'bg-red-50' : ''}`}>
                {/* Circle + line */}
                <div className="flex flex-col items-center shrink-0 w-6">
                  <div className={`w-6 h-6 rounded-full border-2 ${colors.border} ${colors.bg} flex items-center justify-center shrink-0`}>
                    <span className={`text-[10px] font-bold ${colors.text}`}>{index + 1}</span>
                  </div>
                  {!isLast && <div className="w-px flex-1 min-h-[20px] bg-divider mt-0.5" />}
                </div>

                {/* Content */}
                <div className={`flex-1 min-w-0 ${isLast ? 'pb-1' : 'pb-4'}`}>
                  <div className="flex items-start gap-2">

                    {/* Yer adı + açıklama + not */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          if (isDeleting) { setDeletingIndex(null); return; }
                          if (noteIndex === index) return;
                          onActivityClick?.({ placeName: activity.placeName, lat: activity.coordinates.lat, lng: activity.coordinates.lng });
                        }}
                      >
                        <h3 className={`font-heading text-sm leading-tight transition-colors ${isDeleting ? 'text-red-500' : 'text-text hover:text-accent'}`}>
                          {activity.placeName}
                        </h3>
                        {!isDeleting && noteIndex !== index && (
                          <p className="text-xs text-muted mt-0.5 leading-relaxed">
                            {activity.description}
                          </p>
                        )}
                        {isDeleting && (
                          <p className="text-xs text-red-400 mt-0.5 font-medium">{t('dashboard.dailyPlanView.deleteConfirm')}</p>
                        )}
                      </div>

                      {/* Mevcut not gösterimi */}
                      {activity.note && noteIndex !== index && !isDeleting && (
                        <div
                          className="mt-1.5 flex items-start gap-1.5 cursor-pointer group/note"
                          onClick={() => openNote(index)}
                        >
                          <StickyNote size={11} className="text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-700 leading-relaxed line-clamp-2 group-hover/note:line-clamp-none transition-all">
                            {activity.note}
                          </p>
                        </div>
                      )}

                      {/* Not düzenleme alanı */}
                      {noteIndex === index && (
                        <div className="mt-2">
                          <textarea
                            autoFocus
                            rows={3}
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Escape') setNoteIndex(null); }}
                            placeholder={t('dashboard.dailyPlanView.note.placeholder')}
                            className="w-full text-xs px-2.5 py-2 rounded-lg border border-amber-200 bg-amber-50 text-text placeholder:text-muted outline-none focus:border-amber-400 resize-none transition-all"
                          />
                          <div className="flex gap-1.5 mt-1.5">
                            <button
                              type="button"
                              onClick={() => saveNote(index)}
                              className="text-[10px] font-bold px-2.5 py-1 bg-amber-400 hover:bg-amber-500 text-white rounded-lg transition-colors"
                            >
                              {t('dashboard.dailyPlanView.note.save')}
                            </button>
                            {activity.note && (
                              <button
                                type="button"
                                onClick={() => { setNoteText(''); updateActivityNote(day.dayNumber, index, ''); setNoteIndex(null); }}
                                className="text-[10px] font-semibold px-2.5 py-1 bg-surface text-red-400 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                {t('dashboard.dailyPlanView.note.delete')}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setNoteIndex(null)}
                              className="text-[10px] font-semibold px-2.5 py-1 bg-surface text-muted border border-divider rounded-lg hover:bg-surface-2 transition-colors"
                            >
                              {t('dashboard.dailyPlanView.cancel')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sağ kontroller */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Sil onay durumu */}
                      {isDeleting ? (
                        <>
                          <button
                            onClick={() => handleDelete(index)}
                            className="text-[10px] font-bold px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            {t('dashboard.dailyPlanView.delete')}
                          </button>
                          <button
                            onClick={() => setDeletingIndex(null)}
                            className="text-[10px] font-bold px-2 py-1 bg-surface-2 text-muted rounded-lg hover:bg-divider transition-colors"
                          >
                            {t('dashboard.dailyPlanView.cancel')}
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Taşı ↑↓ */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => handleMove(index, index - 1)}
                              disabled={index === 0}
                              title={t('dashboard.dailyPlanView.moveUp')}
                              className="w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center rounded text-muted hover:text-text hover:bg-surface-2 disabled:opacity-0 transition-all"
                            >
                              <ChevronUp size={13} />
                            </button>
                            <button
                              onClick={() => handleMove(index, index + 1)}
                              disabled={isLast}
                              title={t('dashboard.dailyPlanView.moveDown')}
                              className="w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center rounded text-muted hover:text-text hover:bg-surface-2 disabled:opacity-0 transition-all"
                            >
                              <ChevronDown size={13} />
                            </button>
                          </div>

                          {/* Not butonu */}
                          <button
                            onClick={() => noteIndex === index ? setNoteIndex(null) : openNote(index)}
                            title={t('dashboard.dailyPlanView.addNoteTitle')}
                            className={`w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center rounded transition-all ${
                              activity.note
                                ? 'text-amber-400 hover:bg-amber-50'
                                : 'text-muted hover:text-amber-400 hover:bg-amber-50'
                            }`}
                          >
                            <StickyNote size={13} />
                          </button>

                          {/* Sil butonu */}
                          <button
                            onClick={() => { setDeletingIndex(index); setEditingIndex(null); setNoteIndex(null); }}
                            title={t('dashboard.dailyPlanView.deleteActivityTitle')}
                            className="w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center rounded text-muted hover:text-red-400 hover:bg-red-50 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>

                          {/* Maliyet düzenle */}
                          {editingIndex === index ? (
                            <div className="flex items-center gap-1 bg-surface border border-blue-200 px-2 py-1 rounded-md shadow-sm">
                              <span className="text-xs text-muted">{currencySymbol}</span>
                              <input
                                type="number"
                                autoFocus
                                className="w-14 outline-none text-xs font-semibold text-text bg-transparent"
                                value={tempCost}
                                onChange={e => setTempCost(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveCost(index)}
                              />
                              <button type="button" onClick={() => handleSaveCost(index)} className="text-emerald-600 hover:text-emerald-700">
                                <Check size={11} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setEditingIndex(index); setTempCost((activity.actualCost ?? activity.estimatedCost).toString()); setDeletingIndex(null); }}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-semibold transition-colors ${
                                activity.actualCost !== undefined
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-surface text-text border-divider hover:border-accent/40 hover:bg-surface-2'
                              }`}
                            >
                              {currencySymbol}{activity.actualCost !== undefined ? activity.actualCost : activity.estimatedCost}
                              <Edit2 size={9} className="opacity-40" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Ulaşım paneli */}
                  {!isLast && !isDeleting && (
                    <TravelStrip
                      origin={{ lat: activity.coordinates.lat, lng: activity.coordinates.lng }}
                      destination={{ lat: nextActivity!.coordinates.lat, lng: nextActivity!.coordinates.lng }}
                      seg={travelTimes[index]}
                      distText={distText}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* + Aktivite Ekle butonu (liste sonunda) */}
        {!showAddPanel && (
          <button
            onClick={() => { setShowAddPanel(true); setDeletingIndex(null); }}
            className="w-full mt-3 mb-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-dashed border-divider text-xs font-heading text-muted hover:border-accent/50 hover:text-accent hover:bg-accent-100/50 transition-all"
          >
            <Plus size={13} strokeWidth={2.5} />
            {t('dashboard.dailyPlanView.addActivity.title')}
          </button>
        )}
      </div>

      {/* ── AKTİVİTE EKLEME PANELİ ── */}
      {showAddPanel && plan && (
        <AddActivityPanel
          day={day}
          destination={plan.destination}
          currencyCode={currencyCode}
          currencySymbol={currencySymbol}
          onClose={() => setShowAddPanel(false)}
          onAdd={(activity, period) => handleAdd(activity, period)}
        />
      )}

      {/* ── VİBE BAR ── */}
      <div className="sticky bottom-0 border-t border-divider bg-surface/95 backdrop-blur-sm px-3 sm:px-5 py-2.5 flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-heading text-muted uppercase tracking-wider shrink-0">{t('dashboard.dailyPlanView.vibesLabel')}</span>
        <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {VIBE_KEYS.map(key => {
            const isActive = activeVibe === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleVibeSelect(key as VibeType)}
                disabled={isRegenerating}
                className={`inline-flex items-center gap-1.5 px-4 py-1 rounded-full border text-xs font-semibold transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isActive ? 'bg-accent text-white border-accent' : 'bg-surface text-text border-divider hover:border-accent/40'
                }`}
              >
                <span>{VIBE_EMOJIS[key]}</span>
                {t(`dashboard.dailyPlanView.vibes.${key}`)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DailyPlanView;
