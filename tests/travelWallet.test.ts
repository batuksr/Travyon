import { describe, expect, it } from 'vitest';
import { normalizeWalletUrl, sanitizeWalletInput } from '../src/store/useTravelWalletStore';

describe('travel wallet input safety', () => {
  it('normalizes ordinary reservation links to HTTPS', () => {
    expect(normalizeWalletUrl('airline.example/manage/ABC'))
      .toBe('https://airline.example/manage/ABC');
    expect(normalizeWalletUrl('https://hotel.example/booking'))
      .toBe('https://hotel.example/booking');
  });

  it('rejects non-web protocols', () => {
    expect(normalizeWalletUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeWalletUrl('data:text/html,test')).toBeNull();
  });

  it('trims stored fields and keeps an empty link empty', () => {
    expect(sanitizeWalletInput({
      planId: '  plan-1  ',
      category: 'flight',
      title: '  Roma   uçuşu  ',
      reference: '  ABC123 ',
      url: '',
    })).toEqual({
      planId: 'plan-1',
      category: 'flight',
      title: 'Roma uçuşu',
      reference: 'ABC123',
      date: '',
      note: '',
      url: '',
    });
  });
});
