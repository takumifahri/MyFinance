import assert from 'node:assert/strict';
import test from 'node:test';

import { needsOwnerName, normalizeOwnerName } from './owner-name.ts';

test('nama pemilik dirapikan sebelum disimpan', () => {
  assert.equal(normalizeOwnerName('  Takumi   Fahri  '), 'Takumi Fahri');
});

test('instalasi tanpa nama harus masuk onboarding', () => {
  assert.equal(needsOwnerName(null), true);
  assert.equal(needsOwnerName('   '), true);
  assert.equal(needsOwnerName('Takumi'), false);
});
