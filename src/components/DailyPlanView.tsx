import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { Loader2, Edit2, Check, Trash2, ChevronUp, ChevronDown, Plus, Sparkles, X, StickyNote } from 'lucide-react';
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
const TRAVEL_LABELS: Record<TravelMode, string> = { driving: 'Araç', transit: 'Toplu', walking: 'Yürü', cycling: 'Bisiklet' };
const GMAPS_MODE: Record<TravelMode, string> = { driving: 'driving', transit: 'transit', walking: 'walking', cycling: 'bicycling' };

const PERIODS = ['Sabah', 'Öğle', 'Öğleden Sonra', 'Akşam', 'Gece'] as const;
type Period = typeof PERIODS[number];

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

const fmtMin = (mins: number) => {
  if (mins < 60) return `${mins}dk`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}sa ${m}dk` : `${h}sa`;
};

/* ── TravelStrip ── */
interface TravelStripProps {
  origin:      { lat: number; lng: number };
  destination: { lat: number; lng: number };
  seg:         TravelSegment | undefined;
  distText:    string | null;
}
const TravelStrip: React.FC<TravelStripProps> = ({ origin, destination, seg, distText }) => {
  const [pending, setPending] = useState<TravelMode | null>(null);
  const confirmOpen = () => {
    if (!pending) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=${GMAPS_MODE[pending]}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setPending(null);
  };
  if (!seg || seg.loading) return (
    <div className="flex items-center gap-2 mt-1.5">
      {distText && <span className="text-[10px] text-slate-400">↕ {distText}</span>}
      <span className="text-[10px] text-slate-300 animate-pulse">⏱ hesaplanıyor…</span>
    </div>
  );
  const available = TRAVEL_MODES.filter(m => seg[m] != null);
  if (available.length === 0) return distText ? <p className="text-[10px] text-slate-400 mt-1">↕ {distText}</p> : null;
  const fastest = available.reduce<TravelMode>((best, m) => (seg[m] as number) < (seg[best] as number) ? m : best, available[0]);
  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        {distText && (<><span className="text-[10px] text-slate-400">↕ {distText}</span><span className="text-slate-200 text-[10px]">·</span></>)}
        {TRAVEL_MODES.map(mode => {
          const mins = seg[mode];
          if (mins == null) return null;
          const isFastest = mode === fastest;
          const isSelected = pending === mode;
          return (
            <button key={mode} onClick={() => setPending(isSelected ? null : mode)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all hover:scale-105 active:scale-95 select-none ${
                isSelected ? 'bg-[#f8981d] text-white border-[#f8981d]'
                  : isFastest ? 'bg-[#f8981d]/10 text-[#f8981d] border-[#f8981d]/25 hover:bg-[#f8981d]/20'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
              <span className="text-[11px] leading-none">{TRAVEL_ICONS[mode]}</span>
              {fmtMin(mins)}
            </button>
          );
        })}
      </div>
      {pending && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
          <span className="text-base leading-none">{TRAVEL_ICONS[pending]}</span>
          <p className="flex-1 text-[11px] text-slate-600 leading-tight">
            <span className="font-semibold text-slate-800">{TRAVEL_LABELS[pending]}</span> ile Google Maps açılsın mı?
          </p>
          <button onClick={() => setPending(null)} className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors px-1">İptal</button>
          <button onClick={confirmOpen} className="text-[10px] font-semibold text-white bg-[#f8981d] hover:bg-[#e08518] px-2.5 py-1 rounded-lg transition-colors">Aç</button>
        </div>
      )}
    </div>
  );
};

/* ── Period color ── */
const getPeriodColor = (period: string) => {
  if (period === 'Sabah')         return { border: 'border-amber-300',  bg: 'bg-amber-50',  text: 'text-amber-600' };
  if (period === 'Öğle')          return { border: 'border-orange-300', bg: 'bg-orange-50', text: 'text-orange-600' };
  if (period === 'Öğleden Sonra') return { border: 'border-blue-300',   bg: 'bg-blue-50',   text: 'text-blue-600' };
  if (period === 'Akşam')         return { border: 'border-purple-300', bg: 'bg-purple-50', text: 'text-purple-600' };
  if (period === 'Gece')          return { border: 'border-slate-400',  bg: 'bg-slate-100', text: 'text-slate-600' };
  return { border: 'border-slate-300', bg: 'bg-slate-50', text: 'text-slate-500' };
};

const vibeConfig: Record<string, { label: string; emoji: string }> = {
  rest:    { label: 'Dinlenme',    emoji: '😴' },
  indoor:  { label: 'Kapalı Alan', emoji: '🌧️' },
  budget:  { label: 'Tasarruf',    emoji: '💰' },
  explore: { label: 'Keşif',       emoji: '🎉' },
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
      );
      setPreview(activity);
    } catch (e) {
      setError((e as Error).message || 'Öneri alınamadı, tekrar dene.');
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
    <div className="border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 sm:px-5 py-3 space-y-3">

      {/* Başlık */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <Plus size={13} className="text-[#f8981d]" /> Aktivite Ekle
        </p>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <X size={13} className="text-slate-400" />
        </button>
      </div>

      {/* Period seçimi */}
      <div className="flex gap-1.5 flex-wrap">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
              period === p
                ? 'bg-[#f8981d] text-white border-[#f8981d]'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-300'
            }`}
          >
            {p}
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
          placeholder="Ne eklemek istiyorsun? (örn: müze, kahve, park...)"
          className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 transition-all"
        />
        <button
          onClick={handleSuggest}
          disabled={loading || !query.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#f8981d] hover:bg-[#e08518] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shrink-0"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          <span className="hidden sm:inline">{loading ? 'Düşünüyor...' : 'AI Öner'}</span>
          <span className="sm:hidden">{loading ? '...' : 'Öner'}</span>
        </button>
      </div>

      {/* Hata */}
      {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}

      {/* Önizleme kartı */}
      {preview && (
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">{preview.placeName}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{preview.description}</p>
            </div>
            <span className="text-[11px] font-bold text-[#f8981d] bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full shrink-0">
              {currencySymbol}{preview.estimatedCost}
            </span>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              className="flex-1 py-1.5 bg-[#f8981d] hover:bg-[#e08518] text-white text-xs font-bold rounded-lg transition-all"
            >
              ✓ Plana Ekle
            </button>
            <button
              onClick={() => setPreview(null)}
              className="px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 transition-all"
            >
              Farklı Öner
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
        (updatedDay) => updateDayPlan(day.dayNumber, updatedDay)
      );
      updateDayPlan(day.dayNumber, newDay);
      setActiveVibe(null);
    } catch (error: unknown) {
      alert('Vibe güncellenirken hata: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
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
        <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-semibold shadow-lg">
            <Loader2 size={14} className="animate-spin text-[#187fe7]" />
            Optimize ediliyor...
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
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-9 ${index > 0 ? 'mt-4' : ''} ${colors.text}`}>
                  {activity.period}
                </p>
              )}

              <div className={`flex gap-3 rounded-xl transition-colors ${isDeleting ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                {/* Circle + line */}
                <div className="flex flex-col items-center shrink-0 w-6">
                  <div className={`w-6 h-6 rounded-full border-2 ${colors.border} ${colors.bg} flex items-center justify-center shrink-0`}>
                    <span className={`text-[10px] font-bold ${colors.text}`}>{index + 1}</span>
                  </div>
                  {!isLast && <div className="w-px flex-1 min-h-[20px] bg-slate-200 dark:bg-slate-600 mt-0.5" />}
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
                        <h3 className={`text-sm font-semibold leading-tight transition-colors ${isDeleting ? 'text-red-500' : 'text-slate-900 dark:text-white hover:text-[#f8981d]'}`}>
                          {activity.placeName}
                        </h3>
                        {!isDeleting && noteIndex !== index && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {activity.description}
                          </p>
                        )}
                        {isDeleting && (
                          <p className="text-xs text-red-400 mt-0.5 font-medium">Bu aktiviteyi silmek istiyor musun?</p>
                        )}
                      </div>

                      {/* Mevcut not gösterimi */}
                      {activity.note && noteIndex !== index && !isDeleting && (
                        <div
                          className="mt-1.5 flex items-start gap-1.5 cursor-pointer group/note"
                          onClick={() => openNote(index)}
                        >
                          <StickyNote size={11} className="text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed line-clamp-2 group-hover/note:line-clamp-none transition-all">
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
                            placeholder="Not ekle… (rezervasyon no, anı, ipucu...)"
                            className="w-full text-xs px-2.5 py-2 rounded-lg border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-amber-400 resize-none transition-all"
                          />
                          <div className="flex gap-1.5 mt-1.5">
                            <button
                              type="button"
                              onClick={() => saveNote(index)}
                              className="text-[10px] font-bold px-2.5 py-1 bg-amber-400 hover:bg-amber-500 text-white rounded-lg transition-colors"
                            >
                              Kaydet
                            </button>
                            {activity.note && (
                              <button
                                type="button"
                                onClick={() => { setNoteText(''); updateActivityNote(day.dayNumber, index, ''); setNoteIndex(null); }}
                                className="text-[10px] font-semibold px-2.5 py-1 bg-white dark:bg-slate-700 text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                Notu Sil
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setNoteIndex(null)}
                              className="text-[10px] font-semibold px-2.5 py-1 bg-white dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              İptal
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
                            Sil
                          </button>
                          <button
                            onClick={() => setDeletingIndex(null)}
                            className="text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            İptal
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Taşı ↑↓ */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => handleMove(index, index - 1)}
                              disabled={index === 0}
                              title="Yukarı taşı"
                              className="w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center rounded text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-0 transition-all"
                            >
                              <ChevronUp size={13} />
                            </button>
                            <button
                              onClick={() => handleMove(index, index + 1)}
                              disabled={isLast}
                              title="Aşağı taşı"
                              className="w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center rounded text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-0 transition-all"
                            >
                              <ChevronDown size={13} />
                            </button>
                          </div>

                          {/* Not butonu */}
                          <button
                            onClick={() => noteIndex === index ? setNoteIndex(null) : openNote(index)}
                            title="Not ekle"
                            className={`w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center rounded transition-all ${
                              activity.note
                                ? 'text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                : 'text-slate-400 dark:text-slate-500 hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                            }`}
                          >
                            <StickyNote size={13} />
                          </button>

                          {/* Sil butonu */}
                          <button
                            onClick={() => { setDeletingIndex(index); setEditingIndex(null); setNoteIndex(null); }}
                            title="Aktiviteyi sil"
                            className="w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center rounded text-slate-400 dark:text-slate-500 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>

                          {/* Maliyet düzenle */}
                          {editingIndex === index ? (
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 px-2 py-1 rounded-md shadow-sm">
                              <span className="text-xs text-slate-400">{currencySymbol}</span>
                              <input
                                type="number"
                                autoFocus
                                className="w-14 outline-none text-xs font-semibold text-slate-800 dark:text-white bg-transparent"
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
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
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
            className="w-full mt-3 mb-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-400 dark:text-slate-500 hover:border-[#f8981d]/50 hover:text-[#f8981d] hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-all"
          >
            <Plus size={13} />
            Aktivite Ekle
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
      <div className="sticky bottom-0 border-t border-slate-100 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-3 sm:px-5 py-2.5 flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Vibe:</span>
        <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {(Object.keys(vibeConfig) as Array<keyof typeof vibeConfig>).map(key => {
            const cfg = vibeConfig[key];
            const isActive = activeVibe === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleVibeSelect(key as VibeType)}
                disabled={isRegenerating}
                className={`inline-flex items-center gap-1.5 px-4 py-1 rounded-md border text-xs font-semibold transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isActive ? 'bg-[#f8981d] text-white border-[#f8981d]' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300'
                }`}
              >
                <span>{cfg.emoji}</span>
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DailyPlanView;
