import { useJsApiLoader } from '@react-google-maps/api';

/* Uygulama genelinde TEK Google Maps script yükleyici.
   Önceden Hub.tsx / MapView.tsx / DailyPlanView.tsx kendi useJsApiLoader'ını,
   PlacesAutocomplete.tsx ise kendi elle yazılmış <script> enjeksiyonunu
   (ensureGoogleMapsLoaded) çalıştırıyordu. Dashboard bunların birkaçını aynı
   anda mount ettiğinde (DailyPlanView + MapView) veya kullanıcı önce
   PlacesAutocomplete'in olduğu bir sayfaya uğrayıp sonra Dashboard'a
   geçtiğinde, Maps JS API script'i BİRDEN FAZLA/ÇAKIŞAN mekanizmayla
   yüklenmeye çalışılıyor ve Google bunu algılayıp
   "NotLoadingAPIFromGoogleMapsError" fırlatıyordu (resmi bootstrap loader
   dışında bir şeyin script'i yüklediğini tespit edince verdiği hata).
   Artık TÜM bileşenler bu tek hook'u — aynı id + aynı libraries referansıyla
   — kullanıyor. */
const GOOGLE_MAPS_LIBRARIES: ('places')[] = ['places'];

export const useGoogleMapsLoader = (): { isLoaded: boolean; loadError: Error | undefined } =>
  useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
