export interface User {
  id: number;
  username: string;
  email?: string | null;
  avatar_url: string;
}

export interface GitHubRepository {
  github_repo_id: string;
  name: string;
  full_name: string;
  owner: string;
  description?: string | null;
  private?: boolean;
  url?: string;
}

export interface Repository extends GitHubRepository {
  id: number | string;
  is_active: boolean;
  created_at: string;
  auto_review?: boolean;
  post_to_github?: boolean;
  minimum_severity?: ReviewSeverity;
}

export type ReviewStatus = 'pending' | 'completed' | 'failed';
export type ReviewSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ReviewCategory = 'security' | 'correctness' | 'reliability' | 'performance' | 'maintainability';

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

export interface StructuredAnalysis {
  summary: string;
  riskLevel: 'high' | 'medium' | 'low';
  findings: ReviewFinding[];
  metadata?: { analyzedFiles: string[]; skippedFiles: Array<{ file: string; reason: string }> };
}

export interface Review {
  id: number | string;
  repository_id: number | string;
  pr_number: number;
  pr_title: string;
  status: ReviewStatus;
  analysis_result: StructuredAnalysis | Record<string, unknown> | null;
  model?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  files_reviewed?: number | null;
  files_skipped?: number | null;
  error_message?: string | null;
  github_comment_url?: string | null;
  created_at: string;
  completed_at?: string | null;
}
