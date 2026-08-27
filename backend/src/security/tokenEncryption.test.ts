import assert from 'node:assert/strict';
import test from 'node:test';
import { decryptToken, encryptToken } from './tokenEncryption';

test('encryptToken round-trips without storing plaintext', () => {
  const plaintext = 'gho_example_access_token';
  const encrypted = encryptToken(plaintext);

  assert.notEqual(encrypted, plaintext);
  assert.equal(encrypted.startsWith('v1:'), true);
  assert.equal(decryptToken(encrypted), plaintext);
});

test('decryptToken rejects tampered ciphertext', () => {
  const encrypted = encryptToken('gho_example_access_token');
  const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith('A') ? 'B' : 'A'}`;

  assert.throws(() => decryptToken(tampered));
});

test('decryptToken rejects legacy plaintext values', () => {
  assert.throws(
    () => decryptToken('gho_legacy_plaintext_token'),
    /legacy format/
  );
});
