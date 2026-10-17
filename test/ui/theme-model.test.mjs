import { test } from 'node:test';
import assert from 'node:assert/strict';
import { themeForSun, nextThemeMode, resolveTheme } from '../../src/ui/theme-model.mjs';

test('auto theme follows the sun with hysteresis around the horizon', () => {
  assert.equal(themeForSun(30, 'dark'), 'light');
  assert.equal(themeForSun(-20, 'light'), 'dark');
  assert.equal(themeForSun(-1, 'light'), 'light'); // twilight keeps the current theme
  assert.equal(themeForSun(-1, 'dark'), 'dark');
  assert.equal(themeForSun(1, 'dark'), 'dark');
  assert.equal(themeForSun(5, 'dark'), 'light');
  assert.equal(themeForSun(-6, 'light'), 'dark');
});

test('mode cycles auto -> light -> dark -> auto', () => {
  assert.equal(nextThemeMode('auto'), 'light');
  assert.equal(nextThemeMode('light'), 'dark');
  assert.equal(nextThemeMode('dark'), 'auto');
  assert.equal(nextThemeMode('nonsense'), 'auto');
});

test('a manual mode wins over the sun; auto defers to it; missing sun keeps the previous theme', () => {
  assert.equal(resolveTheme('dark', 60, 'light'), 'dark');
  assert.equal(resolveTheme('light', -60, 'dark'), 'light');
  assert.equal(resolveTheme('auto', -60, 'light'), 'dark');
  assert.equal(resolveTheme('auto', undefined, 'dark'), 'dark');
});
