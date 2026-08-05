import { lazy, Suspense, useEffect, useState } from 'react';
import { getAuthSession } from '../auth/api';
import './portal.css';
import './workspaces.css';

const StudentWorkspace = lazy(() => import('./StudentWorkspace'));
const CompanyWorkspace = lazy(() => import('./CompanyWorkspace'));
const AdminWorkspace = lazy(() => import('./AdminWorkspace'));

const workspaces = {
  student: StudentWorkspace,
  company: CompanyWorkspace,
  admin: AdminWorkspace,
};

export default function PortalApp({ location, navigate }) {
  const [, , requestedRole, requestedSection = 'overview'] = location.pathname.split('/');
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const role = workspaces[requestedRole] ? requestedRole : session?.user?.role;
  const Workspace = workspaces[role];

  useEffect(() => {
    let cancelled = false;
    setError('');
    getAuthSession().then((payload) => {
      if (cancelled) return;
      setSession(payload);
      if (!workspaces[requestedRole] || requestedRole !== payload.user.role) navigate(`/portal/${payload.user.role}/overview`, { replace: true });
    }).catch((requestError) => {
      if (cancelled) return;
      if (requestError.status === 401) navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`, { replace: true });
      else setError(requestError.message);
    });
    return () => { cancelled = true; };
  }, [location.pathname, navigate, requestedRole]);

  useEffect(() => {
    if (role) document.title = `${role[0].toUpperCase()}${role.slice(1)} Portal — StructLab`;
  }, [role]);

  if (error) return <PortalError message={error} onRetry={() => window.location.reload()} />;
  if (!session || !Workspace || requestedRole !== session.user.role) return <PortalLoading />;

  return (
    <Suspense fallback={<PortalLoading />}>
      <Workspace user={session.user} permissions={session.permissions} company={session.company} profile={session.profile} section={requestedSection} navigate={navigate} />
    </Suspense>
  );
}

function PortalError({ message, onRetry }) {
  return <div className="portal-loading portal-load-error"><strong>Workspace açıla bilmədi</strong><p>{message}</p><button className="portal-button primary" type="button" onClick={onRetry}>Yenidən yoxla</button></div>;
}

function PortalLoading() {
  return (
    <div className="portal-loading" role="status">
      <span />
      <img src="/assets/images/main_logo.png" alt="" />
      <strong>Workspace hazırlanır</strong>
    </div>
  );
}
