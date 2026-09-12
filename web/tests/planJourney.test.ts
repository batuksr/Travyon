import { describe, expect, it } from 'vitest';
import { directionsUrl, walletEntriesForDay } from '../src/utils/planJourney';
import type { DailyActivity } from '../src/services/aiService';
import type { TravelWalletEntry } from '../src/store/useTravelWalletStore';

const activity: DailyActivity = { placeName: 'Museum & Park', period: 'Sabah', description: '', estimatedCost: 10, coordinates: { lat: 37.38, lng: -5.99 } };
const entry = (changes: Partial<TravelWalletEntry> = {}): TravelWalletEntry => ({ id: 'ticket', planId: 'p1', category: 'ticket', title: 'Ticket', reference: '', date: '2026-09-12', note: '', url: '', createdAt: 0, ...changes });

describe('journey directions', () => {
  it('opens Maps directions without collecting the visitor location', () => {
    const url = new URL(directionsUrl(activity, 'Sevilla'));
    expect(url.origin).toBe('https://www.google.com');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('destination')).toBe('37.38,-5.99');
    expect(url.searchParams.has('origin')).toBe(false);
  });
  it('falls back to the encoded place and city for invalid coordinates', () => {
    expect(new URL(directionsUrl({ ...activity, coordinates: { lat: NaN, lng: 0 } }, 'Sevilla')).searchParams.get('destination')).toBe('Museum & Park, Sevilla');
  });
});

describe('daily wallet matching', () => {
  it('matches exact plan and date, never unrelated/general or undated entries', () => {
    const entries = [entry(), entry({ id: 'other', planId: 'p2' }), entry({ id: 'undated', date: '' }), entry({ id: 'otherday', date: '2026-09-13' }), entry({ id: 'general', planId: 'general' })];
    expect(walletEntriesForDay(entries, 'p1', '2026-09-12').map(e => e.id)).toEqual(['ticket']);
    expect(walletEntriesForDay(entries, null, '2026-09-12')).toEqual([]);
  });
  it('includes stays through checkout and insurance through coverage end', () => {
    const entries = [entry({ id: 'stay', category: 'stay', date: '2026-09-10', details: { checkOut: '2026-09-12' } }), entry({ id: 'insurance', category: 'insurance', date: '2026-09-01', details: { endDate: '2026-09-13' } })];
    expect(walletEntriesForDay(entries, 'p1', '2026-09-12')).toHaveLength(2);
    expect(walletEntriesForDay(entries, 'p1', '2026-09-13').map(e => e.id)).toEqual(['insurance']);
    expect(walletEntriesForDay(entries, 'p1', '2026-08-31')).toEqual([]);
    expect(walletEntriesForDay(entries, 'p1', '')).toEqual([]);
  });
  it('sorts timed entries in order', () => {
    const entries = [entry({ id: 'late', details: { time: '18:00' } }), entry({ id: 'early', details: { time: '09:00' } })];
    expect(walletEntriesForDay(entries, 'p1', '2026-09-12').map(e => e.id)).toEqual(['early', 'late']);
  });
});
