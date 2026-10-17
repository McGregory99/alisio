import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRAWERS, panelHome, toggleDrawer, keyAction, escapeTarget } from '../../src/ui/drawer-model.mjs';

test('four drawers, each with a unique shortcut key and a label', () => {
  assert.deepEqual(DRAWERS.map((d) => d.id), ['passes', 'kpis', 'env', 'about']);
  assert.equal(new Set(DRAWERS.map((d) => d.key)).size, DRAWERS.length);
  assert.ok(DRAWERS.every((d) => d.label && d.title && /^[a-z]$/.test(d.key)));
  assert.ok(!DRAWERS.some((d) => d.key === 'h'), 'h is the cinematic key');
});

test('panels land in their drawer; the detail has its own place; unknown panels go to About', () => {
  assert.equal(panelHome('tracker'), 'passes');
  assert.equal(panelHome('globe'), 'passes');
  assert.equal(panelHome('tables'), 'passes');
  assert.equal(panelHome('kpis'), 'kpis');
  assert.equal(panelHome('weather'), 'env');
  assert.equal(panelHome('edrs'), 'env');
  assert.equal(panelHome('legend'), 'about');
  assert.equal(panelHome('notes'), 'about');
  assert.equal(panelHome('detail'), 'detail');
  assert.equal(panelHome('something-new'), 'about');
});

test('one drawer at a time: opening replaces, the same tab again closes', () => {
  assert.equal(toggleDrawer(null, 'passes'), 'passes');
  assert.equal(toggleDrawer('passes', 'kpis'), 'kpis');
  assert.equal(toggleDrawer('kpis', 'kpis'), null);
});

const press = (key, extra = {}) => keyAction({ key, ctrlKey: false, metaKey: false, altKey: false, typing: false, ...extra });

test('keys: drawer letters toggle, h is cinematic, ? is the help menu', () => {
  assert.deepEqual(press('p'), { type: 'toggle', id: 'passes' });
  assert.deepEqual(press('K'), { type: 'toggle', id: 'kpis' });
  assert.deepEqual(press('w'), { type: 'toggle', id: 'env' });
  assert.deepEqual(press('i'), { type: 'toggle', id: 'about' });
  assert.deepEqual(press('h'), { type: 'cinematic' });
  assert.deepEqual(press('?'), { type: 'menu' });
  assert.equal(press('x'), null);
});

test('keys are ignored while typing and with modifiers (so search and browser shortcuts keep working)', () => {
  assert.equal(press('p', { typing: true }), null);
  assert.equal(press('p', { ctrlKey: true }), null);
  assert.equal(press('h', { metaKey: true }), null);
  assert.equal(press('k', { altKey: true }), null);
});

test('Escape closes the topmost layer first: cinematic, menu, drawer, then the selection', () => {
  assert.equal(escapeTarget({ cinematic: true, menu: true, drawer: 'passes', selected: true }), 'cinematic');
  assert.equal(escapeTarget({ cinematic: false, menu: true, drawer: 'passes', selected: true }), 'menu');
  assert.equal(escapeTarget({ cinematic: false, menu: false, drawer: 'passes', selected: true }), 'drawer');
  assert.equal(escapeTarget({ cinematic: false, menu: false, drawer: null, selected: true }), 'selection');
  assert.equal(escapeTarget({ cinematic: false, menu: false, drawer: null, selected: false }), null);
});
