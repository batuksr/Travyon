import type { DailyActivity } from '../services/aiService';
import type { TravelWalletEntry } from '../store/useTravelWalletStore';

export function directionsUrl(activity: DailyActivity, city: string): string {
  const { lat, lng } = activity.coordinates;
  const valid = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0);
  const query = new URLSearchParams({ api: '1', destination: valid ? `${lat},${lng}` : `${activity.placeName}, ${city}`, dir_action: 'navigate' });
  return `https://www.google.com/maps/dir/?${query}`;
}

export function walletEntriesForDay(entries: TravelWalletEntry[], planId: string | null, date: string): TravelWalletEntry[] {
  if (!planId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  return entries.filter(entry => {
    if (entry.planId !== planId || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return false;
    const end = entry.category === 'stay' ? entry.details?.checkOut : entry.category === 'insurance' ? entry.details?.endDate : undefined;
    return entry.date === date || Boolean(end && /^\d{4}-\d{2}-\d{2}$/.test(end) && entry.date <= date && date <= end);
  }).sort((a, b) => (a.details?.time ?? '').localeCompare(b.details?.time ?? ''));
}
