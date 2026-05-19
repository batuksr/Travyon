import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Compass, LogOut, LayoutDashboard } from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]">

      {/* ─── NAVBAR ─── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-[#f8981d] rounded-xl flex items-center justify-center shrink-0">
              <Compass size={18} className="text-white" />
            </div>
            <span className="text-xl font-black text-[#1a1a1a] tracking-tight">
              Travyon
            </span>
          </Link>

          {/* Sağ: Navigasyon */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 hover:border-[#f8981d] hover:text-[#f8981d] rounded-lg transition-all"
                >
                  <LayoutDashboard size={15} />
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  <LogOut size={15} />
                  Çıkış
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Giriş Yap
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 bg-[#f8981d] hover:bg-[#e08518] text-white text-sm font-bold rounded-lg transition-all shadow-sm"
                >
                  Kayıt Ol
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── İÇERİK ─── */}
      <main className="flex-1">{children}</main>

      {/* ─── FOOTER ─── */}
      <footer className="bg-slate-900 border-t border-white/5">

        {/* ÜST KISIM — Ana içerik */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">

            {/* MARKA SÜTUNU — 4 kolon */}
            <div className="lg:col-span-4">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-[#f8981d] rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-lg">T</span>
                </div>
                <span className="text-white font-bold text-xl tracking-tight">Travyon</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs">
                Yapay zeka destekli kişisel seyahat planlayıcı. Bütçen, tempon ve zevklerine göre saniyeler içinde optimize edilmiş rota oluştur.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Gemini AI', 'Google Maps', 'OpenStreetMap', 'TSP'].map((tech) => (
                  <span key={tech} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-slate-400 text-xs font-medium">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* BOŞLUK — 1 kolon */}
            <div className="hidden lg:block lg:col-span-1" />

            {/* NAVİGASYON — 2 kolon */}
            <div className="lg:col-span-2">
              <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-4">Sayfalar</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Ana Sayfa', to: '/' },
                  { label: 'Dashboard', to: '/dashboard' },
                  { label: 'Plan Oluştur', to: '/onboarding' },
                  { label: 'Giriş Yap', to: '/login' },
                  { label: 'Kayıt Ol', to: '/register' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-slate-400 hover:text-white text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 group"
                    >
                      <span className="w-0 group-hover:w-3 h-px bg-[#f8981d] transition-all duration-200 shrink-0" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ÖZELLİKLER — 2 kolon */}
            <div className="lg:col-span-2">
              <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-4">Özellikler</h4>
              <ul className="space-y-3">
                {[
                  'AI Plan Üretimi',
                  'Rota Optimizasyonu',
                  'Bütçe Takibi',
                  'İnteraktif Harita',
                  'Vibe Değişimi',
                  'Koordinat Doğrulama',
                ].map((feature) => (
                  <li key={feature} className="text-slate-400 text-sm font-medium flex items-center gap-2">
                    <div className="w-1 h-1 bg-[#f8981d] rounded-full shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* PLATFORM & STAT — 3 kolon */}
            <div className="lg:col-span-3">
              <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-4">Platform</h4>
              <div className="space-y-3 mb-6">
                {[
                  { icon: '🌍', value: '50+', label: 'Desteklenen Şehir' },
                  { icon: '⚡', value: '15sn', label: 'Ortalama Plan Süresi' },
                  { icon: '🤖', value: 'AI', label: 'Gemini 2.5 Flash' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                    <span className="text-xl shrink-0">{stat.icon}</span>
                    <div>
                      <p className="text-white font-black text-sm leading-none">{stat.value}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/onboarding"
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#f8981d] hover:bg-[#e08518] text-white font-bold rounded-xl text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-[#f8981d]/20"
              >
                ✈️ Plan Oluştur
              </Link>
            </div>
          </div>
        </div>

        {/* İNCE AYIRICI */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* ALT KISIM — Copyright */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-xs">© 2026 Travyon. Tüm hakları saklıdır.</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>Türkiye'de</span>
              <span className="text-red-500">❤️</span>
              <span>ile yapıldı</span>
            </div>
            <div className="flex items-center gap-5">
              {['Gizlilik', 'Kullanım Şartları', 'İletişim'].map((link) => (
                <a key={link} href="#" className="text-slate-500 hover:text-slate-300 text-xs font-medium transition-colors">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
