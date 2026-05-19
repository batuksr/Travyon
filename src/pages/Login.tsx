import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/onboarding');
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string };
      if (firebaseErr.code === 'auth/user-not-found') setError('Bu e-posta ile kayıtlı hesap bulunamadı.');
      else if (firebaseErr.code === 'auth/wrong-password') setError('Şifre hatalı.');
      else if (firebaseErr.code === 'auth/invalid-credential') setError('E-posta veya şifre hatalı.');
      else setError('Giriş yapılamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/onboarding');
    } catch {
      setError('Google ile giriş yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden">
      {/* Sol Panel — Fotoğraf */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
          alt="Travel"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/30 to-slate-900/75" />
        <div className="relative z-10 flex flex-col h-full p-10">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#187fe7] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-base">T</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Travyon</span>
          </Link>
          <div className="mt-auto">
            <blockquote className="text-white text-xl font-semibold leading-snug max-w-xs">
              "Dünyanın en güzel köşeleri,<br />seni beklemeye devam ediyor."
            </blockquote>
            <p className="mt-3 text-white/55 text-sm">Travyon ile seyahatini planla, anılarını yarat.</p>
          </div>
        </div>
      </div>

      {/* Sağ Panel — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 bg-white overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="w-9 h-9 bg-[#187fe7] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-base">T</span>
              </div>
              <span className="text-slate-900 font-bold text-lg tracking-tight">Travyon</span>
            </Link>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900">Tekrar Hoş Geldiniz 👋</h1>
          <p className="text-slate-500 text-sm mt-1.5 mb-8">Hesabınıza giriş yapın ve planlamaya devam edin.</p>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  placeholder="ornek@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-400 outline-none focus:bg-white focus:border-[#187fe7] focus:ring-4 focus:ring-[#187fe7]/10 transition-all"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Şifre</label>
                <button type="button" className="text-xs text-[#187fe7] hover:text-blue-700 font-medium transition-colors">
                  Şifremi Unuttum
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-400 outline-none focus:bg-white focus:border-[#187fe7] focus:ring-4 focus:ring-[#187fe7]/10 transition-all"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#187fe7] hover:bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">veya</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-2.5 text-sm transition-all disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google ile Devam Et
          </button>

          <p className="text-center text-slate-500 text-sm mt-7">
            Hesabın yok mu?{' '}
            <Link to="/register" className="text-[#187fe7] hover:text-blue-700 font-semibold transition-colors">
              Kayıt Ol
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
