import { AIReviewResult, reviewCategories, reviewSeverities } from './types';

export const reviewJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'riskLevel', 'findings'],
  properties: {
    summary: { type: 'string' },
    riskLevel: { type: 'string', enum: ['high', 'medium', 'low'] },
    findings: {
      type: 'array',
      maxItems: 20,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['category', 'severity', 'title', 'file', 'line', 'description', 'evidence', 'suggestion', 'confidence'],
        properties: {
          category: { type: 'string', enum: reviewCategories },
          severity: { type: 'string', enum: reviewSeverities },
          title: { type: 'string' },
          file: { type: 'string' },
          line: { type: ['integer', 'null'] },
          description: { type: 'string' },
          evidence: { type: 'string' },
          suggestion: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
  },
} as const;

export function parseReviewResult(value: string): AIReviewResult {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object') throw new Error('AI response is not an object');
  const result = parsed as Record<string, unknown>;
  if (typeof result.summary !== 'string' || !['high', 'medium', 'low'].includes(String(result.riskLevel)) || !Array.isArray(result.findings)) {
    throw new Error('AI response has an invalid review shape');
  }
  for (const finding of result.findings as Array<Record<string, unknown>>) {
    if (!finding || !reviewCategories.includes(finding.category as never) || !reviewSeverities.includes(finding.severity as never)) {
      throw new Error('AI response contains an invalid finding');
    }
    for (const field of ['title', 'file', 'description', 'evidence', 'suggestion']) {
      if (typeof finding[field] !== 'string') throw new Error(`AI finding has invalid ${field}`);
    }
    if (finding.line !== null && (!Number.isInteger(finding.line) || Number(finding.line) < 1)) throw new Error('AI finding has an invalid line');
    if (typeof finding.confidence !== 'number' || finding.confidence < 0 || finding.confidence > 1) throw new Error('AI finding has invalid confidence');
  }
  return parsed as AIReviewResult;
}
