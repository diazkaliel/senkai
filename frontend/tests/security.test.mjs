import test from 'node:test';
import assert from 'node:assert/strict';

import {
  escapeHtml,
  safeColorHex,
  safeArtworkUrl,
  safeNavigationHref
} from '../js/services/html_escape.js';

test('encodes content and HTML attributes without trusting customer text', () => {
  const maliciousName = '<img src=x onerror="alert(1)">';
  assert.equal(
    escapeHtml(maliciousName),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
  );
  assert.equal(escapeHtml("O'Connor & Co."), 'O&#39;Connor &amp; Co.');
});

test('rejects CSS injection via customer-supplied garment colors', () => {
  assert.equal(safeColorHex('#A1B2C3'), '#A1B2C3');
  assert.equal(safeColorHex('red; background-image:url(evil)'), '#121212');
});

test('allows only local artwork links with predictable path grammar', () => {
  assert.equal(safeArtworkUrl('/static/assets/uploads/dtf_ab12.svg'), '/static/assets/uploads/dtf_ab12.svg');
  assert.equal(safeArtworkUrl('javascript:alert(1)'), '');
  assert.equal(safeArtworkUrl('/static/assets/../admin'), '');
  assert.equal(safeArtworkUrl('/static/assets/image.png" onerror="alert(1)'), '');
});

test('prevents executable schemes from CMS navigation buttons', () => {
  assert.equal(safeNavigationHref('#personalizador'), '#personalizador');
  assert.equal(safeNavigationHref('/catalogo'), '/catalogo');
  assert.equal(safeNavigationHref('javascript:alert(1)'), '#personalizador');
  assert.equal(safeNavigationHref('data:text/html,<script>alert(1)</script>'), '#personalizador');
});
