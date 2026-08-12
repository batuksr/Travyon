import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import {
  Home, Sparkles, Bookmark, LogOut, Settings, Sun, Moon, Users, Bell,
} from 'lucide-react';
import TravyonLogo from './TravyonLogo';
import { useThemeStore } from '../store/useThemeStore';
import { useSidebarStore } from '../store/useSidebarStore';
import { useAppSettingsStore } from '../store/useAppSettingsStore';
import { toggleWithCircle } from '../utils/themeTransition';

const navBtn = 'w-full flex items-center gap-3.5 px-[15px] py-[11px] rounded-2xl font-heading text-sm text-left cursor-pointer transition-colors';
const navIdle = 'text-muted hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] hover:text-text';
const navActive = 'bg-accent-100 text-accent-700';

const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const { expanded, setExpanded } = useSidebarStore();
  const transitioningRef = React.useRef(false);
  const isHoveredRef = React.useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { dark, toggle: toggleTheme } = useThemeStore();
  const { photoURL: storePhotoURL, setSettings } = useAppSettingsStore();

  const mainNavItems = [
    { icon: Home,     label: t('nav.home'),       path: '/hub' },
    { icon: Sparkles, label: t('nav.createPlan'), path: '/onboarding' },
    { icon: Bookmark, label: t('nav.myPlans'),    path: '/saved-plans' },
    { icon: Users,    label: t('nav.community'),  path: '/community' },
    { icon: Bell,     label: t('nav.notifications'), path: '/notifications' },
  ];

  const handleLogout = async () => {
    setSettings({ photoURL: null }); // localStorage'daki fotoğrafı temizle
    await signOut(auth);
    navigate('/login');
  };

  return (
    <aside
      onMouseEnter={() => { isHoveredRef.current = true; setExpanded(true); }}
      onMouseLeave={() => { isHoveredRef.current = false; if (!transitioningRef.current) setExpanded(false); }}
      className={`hidden sm:flex sm:flex-col sticky top-0 h-screen shrink-0 z-40
                 bg-surface border-r border-divider
                 transition-[width] duration-[260ms] ease-[cubic-bezier(.4,0,.2,1)] overflow-hidden
                 ${expanded ? 'w-[236px]' : 'w-[84px]'}`}
    >

      {/* LOGO */}
      <div className="h-[74px] flex items-center border-b border-divider px-5 shrink-0 overflow-hidden">
        <TravyonLogo size={40} showText={expanded} />
      </div>

      {/* ANA NAVİGASYON */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-[5px] overflow-hidden">
        {mainNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`${navBtn} ${isActive ? navActive : navIdle}`}
            >
              <Icon size={20} strokeWidth={2.5} className="shrink-0" />
              <span className={`whitespace-nowrap overflow-hidden transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* KULLANICI + ALT BUTONLAR */}
      <div className="border-t border-divider p-3 flex flex-col gap-[5px] shrink-0">

        {/* Ayarlar */}
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className={`${navBtn} ${location.pathname === '/settings' ? navActive : navIdle}`}
        >
          <Settings size={20} strokeWidth={2.5} className="shrink-0" />
          <span className={`whitespace-nowrap overflow-hidden transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
            {t('nav.settings')}
          </span>
        </button>

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={(e) => {
            transitioningRef.current = true;
            toggleWithCircle(toggleTheme, e);
            setTimeout(() => {
              transitioningRef.current = false;
              if (!isHoveredRef.current) setExpanded(false);
            }, 700);
          }}
          className={`${navBtn} ${navIdle}`}
          aria-label={t('nav.themeToggleLabel')}
        >
          <span className="w-5 flex items-center justify-center shrink-0">
            {dark ? <Sun size={17} strokeWidth={2.5} /> : <Moon size={17} strokeWidth={2.5} />}
          </span>
          <span className={`whitespace-nowrap overflow-hidden transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
            {t('nav.theme')}
          </span>
        </button>

        {/* Kullanıcı avatarı */}
        {user && (
          <div className="w-full flex items-center gap-3 px-[13px] py-2">
            <div className="w-[34px] h-[34px] rounded-full shrink-0 bg-gradient-to-br from-accent to-sage flex items-center justify-center text-white font-heading text-[15px] overflow-hidden">
              {(storePhotoURL || user.photoURL)
                ? <img src={storePhotoURL || user.photoURL!} alt="avatar" className="w-full h-full object-cover" />
                : (user.displayName?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? 'U')
              }
            </div>
            <div className={`text-left min-w-0 whitespace-nowrap overflow-hidden transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
              <p className="font-heading text-[13.5px] text-text truncate m-0">
                {user.displayName || t('nav.user')}
              </p>
            </div>
          </div>
        )}

        {/* Çıkış */}
        <button
          type="button"
          onClick={handleLogout}
          className={`${navBtn} text-[#c0492f] hover:bg-[#c0492f]/10`}
        >
          <LogOut size={19} strokeWidth={2.5} className="shrink-0" />
          <span className={`whitespace-nowrap overflow-hidden transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
            {t('nav.logout')}
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
