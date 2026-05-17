import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF, InfoWindowF } from '@react-google-maps/api';
import type { DailyActivity } from '../services/aiService';
import { usePlanStore } from '../store/usePlanStore';

interface MapViewProps {
  activities: DailyActivity[];
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

const MapView: React.FC<MapViewProps> = ({ activities }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<DailyActivity | null>(null);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  // Odaklanma (FitBounds) Algoritması
  useEffect(() => {
    if (map && activities.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      activities.forEach(activity => {
        bounds.extend({ lat: activity.coordinates.lat, lng: activity.coordinates.lng });
      });
      map.fitBounds(bounds);
      
      // Tek aktivite varsa veya tüm aktiviteler aynı noktadaysa (çok dar kalıyorsa) yaklaştırmayı kısıtla
      const listener = window.google.maps.event.addListener(map, 'idle', function() { 
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

  // Sadece Polyline çizimi için koordinat arrayi
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
        {/* Rota Çizgisi (TSP Optimizasyonu) */}
        {path.length > 1 && (
          <PolylineF
            path={path}
            options={{
              strokeColor: '#2563eb', // Blue-600
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

        {/* Hedef Noktaları (Markers) */}
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
            onClick={() => setSelectedActivity(act)}
          />
        ))}

        {/* Info Penceresi */}
        {selectedActivity && (
          <InfoWindowF
            position={{ 
              lat: selectedActivity.coordinates.lat, 
              lng: selectedActivity.coordinates.lng 
            }}
            onCloseClick={() => setSelectedActivity(null)}
          >
            <div className="p-1 max-w-[200px]">
              <h3 className="font-bold text-slate-800 text-sm mb-1">{selectedActivity.placeName}</h3>
              <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold mb-2">
                <span>🗓️ {selectedActivity.period}</span>
                <span>💵 {usePlanStore.getState().plan?.currencySymbol}{selectedActivity.actualCost !== undefined ? selectedActivity.actualCost : selectedActivity.estimatedCost}</span>
              </div>
              <p className="text-xs text-slate-600 leading-snug">{selectedActivity.description}</p>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
      
      {/* Harita Etiketi (Görsel Güven) */}
      <div className="absolute top-4 right-14 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs font-semibold text-slate-700 z-10 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
        Coğrafi Olarak Optimize Edildi
      </div>
    </div>
  );
};

export default MapView;
