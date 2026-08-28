import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import type { User } from '../types';

interface AppShellProps {
  user: User | null;
  children: ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const navigate = useNavigate();
  const logout = async () => {
    try { await authAPI.logout(); } finally { navigate('/'); }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/dashboard" className="brand" aria-label="PullPilot dashboard">
          <span className="brand-mark">P</span>
          <span>PullPilot</span>
          <span className="beta-pill">Beta</span>
        </NavLink>
        <nav className="side-nav" aria-label="Primary navigation">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span>⌂</span> Overview
          </NavLink>
          <NavLink to="/repositories" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span>◇</span> Repositories
          </NavLink>
        </nav>
        <div className="sidebar-foot">
          <div className="user-card">
            <img src={user?.avatar_url} alt="" className="avatar" />
            <div className="user-copy"><strong>{user?.username || 'Developer'}</strong><span>GitHub account</span></div>
            <button className="icon-button" onClick={logout} title="Log out" aria-label="Log out">↗</button>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="mobile-header">
          <NavLink to="/dashboard" className="brand"><span className="brand-mark">P</span><span>PullPilot</span></NavLink>
          <nav><NavLink to="/dashboard">Overview</NavLink><NavLink to="/repositories">Repos</NavLink></nav>
        </header>
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
