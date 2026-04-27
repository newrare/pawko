import { describe, it, expect, vi, beforeEach } from 'vitest';
import { optionsManager } from '../../src/managers/options-manager.js';
import { DEFAULT_OPTIONS, STORAGE_KEYS } from '../../src/configs/constants.js';

beforeEach(() => optionsManager._resetForTests());

describe('optionsManager', () => {
  it('exposes defaults when storage is empty', () => {
    expect(optionsManager.musicEnabled).toBe(DEFAULT_OPTIONS.music);
    expect(optionsManager.soundEnabled).toBe(DEFAULT_OPTIONS.sound);
  });

  it('persists writes to localStorage', () => {
    optionsManager.set('music', false);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.OPTIONS));
    expect(raw.music).toBe(false);
  });

  it('emits change events with key + value', () => {
    const fn = vi.fn();
    optionsManager.onChange(fn);
    optionsManager.set('sound', false);
    expect(fn).toHaveBeenCalledWith('sound', false);
  });

  it('emits typed change:<key> events', () => {
    const fn = vi.fn();
    optionsManager.on('change:animSkip', fn);
    optionsManager.set('animSkip', true);
    expect(fn).toHaveBeenCalledWith(true);
  });

  it('skips emit when value is unchanged', () => {
    const fn = vi.fn();
    optionsManager.onChange(fn);
    optionsManager.set('music', optionsManager.musicEnabled);
    expect(fn).not.toHaveBeenCalled();
  });
});
