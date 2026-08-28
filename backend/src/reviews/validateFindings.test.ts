import assert from 'node:assert/strict';
import test from 'node:test';
import { AIReviewResult, PreparedDiff } from './types';
import { validateFindings } from './validateFindings';

const prepared: PreparedDiff = {
  prompt: 'diff', analyzedFiles: ['src/app.ts'], skippedFiles: [], changedLines: { 'src/app.ts': [10, 11] },
};
const base: AIReviewResult = {
  summary: 'Review', riskLevel: 'high', findings: [
    { category: 'correctness', severity: 'high', title: 'Real bug', file: 'src/app.ts', line: 10, description: 'Bug', evidence: 'line 10', suggestion: 'Fix', confidence: 0.9 },
    { category: 'security', severity: 'high', title: 'Invented', file: 'src/missing.ts', line: 3, description: 'No', evidence: 'none', suggestion: 'No', confidence: 0.99 },
    { category: 'maintainability', severity: 'low', title: 'Weak', file: 'src/app.ts', line: 11, description: 'Minor', evidence: 'line 11', suggestion: 'Change', confidence: 0.55 },
  ],
};

test('rejects findings that cannot be grounded in the configured diff', () => {
  const validated = validateFindings(base, prepared, { minimumConfidence: 0.65, minimumSeverity: 'low' });
  assert.equal(validated.result.findings.length, 1);
  assert.equal(validated.metadata.rejected, 2);
  assert.deepEqual(validated.metadata.reasons, { unknown_file: 1, low_confidence: 1 });
});

test('applies repository severity thresholds', () => {
  const validated = validateFindings(base, prepared, { minimumConfidence: 0.5, minimumSeverity: 'critical' });
  assert.equal(validated.result.findings.length, 0);
  assert.equal(validated.result.riskLevel, 'low');
});
