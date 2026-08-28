# PullPilot

PullPilot is a full-stack proof of concept for reviewing GitHub pull requests. Users authenticate with GitHub, connect repositories, select a pull request, and view categorized review findings.

> Current status: GitHub authentication, repository access, pull-request retrieval, persistence, and evidence-based OpenAI review are implemented.

## Architecture

- `frontend/`: React, TypeScript, Vite, React Router, and Axios
- `backend/`: Node.js, Express, TypeScript, JWT authentication, and GitHub OAuth
- PostgreSQL: users, connected repositories, and review history
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

The migrations are idempotent and create the application tables plus review model, token-usage, file-count, timing, and failure metadata.

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
- Model name, token usage, reviewed/skipped file counts, and failures are saved with each review.

The processor currently runs asynchronously inside the API process. A production deployment should move it to a durable queue so a restart cannot strand a pending review.

## Known revival work

- Repair existing frontend lint errors and add shared TypeScript models.
- Harden GitHub OAuth and stop returning session tokens through URLs.
- Encrypt or replace stored GitHub access tokens, preferably with a GitHub App installation flow.
- Add automated tests and CI.
- Reconnect and verify the Vercel, backend, database, and GitHub OAuth deployments.

## Authentication notes

- Sessions are stored in an HTTP-only cookie instead of browser local storage or redirect URLs.
- GitHub OAuth requests use a short-lived state cookie to reject forged callbacks.
- GitHub access tokens are encrypted with AES-256-GCM before database storage.
- The OAuth scope currently requests only user profile and email access, so repository discovery is limited to repositories visible without the broad `repo` scope.
- Users created before token encryption was introduced must sign in again once. A successful login replaces the legacy plaintext token with an encrypted value.
- Production deployments should expose the frontend and API through the same site or a frontend proxy where possible; cross-site session cookies may be restricted by browser privacy controls.
