import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./services/firebase";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useSidebarStore } from "./store/useSidebarStore";
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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

/* Sidebar + layout wrapper — useLocation burada çalışır (BrowserRouter içinde) */
const AppLayout: React.FC<{ isAuthenticated: boolean }> = ({ isAuthenticated }) => {
  const location = useLocation();
  const { expanded } = useSidebarStore();
  const isDashboard = location.pathname === '/dashboard';

  /* Dashboard'da sidebar yok, margin da yok */
  const showSidebar = isAuthenticated && !isDashboard;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {showSidebar && <Sidebar />}
      <main
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: showSidebar ? (expanded ? '240px' : '84px') : '0px' }}
      >
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
        </Routes>
      </main>
    </div>
  );
};

function App() {
  const { user, setUser, setLoading, loading } = useAuthStore();
  const { dark } = useThemeStore();

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
    });
    return () => unsubscribe();
  }, [setUser, setLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
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
