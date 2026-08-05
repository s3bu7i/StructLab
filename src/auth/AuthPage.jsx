import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  GraduationCap,
  KeyRound,
  LoaderCircle,
  MailCheck,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { finishOnboarding, getAuthSession, isLocalDevelopment, secureSignInUrl } from './api';
import './auth.css';

const pendingKey = 'sl_pending_onboarding';

export default function AuthPage({ mode, location, navigate }) {
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedRole = query.get('role');
  const localDevelopment = isLocalDevelopment();
  const initialRoles = localDevelopment && mode !== 'signup' ? ['student', 'company', 'admin'] : ['student', 'company'];
  const [role, setRole] = useState(initialRoles.includes(requestedRole) ? requestedRole : 'student');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [existingSession, setExistingSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const isSignup = mode === 'signup';
  const verifiedReturn = query.get('verified') === '1';

  useEffect(() => {
    document.title = `${isSignup ? 'Create account' : 'Sign in'} — StructLab`;
    let cancelled = false;

    async function resolveSession() {
      setChecking(true);
      setError('');
      try {
        const session = await getAuthSession();
        if (cancelled) return;
        setExistingSession(session);

        if (verifiedReturn) {
          const pending = readPendingOnboarding();
          const next = pending ? await finishOnboarding(pending) : session;
          if (cancelled) return;
          sessionStorage.removeItem(pendingKey);
          navigate(`/portal/${next.user.role}/overview`, { replace: true });
        }
      } catch (requestError) {
        if (!cancelled && requestError.status !== 401) setError(requestError.message);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    resolveSession();
    return () => { cancelled = true; };
  }, [isSignup, navigate, verifiedReturn]);

  useEffect(() => {
    const allowedRoles = localDevelopment && !isSignup ? ['student', 'company', 'admin'] : ['student', 'company'];
    if (allowedRoles.includes(requestedRole)) setRole(requestedRole);
  }, [isSignup, localDevelopment, requestedRole]);

  function openPortal(session = existingSession) {
    if (session?.user) navigate(`/portal/${session.user.role}/overview`, { replace: true });
  }

  async function continueSecurely(event) {
    event.preventDefault();
    setError('');
    if (isSignup && name.trim().length < 2) return setError('Ad və soyadınızı daxil edin.');
    if (isSignup && role === 'company' && companyName.trim().length < 2) return setError('Şirkət adını daxil edin.');
    if (isSignup && !accepted) return setError('Davam etmək üçün şərtləri qəbul edin.');

    const localNames = { student: 'Aylin Məmmədova', company: 'Kamran Əliyev', admin: 'StructLab Admin' };
    const pending = {
      role,
      name: name.trim() || (localDevelopment ? localNames[role] : ''),
      company_name: companyName.trim() || (localDevelopment && role === 'company' ? 'Caspian Structures' : ''),
    };
    sessionStorage.setItem(pendingKey, JSON.stringify(pending));

    if (!existingSession && !localDevelopment) {
      window.location.assign(secureSignInUrl(`${isSignup ? '/signup' : '/login'}?verified=1`));
      return;
    }

    setSubmitting(true);
    try {
      const session = isSignup || localDevelopment ? await finishOnboarding(pending) : existingSession;
      sessionStorage.removeItem(pendingKey);
      openPortal(session);
    } catch (requestError) {
      setError(requestError.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page-shell">
      <aside className="auth-story-panel">
        <a className="auth-back-link" href="/"><ArrowLeft size={17} /> Sayta qayıt</a>

        <div className="auth-story-copy">
          <div className="auth-brand-lockup">
            <img src="/assets/images/main_logo.png" alt="" />
            <img src="/assets/images/STRUCT%20lub.png" alt="Struct Lab" />
          </div>
          <span className="auth-kicker"><Sparkles size={15} /> Təsdiqlənmiş profil. Aydın səlahiyyətlər.</span>
          <h1>{isSignup ? 'Peşəkar profilini təhlükəsiz girişlə yarat.' : 'StructLab workspace-inə təhlükəsiz qayıt.'}</h1>
          <p>Təhsil, işə qəbul və platform idarəetməsi server tərəfində qorunan ayrıca rol sərhədləri ilə işləyir.</p>

          <div className="auth-story-features">
            <div><Check size={16} /><span><strong>Təsdiqlənmiş e-poçt</strong><small>Giriş provider tərəfindən kod və ya təhlükəsiz linklə təsdiqlənir.</small></span></div>
            <div><Check size={16} /><span><strong>Server əsaslı rollar</strong><small>Tələbə, şirkət və admin icazələri brauzerdən dəyişdirilə bilməz.</small></span></div>
            <div><Check size={16} /><span><strong>Davamlı məlumat</strong><small>Profil, kurs, vakansiya və fayllar platform storage-da qalır.</small></span></div>
          </div>
        </div>

        <div className="auth-story-metrics" aria-hidden="true">
          <span><strong>3</strong> qorunan rol</span>
          <span><strong>SQL</strong> məlumat bazası</span>
          <span><strong>R2</strong> fayl storage</span>
        </div>
        <div className="auth-structure-lines" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      </aside>

      <main className="auth-form-panel">
        <div className="auth-form-card">
          <div className="auth-mobile-brand">
            <img src="/assets/images/main_logo.png" alt="" />
            <img src="/assets/images/STRUCT%20lub.png" alt="Struct Lab" />
          </div>

          <div className="auth-mode-switch" aria-label="Authentication mode">
            <button className={!isSignup ? 'active' : ''} type="button" onClick={() => navigate('/login', { replace: true })}>Daxil ol</button>
            <button className={isSignup ? 'active' : ''} type="button" onClick={() => navigate('/signup', { replace: true })}>Hesab yarat</button>
          </div>

          <header className="auth-form-header">
            <span>{isSignup ? 'StructLab-a qoşul' : 'Xoş gəldiniz'}</span>
            <h2>{isSignup ? 'Təsdiqlənmiş workspace yarat' : 'Təhlükəsiz giriş et'}</h2>
            <p>{isSignup ? 'Rolunu seç; e-poçtun təhlükəsiz giriş mərhələsində təsdiqlənəcək.' : 'Hesabına bağlı təsdiqlənmiş e-poçtla davam et.'}</p>
          </header>

          {localDevelopment && (
            <div className="auth-local-banner">
              <ShieldCheck size={17} />
              <span><strong>Lokal demo rejimi</strong><small>Real təsdiq ekranı yalnız yayımlanmış saytda açılır. Burada rol seçib portalları dərhal yoxlaya bilərsiniz.</small></span>
            </div>
          )}

          {checking && <div className="auth-checking"><LoaderCircle size={18} /> Mövcud giriş yoxlanılır…</div>}

          {existingSession && !isSignup && (
            <button className="auth-resume" type="button" onClick={() => openPortal()}>
              <span className={`auth-role-icon ${existingSession.user.role}`}><UserRound size={18} /></span>
              <span><strong>{existingSession.user.name} kimi davam et</strong><small>{existingSession.user.email} · {existingSession.user.role}</small></span>
              <ArrowRight size={18} />
            </button>
          )}

          <form className="auth-page-form" onSubmit={continueSecurely}>
            {localDevelopment && !isSignup && (
              <div className="auth-demo-access">
                <div>Yoxlama rolunu seçin</div>
                <div className="auth-demo-buttons" role="radiogroup" aria-label="Local demo role">
                  <button className={role === 'student' ? 'active' : ''} type="button" role="radio" aria-checked={role === 'student'} onClick={() => setRole('student')}><GraduationCap size={16} /> Tələbə</button>
                  <button className={role === 'company' ? 'active' : ''} type="button" role="radio" aria-checked={role === 'company'} onClick={() => setRole('company')}><Building2 size={16} /> Şirkət</button>
                  <button className={role === 'admin' ? 'active' : ''} type="button" role="radio" aria-checked={role === 'admin'} onClick={() => setRole('admin')}><ShieldCheck size={16} /> Admin</button>
                </div>
              </div>
            )}
            {isSignup && (
              <>
                <div className="auth-role-picker" role="radiogroup" aria-label="Account role">
                  <button className={role === 'student' ? 'active' : ''} type="button" role="radio" aria-checked={role === 'student'} onClick={() => setRole('student')}>
                    <GraduationCap size={20} /><span><strong>Tələbə</strong><small>Öyrən və iş tap</small></span>
                  </button>
                  <button className={role === 'company' ? 'active' : ''} type="button" role="radio" aria-checked={role === 'company'} onClick={() => setRole('company')}>
                    <Building2 size={20} /><span><strong>Şirkət</strong><small>Komanda qur və inkişaf et</small></span>
                  </button>
                </div>

                <label className="auth-input-field">
                  <span>Ad və soyad</span>
                  <div><UserRound size={18} /><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Adınız və soyadınız" /></div>
                </label>

                {role === 'company' && <label className="auth-input-field"><span>Şirkət adı</span><div><Building2 size={18} /><input value={companyName} onChange={(event) => setCompanyName(event.target.value)} autoComplete="organization" placeholder="Rəsmi şirkət adı" /></div></label>}
              </>
            )}

            <div className={`auth-verified-flow${localDevelopment ? ' local' : ''}`}>
              <span><MailCheck size={20} /></span>
              <div><strong>{localDevelopment ? 'Lokal test sessiyası' : 'E-poçt təsdiqi ilə giriş'}</strong><small>{localDevelopment ? 'Demo məlumatları yalnız bu brauzerin localStorage yaddaşında saxlanır.' : 'E-poçt seçimi və doğrulama kodu təhlükəsiz giriş ekranında tamamlanır. StructLab parol saxlamır.'}</small></div>
              <KeyRound size={18} />
            </div>

            {isSignup && <label className="auth-terms"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /> Demo şərtlərini və məxfilik qaydalarını qəbul edirəm.</label>}

            <p className={`auth-form-message${error ? ' show' : ''}`} role="alert">{error}</p>

            <button className="auth-submit-button" type="submit" disabled={submitting || checking}>
              <span>{submitting ? 'Workspace hazırlanır…' : localDevelopment ? `${role === 'student' ? 'Tələbə' : role === 'company' ? 'Şirkət' : 'Admin'} portalını aç` : existingSession ? 'Təsdiqlə və davam et' : 'Təsdiqlənmiş e-poçtla davam et'}</span>
              {submitting ? <LoaderCircle className="auth-spin" size={18} /> : <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-local-note"><ShieldCheck size={15} /> {localDevelopment ? 'Production məlumatlarına toxunmadan bütün əsas funksiyaları yoxlayın.' : 'Giriş kimliyi serverdə yoxlanır; rol icazələri hər API sorğusunda tətbiq olunur.'}</p>
        </div>
      </main>
    </div>
  );
}

function readPendingOnboarding() {
  try { return JSON.parse(sessionStorage.getItem(pendingKey) || 'null'); } catch { return null; }
}
