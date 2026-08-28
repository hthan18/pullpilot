import { AIReviewResult, PreparedDiff, ReviewFinding, ReviewSeverity } from './types';

const severityRank: Record<ReviewSeverity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export interface ValidationMetadata {
  generated: number;
  accepted: number;
  rejected: number;
  reasons: Record<string, number>;
}

export function findingKey(finding: ReviewFinding): string {
  return `${finding.file}:${finding.line ?? 'file'}:${finding.title.trim().toLowerCase()}`;
}

export function validateFindings(
  result: AIReviewResult,
  prepared: PreparedDiff,
  options: { minimumConfidence: number; minimumSeverity: ReviewSeverity }
): { result: AIReviewResult; metadata: ValidationMetadata } {
  const files = new Set(prepared.analyzedFiles);
  const seen = new Set<string>();
  const reasons: Record<string, number> = {};
  const reject = (reason: string) => { reasons[reason] = (reasons[reason] || 0) + 1; };
  const findings = result.findings.filter((finding) => {
    if (!files.has(finding.file)) { reject('unknown_file'); return false; }
    if (finding.confidence < options.minimumConfidence) { reject('low_confidence'); return false; }
    if (severityRank[finding.severity] < severityRank[options.minimumSeverity]) { reject('below_severity_threshold'); return false; }
    if (finding.line !== null && !prepared.changedLines[finding.file]?.includes(finding.line)) { reject('line_not_changed'); return false; }
    const key = findingKey(finding);
    if (seen.has(key)) { reject('duplicate'); return false; }
    seen.add(key);
    return true;
  });

  const riskLevel = findings.some((finding) => finding.severity === 'critical' || finding.severity === 'high')
    ? 'high'
    : findings.some((finding) => finding.severity === 'medium') ? 'medium' : 'low';
  return {
    result: { ...result, riskLevel, findings },
    metadata: { generated: result.findings.length, accepted: findings.length, rejected: result.findings.length - findings.length, reasons },
  };
}
