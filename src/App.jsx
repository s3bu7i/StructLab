import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './styles.css';
import './react-enhancements.css';
import navigationMarkup from './legacy/navigation.html?raw';
import landingMarkup from './legacy/landing.html?raw';
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

function GlobalOverlays() {
  return <HtmlFragment html={overlaysMarkup} />;
}

function Preloader() {
  const [progress, setProgress] = useState(8);
  const [leaving, setLeaving] = useState(false);
  const [visible, setVisible] = useState(true);

  const status = useMemo(() => {
    if (progress >= 99) return 'Hazırdır';
    if (progress >= 72) return 'Son toxunuşlar edilir';
    if (progress >= 38) return 'Struktur qurulur';
    return 'Platforma hazırlanır';
  }, [progress]);

  useEffect(() => {
    document.body.classList.add('is-loading');

    let assetsReady = false;
    let animationFrame = 0;
    let exitTimer = 0;
    let currentProgress = 8;
    let lastRenderedProgress = 8;
    const startedAt = performance.now();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minimumDuration = reducedMotion ? 420 : 1280;

    const priorityImages = [...document.querySelectorAll('.top-nav img, .hero img')];
    const imagePromises = priorityImages.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    });

    const readiness = Promise.allSettled([
      document.fonts?.ready ?? Promise.resolve(),
      ...imagePromises,
    ]).then(() => {
      assetsReady = true;
    });

    const safetyTimer = window.setTimeout(() => {
      assetsReady = true;
    }, 2400);

    function finishLoading() {
      setProgress(100);
      setLeaving(true);
      document.body.classList.remove('is-loading');
      exitTimer = window.setTimeout(() => setVisible(false), reducedMotion ? 40 : 520);
    }

    function updateProgress(now) {
      const elapsed = now - startedAt;
      const timedTarget = Math.min(92, 8 + (elapsed / minimumDuration) * 72);
      const target = assetsReady && elapsed >= minimumDuration ? 100 : timedTarget;
      currentProgress += Math.max(0.18, (target - currentProgress) * 0.075);

      const rounded = Math.min(100, Math.round(currentProgress));
      if (rounded !== lastRenderedProgress) {
        lastRenderedProgress = rounded;
        setProgress(rounded);
      }

      if (target === 100 && currentProgress >= 99.25) {
        finishLoading();
        return;
      }

      animationFrame = window.requestAnimationFrame(updateProgress);
    }

    animationFrame = window.requestAnimationFrame(updateProgress);

    return () => {
      void readiness;
      window.clearTimeout(safetyTimer);
      window.clearTimeout(exitTimer);
      window.cancelAnimationFrame(animationFrame);
      document.body.classList.remove('is-loading');
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`sl-loader${leaving ? ' is-leaving' : ''}`} role="status" aria-live="polite">
      <div className="sl-loader-grid" aria-hidden="true" />
      <div className="sl-loader-orb sl-loader-orb-one" aria-hidden="true" />
      <div className="sl-loader-orb sl-loader-orb-two" aria-hidden="true" />
      <div className="sl-loader-structure" aria-hidden="true">
        <i /><i /><i /><i /><i /><i />
      </div>

      <div className="sl-loader-panel">
        <div className="sl-loader-blueprint" aria-hidden="true">
          <span className="sl-blueprint-line sl-blueprint-line-a" />
          <span className="sl-blueprint-line sl-blueprint-line-b" />
          <span className="sl-blueprint-node sl-blueprint-node-a" />
          <span className="sl-blueprint-node sl-blueprint-node-b" />
        </div>

        <div className="sl-loader-brand">
          <div className="sl-loader-mark">
            <span className="sl-loader-ring" aria-hidden="true" />
            <img src="/assets/images/main_logo.png" alt="" decoding="async" />
          </div>
          <img className="sl-loader-wordmark" src="/assets/images/STRUCT%20lub.png" alt="Struct Lab" />
          <p>Education · Certification · Career</p>
        </div>

        <div className="sl-loader-progress-wrap">
          <div className="sl-loader-status">
            <span>{status}</span>
            <strong>{progress}%</strong>
          </div>
          <div
            className="sl-loader-track"
            role="progressbar"
            aria-label="Yüklənmə vəziyyəti"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={progress}
          >
            <span style={{ '--sl-load-progress': `${progress}%` }} />
          </div>
          <div className="sl-loader-caption">
            <span>STRUCT / 01</span>
            <span className="sl-loader-pulse" aria-hidden="true"><i /><i /><i /></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScrollExperience() {
  useEffect(() => {
    const landing = document.getElementById('page-landing');
    if (!landing) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealTargets = [
      ...landing.querySelectorAll(
        '.section-header, .value-prop, .stat-item, .how-card, .cat-card, .course-card, .showcase-card, .testimonial-card, .faq-item, .team-card, .contact-info-item, .contact-form, .partner-card, footer .footer-brand, footer .footer-col, footer .footer-bottom',
      ),
    ];
    const scenes = [...landing.querySelectorAll(':scope > .value-props, :scope > .stats, :scope > .section, :scope > .cta-section, :scope > .partners-section, :scope > footer')];
    const variants = ['rise', 'left', 'right', 'scale', 'swing'];
    const activeScenes = new Set();

    revealTargets.forEach((element, index) => {
      element.classList.add('motion-ready');
      element.dataset.slReveal = variants[index % variants.length];
      element.style.setProperty('--motion-index', String(index % 5));
    });
    scenes.forEach((scene) => {
      scene.classList.add('scroll-scene');
      delete scene.dataset.slScene;
    });

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.13, rootMargin: '0px 0px -7% 0px' });

    const sceneObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('scene-open', entry.isIntersecting);
        if (entry.isIntersecting) activeScenes.add(entry.target);
        else activeScenes.delete(entry.target);
      });
    }, { threshold: 0.05, rootMargin: '18% 0px 18% 0px' });

    revealTargets.forEach((element) => revealObserver.observe(element));
    scenes.forEach((scene) => sceneObserver.observe(scene));

    const navSections = ['courses', 'categories', 'team', 'about']
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const navObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible && typeof window.setActiveNavLink === 'function') {
        window.setActiveNavLink(visible.target.id);
      }
    }, { threshold: [0.22, 0.45, 0.7], rootMargin: '-18% 0px -52% 0px' });
    navSections.forEach((section) => navObserver.observe(section));

    let frame = 0;
    function renderScrollState() {
      frame = 0;
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
      document.documentElement.style.setProperty('--sl-scroll-progress', progress.toFixed(4));
      document.body.classList.toggle('sl-has-scrolled', window.scrollY > 110);

      if (!reducedMotion) {
        activeScenes.forEach((scene) => {
          const rect = scene.getBoundingClientRect();
          const centerOffset = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
          const drift = Math.max(-1, Math.min(1, centerOffset)) * -30;
          scene.style.setProperty('--sl-scene-drift', `${drift.toFixed(1)}px`);
        });
      }
    }

    function scheduleScrollRender() {
      if (!frame) frame = window.requestAnimationFrame(renderScrollState);
    }

    renderScrollState();
    window.addEventListener('scroll', scheduleScrollRender, { passive: true });
    window.addEventListener('resize', scheduleScrollRender, { passive: true });

    return () => {
      revealObserver.disconnect();
      sceneObserver.disconnect();
      navObserver.disconnect();
      window.removeEventListener('scroll', scheduleScrollRender);
      window.removeEventListener('resize', scheduleScrollRender);
      window.cancelAnimationFrame(frame);
      activeScenes.clear();
      document.body.classList.remove('sl-has-scrolled');
      document.documentElement.style.removeProperty('--sl-scroll-progress');
    };
  }, []);

  return (
    <>
      <div className="sl-scroll-progress" aria-hidden="true"><span /></div>
      <div className="sl-scroll-guide" aria-hidden="true">
        <span>SCROLL</span>
        <i />
      </div>
    </>
  );
}

const parallaxLayerSpecs = [
  { id: 'hero-orbit', selector: '.hero', className: 'sl-parallax-orbit', depth: 0.34 },
  { id: 'category-axis', selector: '#categories', className: 'sl-parallax-axis', depth: 0.22 },
  { id: 'showcase-compass', selector: '#showcase', className: 'sl-parallax-compass', depth: 0.3 },
  { id: 'team-truss', selector: '#team', className: 'sl-parallax-truss', depth: 0.18 },
  { id: 'contact-frame', selector: '#contact', className: 'sl-parallax-frame', depth: 0.26 },
];

function ParallaxArtwork() {
  const [layers, setLayers] = useState([]);

  useLayoutEffect(() => {
    setLayers(
      parallaxLayerSpecs
        .map((spec) => ({ ...spec, host: document.querySelector(`#page-landing ${spec.selector}`) }))
        .filter((spec) => spec.host),
    );
  }, []);

  useEffect(() => {
    if (!layers.length) return undefined;

    const landing = document.getElementById('page-landing');
    const items = layers
      .map((layer) => layer.host.querySelector(`[data-sl-parallax='${layer.id}']`))
      .filter(Boolean);
    if (!landing || !items.length) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const activeItems = new Set();
    let pointerX = 0;
    let pointerY = 0;
    let frame = 0;

    const visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-parallax-visible', entry.isIntersecting);
        if (entry.isIntersecting) activeItems.add(entry.target);
        else activeItems.delete(entry.target);
      });
      scheduleRender();
    }, { rootMargin: '35% 0px 35% 0px', threshold: 0.01 });

    items.forEach((item) => visibilityObserver.observe(item));

    function renderParallax() {
      frame = 0;
      if (reducedMotion) return;

      activeItems.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const depth = Number(item.dataset.slDepth || 0.2);
        const viewportOffset = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
        const translateY = Math.max(-72, Math.min(72, viewportOffset * depth * -150));
        const translateX = pointerX * depth * 34;
        const pointerLift = pointerY * depth * 18;
        const rotation = pointerX * depth * 2.4;

        item.style.setProperty('--sl-parallax-x', `${translateX.toFixed(2)}px`);
        item.style.setProperty('--sl-parallax-y', `${(translateY + pointerLift).toFixed(2)}px`);
        item.style.setProperty('--sl-parallax-r', `${rotation.toFixed(2)}deg`);
      });
    }

    function scheduleRender() {
      if (!frame) frame = window.requestAnimationFrame(renderParallax);
    }

    function handlePointerMove(event) {
      const rect = landing.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      pointerY = ((event.clientY - window.innerHeight / 2) / Math.max(1, window.innerHeight / 2));
      scheduleRender();
    }

    function resetPointer() {
      pointerX = 0;
      pointerY = 0;
      scheduleRender();
    }

    if (finePointer && !reducedMotion) {
      landing.addEventListener('pointermove', handlePointerMove, { passive: true });
      landing.addEventListener('pointerleave', resetPointer, { passive: true });
    }
    window.addEventListener('scroll', scheduleRender, { passive: true });
    window.addEventListener('resize', scheduleRender, { passive: true });
    scheduleRender();

    return () => {
      visibilityObserver.disconnect();
      landing.removeEventListener('pointermove', handlePointerMove);
      landing.removeEventListener('pointerleave', resetPointer);
      window.removeEventListener('scroll', scheduleRender);
      window.removeEventListener('resize', scheduleRender);
      window.cancelAnimationFrame(frame);
      activeItems.clear();
    };
  }, [layers]);

  return layers.map((layer) => createPortal(
    <div
      className={`sl-parallax-item ${layer.className}`}
      data-sl-parallax={layer.id}
      data-sl-depth={layer.depth}
      aria-hidden="true"
    >
      <i /><i /><i /><span />
    </div>,
    layer.host,
    layer.id,
  ));
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

      const originalShowPage = window.showPage;
      window.showPage = (name, targetSection = '') => {
        if (['student', 'company', 'admin'].includes(name)) {
          let user = null;
          try { user = JSON.parse(localStorage.getItem('sl_user') || 'null'); } catch { /* ignore invalid local demo data */ }
          const role = user?.role === name ? name : null;
          const destination = role ? `/portal/${role}/overview` : `/login?role=${name}`;
          window.__STRUCTLAB_NAVIGATE__?.(destination);
          return;
        }
        originalShowPage?.(name, targetSection);
      };

      window.openAuthModal = (mode = 'login') => {
        window.__STRUCTLAB_NAVIGATE__?.(mode === 'signup' ? '/signup' : '/login');
      };

      window.logoutUser = () => {
        localStorage.removeItem('sl_user');
        window.location.assign('/');
      };

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
      <Preloader />
      <Navigation />
      <main id="main-content">
        <LandingPage />
      </main>
      <GlobalOverlays />
      <ScrollExperience />
      <ParallaxArtwork />
    </>
  );
}
