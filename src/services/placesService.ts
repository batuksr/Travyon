export interface PlaceReview {
  authorName: string;
  authorPhoto: string;
  rating: number;
  text: string;
  relativeTime: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  userRatingsTotal: number;
  photos: string[];
  reviews: PlaceReview[];
  openingHours?: string[];
  website?: string;
  phone?: string;
  priceLevel?: number;
}

const placeCache = new Map<string, PlaceDetails>();

const findPlaceId = async (
  placeName: string,
  lat: number,
  lng: number
): Promise<string | null> => {
  if (!window.google?.maps?.places) {
    console.warn('[Places] Google Maps Places API yüklenmemiş');
    return null;
  }

  const service = new window.google.maps.places.PlacesService(
    document.createElement('div')
  );

  return new Promise((resolve) => {
    service.findPlaceFromQuery(
      {
        query: placeName,
        fields: ['place_id'],
        locationBias: new window.google.maps.LatLng(lat, lng),
      },
      (results, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          results?.[0]
        ) {
          resolve(results[0].place_id || null);
        } else {
          console.warn(`[Places] place_id bulunamadı: ${placeName}`);
          resolve(null);
        }
      }
    );
  });
};

export const fetchPlaceDetails = async (
  placeName: string,
  lat: number,
  lng: number
): Promise<PlaceDetails | null> => {
  const cacheKey = `${placeName}_${lat}_${lng}`;

  if (placeCache.has(cacheKey)) {
    console.log(`[Places] Cache hit: ${placeName}`);
    return placeCache.get(cacheKey)!;
  }

  try {
    const placeId = await findPlaceId(placeName, lat, lng);
    if (!placeId) return null;

    if (!window.google?.maps?.places) return null;

    const service = new window.google.maps.places.PlacesService(
      document.createElement('div')
    );

    return new Promise((resolve) => {
      service.getDetails(
        {
          placeId,
          language: 'tr',
          fields: [
            'name',
            'formatted_address',
            'rating',
            'user_ratings_total',
            'photos',
            'reviews',
            'opening_hours',
            'website',
            'formatted_phone_number',
            'price_level',
          ],
        },
        (place, status) => {
          if (
            status !== window.google.maps.places.PlacesServiceStatus.OK ||
            !place
          ) {
            console.warn(`[Places] Detay çekilemedi: ${placeName}`);
            resolve(null);
            return;
          }

          const details: PlaceDetails = {
            placeId,
            name: place.name || placeName,
            address: place.formatted_address || '',
            rating: place.rating || 0,
            userRatingsTotal: place.user_ratings_total || 0,
            photos: (place.photos || [])
              .slice(0, 6)
              .map((photo) => photo.getUrl({ maxWidth: 800, maxHeight: 600 })),
            reviews: (place.reviews || []).slice(0, 5).map((r) => ({
              authorName: r.author_name,
              authorPhoto: r.profile_photo_url,
              rating: r.rating || 0,
              text: r.text || '',
              relativeTime: r.relative_time_description || '',
            })),
            openingHours: place.opening_hours?.weekday_text,
            website: place.website,
            phone: place.formatted_phone_number,
            priceLevel: place.price_level,
          };

          placeCache.set(cacheKey, details);
          console.log(`[Places] ✅ Detay çekildi: ${placeName}`);
          resolve(details);
        }
      );
    });
  } catch (error) {
    console.error('[Places] Hata:', error);
    return null;
  }
};
