import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import TravyonLogo from '../components/TravyonLogo';


const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect sonucu al (mobil Google girişi sonrası)
  useEffect(() => {
    getRedirectResult(auth)
      .then(result => { if (result?.user) navigate('/hub'); })
      .catch(err => {
        const code = (err as { code?: string }).code;
        if (code && code !== 'auth/no-auth-event' && code !== 'auth/null-user') {
          setError(t('auth.login.errors.redirectFailed'));
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/hub');
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string };
      if (firebaseErr.code === 'auth/user-not-found') setError(t('auth.login.errors.userNotFound'));
      else if (firebaseErr.code === 'auth/wrong-password') setError(t('auth.login.errors.wrongPassword'));
      else if (firebaseErr.code === 'auth/invalid-credential') setError(t('auth.login.errors.invalidCredential'));
      else setError(t('auth.login.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/hub');
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      // Popup engellendiyse redirect'e geç (HTTPS zorunlu)
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
        if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
          await signInWithRedirect(auth, googleProvider);
        } else {
          setError(t('auth.common.httpsRequired'));
          setLoading(false);
        }
      } else if (code === 'auth/unauthorized-domain') {
        setError(t('auth.common.unauthorizedDomain'));
        setLoading(false);
      } else {
        setError(t('auth.login.errors.googleFailedWithCode', { code: code || t('auth.common.unknownError') }));
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sol Panel — Fotoğraf */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-[#1c140c]">
        <img
          src="https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=75&w=1600&auto=format&fit=crop"
          alt={t('auth.login.photoAlt')}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'saturate(.72) contrast(.92) brightness(1.04)' }}
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1c140c]/50 via-[#1c140c]/28 to-[#1c140c]/78" />
        <div className="relative z-10 flex flex-col h-full p-10">
          <Link to="/">
            <TravyonLogo size={64} dark />
          </Link>
          <div className="mt-auto">
            <blockquote className="font-heading text-white text-2xl leading-snug max-w-xs">
              "{t('auth.login.quoteLine1')}<br />{t('auth.login.quoteLine2')}"
            </blockquote>
            <p className="mt-3.5 text-white/60 text-sm">{t('auth.common.tagline')}</p>
          </div>
        </div>
      </div>

      {/* Sağ Panel — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 bg-bg overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/">
              <TravyonLogo size={64} />
            </Link>
          </div>

          <h1 className="font-heading text-3xl text-text">{t('auth.login.title')}</h1>
          <p className="text-muted text-[15px] mt-2.5 mb-7">{t('auth.login.subtitle')}</p>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block font-heading text-[13px] text-text mb-2">{t('auth.common.emailLabel')}</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} strokeWidth={2.5} />
                <input
                  type="email"
                  placeholder={t('auth.common.emailPlaceholder')}
                  className="w-full pl-10 pr-4 py-3.5 bg-surface-2 border-[1.5px] border-divider rounded-2xl text-text text-[14.5px] placeholder:text-muted outline-none focus:border-accent transition-colors"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block font-heading text-[13px] text-text">{t('auth.common.passwordLabel')}</label>
                <button type="button" className="text-xs text-accent font-heading transition-colors">
                  {t('auth.login.forgotPassword')}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} strokeWidth={2.5} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3.5 bg-surface-2 border-[1.5px] border-divider rounded-2xl text-text text-[14.5px] placeholder:text-muted outline-none focus:border-accent transition-colors"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                >
                  {showPassword ? <EyeOff size={17} strokeWidth={2.5} /> : <Eye size={17} strokeWidth={2.5} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-1 bg-accent hover:brightness-105 text-white font-heading rounded-full flex items-center justify-center gap-2 text-[15px] transition-all disabled:opacity-50 shadow-[0_12px_26px_rgba(198,113,57,0.3)] active:translate-y-px"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} strokeWidth={2.75} />}
              {loading ? t('auth.login.submitLoading') : t('auth.login.submit')}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-divider" />
            <span className="text-xs text-muted uppercase tracking-wider">{t('auth.common.or')}</span>
            <div className="flex-1 h-px bg-divider" />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 bg-surface hover:bg-surface-2 border-[1.5px] border-divider text-text font-heading rounded-full flex items-center justify-center gap-2.5 text-[14.5px] transition-all disabled:opacity-50"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t('auth.common.googleContinue')}
          </button>

          <p className="text-center text-muted text-sm mt-7">
            {t('auth.login.noAccount')}{' '}
            <Link to="/register" className="text-accent font-heading transition-colors">
              {t('auth.login.registerLink')}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
