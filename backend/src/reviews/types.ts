export const reviewCategories = [
  'security',
  'correctness',
  'reliability',
  'performance',
  'maintainability',
] as const;

export const reviewSeverities = ['critical', 'high', 'medium', 'low'] as const;

export type ReviewCategory = (typeof reviewCategories)[number];
export type ReviewSeverity = (typeof reviewSeverities)[number];

export interface ReviewFinding {
  category: ReviewCategory;
  severity: ReviewSeverity;
  title: string;
  file: string;
  line: number | null;
  description: string;
  evidence: string;
  suggestion: string;
  confidence: number;
}

export interface AIReviewResult {
  summary: string;
  riskLevel: 'high' | 'medium' | 'low';
  findings: ReviewFinding[];
}

export interface GitHubPullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface PreparedDiff {
  prompt: string;
  analyzedFiles: string[];
  skippedFiles: Array<{ file: string; reason: string }>;
}
