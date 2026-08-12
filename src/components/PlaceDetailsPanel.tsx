import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  X, Star, MapPin, Clock, Globe, Phone,
  ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react';
import { fetchPlaceDetails, type PlaceDetails } from '../services/placesService';

interface Props {
  placeName: string;
  lat: number;
  lng: number;
  onClose: () => void;
}

const PlaceDetailsPanel: React.FC<Props> = ({ placeName, lat, lng, onClose }) => {
  const { t, i18n } = useTranslation();
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setDetails(null);
    setPhotoIndex(0);
    setImageError(false);

    fetchPlaceDetails(placeName, lat, lng)
      .then((data) => {
        setDetails(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [placeName, lat, lng]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <>
      {/* Mobil backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="lg:hidden fixed inset-0 bg-black/30 z-40"
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl"
      >

        {/* Üst bar */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
          <div className="min-w-0 mr-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('placeDetails.label')}
            </p>
            <h2 className="font-bold text-slate-900 text-sm truncate">
              {details?.name || placeName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

          {loading ? (
            <div className="p-10 text-center">
              <div className="w-10 h-10 border-[3px] border-slate-200 border-t-[#187fe7] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">
                {t('placeDetails.loading')}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {t('placeDetails.loadingSubtitle')}
              </p>
            </div>
          ) : !details ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPin size={20} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-700 font-semibold mb-1">
                {t('placeDetails.notFound')}
              </p>
              <p className="text-xs text-slate-500">
                {t('placeDetails.notFoundSubtitle')}
              </p>
            </div>
          ) : (
            <>
              {/* Foto galerisi */}
              {details.photos.length > 0 && !imageError && (
                <div className="relative aspect-[16/10] bg-slate-100">
                  <img
                    src={details.photos[photoIndex]}
                    alt={details.name}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />

                  {details.photos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPhotoIndex(Math.max(0, photoIndex - 1))}
                        disabled={photoIndex === 0}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/95 backdrop-blur rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-all shadow-lg text-slate-800"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoIndex(Math.min(details.photos.length - 1, photoIndex + 1))}
                        disabled={photoIndex === details.photos.length - 1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/95 backdrop-blur rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-all shadow-lg text-slate-800"
                      >
                        <ChevronRight size={16} />
                      </button>

                      {/* Indicator dots */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {details.photos.map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 rounded-full transition-all ${i === photoIndex ? 'w-6 bg-white' : 'w-1 bg-white/50'}`}
                          />
                        ))}
                      </div>

                      <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/60 backdrop-blur rounded-md text-white text-[10px] font-semibold">
                        {photoIndex + 1} / {details.photos.length}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Detay bilgileri */}
              <div className="p-5 space-y-5">

                {/* Rating */}
                {details.rating > 0 && (
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
                      <Star size={14} className="fill-amber-500 text-amber-500" />
                      <span className="font-bold text-amber-900 text-sm">
                        {details.rating.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        {t('placeDetails.reviewsCount', {
                          count: details.userRatingsTotal.toLocaleString(i18n.language === 'en' ? 'en-US' : 'tr-TR'),
                        })}
                      </p>
                      <p className="text-[10px] text-slate-400">{t('placeDetails.googleData')}</p>
                    </div>
                    {details.priceLevel && (
                      <div className="ml-auto text-sm font-bold text-emerald-600">
                        {'$'.repeat(details.priceLevel)}
                      </div>
                    )}
                  </div>
                )}

                {/* Adres */}
                {details.address && (
                  <div className="flex items-start gap-3">
                    <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {details.address}
                    </p>
                  </div>
                )}

                {/* Çalışma saatleri */}
                {details.openingHours && details.openingHours.length > 0 && (
                  <details className="group">
                    <summary className="flex items-center gap-3 cursor-pointer list-none hover:text-[#187fe7] transition-colors">
                      <Clock size={14} className="text-slate-400 shrink-0 group-hover:text-[#187fe7]" />
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-[#187fe7]">
                        {t('placeDetails.openingHours')}
                      </span>
                      <ChevronRight
                        size={12}
                        className="ml-auto text-slate-400 group-open:rotate-90 transition-transform"
                      />
                    </summary>
                    <div className="ml-7 mt-2 space-y-1 pl-3 border-l-2 border-slate-100">
                      {details.openingHours.map((day, i) => (
                        <p key={i} className="text-xs text-slate-500">{day}</p>
                      ))}
                    </div>
                  </details>
                )}

                {/* Telefon */}
                {details.phone && (
                  <a
                    href={`tel:${details.phone}`}
                    className="flex items-center gap-3 text-sm text-slate-600 hover:text-[#187fe7] transition-colors"
                  >
                    <Phone size={14} className="shrink-0" />
                    <span className="font-medium">{details.phone}</span>
                  </a>
                )}

                {/* Website */}
                {details.website && (
                  <a
                    href={details.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-[#187fe7] hover:underline"
                  >
                    <Globe size={14} className="shrink-0" />
                    <span className="font-semibold truncate">{t('placeDetails.visitWebsite')}</span>
                    <ExternalLink size={11} className="shrink-0" />
                  </a>
                )}

                {/* Google Yorumları */}
                {details.reviews.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span>{t('placeDetails.reviewsTitle')}</span>
                      <span className="text-[9px] text-slate-400 font-medium normal-case tracking-normal">
                        {t('placeDetails.reviewsCountParen', { count: details.reviews.length })}
                      </span>
                    </h3>
                    <div className="space-y-4">
                      {details.reviews.map((review, i) => (
                        <div key={i} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                          <div className="flex items-center gap-3 mb-2">
                            <img
                              src={review.authorPhoto}
                              alt={review.authorName}
                              className="w-8 h-8 rounded-full bg-slate-100"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(review.authorName)}&background=187fe7&color=fff`;
                              }}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {review.authorName}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {review.relativeTime}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={11}
                                className={star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                              />
                            ))}
                          </div>

                          <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">
                            {review.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Google Maps'te Aç */}
                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${details.placeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-colors mt-4"
                >
                  {t('placeDetails.openInGoogleMaps')}
                  <ExternalLink size={13} />
                </a>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default PlaceDetailsPanel;
