import assert from 'node:assert/strict';
import test from 'node:test';
import { parseReviewResult } from './reviewSchema';

test('accepts a valid structured review', () => {
  const value = parseReviewResult(JSON.stringify({
    summary: 'One correctness problem.', riskLevel: 'medium', findings: [{
      category: 'correctness', severity: 'medium', title: 'Wrong boundary', file: 'src/app.ts', line: 12,
      description: 'The last item is omitted.', evidence: 'The loop uses i < length - 1.',
      suggestion: 'Iterate while i < length.', confidence: 0.95,
    }],
  }));
  assert.equal(value.findings[0].file, 'src/app.ts');
});

test('rejects invalid confidence', () => {
  assert.throws(() => parseReviewResult(JSON.stringify({
    summary: 'Invalid', riskLevel: 'low', findings: [{ category: 'correctness', severity: 'low', title: 'x', file: 'x.ts', line: null,
      description: 'x', evidence: 'x', suggestion: 'x', confidence: 2 }],
  })), /confidence/);
});
