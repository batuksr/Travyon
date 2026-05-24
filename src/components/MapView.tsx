import React, { useState, useCallback, useEffect } from 'react';
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

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '1rem'
};

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

  // Dark mod değişince harita stilini güncelle
  useEffect(() => {
    if (map) {
      map.setOptions({ styles: dark ? darkMapStyles : [] });
    }
  }, [dark, map]);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  // FitBounds — tüm aktiviteleri görünür yap
  useEffect(() => {
    if (map && activities.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      activities.forEach(activity => {
        bounds.extend({ lat: activity.coordinates.lat, lng: activity.coordinates.lng });
      });
      map.fitBounds(bounds);

      const listener = window.google.maps.event.addListener(map, 'idle', function () {
        if (map.getZoom() && map.getZoom()! > 16) {
          map.setZoom(16);
        }
        window.google.maps.event.removeListener(listener);
      });
    }
  }, [map, activities]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full min-h-[400px] bg-slate-100 flex items-center justify-center rounded-2xl border border-slate-200">
        <div className="text-slate-500 font-medium animate-pulse">Harita Yükleniyor...</div>
      </div>
    );
  }

  const path = activities.map(act => ({
    lat: act.coordinates.lat,
    lng: act.coordinates.lng
  }));

  return (
    <div className="w-full h-full min-h-[400px] md:min-h-[600px] rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={path[0] || { lat: 41.0082, lng: 28.9784 }}
        zoom={12}
        options={{ ...baseMapOptions, styles: dark ? darkMapStyles : [] }}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {/* Rota çizgisi (TSP optimize) */}
        {path.length > 1 && (
          <PolylineF
            path={path}
            options={{
              strokeColor: '#2563eb',
              strokeOpacity: 0.8,
              strokeWeight: 4,
              geodesic: true,
              icons: [{
                icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                offset: '50%',
              }]
            }}
          />
        )}

        {/* Marker'lar */}
        {activities.map((act, index) => (
          <MarkerF
            key={index}
            position={{ lat: act.coordinates.lat, lng: act.coordinates.lng }}
            label={{
              text: (index + 1).toString(),
              color: 'white',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
            options={{ cursor: 'pointer' }}
            onClick={() => {
              if (onActivityClick) {
                onActivityClick({
                  placeName: act.placeName,
                  lat: act.coordinates.lat,
                  lng: act.coordinates.lng,
                });
              } else {
                // Fallback: konsola yaz
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
