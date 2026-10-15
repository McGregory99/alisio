import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMobile, afterGesture, sheetHeight, MOBILE_MAX_PX, COLLAPSED_PX } from '../../src/ui/sheet-model.mjs';

test('mobile layout applies at 768 px and below (R7.9)', () => {
  assert.equal(MOBILE_MAX_PX, 768);
  assert.equal(isMobile(375), true);
  assert.equal(isMobile(768), true);
  assert.equal(isMobile(769), false);
});

test('a tap toggles the sheet', () => {
  assert.equal(afterGesture('collapsed', 0), 'expanded');
  assert.equal(afterGesture('expanded', 3), 'collapsed');
  assert.equal(afterGesture('collapsed', -3), 'expanded');
});

test('dragging up expands and dragging down collapses, from either state', () => {
  assert.equal(afterGesture('collapsed', -80), 'expanded');
  assert.equal(afterGesture('expanded', -80), 'expanded');
  assert.equal(afterGesture('expanded', 80), 'collapsed');
  assert.equal(afterGesture('collapsed', 80), 'collapsed');
});

test('a short drag that is not a tap keeps the state', () => {
  assert.equal(afterGesture('collapsed', -20), 'collapsed');
  assert.equal(afterGesture('expanded', 20), 'expanded');
});

test('heights: collapsed is a fixed handle, expanded is 70% of the viewport above the disclaimer', () => {
  assert.equal(sheetHeight('collapsed', 800, 28), COLLAPSED_PX);
  assert.equal(sheetHeight('expanded', 800, 28), Math.round((800 - 28) * 0.7));
  assert.ok(sheetHeight('expanded', 300, 28) > COLLAPSED_PX);
});

test('live drag height follows the finger and stays within the limits', () => {
  assert.equal(sheetHeight('collapsed', 800, 28, -100), COLLAPSED_PX + 100);
  assert.equal(sheetHeight('collapsed', 800, 28, 100), COLLAPSED_PX);
  assert.equal(sheetHeight('expanded', 800, 28, -2000), Math.round((800 - 28) * 0.7));
});
