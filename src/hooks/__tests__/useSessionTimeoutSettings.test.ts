import { describe, it, expect } from 'vitest';
import {
  normalizeSessionTimeoutSettings,
  DEFAULT_SESSION_TIMEOUT_SETTINGS,
} from '../useSessionTimeoutSettings';

describe('useSessionTimeoutSettings - normalizeSessionTimeoutSettings', () => {
  it('returns default settings when input is null, undefined, or empty', () => {
    expect(normalizeSessionTimeoutSettings(null)).toEqual(DEFAULT_SESSION_TIMEOUT_SETTINGS);
    expect(normalizeSessionTimeoutSettings(undefined)).toEqual(DEFAULT_SESSION_TIMEOUT_SETTINGS);
    expect(normalizeSessionTimeoutSettings({})).toEqual(DEFAULT_SESSION_TIMEOUT_SETTINGS);
  });

  it('correctly parses custom valid values', () => {
    const input = {
      enabled: false,
      admin_background_minutes: 5,
      staff_background_minutes: 10,
      admin_idle_minutes: 15,
      staff_idle_minutes: 25,
      show_warning_dialog: false,
      warning_countdown_seconds: 60,
    };

    const result = normalizeSessionTimeoutSettings(input);
    expect(result.enabled).toBe(false);
    expect(result.admin_background_minutes).toBe(5);
    expect(result.staff_background_minutes).toBe(10);
    expect(result.admin_idle_minutes).toBe(15);
    expect(result.staff_idle_minutes).toBe(25);
    expect(result.show_warning_dialog).toBe(false);
    expect(result.warning_countdown_seconds).toBe(60);
  });

  it('falls back to defaults when invalid numbers or types are provided', () => {
    const input = {
      enabled: 'yes', // invalid boolean
      admin_background_minutes: 'invalid',
      staff_background_minutes: -10,
      admin_idle_minutes: NaN,
      staff_idle_minutes: null,
      show_warning_dialog: 123,
      warning_countdown_seconds: 1, // too small (min is 10)
    };

    const result = normalizeSessionTimeoutSettings(input);
    expect(result.enabled).toBe(DEFAULT_SESSION_TIMEOUT_SETTINGS.enabled);
    expect(result.admin_background_minutes).toBe(DEFAULT_SESSION_TIMEOUT_SETTINGS.admin_background_minutes);
    expect(result.staff_background_minutes).toBe(DEFAULT_SESSION_TIMEOUT_SETTINGS.staff_background_minutes);
    expect(result.admin_idle_minutes).toBe(DEFAULT_SESSION_TIMEOUT_SETTINGS.admin_idle_minutes);
    expect(result.staff_idle_minutes).toBe(DEFAULT_SESSION_TIMEOUT_SETTINGS.staff_idle_minutes);
    expect(result.show_warning_dialog).toBe(DEFAULT_SESSION_TIMEOUT_SETTINGS.show_warning_dialog);
    expect(result.warning_countdown_seconds).toBe(DEFAULT_SESSION_TIMEOUT_SETTINGS.warning_countdown_seconds);
  });

  it('allows 0 for disabling individual timeouts', () => {
    const input = {
      admin_background_minutes: 0,
      staff_background_minutes: 0,
      admin_idle_minutes: 0,
      staff_idle_minutes: 0,
    };

    const result = normalizeSessionTimeoutSettings(input);
    expect(result.admin_background_minutes).toBe(0);
    expect(result.staff_background_minutes).toBe(0);
    expect(result.admin_idle_minutes).toBe(0);
    expect(result.staff_idle_minutes).toBe(0);
  });
});
