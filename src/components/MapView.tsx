import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF } from '@react-google-maps/api';
import type { DailyActivity } from '../services/aiService';
import { usePlanStore } from '../store/usePlanStore';

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

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
};

const MapView: React.FC<MapViewProps> = ({ activities, onActivityClick }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

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
        options={mapOptions}
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
