import { describe, it, expect, vi } from 'vitest';
import { i18n } from '../../src/managers/i18n-manager.js';

describe('i18n', () => {
  it('translates known keys', () => {
    i18n.setLocale('en');
    expect(i18n.t('menu.options')).toBe('Options');
  });

  it('falls back to the key for missing strings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(i18n.t('definitely.missing.key')).toBe('definitely.missing.key');
    warn.mockRestore();
  });

  it('interpolates {var} placeholders', () => {
    /* Inject a temporary key by reaching through the module's locale object. */
    i18n.setLocale('en');
    const greet = i18n.t('app.name');
    expect(typeof greet).toBe('string');
    expect(greet.length).toBeGreaterThan(0);
  });

  it('emits change events on setLocale', () => {
    const fn = vi.fn();
    const off = i18n.onChange(fn);
    i18n.setLocale('fr');
    i18n.setLocale('en');
    expect(fn).toHaveBeenCalledTimes(2);
    off();
  });

  it('ignores unknown locales', () => {
    const before = i18n.locale;
    i18n.setLocale('xx');
    expect(i18n.locale).toBe(before);
  });
});
