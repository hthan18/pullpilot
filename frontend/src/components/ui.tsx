import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{description}</p></div>{actions && <div className="header-actions">{actions}</div>}</header>;
}

export function StatCard({ label, value, detail, tone = 'blue' }: { label: string; value: string | number; detail: string; tone?: 'blue' | 'green' | 'amber' | 'violet' }) {
  return <article className={`stat-card tone-${tone}`}><div className="stat-orb" /><p>{label}</p><strong>{value}</strong><span>{detail}</span></article>;
}

export function LoadingState({ label = 'Loading workspace' }: { label?: string }) {
  return <div className="loading-state"><span className="spinner" /><p>{label}</p></div>;
}

export function EmptyState({ icon = '◇', title, description, action }: { icon?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`status-pill status-${status.toLowerCase()}`}><i />{status}</span>;
}
