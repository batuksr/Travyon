import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { Loader2, Edit2, Check } from 'lucide-react';
import type { DailyPlan } from '../services/aiService';
import { regenerateDayWithVibe } from '../services/aiService';
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

const TRAVEL_ICONS: Record<TravelMode, string> = {
  driving: '🚗',
  transit: '🚌',
  walking: '🚶',
  cycling: '🚲',
};

const TRAVEL_LABELS: Record<TravelMode, string> = {
  driving: 'Araç',
  transit: 'Toplu',
  walking: 'Yürü',
  cycling: 'Bisiklet',
};

const GMAPS_MODE: Record<TravelMode, string> = {
  driving: 'driving',
  transit: 'transit',
  walking: 'walking',
  cycling: 'bicycling',
};

/* ── Format minutes: 65 → "1sa 5dk", 45 → "45dk" ── */
const fmtMin = (mins: number) => {
  if (mins < 60) return `${mins}dk`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}sa ${m}dk` : `${h}sa`;
};

/* ─────────────────────────────────────────────────────
   TravelStrip — Google Maps tarzı mod seçici panel
───────────────────────────────────────────────────── */
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
    const url = `https://www.google.com/maps/dir/?api=1` +
      `&origin=${origin.lat},${origin.lng}` +
      `&destination=${destination.lat},${destination.lng}` +
      `&travelmode=${GMAPS_MODE[pending]}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setPending(null);
  };

  /* Loading state — slim inline pulse */
  if (!seg || seg.loading) {
    return (
      <div className="flex items-center gap-2 mt-1.5">
        {distText && <span className="text-[10px] text-slate-400">↕ {distText}</span>}
        <span className="text-[10px] text-slate-300 animate-pulse">⏱ hesaplanıyor…</span>
      </div>
    );
  }

  const available = TRAVEL_MODES.filter(m => seg[m] != null);
  if (available.length === 0) {
    return distText
      ? <p className="text-[10px] text-slate-400 mt-1">↕ {distText}</p>
      : null;
  }

  /* Fastest = smallest non-null time */
  const fastest = available.reduce<TravelMode>((best, m) =>
    (seg[m] as number) < (seg[best] as number) ? m : best
  , available[0]);

  return (
    <div className="mt-1.5 space-y-1.5">
      {/* Chips row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {distText && (
          <>
            <span className="text-[10px] text-slate-400">↕ {distText}</span>
            <span className="text-slate-200 text-[10px]">·</span>
          </>
        )}
        {TRAVEL_MODES.map(mode => {
          const mins = seg[mode];
          if (mins == null) return null;
          const isFastest  = mode === fastest;
          const isSelected = pending === mode;
          return (
            <button
              key={mode}
              onClick={() => setPending(isSelected ? null : mode)}
              className={`
                inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                text-[10px] font-semibold border transition-all
                hover:scale-105 active:scale-95 select-none
                ${isSelected
                  ? 'bg-[#f8981d] text-white border-[#f8981d]'
                  : isFastest
                    ? 'bg-[#f8981d]/10 text-[#f8981d] border-[#f8981d]/25 hover:bg-[#f8981d]/20'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}
              `}
            >
              <span className="text-[11px] leading-none">{TRAVEL_ICONS[mode]}</span>
              {fmtMin(mins)}
            </button>
          );
        })}
      </div>

      {/* Confirmation card — animasyonlu, sadece seçim varsa */}
      {pending && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
          <span className="text-base leading-none">{TRAVEL_ICONS[pending]}</span>
          <p className="flex-1 text-[11px] text-slate-600 leading-tight">
            <span className="font-semibold text-slate-800">{TRAVEL_LABELS[pending]}</span> ile Google Maps açılsın mı?
          </p>
          <button
            onClick={() => setPending(null)}
            className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors px-1"
          >
            İptal
          </button>
          <button
            onClick={confirmOpen}
            className="text-[10px] font-semibold text-white bg-[#f8981d] hover:bg-[#e08518] px-2.5 py-1 rounded-lg transition-colors"
          >
            Aç
          </button>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   Period color helper
───────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────── */
const DailyPlanView: React.FC<Props> = ({ day, onActivityClick }) => {
  const { plan, updateDayPlan, updateActivityActualCost } = usePlanStore();
  const { data: tripData } = useOnboardingStore();
  const { distanceKm: distKm } = useAppSettingsStore();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeVibe, setActiveVibe]         = useState<VibeType>(null);
  const [editingIndex, setEditingIndex]     = useState<number | null>(null);
  const [tempCost, setTempCost]             = useState<string>('');
  const [travelTimes, setTravelTimes]       = useState<Record<number, TravelSegment>>({});

  // Reuses already-loaded Maps script — same id, no extra network request
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const currencySymbol = plan?.currencySymbol ?? '₺';

  const activitiesKey = useMemo(
    () => day.activities.map(a => `${a.coordinates.lat},${a.coordinates.lng}`).join('|'),
    [day.activities]
  );
  const prevKeyRef = useRef<string>('');

  /* Fetch travel times when activities change */
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
        const request: google.maps.DirectionsRequest = {
          origin,
          destination,
          travelMode: mode,
          // Araç için: anlık trafik verisiyle süre (duration_in_traffic)
          ...(mode === window.google.maps.TravelMode.DRIVING && {
            drivingOptions: {
              departureTime: new Date(),
              trafficModel:  google.maps.TrafficModel.BEST_GUESS,
            },
          }),
        };
        service.route(request, (result, status) => {
          const leg = result?.routes?.[0]?.legs?.[0];
          // Araç: trafik dahil süreyi tercih et (yoksa standart süreye düş)
          const durationSec = key === 'driving'
            ? (leg?.duration_in_traffic?.value ?? leg?.duration?.value)
            : leg?.duration?.value;
          seg[key] = status === 'OK' && durationSec
            ? Math.ceil(durationSec / 60)
            : null;
          remaining--;
          if (remaining === 0) {
            seg.loading = false;
            setTravelTimes(prev => ({ ...prev, [index]: { ...seg } }));
          }
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
        day,
        plan.dailyPlans,          // tüm günler → tekrar önleme
        plan.destination,
        newVibe,
        tripData.startDate, tripData.arrivalTime,
        tripData.endDate,   tripData.departureTime,
        (updatedDay) => updateDayPlan(day.dayNumber, updatedDay)
      );
      updateDayPlan(day.dayNumber, newDay);
      setActiveVibe(null);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Bilinmeyen hata';
      alert('Vibe güncellenirken hata oluştu: ' + msg);
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

  return (
    <div className="flex flex-col h-full relative">

      {/* ── OVERLAY ── */}
      {isRegenerating && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold shadow-lg">
            <Loader2 size={14} className="animate-spin text-[#187fe7]" />
            Optimize ediliyor...
          </div>
        </div>
      )}

      {/* ── TİMLİNE ── */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
        {day.activities.map((activity, index) => {
          const isLast       = index === day.activities.length - 1;
          const nextActivity = !isLast ? day.activities[index + 1] : null;

          const rawDistKm = nextActivity
            ? haversineDistance(
                activity.coordinates.lat, activity.coordinates.lng,
                nextActivity.coordinates.lat, nextActivity.coordinates.lng)
            : null;
          const distText = rawDistKm != null
            ? distKm ? `${rawDistKm.toFixed(1)} km` : `${(rawDistKm * 0.621371).toFixed(1)} mi`
            : null;

          const colors          = getPeriodColor(activity.period);
          const prevPeriod      = index > 0 ? day.activities[index - 1].period : null;
          const showPeriodLabel = activity.period !== prevPeriod;

          return (
            <div key={index}>
              {showPeriodLabel && (
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-9 ${index > 0 ? 'mt-4' : ''} ${colors.text}`}>
                  {activity.period}
                </p>
              )}

              <div className="flex gap-3">
                {/* Circle + line */}
                <div className="flex flex-col items-center shrink-0 w-6">
                  <div className={`w-6 h-6 rounded-full border-2 ${colors.border} ${colors.bg} flex items-center justify-center shrink-0`}>
                    <span className={`text-[10px] font-bold ${colors.text}`}>{index + 1}</span>
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 min-h-[20px] bg-slate-200 dark:bg-slate-600 mt-0.5" />
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 min-w-0 ${isLast ? 'pb-1' : 'pb-4'}`}>
                  <div className="flex items-start justify-between gap-2 group">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => onActivityClick?.({
                        placeName: activity.placeName,
                        lat: activity.coordinates.lat,
                        lng: activity.coordinates.lng,
                      })}
                    >
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-[#f8981d] transition-colors leading-tight">
                        {activity.placeName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {activity.description}
                      </p>
                    </div>

                    {/* Cost edit */}
                    <div className="shrink-0">
                      {editingIndex === index ? (
                        <div className="flex items-center gap-1 bg-white border border-blue-200 px-2 py-1 rounded-md shadow-sm">
                          <span className="text-xs text-slate-400">{currencySymbol}</span>
                          <input
                            type="number"
                            autoFocus
                            className="w-14 outline-none text-xs font-semibold text-slate-800"
                            value={tempCost}
                            onChange={e => setTempCost(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveCost(index)}
                          />
                          <button type="button" onClick={e => { e.stopPropagation(); handleSaveCost(index); }} className="text-emerald-600 hover:text-emerald-700">
                            <Check size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setEditingIndex(index);
                            setTempCost((activity.actualCost ?? activity.estimatedCost).toString());
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-semibold transition-colors ${
                            activity.actualCost !== undefined
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {currencySymbol}{activity.actualCost !== undefined ? activity.actualCost : activity.estimatedCost}
                          <Edit2 size={9} className="opacity-40" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Ulaşım paneli ── */}
                  {!isLast && (
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
      </div>

      {/* ── VİBE BAR ── */}
      <div className="sticky bottom-0 border-t border-slate-100 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-5 py-2.5 flex items-center gap-2 shrink-0">
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
                  isActive ? 'bg-[#f8981d] text-white border-[#f8981d]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
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
