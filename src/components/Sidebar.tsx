import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import {
  Home, Sparkles, Bookmark, LogOut, ChevronRight, Settings, Sun, Moon, Users, Bell,
} from 'lucide-react';
import TravyonLogo from './TravyonLogo';
import { useThemeStore } from '../store/useThemeStore';
import { useSidebarStore } from '../store/useSidebarStore';

const mainNavItems = [
  { icon: Home,     label: 'Ana Sayfa',   path: '/hub' },
  { icon: Sparkles, label: 'Plan Oluştur', path: '/onboarding' },
  { icon: Bookmark, label: 'Planlarım',   path: '/saved-plans' },
  { icon: Users,    label: 'Topluluk',     path: '/community' },
  { icon: Bell,     label: 'Bildirimler',  path: '/notifications' },
];

const Sidebar: React.FC = () => {
  const { expanded, setExpanded } = useSidebarStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { dark, toggle: toggleTheme } = useThemeStore();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`fixed left-0 top-0 bottom-0 z-50
                 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700
                 flex flex-col transition-all duration-300 ease-out
                 ${expanded ? 'w-60' : 'w-[84px]'}`}
    >

      {/* LOGO */}
      <div className="h-16 flex items-center border-b border-slate-100 px-2 shrink-0 overflow-hidden">
        <TravyonLogo
          size={64}
          showText={expanded}
          dark={dark}
        />
      </div>

      {/* ANA NAVİGASYON */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-hidden">
        {mainNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-[#187fe7]/10 text-[#187fe7]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className={`text-sm font-semibold whitespace-nowrap transition-opacity duration-200
                               ${expanded ? 'opacity-100' : 'opacity-0'}`}>
                {item.label}
              </span>
              {isActive && expanded && (
                <ChevronRight size={14} className="ml-auto shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* PRO UPGRADE KARTI — Genişlemişken */}
      {expanded && (
        <div className="px-3 pb-3">
          <div className="relative bg-gradient-to-br from-[#187fe7] to-[#0a4d99] rounded-xl p-4 overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#f8981d]/20 rounded-full blur-2xl" />
            <div className="relative">
              <span className="inline-block px-2 py-0.5 bg-[#f8981d] text-white text-[9px] font-black uppercase tracking-widest rounded-full mb-2">
                Pro
              </span>
              <p className="text-white font-bold text-sm leading-tight mb-1">
                Sınırsız Plan
              </p>
              <p className="text-blue-100 text-xs leading-relaxed mb-3">
                Reklamsız deneyim ve gelişmiş AI özellikleri
              </p>
              <button
                type="button"
                className="w-full py-1.5 bg-white text-[#187fe7] font-bold text-xs rounded-lg hover:bg-slate-50 transition-colors"
              >
                Yükselt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KULLANICI + ALT BUTONLAR */}
      <div className="border-t border-slate-100 px-2 py-3 space-y-1 shrink-0">

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all
            ${dark
              ? 'bg-slate-800 text-yellow-300 hover:bg-slate-700'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          aria-label="Tema değiştir"
        >
          <span key={dark ? 'sun' : 'moon'} className="theme-icon-in shrink-0">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </span>
          <span className={`text-xs font-semibold whitespace-nowrap transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
            {dark ? 'Aydınlık Mod' : 'Gece Modu'}
          </span>
        </button>

        {/* Kullanıcı avatarı */}
        {user && (
          <div className="w-full flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#187fe7] to-[#f8981d] flex items-center justify-center text-white text-xs font-black shrink-0">
              {user.displayName?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className={`text-left min-w-0 transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
              <p className="text-xs font-bold text-slate-900 truncate">
                {user.displayName || 'Kullanıcı'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {user.email}
              </p>
            </div>
          </div>
        )}

        {/* Ayarlar */}
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all
            ${location.pathname === '/settings'
              ? 'bg-[#f8981d]/10 text-[#f8981d]'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
        >
          <Settings size={16} className="shrink-0" />
          <span className={`text-xs font-semibold whitespace-nowrap transition-opacity duration-200
                           ${expanded ? 'opacity-100' : 'opacity-0'}`}>
            Ayarlar
          </span>
        </button>

        {/* Çıkış */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut size={16} className="shrink-0" />
          <span className={`text-xs font-semibold whitespace-nowrap transition-opacity duration-200
                           ${expanded ? 'opacity-100' : 'opacity-0'}`}>
            Çıkış Yap
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
