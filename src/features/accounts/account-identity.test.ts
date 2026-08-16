import assert from 'node:assert/strict';
import test from 'node:test';

import { isSameAccount, normalizeAccountName } from './account-identity.ts';

test('nama akun dinormalisasi untuk validasi duplikat', () => {
  assert.equal(normalizeAccountName('  Bank   Jago '), 'bank jago');
  assert.equal(
    isSameAccount(
      { name: 'DANA', type: 'ewallet' },
      { name: ' dana ', type: 'ewallet' },
    ),
    true,
  );
});

test('nama sama dengan jenis berbeda bukan akun yang sama', () => {
  assert.equal(
    isSameAccount(
      { name: 'Dompet', type: 'cash' },
      { name: 'Dompet', type: 'bank' },
    ),
    false,
  );
});
