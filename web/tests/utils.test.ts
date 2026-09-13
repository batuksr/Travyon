import { afterEach, describe, expect, it, vi } from 'vitest';
import { haversineDistance, optimizeRouteTSP } from '../src/utils/geoOptimization';
import { relativeTime } from '../src/utils/timeUtils';
import type { DailyActivity } from '../src/services/aiService';
import {
  formatDistanceKm,
  formatDistanceRangeKm,
  formatSpeedKmh,
  formatTemperatureC,
} from '../src/utils/unitFormatters';

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

describe('unit formatters', () => {
  it('uses metric units and Turkish decimal formatting', () => {
    expect(formatDistanceKm(2.4, true, 'tr')).toBe('2,4 km');
    expect(formatTemperatureC(24, true, 'tr')).toBe('24°C');
    expect(formatSpeedKmh(18, true, 'tr')).toBe('18 km/sa');
  });

  it('converts values and uses English decimal formatting', () => {
    expect(formatDistanceKm(2.4, false, 'en')).toBe('1.5 mi');
    expect(formatTemperatureC(24, false, 'en')).toBe('75°F');
    expect(formatSpeedKmh(18, false, 'en')).toBe('11 mph');
    expect(formatDistanceRangeKm(3, 4, false, 'en', true)).toBe('1.9–2.5 mi/day');
  });
});
