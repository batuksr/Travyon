import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { createUserWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, updateProfile, sendEmailVerification } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User, MailCheck, RefreshCw, Check } from 'lucide-react';
import TravyonLogo from '../components/TravyonLogo';
import { useAuthStore } from '../store/useAuthStore';


const Register: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();

  /* E-posta doğrulama popup durumu */
  const [showVerify, setShowVerify]   = useState(false);
  const [checking, setChecking]       = useState(false);
  const [resending, setResending]     = useState(false);
  const [resent, setResent]           = useState(false);
  const [verifyMsg, setVerifyMsg]     = useState('');

  // Redirect sonucu al (mobil Google kaydı sonrası)
  useEffect(() => {
    getRedirectResult(auth)
      .then(result => { if (result?.user) navigate('/onboarding'); })
      .catch(err => {
        const code = (err as { code?: string }).code;
        if (code && code !== 'auth/no-auth-event' && code !== 'auth/null-user') {
          setError(t('auth.register.errors.redirectFailed'));
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError(t('auth.register.errors.passwordTooShort')); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      // Doğrulama maili gönder — doğrulayınca uygulamaya geri dönsün
      sendEmailVerification(cred.user, {
        url: `${window.location.origin}/hub`,
        handleCodeInApp: false,
      }).catch(() => { /* sessizce geç */ });
      // Navigate yerine doğrulama popup'ı göster
      setShowVerify(true);
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string };
      if (firebaseErr.code === 'auth/email-already-in-use') setError(t('auth.register.errors.emailInUse'));
      else if (firebaseErr.code === 'auth/weak-password') setError(t('auth.register.errors.weakPassword'));
      else setError(t('auth.register.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/onboarding');
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
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
        setError(t('auth.register.errors.googleFailedWithCode', { code: code || t('auth.common.unknownError') }));
        setLoading(false);
      }
    }
  };

  /* Doğrulama popup — "Doğruladım" kontrolü */
  const handleVerifyCheck = async () => {
    if (!auth.currentUser || checking) return;
    setVerifyMsg('');
    setChecking(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        setUser(auth.currentUser);
        navigate('/onboarding');
      } else {
        setVerifyMsg(t('auth.register.verify.notVerifiedYet'));
      }
    } catch {
      setVerifyMsg(t('auth.register.verify.checkFailed'));
    } finally {
      setChecking(false);
    }
  };

  /* Doğrulama popup — maili tekrar gönder */
  const handleVerifyResend = async () => {
    if (!auth.currentUser || resending) return;
    setVerifyMsg('');
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/hub`,
        handleCodeInApp: false,
      });
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (err) {
      const code = (err as { code?: string }).code;
      setVerifyMsg(code === 'auth/too-many-requests'
        ? t('auth.register.verify.tooManyRequests')
        : t('auth.register.verify.resendFailed'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── E-POSTA DOĞRULAMA POPUP ── */}
      {showVerify && (
        <div className="fixed inset-0 z-[100] bg-[#1c140c]/55 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-surface rounded-[28px] shadow-[0_24px_60px_rgba(46,43,37,0.4)] w-full max-w-md p-8 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4.5 rounded-3xl bg-accent-100 flex items-center justify-center text-accent">
              <MailCheck size={30} strokeWidth={2.5} />
            </div>
            <h2 className="font-heading text-2xl text-text mb-2">{t('auth.register.verify.title')}</h2>
            <p className="text-sm text-muted leading-relaxed mb-1.5">
              <Trans i18nKey="auth.register.verify.sentTo" values={{ email }} components={{ b: <span className="font-semibold text-text" /> }} />
            </p>
            <p className="text-xs text-muted leading-relaxed mb-6">
              {t('auth.register.verify.instructions')}
              <br />{t('auth.register.verify.spamHint')}
            </p>

            {verifyMsg && (
              <p className="text-xs text-rose-500 font-medium mb-4 bg-rose-50 border border-rose-100 rounded-2xl px-3 py-2">
                {verifyMsg}
              </p>
            )}

            <button
              type="button"
              onClick={handleVerifyCheck}
              disabled={checking}
              className="w-full py-3.5 bg-accent hover:brightness-105 text-white font-heading rounded-full flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-60 shadow-[0_12px_26px_rgba(198,113,57,0.3)] mb-2.5"
            >
              {checking ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.75} />}
              {t('auth.register.verify.checkButton')}
            </button>

            <button
              type="button"
              onClick={handleVerifyResend}
              disabled={resending || resent}
              className="w-full py-3 bg-transparent border-[1.5px] border-divider text-text font-heading rounded-full flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-60"
            >
              {resending ? <Loader2 size={15} className="animate-spin" />
                : resent ? <><Check size={15} strokeWidth={2.75} className="text-emerald-500" /> {t('auth.register.verify.resendSent')}</>
                : <><RefreshCw size={15} strokeWidth={2.75} /> {t('auth.register.verify.resendButton')}</>}
            </button>

            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="mt-4 text-xs text-muted hover:text-text font-medium transition-colors"
            >
              {t('auth.register.verify.laterButton')}
            </button>
          </motion.div>
        </div>
      )}

      {/* Sol Panel — Fotoğraf */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-[#1c140c]">
        <img
          src="https://images.unsplash.com/photo-1699654945774-2401e713f53e?q=75&w=1600&auto=format&fit=crop"
          alt={t('auth.register.photoAlt')}
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
              "{t('auth.register.quoteLine1')}<br />{t('auth.register.quoteLine2')}"
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

          <h1 className="font-heading text-3xl text-text">{t('auth.register.title')}</h1>
          <p className="text-muted text-[15px] mt-2.5 mb-7">{t('auth.register.subtitle')}</p>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block font-heading text-[13px] text-text mb-2">{t('auth.register.nameLabel')}</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} strokeWidth={2.5} />
                <input
                  type="text"
                  placeholder={t('auth.register.namePlaceholder')}
                  className="w-full pl-10 pr-4 py-3.5 bg-surface-2 border-[1.5px] border-divider rounded-2xl text-text text-[14.5px] placeholder:text-muted outline-none focus:border-accent transition-colors"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            </div>

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
              <label className="block font-heading text-[13px] text-text mb-2">{t('auth.common.passwordLabel')}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} strokeWidth={2.5} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.register.passwordPlaceholder')}
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
              <p className="mt-2 text-xs text-muted">{t('auth.register.passwordHint')}</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-1 bg-accent hover:brightness-105 text-white font-heading rounded-full flex items-center justify-center gap-2 text-[15px] transition-all disabled:opacity-50 shadow-[0_12px_26px_rgba(198,113,57,0.3)] active:translate-y-px"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} strokeWidth={2.75} />}
              {loading ? t('auth.register.submitLoading') : t('auth.register.submit')}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-divider" />
            <span className="text-xs text-muted uppercase tracking-wider">{t('auth.common.or')}</span>
            <div className="flex-1 h-px bg-divider" />
          </div>

          <button
            onClick={handleGoogleRegister}
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
            {t('auth.register.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-accent font-heading transition-colors">
              {t('auth.register.loginLink')}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
