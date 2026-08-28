import { GitHubPullRequestFile, PreparedDiff } from './types';

const MAX_FILES = 100;
const MAX_PATCH_CHARS_PER_FILE = 12_000;
const MAX_TOTAL_CHARS = 60_000;
const ignoredFile = /(^|\/)(dist|build|coverage|vendor|generated)(\/|$)|(?:\.min\.(?:js|css)|package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/i;

export function prepareDiff(files: GitHubPullRequestFile[]): PreparedDiff {
  const analyzedFiles: string[] = [];
  const skippedFiles: Array<{ file: string; reason: string }> = [];
  const sections: string[] = [];
  let totalChars = 0;

  for (const file of files.slice(0, MAX_FILES)) {
    let reason: string | undefined;
    if (file.status === 'removed') reason = 'deleted file';
    else if (ignoredFile.test(file.filename)) reason = 'generated, built, or lock file';
    else if (!file.patch) reason = 'binary file or patch unavailable';
    else if (totalChars >= MAX_TOTAL_CHARS) reason = 'review input limit reached';

    if (reason) {
      skippedFiles.push({ file: file.filename, reason });
      continue;
    }

    const available = MAX_TOTAL_CHARS - totalChars;
    const patch = file.patch!.slice(0, Math.min(MAX_PATCH_CHARS_PER_FILE, available));
    const truncated = patch.length < file.patch!.length ? '\n[patch truncated]' : '';
    const section = `FILE: ${file.filename}\nSTATUS: ${file.status}\nCHANGES: +${file.additions} -${file.deletions}\nPATCH:\n${patch}${truncated}`;
    sections.push(section);
    analyzedFiles.push(file.filename);
    totalChars += patch.length;
  }

  if (files.length > MAX_FILES) {
    for (const file of files.slice(MAX_FILES)) {
      skippedFiles.push({ file: file.filename, reason: 'file count limit reached' });
    }
  }

  return { prompt: sections.join('\n\n---\n\n'), analyzedFiles, skippedFiles };
}
