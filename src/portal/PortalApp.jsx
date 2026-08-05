import { lazy, Suspense, useEffect } from 'react';
import { getSession } from '../auth/session';
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
  const session = getSession();
  const role = workspaces[requestedRole] ? requestedRole : session?.role;
  const Workspace = workspaces[role];

  useEffect(() => {
    if (!session) {
      navigate(`/login${requestedRole ? `?role=${requestedRole}` : ''}`, { replace: true });
      return;
    }
    if (!workspaces[requestedRole] || requestedRole !== session.role) {
      navigate(`/portal/${session.role}/overview`, { replace: true });
    }
  }, [navigate, requestedRole, session]);

  useEffect(() => {
    if (role) document.title = `${role[0].toUpperCase()}${role.slice(1)} Portal — StructLab`;
  }, [role]);

  if (!session || !Workspace || requestedRole !== session.role) return <PortalLoading />;

  return (
    <Suspense fallback={<PortalLoading />}>
      <Workspace user={session} section={requestedSection} navigate={navigate} />
    </Suspense>
  );
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
