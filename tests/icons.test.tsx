import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Mail } from 'lucide-react';
import AppIcon from '../src/components/AppIcon';
import IconBadge from '../src/components/IconBadge';
import { getWeatherInfo } from '../src/services/weatherService';
import tr from '../src/i18n/locales/tr.json';
import en from '../src/i18n/locales/en.json';

describe('Shared interface icons', () => {
  it('renders decorative, consistent-stroke SVG icons', () => {
    const markup = renderToStaticMarkup(<AppIcon name="mail" size={22} />);
    expect(markup).toContain('<svg');
    expect(markup).toContain('stroke-width="1.65"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('width="22"');
    expect(markup).not.toContain('lucide-compass');
  });

  it('provides an accessible label when the icon conveys a standalone value', () => {
    const markup = renderToStaticMarkup(<AppIcon name="check" label="Dahil" />);
    expect(markup).toContain('aria-label="Dahil"');
    expect(markup).toContain('role="img"');
    expect(markup).not.toContain('aria-hidden');
  });

  it('supports existing Lucide components and semantic icon names in the same badge', () => {
    expect(renderToStaticMarkup(<IconBadge icon={Mail} />))
      .toBe(renderToStaticMarkup(<IconBadge icon="mail" />));
  });

  it('uses theme tokens for neutral and selected states', () => {
    expect(renderToStaticMarkup(<IconBadge icon="leaf" />)).toContain('text-sage-700');
    expect(renderToStaticMarkup(<IconBadge icon="leaf" selected />)).toContain('text-accent-700');
    expect(renderToStaticMarkup(<IconBadge icon="leaf" variant="compact" />)).not.toContain('border border-');
  });

  it('renders a known SVG for every weather condition', () => {
    for (const code of [0, 1, 2, 3, 45, 48, 51, 53, 55, 61, 63, 65, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99, -1]) {
      const { icon } = getWeatherInfo(code);
      expect(icon).toMatch(/^[a-z-]+$/);
      expect(renderToStaticMarkup(<AppIcon name={icon} />)).not.toContain('lucide-compass');
    }
  });

  it('keeps translated choices and quick questions mapped to known icons', () => {
    for (const locale of [tr, en]) {
      const choices = [
        ...Object.values(locale.onboarding.step3.diets),
        ...locale.aiAssistant.quickQuestions,
        ...locale.aiAssistant.planQuestions,
      ];
      for (const { icon } of choices) {
        expect(icon).toMatch(/^[a-z-]+$/);
        expect(renderToStaticMarkup(<AppIcon name={icon} />)).not.toContain('lucide-compass');
      }
      expect(locale.settings.subscription.compare.rows.some(row => row.free === 'check' || row.pro === 'check')).toBe(true);
      expect(locale.settings.subscription.compare.included).toBeTruthy();
    }
  });

  it('keeps authored UI translations free of emoji without removing copyright symbols', () => {
    for (const locale of [tr, en]) {
      const text = JSON.stringify(locale).replace(/[©®™]/g, '');
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(locale.footer.copyright).toContain('©');
    }
  });
});
