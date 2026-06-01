import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./services/firebase";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useAppSettingsStore, CURRENCY_MAP } from "./store/useAppSettingsStore";
import Sidebar from "./components/Sidebar";
import { Home as HomeIcon, Sparkles, Bookmark, Users, Settings as SettingsIcon, Bell } from "lucide-react";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import SavedPlans from "./pages/SavedPlans";
import Settings from "./pages/Settings";
import Hub from "./pages/Hub";
import Community from "./pages/Community";
import Notifications from "./pages/Notifications";
import UserProfile from "./pages/UserProfile";
import SSS from "./pages/SSS";
import TravelChecklist from "./pages/TravelChecklist";
import CommunityPlanView from "./pages/CommunityPlanView";
import Gizlilik from "./pages/Gizlilik";
import KullanimKosullari from "./pages/KullanimKosullari";
import Iletisim from "./pages/Iletisim";
import PwaInstallBanner from "./components/PwaInstallBanner";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

/* ── Mobil alt navigasyon (sm altında gösterilir) ── */
const BOTTOM_NAV = [
  { icon: HomeIcon,     label: 'Ana Sayfa',    path: '/hub' },
  { icon: Sparkles,     label: 'Plan Oluştur', path: '/onboarding' },
  { icon: Bookmark,     label: 'Planlarım',    path: '/saved-plans' },
  { icon: Users,        label: 'Topluluk',     path: '/community' },
  { icon: Bell,         label: 'Bildirim',     path: '/notifications' },
  { icon: SettingsIcon, label: 'Ayarlar',      path: '/settings' },
] as const;

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const { dark }  = useThemeStore();
  return (
    <nav className={`sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around
      border-t px-1 h-14 safe-b
      ${dark
        ? 'bg-slate-900 border-slate-700'
        : 'bg-white border-slate-200'}`}
    >
      {BOTTOM_NAV.map(({ icon: Icon, label, path }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            type="button"
            onClick={() => navigate(path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors
              ${active
                ? 'text-[#f8981d]'
                : dark ? 'text-slate-400' : 'text-slate-500'}`}
          >
            <Icon size={18} />
            <span className="text-[9px] font-semibold">{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

/* Sidebar + layout wrapper — useLocation burada çalışır (BrowserRouter içinde) */
const AppLayout: React.FC<{ isAuthenticated: boolean }> = ({ isAuthenticated }) => {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard' || location.pathname.startsWith('/plan/');

  /* Sidebar/alt nav gösterilmeyecek sayfalar — Dashboard, auth ve genel sayfalar */
  const noChromePaths = ['/login', '/register', '/', '/sss', '/gizlilik', '/kullanim-kosullari', '/iletisim'];
  const hideChrome = isDashboard || noChromePaths.includes(location.pathname);

  const showSidebar   = isAuthenticated && !hideChrome;
  const showBottomNav = isAuthenticated && !hideChrome;

  return (
    <div className="flex min-h-screen bg-[#f5f0e8] dark:bg-slate-900">
      {showSidebar && <Sidebar />}
      <main className={`flex-1 min-w-0 ${showBottomNav ? 'pb-14 sm:pb-0' : ''}`}>
        <Routes>
          <Route path="/"            element={isAuthenticated ? <Navigate to="/hub" replace /> : <Home />} />
          <Route path="/hub"         element={<ProtectedRoute><Hub /></ProtectedRoute>} />
          <Route path="/community"      element={<ProtectedRoute><Community /></ProtectedRoute>} />
          <Route path="/notifications"  element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/login"       element={<Login />} />
          <Route path="/register"    element={<Register />} />
          <Route path="/onboarding"  element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/saved-plans" element={<ProtectedRoute><SavedPlans /></ProtectedRoute>} />
          <Route path="/settings"    element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/profile/:uid" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="/sss"                  element={<SSS />} />
          <Route path="/travel-checklist"     element={<ProtectedRoute><TravelChecklist /></ProtectedRoute>} />
          <Route path="/plan/:planId"         element={<ProtectedRoute><CommunityPlanView /></ProtectedRoute>} />
          <Route path="/gizlilik"             element={<Gizlilik />} />
          <Route path="/kullanim-kosullari"   element={<KullanimKosullari />} />
          <Route path="/iletisim"             element={<Iletisim />} />
        </Routes>
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
};

function App() {
  const { user, setUser, setLoading, loading } = useAuthStore();
  const { dark } = useThemeStore();
  const { setSettings } = useAppSettingsStore();

  /* Apply / remove dark class on <html> */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    if (!auth || Object.keys(auth).length === 0) {
      console.warn("Auth servisi başlatılamadı, Firebase ayarlarını kontrol edin.");
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Kullanıcı çıkış yaptığında store'u temizle
      if (!currentUser) {
        setSettings({ photoURL: null });
        return;
      }

      // Kullanıcı giriş yaptığında uygulama ayarlarını Firestore'dan yükle
      if (currentUser) {
        getDoc(doc(db, 'users', currentUser.uid)).then((snap) => {
          if (!snap.exists()) return;
          const d = snap.data();
          // Para birimi → Varsayılan Tercihler'deki defaultCurrency'den alınır
          const currLabel: string = d.defaultCurrency ?? 'TRY — ₺';
          const curr = CURRENCY_MAP[currLabel] ?? { code: 'TRY', symbol: '₺' };
          // Tarayıcı push iznini kontrol et
          const pushPerm: 'default' | 'granted' | 'denied' | 'unsupported' =
            'Notification' in window
              ? (Notification.permission as 'default' | 'granted' | 'denied')
              : 'unsupported';

          setSettings({
            language:           d.language           ?? 'Türkçe',
            currencyLabel:      currLabel,
            currencyCode:       curr.code,
            currencySymbol:     curr.symbol,
            distanceKm:         d.distanceKm          ?? true,
            tempCelsius:        d.tempCelsius          ?? true,
            appPlanNotif:       d.appPlanNotif         ?? true,
            appCommunityNotif:  d.appCommunityNotif    ?? true,
            appUpdateNotif:     d.appUpdateNotif       ?? false,
            emailPlanNotif:     d.emailPlanNotif       ?? true,
            emailWeeklyDigest:  d.emailWeeklyDigest    ?? true,
            emailPromoNotif:    d.emailPromoNotif      ?? false,
            pushEnabled:        d.pushEnabled          ?? false,
            pushSoundEnabled:   d.pushSoundEnabled     ?? true,
            pushPermission:     pushPerm,
            profilePublic:      d.profilePublic        ?? true,
            plansPublic:        d.plansPublic          ?? true,
            followPublic:       d.followPublic         ?? true,
            locationEnabled:    d.locationEnabled      ?? true,
            locationHistory:    d.locationHistory      ?? false,
            analyticsEnabled:   d.analyticsEnabled     ?? true,
            photoURL:           d.photoURL             ?? null,
          });
        }).catch(() => {});
      }
    });
    return () => unsubscribe();
  }, [setUser, setLoading, setSettings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f5f0e8] dark:bg-slate-900">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-slate-200 border-t-slate-900 dark:border-slate-600 dark:border-t-slate-200" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppLayout isAuthenticated={!!user} />
      <PwaInstallBanner />
    </BrowserRouter>
  );
}

export default App;
