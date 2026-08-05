import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { isLocalDevelopment } from './auth/api';
import './router.css';

const MarketingApp = lazy(() => import('./App'));
const AuthPage = lazy(() => import('./auth/AuthPage'));
const PortalApp = lazy(() => import('./portal/PortalApp'));

function getLocationState() {
  return {
    pathname: window.location.pathname.replace(/\/+$/, '') || '/',
    search: window.location.search,
  };
}

function RouteFallback() {
  return (
    <div className="route-loader" role="status" aria-label="Loading StructLab">
      <span className="route-loader-ring" aria-hidden="true" />
      <img src="/assets/images/main_logo.png" alt="" />
      <strong>StructLab</strong>
    </div>
  );
}

function LocalPlatformAuthRedirect({ location, navigate }) {
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const requestedReturn = query.get('return_to') || '/login';
    const safeReturn = requestedReturn.startsWith('/') && !requestedReturn.startsWith('//') ? requestedReturn : '/login';
    if (location.pathname === '/signout-with-chatgpt') globalThis.localStorage?.removeItem('sl_local_api_session_v1');
    navigate(safeReturn, { replace: true });
  }, [location.pathname, location.search, navigate]);

  return <RouteFallback />;
}

function AppRouter() {
  const [location, setLocation] = useState(getLocationState);

  const navigate = useCallback((destination, options = {}) => {
    const nextUrl = new URL(destination, window.location.origin);
    if (nextUrl.origin !== window.location.origin || !nextUrl.pathname.startsWith('/')) return;

    const crossingLandingBoundary = location.pathname === '/' || nextUrl.pathname === '/';
    if (options.hard || crossingLandingBoundary) {
      if (options.replace) window.location.replace(nextUrl.href);
      else window.location.assign(nextUrl.href);
      return;
    }

    const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
    window.history[options.replace ? 'replaceState' : 'pushState']({}, '', nextPath);
    setLocation(getLocationState());
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    const handlePopState = () => {
      const next = getLocationState();
      if (next.pathname === '/' && location.pathname !== '/') {
        window.location.reload();
        return;
      }
      setLocation(next);
    };

    window.__STRUCTLAB_NAVIGATE__ = navigate;
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname, navigate]);

  let page;
  if (location.pathname === '/login' || location.pathname === '/signup') {
    page = <AuthPage mode={location.pathname === '/signup' ? 'signup' : 'login'} location={location} navigate={navigate} />;
  } else if (isLocalDevelopment() && ['/signin-with-chatgpt', '/signout-with-chatgpt'].includes(location.pathname)) {
    page = <LocalPlatformAuthRedirect location={location} navigate={navigate} />;
  } else if (location.pathname.startsWith('/portal/')) {
    page = <PortalApp location={location} navigate={navigate} />;
  } else if (location.pathname === '/') {
    page = <MarketingApp />;
  } else {
    page = (
      <div className="route-not-found">
        <span>404</span>
        <h1>This page is not part of the structure.</h1>
        <p>Return to StructLab and continue from the main platform.</p>
        <a href="/">Back to StructLab</a>
      </div>
    );
  }

  return <Suspense fallback={<RouteFallback />}>{page}</Suspense>;
}

createRoot(document.getElementById('root')).render(<AppRouter />);
