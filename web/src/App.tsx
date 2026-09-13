import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as Sentry from "@sentry/react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./services/firebase";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useAppSettingsStore, CURRENCY_MAP } from "./store/useAppSettingsStore";
import { usePlanStore } from "./store/usePlanStore";
import i18n, { LANGUAGE_TO_CODE } from "./i18n";
import Sidebar from "./components/Sidebar";
import { Home as HomeIcon, Sparkles, Bookmark, Users, Settings as SettingsIcon, Bell } from "lucide-react";
import PwaInstallBanner from "./components/PwaInstallBanner";
import SavedPlansCloudSync from "./components/SavedPlansCloudSync";
import TravelWalletCloudSync from "./components/TravelWalletCloudSync";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Rota bazlı kod bölme — sadece ziyaret edildiğinde indirilen ağır sayfalar.
// Home/Login/Register (anonim ziyaretçinin göreceği ilk sayfalar) yukarıda
// normal import ile geliyor — hiçbir Suspense/loading beklemesi olmadan
// anında render edilsinler diye. Dashboard/Settings/Firebase-ağır sayfalar
// ise sadece o rotaya girildiğinde indirilir.
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
const TravelWallet          = lazy(() => import("./pages/TravelWallet"));
const CommunityPlanView     = lazy(() => import("./pages/CommunityPlanView"));
const Gizlilik             = lazy(() => import("./pages/Gizlilik"));
const KullanimKosullari     = lazy(() => import("./pages/KullanimKosullari"));
const Iletisim             = lazy(() => import("./pages/Iletisim"));
const CityGuide            = lazy(() => import("./pages/CityGuide"));
const NotFound             = lazy(() => import("./pages/NotFound"));

/* Rota geçişlerinde kısa süreliğine gösterilen, tema tokenlarına uygun yükleme ekranı */
const RouteFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-bg">
    <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-divider border-t-accent" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuthStore();
  // Sadece korumalı (giriş gerektiren) sayfalar auth kontrolünü bekler —
  // herkese açık sayfalar (Home, Login, Register, yasal sayfalar) beklemez.
  if (loading) return <RouteFallback />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

/* ── Mobil alt navigasyon (sm altında gösterilir) ── */
const BottomNav: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate  = useNavigate();

  const BOTTOM_NAV = [
    { icon: HomeIcon,     label: t('nav.home'),              path: '/hub' },
    { icon: Sparkles,     label: t('nav.createPlan'),        path: '/onboarding' },
    { icon: Bookmark,     label: t('nav.myPlans'),           path: '/saved-plans' },
    { icon: Users,        label: t('nav.community'),         path: '/community' },
    { icon: Bell,         label: t('nav.notificationsShort'), path: '/notifications' },
    { icon: SettingsIcon, label: t('nav.settings'),          path: '/settings' },
  ] as const;

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

  /* Rota değişince sayfayı en üste sar — önceki sayfada kaydırılmış konum yeni sayfaya taşınmasın */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  /* Sidebar/alt nav gösterilmeyecek sayfalar — Dashboard, auth ve genel sayfalar */
  const noChromePaths = ['/login', '/register', '/', '/sss', '/gizlilik', '/kullanim-kosullari', '/iletisim'];
  const hideChrome = isDashboard || noChromePaths.includes(location.pathname) || location.pathname.startsWith('/rehber/');

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
            <Route path="/travel-wallet"        element={<ProtectedRoute><TravelWallet /></ProtectedRoute>} />
            <Route path="/plan/:planId"         element={<ProtectedRoute><CommunityPlanView /></ProtectedRoute>} />
            <Route path="/gizlilik"             element={<Gizlilik />} />
            <Route path="/kullanim-kosullari"   element={<KullanimKosullari />} />
            <Route path="/iletisim"             element={<Iletisim />} />
            <Route path="/rehber/:slug"         element={<CityGuide />} />
            <Route path="*"                      element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
};

function App() {
  const { user, setUser, setLoading } = useAuthStore();
  const { dark } = useThemeStore();
  const { language, analyticsEnabled, setSettings, resetSettings } = useAppSettingsStore();
  const clearPlan = usePlanStore((state) => state.clearPlan);

  /* Apply / remove dark class on <html> */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // Hata telemetrisi yalnızca oturum sahibi açıkça izin verdiyse başlatılır.
  useEffect(() => {
    if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN && user && analyticsEnabled) {
      Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN });
      return () => { void Sentry.close(1000); };
    }
    return undefined;
  }, [user, analyticsEnabled]);

  /* Ayarlar'daki dil seçimini i18next'e uygula — değişince tüm uygulama anında güncellenir */
  useEffect(() => {
    const code = LANGUAGE_TO_CODE[language] ?? 'tr';
    if (i18n.language !== code) i18n.changeLanguage(code);
    document.documentElement.lang = code;
  }, [language]);

  useEffect(() => {
    if (!auth || Object.keys(auth).length === 0) {
      console.warn("Auth servisi başlatılamadı, Firebase ayarlarını kontrol edin.");
      setLoading(false);
      return;
    }
    let unsubscribeSettings: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      unsubscribeSettings?.();
      unsubscribeSettings = undefined;
      // Önceki hesabın izinleri yeni hesaba bir render bile taşınmasın.
      resetSettings();
      setUser(currentUser);
      setLoading(false);

      // Kullanıcı çıkış yaptığında store'u temizle
      if (!currentUser) {
        clearPlan();
        return;
      }

      const activePlanOwner = usePlanStore.getState().ownerUid;
      if (activePlanOwner !== currentUser.uid) clearPlan();

      // Web ve mobil değişiklikleri açık oturumda anında eşitle.
      if (currentUser) {
        const settingsOwnerUid = currentUser.uid;
        unsubscribeSettings = onSnapshot(doc(db, 'users', settingsOwnerUid), (snap) => {
          if (auth.currentUser?.uid !== settingsOwnerUid) return;
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
            profilePublic:      d.profilePublic        ?? false,
            plansPublic:        d.plansPublic          ?? false,
            followPublic:       d.followPublic         ?? false,
            locationEnabled:    false,
            locationHistory:    false,
            analyticsEnabled:   d.analyticsEnabled     ?? false,
            photoURL:           d.photoURL             ?? null,
          });
        }, () => {});
      }
    });
    return () => {
      unsubscribeSettings?.();
      unsubscribe();
    };
  }, [setUser, setLoading, setSettings, resetSettings, clearPlan]);

  // Not: burada global bir "loading" bekletmesi yok — herkese açık sayfalar
  // (Home, Login, Register...) auth kontrolü bitmeden hemen render edilir.
  // Sadece ProtectedRoute içindeki sayfalar auth durumunu bekler.
  return (
    <BrowserRouter>
      <AppLayout isAuthenticated={!!user} />
      <SavedPlansCloudSync />
      <TravelWalletCloudSync />
      <PwaInstallBanner />
    </BrowserRouter>
  );
}

export default App;
