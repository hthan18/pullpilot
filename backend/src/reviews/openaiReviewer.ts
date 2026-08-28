import OpenAI from 'openai';
import { env } from '../config/env';
import { parseReviewResult, reviewJsonSchema } from './reviewSchema';
import { AIReviewResult } from './types';

export interface GeneratedReview {
  result: AIReviewResult;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export async function generateReview(prTitle: string, diff: string): Promise<GeneratedReview> {
  if (!env.openaiApiKey) throw new Error('OPENAI_API_KEY is not configured');
  if (!diff.trim()) throw new Error('No reviewable text patches were found in this pull request');

  const client = new OpenAI({ apiKey: env.openaiApiKey });
  const response = await client.responses.create({
    model: env.openaiModel,
    instructions: [
      'You are a careful senior code reviewer.',
      'Review only the supplied changed lines and their immediate context.',
      'Report concrete bugs, security flaws, reliability risks, performance problems, or important maintainability issues.',
      'Do not invent missing context. Omit speculative or cosmetic findings.',
      'The evidence must quote or precisely identify the relevant changed code.',
      'Use the new-file line number when it is unambiguous; otherwise use null.',
      'Return no more than 20 findings, ordered by severity.',
    ].join(' '),
    input: `Pull request title: ${prTitle}\n\nChanged files:\n${diff}`,
    text: {
      format: {
        type: 'json_schema',
        name: 'pull_request_review',
        strict: true,
        schema: reviewJsonSchema,
      },
    },
  });

  if (!response.output_text) throw new Error('OpenAI returned no review output');
  return {
    result: parseReviewResult(response.output_text),
    model: response.model,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  };
}
