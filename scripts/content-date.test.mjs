import assert from 'node:assert/strict';
import test from 'node:test';
import { normDate } from './lib/content-date.mjs';
import { validateCoreFile } from './lib/core-artifact.mjs';
import { indexFingerprintRow } from './lib/content-fingerprint.mjs';

test('sponsor-only changes invalidate the article index fingerprint', () => {
  const article = { id: 'one', title: 'Fixture', author: { name: 'Fixture', role: 'desk' } };
  assert.notEqual(indexFingerprintRow(article), indexFingerprintRow({ ...article, sponsor: 'fixture-sponsor' }));
  assert.notEqual(indexFingerprintRow({ ...article, sponsor: 'first' }), indexFingerprintRow({ ...article, sponsor: 'second' }));
});

test('content dates reject rollover, invalid correction dates and missing values', () => {
  for (const value of ['2026-02-31 09:00', '2025-02-29 09:00', '2026-04-31 09:00', '2026-10-07 24:00', 'invalid', '']) {
    assert.equal(normDate(value), 'Invalid Date', value);
  }
  assert.equal(normDate('2024-02-29 09:00'), '2024-02-29T09:00:00Z');
  assert.equal(normDate('2026-10-07T12:30:00+09:00'), '2026-10-07T12:30:00Z');
  assert.equal(normDate('2026-10-07'), '2026-10-07T09:00:00Z');
});

test('release core validation rejects malformed and empty search indexes and non-XML payloads', () => {
  for (const body of ['{', '[]', '{}', '[{"slug":"x"}]']) {
    assert.throws(() => validateCoreFile('articles-index.json', body));
  }
  assert.throws(() => validateCoreFile('rss.xml', '<html>error</html>'));
  assert.throws(() => validateCoreFile('sitemap.xml', '<?xml version="1.0"?><urlset></rss>'));
  assert.throws(() => validateCoreFile('robots.txt', 'User-agent: *'));
});
