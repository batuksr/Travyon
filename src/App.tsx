import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./services/firebase";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useSidebarStore } from "./store/useSidebarStore";
import { useAppSettingsStore, CURRENCY_MAP } from "./store/useAppSettingsStore";
import Sidebar from "./components/Sidebar";
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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

/* Sidebar + layout wrapper — useLocation burada çalışır (BrowserRouter içinde) */
const AppLayout: React.FC<{ isAuthenticated: boolean }> = ({ isAuthenticated }) => {
  const location = useLocation();
  const { expanded } = useSidebarStore();
  const isDashboard = location.pathname === '/dashboard' || location.pathname.startsWith('/plan/');

  /* Dashboard'da sidebar yok, margin da yok */
  const showSidebar = isAuthenticated && !isDashboard;

  return (
    <div className="flex min-h-screen bg-[#f5f0e8] dark:bg-slate-900">
      {showSidebar && <Sidebar />}
      <main className="flex-1 min-w-0">
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
        </Routes>
      </main>
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
            plansPublic:        d.plansPublic          ?? false,
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
    </BrowserRouter>
  );
}

export default App;
