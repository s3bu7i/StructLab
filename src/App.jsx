import { useEffect, useLayoutEffect } from 'react';
import navigationMarkup from './legacy/navigation.html?raw';
import landingMarkup from './legacy/landing.html?raw';
import studentMarkup from './legacy/student.html?raw';
import companyMarkup from './legacy/company.html?raw';
import adminMarkup from './legacy/admin.html?raw';
import overlaysMarkup from './legacy/overlays.html?raw';

function HtmlFragment({ html }) {
  return <div className="react-fragment" dangerouslySetInnerHTML={{ __html: html }} />;
}

function Navigation() {
  return <HtmlFragment html={navigationMarkup} />;
}

function LandingPage() {
  return <HtmlFragment html={landingMarkup} />;
}

function StudentDashboard() {
  return <HtmlFragment html={studentMarkup} />;
}

function CompanyDashboard() {
  return <HtmlFragment html={companyMarkup} />;
}

function AdminDashboard() {
  return <HtmlFragment html={adminMarkup} />;
}

function GlobalOverlays() {
  return <HtmlFragment html={overlaysMarkup} />;
}

function useProgressiveMedia() {
  useLayoutEffect(() => {
    const priorityImages = new Set(
      document.querySelectorAll('.top-nav img, .hero img, .brand-lockup-nav img'),
    );

    document.querySelectorAll('img').forEach((image) => {
      image.decoding = 'async';
      if (!priorityImages.has(image)) image.loading = 'lazy';
    });
  }, []);
}

function useLegacyRuntime() {
  useEffect(() => {
    if (window.__STRUCTLAB_RUNTIME_READY__) return undefined;

    const script = document.createElement('script');
    script.src = '/legacy.js';
    script.dataset.structlabRuntime = 'true';
    script.addEventListener('load', () => {
      window.__STRUCTLAB_RUNTIME_READY__ = true;
      document.dispatchEvent(new CustomEvent('structlab:ready'));
    }, { once: true });
    document.body.appendChild(script);

    return undefined;
  }, []);
}

export default function App() {
  useProgressiveMedia();
  useLegacyRuntime();

  return (
    <>
      <Navigation />
      <main id="main-content">
        <LandingPage />
        <StudentDashboard />
        <CompanyDashboard />
        <AdminDashboard />
      </main>
      <GlobalOverlays />
    </>
  );
}
