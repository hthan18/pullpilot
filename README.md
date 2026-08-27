# PullPilot

PullPilot is a full-stack proof of concept for reviewing GitHub pull requests. Users authenticate with GitHub, connect repositories, select a pull request, and view categorized review findings.

> Current status: GitHub authentication, repository access, pull-request retrieval, persistence, and the review interface are implemented. The review engine currently returns demo findings and does not yet perform real AI analysis.

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

## 3. Initialize PostgreSQL

From `backend/`:

```powershell
npm run db:check
npm run db:migrate
```

The initial migration is idempotent and creates the tables and indexes required by the existing API queries.

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

cd ..\frontend
npm run build
npm run lint
```

## Known revival work

- Replace the hard-coded demo analysis with a real, validated review pipeline.
- Repair existing frontend lint errors and add shared TypeScript models.
- Harden GitHub OAuth and stop returning session tokens through URLs.
- Encrypt or replace stored GitHub access tokens, preferably with a GitHub App installation flow.
- Add automated tests and CI.
- Reconnect and verify the Vercel, backend, database, and GitHub OAuth deployments.
