import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  ChevronDown,
  Command,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { logoutLocalAccount } from '../auth/session';

const roleLabels = {
  student: 'Learning workspace',
  company: 'Employer workspace',
  admin: 'Control center',
};

export default function PortalShell({
  role,
  user,
  items,
  active,
  title,
  subtitle,
  navigate,
  children,
  toast,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sl_sidebar_collapsed') === 'true');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unread, setUnread] = useState(3);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commands = useMemo(() => items.filter((item) => (
    `${item.label} ${item.description || ''}`.toLowerCase().includes(query.trim().toLowerCase())
  )), [items, query]);

  function goTo(item) {
    navigate(`/portal/${role}/${item.id}`);
    setSidebarOpen(false);
    setSearchOpen(false);
    setQuery('');
  }

  function toggleCollapsed() {
    setCollapsed((value) => {
      localStorage.setItem('sl_sidebar_collapsed', String(!value));
      return !value;
    });
  }

  function logout() {
    logoutLocalAccount();
    navigate('/', { hard: true, replace: true });
  }

  const initials = user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <div className={`portal-shell role-${role}${collapsed ? ' sidebar-collapsed' : ''}`}>
      <button className={`portal-mobile-scrim${sidebarOpen ? ' show' : ''}`} type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />

      <aside className={`portal-sidebar${sidebarOpen ? ' mobile-open' : ''}`}>
        <div className="portal-sidebar-head">
          <a className="portal-logo" href="/" aria-label="StructLab home">
            <img src="/assets/images/main_logo.png" alt="" />
            <img src="/assets/images/STRUCT%20lub.png" alt="Struct Lab" />
          </a>
          <button className="portal-mobile-close" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><X size={19} /></button>
        </div>

        <div className="portal-workspace-label"><span>{roleLabels[role]}</span><i /></div>

        <nav className="portal-nav" aria-label={`${role} workspace navigation`}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={active === item.id ? 'active' : ''} type="button" onClick={() => goTo(item)} title={collapsed ? item.label : undefined}>
                <span className="portal-nav-icon"><Icon size={19} /></span>
                <span className="portal-nav-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
                {item.badge ? <em>{item.badge}</em> : null}
              </button>
            );
          })}
        </nav>

        <div className="portal-sidebar-foot">
          <button type="button" onClick={() => navigate(`/portal/${role}/${role === 'admin' ? 'settings' : 'profile'}`)}>
            <Settings size={18} /><span>Workspace settings</span>
          </button>
          <button type="button" onClick={logout}><LogOut size={18} /><span>Sign out</span></button>
          <div className="portal-sidebar-user">
            <span className="portal-avatar">{initials}</span>
            <span><strong>{user.name}</strong><small>{user.email}</small></span>
          </div>
        </div>
      </aside>

      <div className="portal-main-wrap">
        <header className="portal-topbar">
          <div className="portal-topbar-left">
            <button className="portal-menu-button" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button>
            <button className="portal-collapse-button" type="button" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={toggleCollapsed}>
              {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>
            <div className="portal-page-heading"><h1>{title}</h1><p>{subtitle}</p></div>
          </div>

          <div className="portal-topbar-actions">
            <button className="portal-command-trigger" type="button" onClick={() => setSearchOpen(true)}>
              <Search size={17} /><span>Search workspace</span><kbd>Ctrl K</kbd>
            </button>

            <div className="portal-popover-wrap">
              <button className="portal-icon-button" type="button" aria-label="Notifications" onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }}>
                <Bell size={19} />{unread ? <span>{unread}</span> : null}
              </button>
              {notificationsOpen && (
                <div className="portal-popover notification-popover">
                  <div className="portal-popover-head"><div><strong>Notifications</strong><small>{unread} unread updates</small></div><button type="button" onClick={() => setUnread(0)}>Mark all read</button></div>
                  <div className="portal-notification-list">
                    <button type="button"><i className="coral" /><span><strong>New activity in your workspace</strong><small>Course and profile data were refreshed.</small></span></button>
                    <button type="button"><i className="violet" /><span><strong>Weekly summary is ready</strong><small>Review the latest performance snapshot.</small></span></button>
                    <button type="button"><i className="gold" /><span><strong>StructLab recommendation</strong><small>There is a new action worth reviewing.</small></span></button>
                  </div>
                </div>
              )}
            </div>

            <div className="portal-popover-wrap">
              <button className="portal-profile-button" type="button" onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }}>
                <span className="portal-avatar">{initials}</span><span>{user.name.split(' ')[0]}</span><ChevronDown size={15} />
              </button>
              {profileOpen && (
                <div className="portal-popover profile-popover">
                  <div><span className="portal-avatar large">{initials}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div>
                  <button type="button" onClick={() => navigate(`/portal/${role}/${role === 'admin' ? 'settings' : 'profile'}`)}><Settings size={16} /> Account settings</button>
                  <button type="button" onClick={logout}><LogOut size={16} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="portal-content" key={`${role}-${active}`}>{children}</main>
      </div>

      {searchOpen && (
        <div className="portal-command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false); }}>
          <div className="portal-command" role="dialog" aria-modal="true" aria-label="Search workspace">
            <div className="portal-command-input"><Search size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages and actions…" /><kbd>ESC</kbd></div>
            <div className="portal-command-results">
              <span>Workspace pages</span>
              {commands.length ? commands.map((item) => {
                const Icon = item.icon;
                return <button key={item.id} type="button" onClick={() => goTo(item)}><Icon size={18} /><span><strong>{item.label}</strong><small>{item.description}</small></span><ArrowSymbol /></button>;
              }) : <p>No matching workspace page.</p>}
            </div>
            <div className="portal-command-foot"><span><kbd>↵</kbd> Open</span><span><kbd>ESC</kbd> Close</span><span><Command size={13} /> K Search</span></div>
          </div>
        </div>
      )}

      {toast ? <div className={`portal-toast ${toast.type || 'success'}`} role="status"><Checkmark type={toast.type} /><span>{toast.message}</span></div> : null}
    </div>
  );
}

function ArrowSymbol() {
  return <span aria-hidden="true">↗</span>;
}

function Checkmark({ type }) {
  return <span className="portal-toast-mark" aria-hidden="true">{type === 'error' ? '!' : '✓'}</span>;
}

export function PageLead({ eyebrow, title, text, actions, accent = 'violet' }) {
  return (
    <section className={`portal-page-lead ${accent}`}>
      <div><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></div>
      {actions ? <div className="portal-page-actions">{actions}</div> : null}
    </section>
  );
}

export function KpiGrid({ children }) {
  return <div className="portal-kpi-grid">{children}</div>;
}

export function KpiCard({ label, value, detail, icon: Icon, tone = 'violet', trend }) {
  return (
    <article className="portal-kpi-card">
      <span className={`portal-kpi-icon ${tone}`}><Icon size={20} /></span>
      <div><span>{label}</span><strong>{value}</strong><small className={trend === 'down' ? 'down' : ''}>{detail}</small></div>
    </article>
  );
}

export function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`portal-panel ${className}`}>
      {(title || action) && <header><div><h3>{title}</h3>{subtitle ? <p>{subtitle}</p> : null}</div>{action}</header>}
      {children}
    </section>
  );
}

export function Badge({ children, tone = 'neutral' }) {
  return <span className={`portal-badge ${tone}`}>{children}</span>;
}

export function Modal({ title, subtitle, onClose, children, footer }) {
  useEffect(() => {
    const handleEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.body.classList.add('portal-modal-open');
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.classList.remove('portal-modal-open');
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div className="portal-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="portal-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header><div><h3>{title}</h3>{subtitle ? <p>{subtitle}</p> : null}</div><button type="button" aria-label="Close" onClick={onClose}><X size={20} /></button></header>
        <div className="portal-modal-body">{children}</div>
        {footer ? <footer>{footer}</footer> : null}
      </div>
    </div>
  );
}
