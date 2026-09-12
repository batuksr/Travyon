import { afterEach, describe, expect, it, vi } from 'vitest';
import { haversineDistance, optimizeRouteTSP } from '../src/utils/geoOptimization';
import { relativeTime } from '../src/utils/timeUtils';
import type { DailyActivity } from '../src/services/aiService';

const activity = (placeName: string, lat: number, lng: number): DailyActivity => ({
  period: 'Sabah',
  placeName,
  description: placeName,
  coordinates: { lat, lng },
  estimatedCost: 0,
});

describe('geoOptimization', () => {
  it('returns zero for identical coordinates', () => {
    expect(haversineDistance(41.0082, 28.9784, 41.0082, 28.9784)).toBe(0);
  });

  it('orders a two-stop route from the provided starting position', () => {
    const far = activity('Far', 41.1, 29.1);
    const near = activity('Near', 41.001, 29.001);
    const result = optimizeRouteTSP([far, near], { lat: 41, lng: 29 });
    expect(result.map(item => item.placeName)).toEqual(['Near', 'Far']);
  });
});

describe('relativeTime', () => {
  afterEach(() => vi.useRealTimers());

  it('uses the requested Turkish locale', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T12:00:00Z'));
    expect(relativeTime(Date.now() - 2 * 60_000, 'tr-TR')).toContain('2 dakika');
  });

  it('uses the requested English locale', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T12:00:00Z'));
    expect(relativeTime(Date.now() - 2 * 60_000, 'en-US')).toBe('2 minutes ago');
  });
});
