import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF } from '@react-google-maps/api';
import type { DailyActivity } from '../services/aiService';
import { usePlanStore } from '../store/usePlanStore';
import { useThemeStore } from '../store/useThemeStore';

// Stable reference — prevents SDK reload on every render
const LIBRARIES: ('places')[] = ['places'];

interface MapViewProps {
  activities: DailyActivity[];
  onActivityClick?: (place: { placeName: string; lat: number; lng: number }) => void;
}

const containerStyle = { width: '100%', height: '100%', borderRadius: '1rem' };

// Sabit başlangıç değerleri — render'da yeni obje oluşturmaz
const MAP_INIT_CENTER = { lat: 41.0082, lng: 28.9784 };
const MAP_INIT_ZOOM   = 12;

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

const MapView: React.FC<MapViewProps> = ({ activities, onActivityClick }) => {
  const { dark } = useThemeStore();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Aktivitelerin gerçekten değişip değişmediğini tespit etmek için anahtar
  // Sadece gün değişince (koordinatlar değişince) fitBounds yeniden çalışır
  const activitiesKey = useMemo(
    () => activities.map(a => `${a.coordinates.lat},${a.coordinates.lng}`).join('|'),
    [activities]
  );
  const prevKeyRef = useRef<string>('');

  // Dark mod değişince harita stilini güncelle
  useEffect(() => {
    if (map) map.setOptions({ styles: dark ? darkMapStyles : [] });
  }, [dark, map]);

  const onLoad = useCallback((m: google.maps.Map) => {
    setMap(m);
    prevKeyRef.current = ''; // yeni instance için sıfırla
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
    prevKeyRef.current = '';
  }, []);

  // FitBounds — sadece aktiviteler GERÇEKTEN değişince (gün geçişi) çalışır
  useEffect(() => {
    if (!map || activities.length === 0) return;
    if (activitiesKey === prevKeyRef.current) return; // aynı gün, re-render — atla
    prevKeyRef.current = activitiesKey;

    const bounds = new window.google.maps.LatLngBounds();
    activities.forEach(a => bounds.extend({ lat: a.coordinates.lat, lng: a.coordinates.lng }));
    map.fitBounds(bounds);

    const listener = window.google.maps.event.addListener(map, 'idle', () => {
      if ((map.getZoom() ?? 0) > 16) map.setZoom(16);
      window.google.maps.event.removeListener(listener);
    });
  }, [map, activitiesKey, activities]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full min-h-[400px] bg-slate-100 flex items-center justify-center rounded-2xl border border-slate-200">
        <div className="text-slate-500 font-medium animate-pulse">Harita Yükleniyor...</div>
      </div>
    );
  }

  const path = activities.map(a => ({ lat: a.coordinates.lat, lng: a.coordinates.lng }));

  // Custom marker SVG — yuvarlak köşeli kare, modern flat
  const makeMarkerIcon = (index: number) => {
    const num     = index + 1;
    const isFirst = index === 0;
    const bg      = isFirst ? '#ff0000' : '#ff0000';
    const border  = isFirst ? '#ffffff' : '#ffffff';
    const size    = 22;
    const r       =  8;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <defs>
          <filter id="sh${num}" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
          </filter>
        </defs>
        <rect x="2" y="2" width="${size - 4}" height="${size - 4}" rx="${r}" ry="${r}"
              fill="${bg}" stroke="${border}" stroke-width="1.5" filter="url(#sh${num})"/>
        <text x="${size / 2}" y="${size / 2 + 5}" text-anchor="middle"
              font-family="system-ui,sans-serif"
              font-size="${num > 9 ? '11' : '13'}" font-weight="800" fill="white">${num}</text>
      </svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size / 2, size / 2),
    };
  };

  return (
    <div className="w-full h-full min-h-[400px] md:min-h-[600px] rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={MAP_INIT_CENTER}
        zoom={MAP_INIT_ZOOM}
        options={{ ...baseMapOptions, styles: dark ? darkMapStyles : [] }}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {/* Rota çizgisi — temiz kesikli çizgi, ok yok */}
        {path.length > 1 && (
          <PolylineF
            path={path}
            options={{
              strokeColor: '#0059ff',
              strokeOpacity: 0,
              strokeWeight: 0,
              geodesic: true,
              icons: [
                {
                  icon: {
                    path: 'M 0,-1 0,1',
                    strokeOpacity: 0.85,
                    strokeWeight: 3,
                    scale: 4,
                    strokeColor: '#0059ff',
                  },
                  offset: '0',
                  repeat: '18px',
                },
              ],
            }}
          />
        )}

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
                console.log('[MapView] Tıklanan mekan:', act.placeName);
                console.log('[MapView] Detay:', usePlanStore.getState().plan?.currencySymbol,
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
