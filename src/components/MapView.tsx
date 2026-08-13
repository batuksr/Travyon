import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF } from '@react-google-maps/api';
import { useTranslation } from 'react-i18next';
import type { DailyActivity } from '../services/aiService';
import { usePlanStore } from '../store/usePlanStore';
import { useThemeStore } from '../store/useThemeStore';

// Stable reference — prevents SDK reload on every render
const LIBRARIES: ('places')[] = ['places'];

interface MapViewProps {
  activities: DailyActivity[];
  onActivityClick?: (place: { placeName: string; lat: number; lng: number }) => void;
  hotel?: { lat: number; lng: number; name: string } | null;
}

const containerStyle = { width: '100%', height: '100%', borderRadius: '1rem' };

const MAP_INIT_CENTER = { lat: 41.0082, lng: 28.9784 };
const MAP_INIT_ZOOM   = 12;

// ── Kuadratik Bezier yay ──────────────────────────────────────────────────
// İki koordinat arasında "bombeli" (kemer) bir eğri üretir.
// steps: eğri yumuşaklığı  |  h: kemer yüksekliği (mesafenin oranı)
const generateArcPath = (
  start: google.maps.LatLngLiteral,
  end:   google.maps.LatLngLiteral,
  steps = 28,
): google.maps.LatLngLiteral[] => {
  const dLat = end.lat - start.lat;
  const dLng = end.lng - start.lng;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);
  if (dist < 1e-10) return [start, end];

  // Kemer yüksekliği: mesafenin %22'si, max ~0.009° ≈ 1 km
  const h = Math.min(dist * 0.22, 0.009);

  // Kontrol noktası: akordan dik (CW rotasyon → doğuya giden segmentte kuzeye kemerer)
  const ctrlLat = (start.lat + end.lat) / 2 + ( dLng / dist) * h;
  const ctrlLng = (start.lng + end.lng) / 2 + (-dLat / dist) * h;

  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return {
      lat: u * u * start.lat + 2 * u * t * ctrlLat + t * t * end.lat,
      lng: u * u * start.lng + 2 * u * t * ctrlLng + t * t * end.lng,
    };
  });
};
// ─────────────────────────────────────────────────────────────────────────

const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',                                        stylers: [{ color: '#1a1f2e' }] },
  { elementType: 'labels.text.fill',                               stylers: [{ color: '#8a9bb0' }] },
  { elementType: 'labels.text.stroke',                             stylers: [{ color: '#1a1f2e' }] },
  { elementType: 'labels.icon',                                    stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative',        elementType: 'geometry', stylers: [{ color: '#2d3a4a' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#9fb3c8' }] },
  { featureType: 'poi',                   elementType: 'labels.text.fill', stylers: [{ color: '#6b7f96' }] },
  { featureType: 'poi.park',              elementType: 'geometry',         stylers: [{ color: '#1a2e1f' }] },
  { featureType: 'poi.park',              elementType: 'labels.text.fill', stylers: [{ color: '#3d6b4a' }] },
  { featureType: 'road',                  elementType: 'geometry.fill',    stylers: [{ color: '#2d3a50' }] },
  { featureType: 'road',                  elementType: 'geometry.stroke',  stylers: [{ color: '#1a2435' }] },
  { featureType: 'road',                  elementType: 'labels.text.fill', stylers: [{ color: '#7a8fa8' }] },
  { featureType: 'road.arterial',         elementType: 'geometry',         stylers: [{ color: '#38475e' }] },
  { featureType: 'road.highway',          elementType: 'geometry',         stylers: [{ color: '#4a6080' }] },
  { featureType: 'road.highway',          elementType: 'labels.text.fill', stylers: [{ color: '#a0b8d0' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#3d5570' }] },
  { featureType: 'transit',               elementType: 'geometry',         stylers: [{ color: '#2d3d50' }] },
  { featureType: 'transit.station',       elementType: 'labels.text.fill', stylers: [{ color: '#6b8faa' }] },
  { featureType: 'water',                 elementType: 'geometry',         stylers: [{ color: '#0d1b2a' }] },
  { featureType: 'water',                 elementType: 'labels.text.fill', stylers: [{ color: '#3d6080' }] },
];

const baseMapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
};

const MapView: React.FC<MapViewProps> = ({ activities, onActivityClick, hotel }) => {
  const { dark } = useThemeStore();
  const { t } = useTranslation();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  // ── Animasyon timer — doğrudan Maps API ref üzerinden, React re-render yok ──
  const animTimerRef = useRef<number | null>(null);

  const stopAnimation = useCallback(() => {
    if (animTimerRef.current !== null) {
      clearInterval(animTimerRef.current);
      animTimerRef.current = null;
    }
  }, []);

  // Yavaş akan ok animasyonu — tam tur 8 saniye (~12fps)
  const handleAnimPolyLoad = useCallback((polyline: google.maps.Polyline) => {
    stopAnimation();
    let tick = 0;
    animTimerRef.current = window.setInterval(() => {
      tick = (tick + 1) % 100;
      const icons = polyline.get('icons') as google.maps.IconSequence[] | undefined;
      if (icons?.[0]) {
        icons[0].offset = `${tick}%`;
        polyline.set('icons', icons);
      }
    }, 80); // yavaş ve zarif
  }, [stopAnimation]);

  useEffect(() => () => stopAnimation(), [stopAnimation]);

  // Aktivite anahtarı — sadece koordinatlar değişince fitBounds çalışır
  const activitiesKey = useMemo(
    () => activities.map(a => `${a.coordinates.lat},${a.coordinates.lng}`).join('|'),
    [activities]
  );
  const prevKeyRef = useRef<string>('');

  // Düz nokta dizisi (fitBounds ve arc hesabı için temel) — bilinçli olarak
  // activities yerine activitiesKey'e bağlı: sadece koordinatlar değişince
  // yeniden hesaplansın, activities referansı (örn. başlık düzenlemesi)
  // değişince map gereksiz yere fitBounds/pan yapmasın.
  const path = useMemo(
    () => activities.map(a => ({ lat: a.coordinates.lat, lng: a.coordinates.lng })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activitiesKey],
  );

  // Tüm segment yaylarını birleştiren sürekli eğri
  const arcPath = useMemo(() => {
    if (path.length < 2) return path;
    const pts: { lat: number; lng: number }[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const seg = generateArcPath(path[i], path[i + 1]);
      // İlk segment hariç başlangıç noktasını atla (önceki segmentin son noktasıyla çakışır)
      pts.push(...(i === 0 ? seg : seg.slice(1)));
    }
    return pts;
  }, [path]);

  useEffect(() => {
    if (map) map.setOptions({ styles: dark ? darkMapStyles : [] });
  }, [dark, map]);

  const onLoad = useCallback((m: google.maps.Map) => {
    setMap(m);
    prevKeyRef.current = '';
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
    prevKeyRef.current = '';
  }, []);

  // FitBounds — sadece gün değişince
  useEffect(() => {
    if (!map || activities.length === 0) return;
    if (activitiesKey === prevKeyRef.current) return;
    prevKeyRef.current = activitiesKey;

    const bounds = new window.google.maps.LatLngBounds();
    activities.forEach(a => bounds.extend({ lat: a.coordinates.lat, lng: a.coordinates.lng }));
    if (hotel?.lat && hotel?.lng) bounds.extend({ lat: hotel.lat, lng: hotel.lng });
    map.fitBounds(bounds);

    const listener = window.google.maps.event.addListener(map, 'idle', () => {
      if ((map.getZoom() ?? 0) > 16) map.setZoom(16);
      window.google.maps.event.removeListener(listener);
    });
  }, [map, activitiesKey, activities, hotel]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full min-h-[400px] bg-surface-2 flex items-center justify-center rounded-2xl border border-divider">
        <div className="text-muted font-medium animate-pulse">{t('mapView.loading')}</div>
      </div>
    );
  }

  const makeHotelMarkerIcon = () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="80" height="64" viewBox="0 0 80 64">
        <defs>
          <filter id="hsh" x="-40%" y="-30%" width="180%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity="0.26"/>
          </filter>
        </defs>
        <!-- Etiket: beyaz çerçeve + kırmızı dolgu -->
        <rect x="3" y="1" width="74" height="17" rx="5" ry="5" fill="white" opacity="0.95"/>
        <rect x="4" y="2" width="72" height="15" rx="4" ry="4" fill="#dc2626"/>
        <text x="40" y="10" text-anchor="middle" dominant-baseline="middle"
              font-family="-apple-system,system-ui,sans-serif"
              font-size="8.5" font-weight="700" fill="white" letter-spacing="0.2">${t('mapView.hotelLabel')}</text>
        <!-- Pin gövdesi -->
        <path d="M40 21 C33 21 27 27 27 34 C27 43.5 40 62 40 62 C40 62 53 43.5 53 34 C53 27 47 21 40 21 Z"
              fill="#dc2626" stroke="white" stroke-width="2" filter="url(#hsh)"/>
        <!-- İç beyaz daire -->
        <circle cx="40" cy="34" r="7" fill="white" opacity="0.95"/>
      </svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(80, 64),
      anchor: new window.google.maps.Point(40, 62),
    };
  };

  const makeMarkerIcon = (index: number) => {
    const num = index + 1;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
        <defs>
          <filter id="sh${num}" x="-40%" y="-20%" width="180%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity="0.28"/>
          </filter>
        </defs>
        <!-- Damla (pin) gövdesi -->
        <path d="M16 2 C9 2 3 8 3 15 C3 24.5 16 42 16 42 C16 42 29 24.5 29 15 C29 8 23 2 16 2 Z"
              fill="${dark ? '#e08a4f' : '#c67139'}" stroke="white" stroke-width="2" filter="url(#sh${num})"/>
        <!-- İç beyaz daire -->
        <circle cx="16" cy="15" r="8" fill="white" opacity="0.95"/>
        <!-- Numara -->
        <text x="16" y="19.5" text-anchor="middle"
              font-family="system-ui,sans-serif"
              font-size="${num > 9 ? '9' : '11'}" font-weight="800" fill="${dark ? '#e08a4f' : '#8c491a'}">${num}</text>
      </svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(32, 44),
      anchor: new window.google.maps.Point(16, 42), // ucun tam altı
    };
  };

  return (
    <div className="w-full h-full min-h-[400px] md:min-h-[600px] rounded-2xl overflow-hidden shadow-sm border border-divider relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={MAP_INIT_CENTER}
        zoom={MAP_INIT_ZOOM}
        options={{ ...baseMapOptions, styles: dark ? darkMapStyles : [] }}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {/* ── Katman 1: Beyaz dış hat — derinlik ve keskinlik ── */}
        {arcPath.length > 1 && (
          <PolylineF
            path={arcPath}
            options={{
              strokeColor:   '#ffffff',
              strokeOpacity: 0.9,
              strokeWeight:  8,
              geodesic:      false,
              zIndex:        1,
            }}
          />
        )}

        {/* ── Katman 2: Sage ana kemer çizgisi ── */}
        {arcPath.length > 1 && (
          <PolylineF
            path={arcPath}
            options={{
              strokeColor:   dark ? '#9fb37e' : '#7a8a5e',
              strokeOpacity: 1,
              strokeWeight:  4,
              geodesic:      false,
              zIndex:        2,
            }}
          />
        )}

        {/* ── Katman 3: Yavaş akan yön okları ── */}
        {arcPath.length > 1 && (
          <PolylineF
            path={arcPath}
            onLoad={handleAnimPolyLoad}
            options={{
              strokeOpacity: 0,
              strokeWeight:  0,
              geodesic:      false,
              zIndex:        3,
              icons: [
                {
                  icon: {
                    path:         google.maps.SymbolPath.FORWARD_OPEN_ARROW,
                    scale:        3,
                    strokeColor:  '#ffffff',
                    strokeWeight: 2.5,
                    strokeOpacity: 0.95,
                  },
                  offset: '15%',
                  repeat: '250px',
                },
              ],
            }}
          />
        )}

        {/* Otel markeri */}
        {hotel?.lat && hotel?.lng && (
          <MarkerF
            position={{ lat: hotel.lat, lng: hotel.lng }}
            icon={isLoaded ? makeHotelMarkerIcon() : undefined}
            title={hotel.name}
            zIndex={999}
            options={{ cursor: 'pointer' }}
            onClick={() => {
              if (onActivityClick) {
                onActivityClick({ placeName: hotel.name, lat: hotel.lat, lng: hotel.lng });
              }
            }}
          />
        )}

        {/* Aktivite markerleri */}
        {activities.map((act, index) => (
          <MarkerF
            key={index}
            position={{ lat: act.coordinates.lat, lng: act.coordinates.lng }}
            icon={isLoaded ? makeMarkerIcon(index) : undefined}
            options={{ cursor: 'pointer' }}
            title={act.placeName}
            onClick={() => {
              if (onActivityClick) {
                onActivityClick({
                  placeName: act.placeName,
                  lat: act.coordinates.lat,
                  lng: act.coordinates.lng,
                });
              } else {
                console.log('[MapView] Tıklanan mekan:', act.placeName,
                  usePlanStore.getState().plan?.currencySymbol,
                  act.actualCost !== undefined ? act.actualCost : act.estimatedCost);
              }
            }}
          />
        ))}
      </GoogleMap>
    </div>
  );
};

export default MapView;
