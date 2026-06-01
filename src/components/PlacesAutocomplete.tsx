import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

/* ─────────────────────────────────────────────
   Ülke kodu haritası
───────────────────────────────────────────── */
const COUNTRY_CODE_MAP: Record<string, string> = {
  türkiye: 'tr', turkey: 'tr',
  italya: 'it', italy: 'it',
  fransa: 'fr', france: 'fr',
  ispanya: 'es', spain: 'es',
  yunanistan: 'gr', greece: 'gr',
  almanya: 'de', germany: 'de',
  ingiltere: 'gb', 'birleşik krallık': 'gb', uk: 'gb', england: 'gb',
  hollanda: 'nl', netherlands: 'nl',
  portekiz: 'pt', portugal: 'pt',
  avusturya: 'at', austria: 'at',
  belçika: 'be', belgium: 'be',
  isviçre: 'ch', switzerland: 'ch',
  japonya: 'jp', japan: 'jp',
  tayland: 'th', thailand: 'th',
  mısır: 'eg', egypt: 'eg',
  fas: 'ma', morocco: 'ma',
  dubai: 'ae', bae: 'ae', 'birleşik arap emirlikleri': 'ae', uae: 'ae',
  abd: 'us', amerika: 'us', usa: 'us', 'united states': 'us',
  kanada: 'ca', canada: 'ca',
  meksika: 'mx', mexico: 'mx',
  brezilya: 'br', brazil: 'br',
  arjantin: 'ar', argentina: 'ar',
  avustralya: 'au', australia: 'au',
  endonezya: 'id', indonesia: 'id',
  hindistan: 'in', india: 'in',
  çin: 'cn', china: 'cn',
  'güney kore': 'kr', 'south korea': 'kr', korea: 'kr',
  vietnam: 'vn',
  singapur: 'sg', singapore: 'sg',
  malezya: 'my', malaysia: 'my',
  filipinler: 'ph', philippines: 'ph',
  'sri lanka': 'lk',
  nepal: 'np',
  polonya: 'pl', poland: 'pl',
  'çek cumhuriyeti': 'cz', czechia: 'cz',
  macaristan: 'hu', hungary: 'hu',
  hırvatistan: 'hr', croatia: 'hr',
  slovenya: 'si', slovenia: 'si',
  sırbistan: 'rs', serbia: 'rs',
  romanya: 'ro', romania: 'ro',
  bulgaristan: 'bg', bulgaria: 'bg',
  ukrayna: 'ua', ukraine: 'ua',
  norveç: 'no', norway: 'no',
  isveç: 'se', sweden: 'se',
  finlandiya: 'fi', finland: 'fi',
  danimarka: 'dk', denmark: 'dk',
  irlanda: 'ie', ireland: 'ie',
  isreil: 'il', israel: 'il',
  'güney afrika': 'za', 'south africa': 'za',
  tanzanya: 'tz', tanzania: 'tz',
  kenya: 'ke',
  etiyopya: 'et', ethiopia: 'et',
  nijerya: 'ng', nigeria: 'ng',
  cezayir: 'dz', algeria: 'dz',
  tunus: 'tn', tunisia: 'tn',
  ürdün: 'jo', jordan: 'jo',
  lübnan: 'lb', lebanon: 'lb',
  'suudi arabistan': 'sa', 'saudi arabia': 'sa',
  katar: 'qa', qatar: 'qa',
  küba: 'cu', cuba: 'cu',
  kolombiya: 'co', colombia: 'co',
  peru: 'pe',
  şili: 'cl', chile: 'cl',
};

const getCountryCode = (destination: string): string | undefined => {
  if (!destination) return undefined;
  const lower = destination.toLowerCase().trim();
  const parts = lower.split(',');
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i].trim();
    if (COUNTRY_CODE_MAP[part]) return COUNTRY_CODE_MAP[part];
  }
  return COUNTRY_CODE_MAP[lower];
};

/* ─────────────────────────────────────────────
   Script yükleme yardımcısı
   — Hub.tsx zaten yüklüyse anında döner,
     yoksa Places kütüphanesiyle yükler.
───────────────────────────────────────────── */
let scriptPromise: Promise<void> | null = null;

const ensureGoogleMapsLoaded = (apiKey: string): Promise<void> => {
  // Zaten yüklü
  if (window.google?.maps?.places) return Promise.resolve();

  // Yüklenme devam ediyorsa aynı promise'i bekle
  if (scriptPromise) return scriptPromise;

  // DOM'da script etiketi var mı?
  const existing = document.querySelector('script[src*="maps.googleapis.com"]');
  if (existing) {
    // Başka bir yükleyici (Hub.tsx) başlattı, biz sadece bekleriz
    scriptPromise = new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const timer = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(timer);
          resolve();
        } else if (++attempts > 150) {        // ~15 saniye maksimum bekleme
          clearInterval(timer);
          reject(new Error('[PlacesAutocomplete] Google Maps yüklenemedi (timeout)'));
        }
      }, 100);
    });
    return scriptPromise;
  }

  // Script yok — kendimiz yükleriz
  const callbackName = `__gm_places_cb_${Date.now()}`;
  scriptPromise = new Promise<void>((resolve, reject) => {
    (window as unknown as Record<string, unknown>)[callbackName] = () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      resolve();
    };
    const script = document.createElement('script');
    script.id   = 'gm-places-loader';
    script.src  = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('[PlacesAutocomplete] Script yüklenemedi'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
};

/* ─────────────────────────────────────────────
   Tipler
───────────────────────────────────────────── */
export interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface Prediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

interface PlacesAutocompleteProps {
  value: string;
  onChange: (place: PlaceResult) => void;
  placeholder?: string;
  destination?: string;
  hasError?: boolean;
}

/* ═══════════════════════════════════════════
   Ana Bileşen
══════════════════════════════════════════ */
const PlacesAutocomplete: React.FC<PlacesAutocompleteProps> = ({
  value,
  onChange,
  placeholder,
  destination,
  hasError,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string || '';

  /* State */
  const [inputValue, setInputValue]   = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen]           = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [flashIndex, setFlashIndex]   = useState<number | null>(null);
  const [noResults, setNoResults]     = useState(false);
  const [apiReady, setApiReady]       = useState(false);

  /* Refs */
  const containerRef           = useRef<HTMLDivElement>(null);
  const debounceRef            = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef           = useRef(true);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef       = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef        = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  /* Unmount flag */
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  /* Google Maps API'yi garantiye al (Hub zaten yüklediyse anında döner) */
  useEffect(() => {
    if (!apiKey) {
      console.warn('[PlacesAutocomplete] VITE_GOOGLE_MAPS_API_KEY tanımlı değil.');
      return;
    }
    ensureGoogleMapsLoaded(apiKey)
      .then(() => { if (isMountedRef.current) setApiReady(true); })
      .catch((err) => console.warn(err));
  }, [apiKey]);

  /* Servisler: API hazır olunca başlat */
  useEffect(() => {
    if (!apiReady || !window.google?.maps?.places) return;
    try {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      const dummyDiv = document.createElement('div');
      placesServiceRef.current  = new window.google.maps.places.PlacesService(dummyDiv);
      sessionTokenRef.current   = new window.google.maps.places.AutocompleteSessionToken();
    } catch (err) {
      console.warn('[PlacesAutocomplete] Servis başlatılamadı:', err);
    }
  }, [apiReady]);

  /* Dışarıdan gelen value → input'u güncelle */
  useEffect(() => { setInputValue(value); }, [value]);

  /* Dışına tıklayınca kapat */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Debounce temizleme */
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  /* ── Lazy-init yardımcısı: fetchPredictions çağrısında servis yoksa oluştur ── */
  const ensureServices = useCallback((): boolean => {
    // Zaten hazır
    if (autocompleteServiceRef.current && placesServiceRef.current) return true;
    // API yüklenmiş ama effect henüz çalışmadıysa — burada çalıştır
    if (!window.google?.maps?.places) return false;
    try {
      if (!autocompleteServiceRef.current)
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      if (!placesServiceRef.current) {
        const dummyDiv = document.createElement('div');
        placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv);
      }
      if (!sessionTokenRef.current)
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      return true;
    } catch {
      return false;
    }
  }, []);

  /* ── Sonuçları state'e yaz ── */
  const applyPredictions = useCallback((preds: Prediction[]) => {
    if (!isMountedRef.current) return;
    if (preds.length > 0) {
      setPredictions(preds);
      setNoResults(false);
    } else {
      setPredictions([]);
      setNoResults(true);
    }
    setIsOpen(true);
    setActiveIndex(-1);
  }, []);

  /* ── YENİ Places API (AutocompleteSuggestion) ── */
  const fetchNew = useCallback(async (query: string, countryCode?: string): Promise<Prediction[] | null> => {
    const places = window.google?.maps?.places as unknown as {
      AutocompleteSuggestion?: {
        fetchAutocompleteSuggestions: (req: Record<string, unknown>) => Promise<{ suggestions: Array<{ placePrediction?: { placeId: string; mainText?: { text: string }; secondaryText?: { text: string }; text?: { text: string } } }> }>;
      };
    };
    if (!places?.AutocompleteSuggestion) return null; // yeni API yok → legacy'ye düş

    const req: Record<string, unknown> = {
      input: query,
      sessionToken: sessionTokenRef.current ?? undefined,
    };
    if (countryCode) req.includedRegionCodes = [countryCode];

    const res = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
    return (res.suggestions ?? [])
      .filter(s => s.placePrediction)
      .map(s => ({
        placeId:       s.placePrediction!.placeId,
        mainText:      s.placePrediction!.mainText?.text ?? s.placePrediction!.text?.text ?? '',
        secondaryText: s.placePrediction!.secondaryText?.text ?? '',
      }));
  }, []);

  /* ── ESKİ Places API (AutocompleteService) — fallback ── */
  const fetchLegacy = useCallback((query: string, countryCode?: string): Promise<Prediction[]> => {
    return new Promise((resolve) => {
      if (!ensureServices() || !autocompleteServiceRef.current) { resolve([]); return; }
      const request: google.maps.places.AutocompletionRequest = {
        input: query,
        types: ['establishment'],
        sessionToken: sessionTokenRef.current ?? undefined,
      };
      if (countryCode) request.componentRestrictions = { country: countryCode };
      autocompleteServiceRef.current.getPlacePredictions(request, (results, status) => {
        const ok = window.google.maps.places.PlacesServiceStatus.OK;
        if (status === ok && results) {
          resolve(results.map((r) => ({
            placeId:       r.place_id,
            mainText:      r.structured_formatting.main_text,
            secondaryText: r.structured_formatting.secondary_text || '',
          })));
        } else {
          resolve([]);
        }
      });
    });
  }, [ensureServices]);

  /* ── Ana istek: önce yeni API, olmazsa eski; her durumda spinner kapanır ── */
  const fetchPredictions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setPredictions([]); setNoResults(false); setIsOpen(false);
      return;
    }
    if (!window.google?.maps?.places) {
      console.warn('[PlacesAutocomplete] Google Maps places yüklü değil.');
      return;
    }

    setIsLoading(true);
    setNoResults(false);

    const countryCode = destination ? getCountryCode(destination) : undefined;

    // 8 sn güvenlik zaman aşımı — hiçbir koşulda spinner takılı kalmaz
    let settled = false;
    const safety = setTimeout(() => {
      if (!settled && isMountedRef.current) { setIsLoading(false); applyPredictions([]); }
    }, 8000);

    try {
      let preds = await fetchNew(query, countryCode);
      if (preds === null) {
        // yeni API mevcut değil → eski API'yi dene
        preds = await fetchLegacy(query, countryCode);
      }
      settled = true;
      clearTimeout(safety);
      if (isMountedRef.current) { setIsLoading(false); applyPredictions(preds); }
    } catch (err) {
      // yeni API hata verdiyse eski API'yi dene
      console.warn('[PlacesAutocomplete] Yeni API hatası, legacy deneniyor:', err);
      try {
        const preds = await fetchLegacy(query, countryCode);
        settled = true;
        clearTimeout(safety);
        if (isMountedRef.current) { setIsLoading(false); applyPredictions(preds); }
      } catch {
        settled = true;
        clearTimeout(safety);
        if (isMountedRef.current) { setIsLoading(false); applyPredictions([]); }
      }
    }
  }, [destination, fetchNew, fetchLegacy, applyPredictions]);

  /* ── Input değişimi ── */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) { setPredictions([]); setNoResults(false); setIsOpen(false); return; }
    debounceRef.current = setTimeout(() => fetchPredictions(val), 300);
  };

  /* ── Öneri seçimi: yeni Place API → legacy getDetails → koordinatsız ── */
  const handleSelectPrediction = useCallback(async (pred: Prediction, index: number) => {
    setFlashIndex(index);
    setTimeout(() => { if (isMountedRef.current) setFlashIndex(null); }, 200);
    setIsOpen(false);
    setActiveIndex(-1);
    setInputValue(pred.mainText);

    const finish = (name: string, address: string, lat: number, lng: number) => {
      if (!isMountedRef.current) return;
      setInputValue(address ? `${name}, ${address}` : name);
      onChange({ name, address, lat, lng });
    };

    // Oturum tokenını yenile (yeni arama için)
    const renewToken = () => {
      try { sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken(); } catch { /* yoksay */ }
    };

    // 1) YENİ API: Place.fetchFields
    const PlaceCls = (window.google?.maps?.places as unknown as {
      Place?: new (opts: { id: string }) => {
        fetchFields: (req: { fields: string[] }) => Promise<unknown>;
        displayName?: string;
        formattedAddress?: string;
        location?: { lat: () => number; lng: () => number };
      };
    })?.Place;

    if (PlaceCls) {
      try {
        const place = new PlaceCls({ id: pred.placeId });
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
        renewToken();
        finish(
          place.displayName ?? pred.mainText,
          place.formattedAddress ?? pred.secondaryText,
          place.location?.lat() ?? 0,
          place.location?.lng() ?? 0,
        );
        return;
      } catch (err) {
        console.warn('[PlacesAutocomplete] Yeni Place.fetchFields hatası, legacy deneniyor:', err);
      }
    }

    // 2) LEGACY: PlacesService.getDetails
    if (placesServiceRef.current) {
      const req: google.maps.places.PlaceDetailsRequest = {
        placeId: pred.placeId,
        fields:  ['name', 'formatted_address', 'geometry'],
        sessionToken: sessionTokenRef.current ?? undefined,
      };
      renewToken();
      placesServiceRef.current.getDetails(req, (result, status) => {
        const ok = window.google.maps.places.PlacesServiceStatus.OK;
        if (status === ok && result) {
          finish(
            result.name ?? pred.mainText,
            result.formatted_address ?? pred.secondaryText,
            result.geometry?.location?.lat() ?? 0,
            result.geometry?.location?.lng() ?? 0,
          );
        } else {
          finish(pred.mainText, pred.secondaryText, 0, 0);
        }
      });
      return;
    }

    // 3) Hiçbiri yoksa koordinatsız devam (AI yine de adres metnini kullanır)
    finish(pred.mainText, pred.secondaryText, 0, 0);
  }, [onChange]);

  /* ── Klavye navigasyonu ── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, predictions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && predictions[activeIndex]) handleSelectPrediction(predictions[activeIndex], activeIndex);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  /* ── Render ── */
  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (predictions.length > 0 || noResults) setIsOpen(true); }}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full px-3.5 py-2.5 pr-9 rounded-lg border text-sm outline-none transition-all
                      text-slate-800 placeholder:text-slate-400
                      ${hasError
                        ? 'border-rose-200 bg-rose-50/20 focus:border-rose-300'
                        : 'border-slate-200 bg-white focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/8'}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading
            ? <Loader2 size={14} className="animate-spin text-slate-400" />
            : <MapPin  size={14} className="text-slate-300" />}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[200]
                        bg-white border border-slate-200 rounded-xl shadow-lg
                        overflow-hidden max-h-80 overflow-y-auto">
          {predictions.length === 0 ? (
            <div className="px-4 py-3.5 text-sm text-slate-400 text-center select-none">
              Sonuç bulunamadı
            </div>
          ) : (
            predictions.map((pred, i) => {
              const isActive = activeIndex === i;
              const isFlash  = flashIndex  === i;
              return (
                <button
                  key={pred.placeId}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelectPrediction(pred, i); }}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left
                              transition-colors duration-100 min-h-[44px]
                              ${isFlash  ? 'bg-[#f8981d]/10 border-l-[3px] border-l-[#f8981d]'
                              : isActive ? 'bg-slate-100'
                                         : 'hover:bg-slate-50'}`}
                >
                  <MapPin
                    size={14}
                    className={`shrink-0 mt-0.5 transition-colors
                                ${isFlash ? 'text-[#f8981d]' : 'text-slate-400'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate leading-snug
                                   ${isFlash ? 'text-[#f8981d]' : 'text-slate-800'}`}>
                      {pred.mainText}
                    </p>
                    {pred.secondaryText && (
                      <p className="text-xs text-slate-400 truncate mt-0.5 leading-snug">
                        {pred.secondaryText}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default PlacesAutocomplete;
