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
import { useAppSettingsStore } from '../store/useAppSettingsStore';
import { toggleWithCircle } from '../utils/themeTransition';

const mainNavItems = [
  { icon: Home,     label: 'Ana Sayfa',   path: '/hub' },
  { icon: Sparkles, label: 'Plan Oluştur', path: '/onboarding' },
  { icon: Bookmark, label: 'Planlarım',   path: '/saved-plans' },
  { icon: Users,    label: 'Topluluk',     path: '/community' },
  { icon: Bell,     label: 'Bildirimler',  path: '/notifications' },
];

const Sidebar: React.FC = () => {
  const { expanded, setExpanded } = useSidebarStore();
  const transitioningRef = React.useRef(false);
  const isHoveredRef = React.useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { dark, toggle: toggleTheme } = useThemeStore();
  const { photoURL: storePhotoURL, setSettings } = useAppSettingsStore();
  // Pill pozisyonunu VT snapshot'tan sonra geciktirerek güncelle — akıcı kayma için
  const [pillDark, setPillDark] = React.useState(dark);

  // Başka bir sayfadan tema değişince pill'i senkronize et
  React.useEffect(() => {
    if (!transitioningRef.current) {
      setPillDark(dark);
    }
  }, [dark]);

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
                 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700
                 transition-all duration-300 ease-out overflow-hidden
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


      {/* KULLANICI + ALT BUTONLAR */}
      <div className="border-t border-slate-100 px-2 py-3 space-y-1 shrink-0">

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={(e) => {
            transitioningRef.current = true;
            toggleWithCircle(toggleTheme, e);
            // VT snapshot alındıktan sonra pill'i kaydır — akıcı sliding için
            setTimeout(() => setPillDark(d => !d), 150);
            // Transition bittikten sonra: ref'i sıfırla, mouse dışarıdaysa sidebar'ı kapat
            setTimeout(() => {
              transitioningRef.current = false;
              if (!isHoveredRef.current) setExpanded(false);
            }, 700);
          }}
          className="w-full flex items-center px-0.5 py-2 rounded-lg transition-all hover:bg-slate-50"
          aria-label="Tema değiştir"
        >
          {/* Kapalıyken: pill toggle ortada */}
          {!expanded && (
            <div className="w-full flex justify-start">
              <div className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors duration-300
                ${dark ? 'bg-slate-600' : 'bg-slate-200'}`}
              >
                <div className={`pill-circle inline-flex h-5 w-5 rounded-full shadow-lg items-center justify-center
                  ${pillDark ? 'translate-x-5 bg-slate-900 text-yellow-300' : 'translate-x-0 bg-white text-slate-500'}`}
                  style={{ transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), background-color 0.3s ease' }}
                >
                  <span key={pillDark ? 'moon-c' : 'sun-c'} className="theme-icon-in">
                    {pillDark ? <Moon size={11} /> : <Sun size={11} />}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Genişlemişken: Tema yazısı + pill toggle */}
          {expanded && (
            <>
              <span className="text-xs font-semibold whitespace-nowrap text-slate-600 dark:text-slate-300 flex-1 text-left pl-3">
                Tema
              </span>
              <div className={`relative inline-flex flex-shrink-0 h-6 w-11 rounded-full border-2 border-transparent transition-colors duration-300
                ${dark ? 'bg-slate-600' : 'bg-slate-200'}`}
              >
                <div className={`pill-circle inline-flex h-5 w-5 rounded-full shadow-lg items-center justify-center
                  ${pillDark ? 'translate-x-5 bg-slate-900 text-yellow-300' : 'translate-x-0 bg-white text-slate-500'}`}
                  style={{ transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), background-color 0.3s ease' }}
                >
                  <span key={pillDark ? 'moon-e' : 'sun-e'} className="theme-icon-in">
                    {pillDark ? <Moon size={11} /> : <Sun size={11} />}
                  </span>
                </div>
              </div>
            </>
          )}
        </button>

        {/* Kullanıcı avatarı */}
        {user && (
          <div className="w-full flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#187fe7] to-[#f8981d] flex items-center justify-center text-white text-xs font-black shrink-0 overflow-hidden">
              {(storePhotoURL || user.photoURL)
                ? <img src={storePhotoURL || user.photoURL!} alt="avatar" className="w-full h-full object-cover" />
                : (user.displayName?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? 'U')
              }
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
