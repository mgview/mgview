import test from 'node:test';
import assert from 'node:assert/strict';

import { formatCssColor, parseCssColorString } from './materialPresets.ts';

test('parseCssColorString parses hex and rgba values into normalized output', () => {
  assert.deepEqual(parseCssColorString('#369'), {
    red: 51,
    green: 102,
    blue: 153,
    alpha: 1,
    cssText: '#336699',
    hex: '#336699',
  });

  assert.deepEqual(parseCssColorString('rgba(12, 34, 56, 0.5)'), {
    red: 12,
    green: 34,
    blue: 56,
    alpha: 0.5,
    cssText: 'rgba(12, 34, 56, 0.5)',
    hex: '#0c2238',
  });

  assert.deepEqual(parseCssColorString('brown'), {
    red: 165,
    green: 42,
    blue: 42,
    alpha: 1,
    cssText: '#a52a2a',
    hex: '#a52a2a',
  });
});

test('formatCssColor prefers hex for opaque colors and rgba for transparent colors', () => {
  assert.equal(formatCssColor(12, 34, 56, 1), '#0c2238');
  assert.equal(formatCssColor(12, 34, 56, 0.375), 'rgba(12, 34, 56, 0.375)');
});
