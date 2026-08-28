# PullPilot

PullPilot is an evidence-first AI review workspace for GitHub pull requests. It combines repository-specific review policies, diff-grounded finding validation, developer feedback, quality analytics, and explicitly approved GitHub publishing.

> Current status: the complete local product workflow is implemented, including authentication, repository policies, structured AI review, deterministic evidence validation, feedback analytics, and GitHub PR publishing.

## Why PullPilot is different

Most AI review demos display everything a model generates. PullPilot treats model output as an untrusted candidate set:

- Findings must reference a file that was actually analyzed.
- Line-specific findings must point to a changed line in the supplied patch.
- Findings below the repository's confidence or severity policy are removed.
- Duplicate findings are removed before developers see them.
- Accepted and dismissed findings are recorded so review quality is measurable.
- GitHub comments are published only after an explicit user action.

This makes the project an exploration of **trustworthy and measurable AI review**, rather than another generic pull-request summarizer.

## Architecture

- `frontend/`: React, TypeScript, Vite, React Router, and Axios
- `backend/`: Node.js, Express, TypeScript, JWT authentication, and GitHub OAuth
- PostgreSQL: users, connected repositories, review policies, history, validation metadata, and finding feedback
- Original hosting: Vercel frontend with a Railway API and PostgreSQL database

## Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer
- A GitHub OAuth App for the complete authentication flow

## 1. Install dependencies

```powershell
cd frontend
npm ci

cd ..\backend
npm ci
```

## 2. Configure the environment

Copy the committed templates without changing the templates themselves:

```powershell
Copy-Item frontend\.env.example frontend\.env.local
Copy-Item backend\.env.example backend\.env
```

Create a local PostgreSQL database named `pullpilot`, then update `backend/.env` if its connection string differs from the template.

For GitHub OAuth, create or update an OAuth App with this development callback URL:

```text
http://localhost:5000/api/auth/github/callback
```

Never commit `.env`, `.env.local`, OAuth secrets, database passwords, access tokens, or JWT secrets.

Create an OpenAI API key and set `OPENAI_API_KEY` in `backend/.env`. `OPENAI_MODEL` defaults to `gpt-5.4-mini` and can be overridden there.

For production, generate a separate GitHub-token encryption key and set `TOKEN_ENCRYPTION_KEY`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Development derives a local encryption key from `JWT_SECRET` when this optional value is blank. Production startup rejects a missing encryption key.

## 3. Initialize PostgreSQL

From `backend/`:

```powershell
npm run db:check
npm run db:migrate
```

The migrations are idempotent and create the application tables plus review model, token usage, validation, policy, publishing, feedback, timing, and failure metadata.

## 4. Run locally

In one terminal:

```powershell
cd backend
npm run dev
```

In another terminal:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173`. The backend health check is available at `http://localhost:5000/health`.

## Verification commands

```powershell
cd backend
npm run build
npm test

cd ..\frontend
npm run build
npm run lint
```

## Review pipeline

- PullPilot fetches up to 100 changed-file patches from GitHub.
- Deleted, binary, generated, built, minified, and dependency-lock files are skipped.
- Individual patches and total prompt size are capped before being sent to OpenAI.
- The model must return a strict JSON schema with evidence, severity, category, file, optional line, remediation, and confidence.
- Candidate findings then pass deterministic file, changed-line, confidence, severity, and duplicate validation.
- Each repository can provide up to 4,000 characters of review instructions and choose its quality thresholds.
- Model name, token usage, reviewed/skipped file counts, and failures are saved with each review.
- Developers can mark findings useful or dismiss them, and the dashboard reports the resulting acceptance rate.
- Completed reviews can be published as a structured GitHub pull-request comment with one explicit click.

The processor currently runs asynchronously inside the API process. A production deployment should move it to a durable queue so a restart cannot strand a pending review.

## API protection

- All API routes are limited to 150 requests per IP every 15 minutes.
- GitHub OAuth endpoints are limited to 20 requests per IP every 15 minutes.
- AI review creation is limited to 10 requests per IP per hour.
- JSON request bodies are capped at 100 KB and Express technology headers are disabled.
- The current in-memory limiter is appropriate for one API instance. Use a shared rate-limit store before scaling the backend horizontally.

## Recruiter demo flow

1. Connect a public GitHub repository containing an open pull request.
2. Open its review workspace and configure repository-specific rules.
3. Run the PR analysis and show the validation count above the findings.
4. Expand a finding to show its evidence and suggested fix.
5. Mark one finding useful and dismiss another to update quality analytics.
6. Publish the completed report to the pull request and open the resulting GitHub comment.

For a repeatable demo, use a small repository with intentionally seeded correctness, security, and reliability problems plus at least one harmless change that should not generate a finding.

## Production deployment

### Backend and database (Railway)

Create a Railway project with a PostgreSQL service and a service sourced from this GitHub repository. Set the service root directory to `backend`; Railway will read `backend/railway.json`, build TypeScript, run migrations, start the API, and check `/health`.

Set these backend variables without committing their values:

```text
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-vercel-domain.vercel.app
SERVER_URL=https://your-railway-api-domain.up.railway.app
DATABASE_URL=<Railway PostgreSQL reference>
GITHUB_CLIENT_ID=<production OAuth app client ID>
GITHUB_CLIENT_SECRET=<production OAuth app secret>
JWT_SECRET=<at least 32 random characters>
TOKEN_ENCRYPTION_KEY=<32 random bytes encoded as base64url>
OPENAI_API_KEY=<OpenAI API key>
OPENAI_MODEL=gpt-5.4-mini
```

Update the GitHub OAuth App callback URL to:

```text
https://your-railway-api-domain.up.railway.app/api/auth/github/callback
```

### Frontend (Vercel)

Keep the Vercel project root directory set to `frontend`. Add this production variable and redeploy:

```text
VITE_API_URL=https://your-railway-api-domain.up.railway.app
```

Pushes and pull requests run `.github/workflows/ci.yml`. Vercel Git integration can create previews for branches and production deployments from `main`.

## Authentication notes

- Sessions are stored in an HTTP-only cookie instead of browser local storage or redirect URLs.
- GitHub OAuth requests use a short-lived state cookie to reject forged callbacks.
- GitHub access tokens are encrypted with AES-256-GCM before database storage.
- The OAuth scope requests profile, email, and `public_repo` access. This supports public-repository discovery and user-initiated PR comments without requesting the broad private-repository `repo` scope.
- Users created before token encryption was introduced must sign in again once. A successful login replaces the legacy plaintext token with an encrypted value.
- Production deployments should expose the frontend and API through the same site or a frontend proxy where possible; cross-site session cookies may be restricted by browser privacy controls.
