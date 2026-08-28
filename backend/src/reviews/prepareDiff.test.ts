import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareDiff } from './prepareDiff';

test('keeps source patches and skips non-reviewable files', () => {
  const result = prepareDiff([
    { filename: 'src/app.ts', status: 'modified', additions: 2, deletions: 1, patch: '@@ -1 +1 @@\n-old\n+new' },
    { filename: 'package-lock.json', status: 'modified', additions: 1, deletions: 1, patch: 'lock data' },
    { filename: 'logo.png', status: 'modified', additions: 0, deletions: 0 },
    { filename: 'src/old.ts', status: 'removed', additions: 0, deletions: 10, patch: '-old' },
  ]);

  assert.deepEqual(result.analyzedFiles, ['src/app.ts']);
  assert.equal(result.skippedFiles.length, 3);
  assert.match(result.prompt, /FILE: src\/app\.ts/);
  assert.doesNotMatch(result.prompt, /lock data/);
});

test('truncates oversized patches', () => {
  const result = prepareDiff([{ filename: 'src/large.ts', status: 'modified', additions: 1, deletions: 0, patch: 'x'.repeat(20_000) }]);
  assert.match(result.prompt, /\[patch truncated\]$/);
  assert.ok(result.prompt.length < 13_000);
});
