import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { createLocalAccount, demoAccounts, getSession, loginLocalAccount, saveSession } from './session';
import './auth.css';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthPage({ mode, location, navigate }) {
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedRole = query.get('role');
  const [role, setRole] = useState(['student', 'company'].includes(requestedRole) ? requestedRole : 'student');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingSession, setExistingSession] = useState(null);
  const isSignup = mode === 'signup';

  useEffect(() => {
    document.title = `${isSignup ? 'Create account' : 'Sign in'} — StructLab`;
    setError('');
    setSubmitting(false);
    setExistingSession(getSession());
    if (['student', 'company'].includes(requestedRole)) setRole(requestedRole);
  }, [mode, requestedRole]);

  function openPortal(user, replace = true) {
    navigate(`/portal/${user.role}/overview`, { replace });
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    const fullName = String(data.get('name') || '').trim();

    if (!emailPattern.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 4) {
      setError('Password must contain at least 4 characters for this demo.');
      return;
    }
    if (isSignup && fullName.length < 2) {
      setError('Enter your full name.');
      return;
    }
    if (isSignup && data.get('terms') !== 'on') {
      setError('Please accept the demo terms to continue.');
      return;
    }

    setSubmitting(true);
    window.setTimeout(() => {
      const user = isSignup
        ? createLocalAccount({ name: fullName, email, role })
        : loginLocalAccount(email, role);
      openPortal(user);
    }, 420);
  }

  function useDemo(demoRole) {
    const user = saveSession(demoAccounts[demoRole]);
    openPortal(user);
  }

  return (
    <div className="auth-page-shell">
      <aside className="auth-story-panel">
        <a className="auth-back-link" href="/"><ArrowLeft size={17} /> Back to website</a>

        <div className="auth-story-copy">
          <div className="auth-brand-lockup">
            <img src="/assets/images/main_logo.png" alt="" />
            <img src="/assets/images/STRUCT%20lub.png" alt="Struct Lab" />
          </div>
          <span className="auth-kicker"><Sparkles size={15} /> One profile. A complete construction career.</span>
          <h1>{isSignup ? 'Build a profile that proves what you can do.' : 'Continue building your construction future.'}</h1>
          <p>Learning, verified credentials, candidate matching, and company workflows meet in one focused workspace.</p>

          <div className="auth-story-features">
            <div><Check size={16} /><span><strong>Track real progress</strong><small>Courses, exams, and certificates stay connected.</small></span></div>
            <div><Check size={16} /><span><strong>Show verified skills</strong><small>Turn completed learning into a stronger profile.</small></span></div>
            <div><Check size={16} /><span><strong>Reach the right opportunity</strong><small>See roles and candidates with clearer matching.</small></span></div>
          </div>
        </div>

        <div className="auth-story-metrics" aria-hidden="true">
          <span><strong>1,000+</strong> learners</span>
          <span><strong>95%</strong> success rate</span>
          <span><strong>45</strong> companies</span>
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
            <button className={!isSignup ? 'active' : ''} type="button" onClick={() => navigate('/login', { replace: true })}>Sign in</button>
            <button className={isSignup ? 'active' : ''} type="button" onClick={() => navigate('/signup', { replace: true })}>Create account</button>
          </div>

          <header className="auth-form-header">
            <span>{isSignup ? 'Start with StructLab' : 'Welcome back'}</span>
            <h2>{isSignup ? 'Create your workspace' : 'Sign in to your account'}</h2>
            <p>{isSignup ? 'Choose how you will use the platform and complete your profile.' : 'Your dashboard is ready where you left it.'}</p>
          </header>

          {existingSession && !isSignup && (
            <button className="auth-resume" type="button" onClick={() => openPortal(existingSession)}>
              <span className={`auth-role-icon ${existingSession.role}`}><UserRound size={18} /></span>
              <span><strong>Continue as {existingSession.name}</strong><small>{existingSession.email}</small></span>
              <ArrowRight size={18} />
            </button>
          )}

          <form className="auth-page-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-role-picker" role="radiogroup" aria-label="Account role">
              <button className={role === 'student' ? 'active' : ''} type="button" role="radio" aria-checked={role === 'student'} onClick={() => setRole('student')}>
                <GraduationCap size={20} /><span><strong>Student</strong><small>Learn and get hired</small></span>
              </button>
              <button className={role === 'company' ? 'active' : ''} type="button" role="radio" aria-checked={role === 'company'} onClick={() => setRole('company')}>
                <Building2 size={20} /><span><strong>Company</strong><small>Train and recruit</small></span>
              </button>
            </div>

            {isSignup && (
              <label className="auth-input-field">
                <span>Full name</span>
                <div><UserRound size={18} /><input name="name" type="text" autoComplete="name" placeholder={role === 'company' ? 'Company or contact name' : 'Your full name'} /></div>
              </label>
            )}

            <label className="auth-input-field">
              <span>Email address</span>
              <div><Mail size={18} /><input name="email" type="email" autoComplete="email" placeholder={role === 'company' ? 'hr@company.az' : 'name@example.com'} /></div>
            </label>

            <label className="auth-input-field">
              <span>Password</span>
              <div>
                <LockKeyhole size={18} />
                <input name="password" type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder="Enter your password" />
                <button className="auth-password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {!isSignup && (
              <div className="auth-form-options">
                <label><input type="checkbox" defaultChecked /> Remember this device</label>
                <button type="button" onClick={() => setError('Password recovery is available in the connected production backend.')}>Forgot password?</button>
              </div>
            )}

            {isSignup && (
              <label className="auth-terms"><input name="terms" type="checkbox" /> I agree to the demo terms and privacy policy.</label>
            )}

            <p className={`auth-form-message${error ? ' show' : ''}`} role="alert">{error}</p>

            <button className="auth-submit-button" type="submit" disabled={submitting}>
              <span>{submitting ? 'Preparing workspace…' : isSignup ? 'Create account' : 'Sign in'}</span>
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>

          {!isSignup && (
            <div className="auth-demo-access">
              <div><span>Quick demo access</span></div>
              <div className="auth-demo-buttons">
                <button type="button" onClick={() => useDemo('student')}><GraduationCap size={16} /> Student</button>
                <button type="button" onClick={() => useDemo('company')}><Building2 size={16} /> Company</button>
                <button type="button" onClick={() => useDemo('admin')}><ShieldCheck size={16} /> Admin</button>
              </div>
            </div>
          )}

          <p className="auth-local-note"><ShieldCheck size={15} /> This frontend demo stores profile data only on this device.</p>
        </div>
      </main>
    </div>
  );
}
