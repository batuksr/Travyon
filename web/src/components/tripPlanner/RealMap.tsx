import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

interface RealMapProps {
  pins: MapPin[];
  stay: { lat: number; lng: number };
  activeId: string | null;
  onSelect: (id: string) => void;
}

/* CARTO'nun ücretsiz, API key gerektirmeyen "Voyager" tile seti — OpenStreetMap verisiyle,
   herkese açık bir sayfada makul trafik için uygun (attribution zorunlu, aşağıda veriliyor). */
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar &copy; <a href="https://carto.com/attributions">CARTO</a>';

const numberIcon = (num: number, active: boolean) => {
  const size = active ? 28 : 24;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px" class="${
      active
        ? 'bg-accent text-white ring-4 ring-accent/25'
        : 'bg-white text-accent-700 border-[1.5px] border-accent'
    } rounded-full flex items-center justify-center font-bold text-[11px] shadow-lg font-heading">${num}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const stayIcon = L.divIcon({
  className: '',
  html: `<svg width="28" height="28" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
    <path d="M12 22s7.5-6.8 7.5-12A7.5 7.5 0 1 0 4.5 10c0 5.2 7.5 12 7.5 12z" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="10" r="3" fill="#fff"/>
  </svg>`,
  iconSize: [28, 28],
  iconAnchor: [14, 26],
});

/* Gün değişince (veya aktivite eklenip/silinince ilk günde) haritayı o günün
   duraklarına ve konaklama noktasına göre otomatik kadrajlar. */
const FitToPins: React.FC<{ dayKey: string; points: [number, number][] }> = ({ dayKey, points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    // animate:false — permanent tooltip'ler (her pin'de her zaman görünür etiket) Leaflet'in
    // animasyonlu pan/zoom'u sırasında her frame'de yeniden konumlanmak zorunda kalıp
    // gözle görülür takılmaya (jank) yol açıyordu; anlık geçiş bunu ortadan kaldırıyor.
    map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 16, animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);
  return null;
};

const RealMap: React.FC<RealMapProps> = ({ pins, stay, activeId, onSelect }) => {
  const { t } = useTranslation();
  const mapRef = useRef<L.Map | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dayKey = pins.map((p) => p.id).join(',');
  const routePoints: [number, number][] = pins.map((p) => [p.lat, p.lng]);
  const allPoints: [number, number][] = [[stay.lat, stay.lng], ...routePoints];

  // Sol panel/harita ayracı sürüklendiğinde konteyner boyutu değişir ama Leaflet
  // bunu kendiliğinden fark etmez (yalnızca window resize'ı dinler) — ResizeObserver
  // ile container boyutu her değiştiğinde invalidateSize() çağırıp tile'ları düzelt.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full h-full">
      <MapContainer
        ref={mapRef}
        center={[stay.lat, stay.lng]}
        zoom={14}
        zoomControl={false}
        scrollWheelZoom
        className="w-full h-full"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <FitToPins dayKey={dayKey} points={allPoints} />

        {routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            pathOptions={{ color: '#c67139', weight: 3, dashArray: '2 8', lineCap: 'round', opacity: 0.85 }}
          />
        )}

        <Marker position={[stay.lat, stay.lng]} icon={stayIcon}>
          <Tooltip permanent direction="top" offset={[0, -24]} className="!bg-red-500 !text-white !border-0 !rounded-full !text-[10px] !font-bold !px-2 !py-0.5 !shadow">
            {t('home.product.demo.yourStay')}
          </Tooltip>
        </Marker>

        {pins.map((p, i) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={numberIcon(i + 1, p.id === activeId)}
            eventHandlers={{ click: () => onSelect(p.id) }}
          >
            <Tooltip
              permanent
              direction="top"
              offset={[0, p.id === activeId ? -18 : -16]}
              className={`!border !text-[10px] !font-semibold !px-1.5 !py-0.5 !rounded-md !shadow-sm
                ${p.id === activeId ? '!bg-accent !text-white !border-accent' : '!bg-white !text-[#2c2620] !border-[#ddd0bd]'}`}
            >
              {p.label}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {/* "X mekan optimize" rozeti */}
      <div className="absolute top-2.5 right-2.5 z-[500] flex items-center gap-1 bg-surface/95 border border-divider rounded-full pl-1.5 pr-2.5 py-1 shadow text-[10px] font-semibold text-muted pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-sage" />
        {t('dashboard.map.placesOptimized', { count: pins.length })}
      </div>

      {/* Özel yakınlaştırma kontrolleri (Leaflet varsayılanı yerine, uygulama stiliyle) */}
      <div className="absolute bottom-3 right-3 z-[500] flex flex-col gap-1">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="w-7 h-7 rounded-lg bg-surface border border-divider shadow flex items-center justify-center text-text hover:bg-surface-2 transition-colors text-sm font-bold"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="w-7 h-7 rounded-lg bg-surface border border-divider shadow flex items-center justify-center text-text hover:bg-surface-2 transition-colors text-sm font-bold"
        >
          −
        </button>
      </div>
    </div>
  );
};

export default RealMap;
