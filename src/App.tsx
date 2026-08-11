import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./services/firebase";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useAppSettingsStore, CURRENCY_MAP } from "./store/useAppSettingsStore";
import Sidebar from "./components/Sidebar";
import { Home as HomeIcon, Sparkles, Bookmark, Users, Settings as SettingsIcon, Bell } from "lucide-react";
import PwaInstallBanner from "./components/PwaInstallBanner";

// Rota bazlı kod bölme — her sayfa sadece ziyaret edildiğinde indirilir.
// Anonim bir ziyaretçi Home'a girdiğinde Dashboard/Settings/Firebase-ağır
// sayfaların kodunu indirmek zorunda kalmaz.
const Home               = lazy(() => import("./pages/Home"));
const Login               = lazy(() => import("./pages/Login"));
const Register             = lazy(() => import("./pages/Register"));
const Onboarding           = lazy(() => import("./pages/Onboarding"));
const Dashboard             = lazy(() => import("./pages/Dashboard"));
const SavedPlans           = lazy(() => import("./pages/SavedPlans"));
const Settings             = lazy(() => import("./pages/Settings"));
const Hub                 = lazy(() => import("./pages/Hub"));
const Community             = lazy(() => import("./pages/Community"));
const Notifications         = lazy(() => import("./pages/Notifications"));
const UserProfile           = lazy(() => import("./pages/UserProfile"));
const SSS                 = lazy(() => import("./pages/SSS"));
const TravelChecklist       = lazy(() => import("./pages/TravelChecklist"));
const CommunityPlanView     = lazy(() => import("./pages/CommunityPlanView"));
const Gizlilik             = lazy(() => import("./pages/Gizlilik"));
const KullanimKosullari     = lazy(() => import("./pages/KullanimKosullari"));
const Iletisim             = lazy(() => import("./pages/Iletisim"));

/* Rota geçişlerinde kısa süreliğine gösterilen, tema tokenlarına uygun yükleme ekranı */
const RouteFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-bg">
    <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-divider border-t-accent" />
  </div>
);

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
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around
      border-t border-divider bg-surface px-1 h-14 safe-b"
    >
      {BOTTOM_NAV.map(({ icon: Icon, label, path }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            type="button"
            onClick={() => navigate(path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors
              ${active ? 'text-accent' : 'text-muted'}`}
          >
            <Icon size={18} strokeWidth={2.5} />
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
    <div className="flex min-h-screen bg-bg">
      {showSidebar && <Sidebar />}
      <main className={`flex-1 min-w-0 ${showBottomNav ? 'pb-14 sm:pb-0' : ''}`}>
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
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
    return <RouteFallback />;
  }

  return (
    <BrowserRouter>
      <AppLayout isAuthenticated={!!user} />
      <PwaInstallBanner />
    </BrowserRouter>
  );
}

export default App;
