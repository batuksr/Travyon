import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  deleteUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import {
  User, Mail, Lock, ChevronRight, Check, AlertCircle, Loader2, Camera,
  Settings2, BookOpen, MapPin, Palette, Globe, Ruler,
  BellRing, Smartphone, Eye, EyeOff, Database,
  CreditCard, Receipt, Wallet, Download, Trash2,
  HelpCircle, MessageCircle, Bug,
  Sun, Moon,
  type LucideIcon,
} from 'lucide-react';

/* ── Types ── */
type Section =
  | 'profile' | 'email' | 'password'
  | 'travel_defaults' | 'passport' | 'location_tz'
  | 'theme' | 'language_currency' | 'units'
  | 'app_notif' | 'email_notif' | 'push_notif'
  | 'privacy_profile' | 'privacy_location' | 'privacy_data'
  | 'subscription' | 'billing_history' | 'payment'
  | 'data_export' | 'delete_account'
  | 'faq' | 'contact' | 'report_bug';

type Status = { type: 'success' | 'error'; message: string } | null;

const LANGUAGES = ['Türkçe', 'English', 'Français', 'Español', 'Deutsch'];
const CURRENCIES = ['TRY — ₺', 'USD — $', 'EUR — €', 'GBP — £', 'JPY — ¥'];
const TIMEZONES = ['Europe/Istanbul (UTC+3)', 'Europe/London (UTC+0)', 'America/New_York (UTC-5)', 'America/Los_Angeles (UTC-8)', 'Asia/Tokyo (UTC+9)'];

/* Şifre gücü: 0-4 */
const getPasswordStrength = (pw: string): { score: number; label: string; color: string } => {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score: 1, label: 'Çok zayıf', color: 'bg-rose-500' };
  if (score === 2) return { score: 2, label: 'Zayıf', color: 'bg-orange-400' };
  if (score === 3) return { score: 3, label: 'Orta', color: 'bg-amber-400' };
  if (score === 4) return { score: 4, label: 'Güçlü', color: 'bg-emerald-500' };
  return { score: 5, label: 'Çok güçlü', color: 'bg-emerald-600' };
};

const firebaseErrorMsg = (code: string): string => {
  const map: Record<string, string> = {
    'auth/wrong-password': 'Mevcut şifre hatalı.',
    'auth/invalid-credential': 'Mevcut şifre hatalı.',
    'auth/weak-password': 'Yeni şifre en az 6 karakter olmalı.',
    'auth/email-already-in-use': 'Bu e-posta zaten kullanılıyor.',
    'auth/invalid-email': 'Geçersiz e-posta adresi.',
    'auth/requires-recent-login': 'Güvenlik için lütfen tekrar giriş yapın.',
    'auth/too-many-requests': 'Çok fazla deneme, lütfen birkaç dakika bekleyin.',
  };
  return map[code] ?? 'Bir hata oluştu, lütfen tekrar deneyin.';
};

/* ── Shared UI ── */
const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-[#f8981d]' : 'bg-slate-200'}`}
  >
    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
  </button>
);

const StatusBanner: React.FC<{ status: Status }> = ({ status }) => {
  if (!status) return null;
  const ok = status.type === 'success';
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm mb-5 ${ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
      {ok ? <Check size={14} /> : <AlertCircle size={14} />}
      {status.message}
    </div>
  );
};

const SegmentedControl: React.FC<{
  options: { label: string; val: boolean }[];
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
    {options.map(({ label, val }) => (
      <button key={label} type="button" onClick={() => onChange(val)}
        className={`flex-1 py-2 transition-colors ${value === val ? 'bg-[#f8981d] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
      >{label}</button>
    ))}
  </div>
);

const SettingRow: React.FC<{ title: string; desc: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
    <div>
      <p className="text-sm font-medium text-slate-800">{title}</p>
      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
    </div>
    {children}
  </div>
);

const ComingSoonBadge = () => (
  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest">Yakında</span>
);

/* ── Nav structure ── */
const NAV_GROUPS: { label: string; items: { id: Section; icon: LucideIcon; label: string }[] }[] = [
  {
    label: 'HESAP',
    items: [
      { id: 'profile',  icon: User, label: 'Profil' },
      { id: 'email',    icon: Mail, label: 'E-posta' },
      { id: 'password', icon: Lock, label: 'Şifre' },
    ],
  },
  {
    label: 'SEYAHAT',
    items: [
      { id: 'travel_defaults', icon: Settings2, label: 'Varsayılan Tercihler' },
      { id: 'passport',        icon: BookOpen,  label: 'Pasaport & Vatandaşlık' },
      { id: 'location_tz',     icon: MapPin,    label: 'Konum & Saat Dilimi' },
    ],
  },
  {
    label: 'GÖRÜNÜM',
    items: [
      { id: 'theme',             icon: Palette, label: 'Tema' },
      { id: 'language_currency', icon: Globe,   label: 'Dil & Para Birimi' },
      { id: 'units',             icon: Ruler,   label: 'Ölçü Birimleri' },
    ],
  },
  {
    label: 'BİLDİRİMLER',
    items: [
      { id: 'app_notif',   icon: BellRing,     label: 'Uygulama Bildirimleri' },
      { id: 'email_notif', icon: Mail,         label: 'E-posta Bildirimleri' },
      { id: 'push_notif',  icon: Smartphone,   label: 'Push Bildirimleri' },
    ],
  },
  {
    label: 'GİZLİLİK',
    items: [
      { id: 'privacy_profile',  icon: Eye,      label: 'Profil & Plan Gizliliği' },
      { id: 'privacy_location', icon: MapPin,   label: 'Lokasyon' },
      { id: 'privacy_data',     icon: Database, label: 'Veri Kullanımı' },
    ],
  },
  {
    label: 'FATURALAMA',
    items: [
      { id: 'subscription',    icon: CreditCard, label: 'Abonelik' },
      { id: 'billing_history', icon: Receipt,    label: 'Fatura Geçmişi' },
      { id: 'payment',         icon: Wallet,     label: 'Ödeme Yöntemi' },
    ],
  },
  {
    label: 'VERİLERİM',
    items: [
      { id: 'data_export',   icon: Download, label: 'Veri İndir' },
      { id: 'delete_account', icon: Trash2,   label: 'Hesabı Sil' },
    ],
  },
  {
    label: 'DESTEK',
    items: [
      { id: 'faq',        icon: HelpCircle,    label: 'SSS' },
      { id: 'contact',    icon: MessageCircle, label: 'İletişim' },
      { id: 'report_bug', icon: Bug,           label: 'Hata Bildir' },
    ],
  },
];

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { dark, toggle: toggleTheme } = useThemeStore();

  const [activeSection, setActiveSection] = useState<Section>('profile');

  /* ── HESAP ── */
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState((user?.displayName ?? '').toLowerCase().replace(/\s+/g, '') || '');
  const [bio, setBio] = useState('');
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [emailStatus, setEmailStatus] = useState<Status>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [reloadLoading, setReloadLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  /* ── SEYAHAT ── */
  const [defaultBudget, setDefaultBudget] = useState('15000');
  const [defaultCurrency, setDefaultCurrency] = useState('TRY — ₺');
  const [defaultPace, setDefaultPace] = useState('normal');
  const [passportCountry, setPassportCountry] = useState('Türkiye');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [timezone, setTimezone] = useState('Europe/Istanbul (UTC+3)');
  const [travelStatus, setTravelStatus] = useState<Status>(null);
  const [travelLoading, setTravelLoading] = useState(false);

  /* ── GÖRÜNÜM ── */
  const [language, setLanguage] = useState('Türkçe');
  const [currency, setCurrency] = useState('TRY — ₺');
  const [distanceKm, setDistanceKm] = useState(true);
  const [tempCelsius, setTempCelsius] = useState(true);
  const [appearanceStatus, setAppearanceStatus] = useState<Status>(null);
  const [appearanceLoading, setAppearanceLoading] = useState(false);

  /* ── BİLDİRİMLER ── */
  const [appPlanNotif, setAppPlanNotif] = useState(true);
  const [appCommunityNotif, setAppCommunityNotif] = useState(true);
  const [appUpdateNotif, setAppUpdateNotif] = useState(false);
  const [emailPlanNotif, setEmailPlanNotif] = useState(true);
  const [emailWeeklyDigest, setEmailWeeklyDigest] = useState(true);
  const [emailPromoNotif, setEmailPromoNotif] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSoundEnabled, setPushSoundEnabled] = useState(true);
  const [notifStatus, setNotifStatus] = useState<Status>(null);
  const [notifLoading, setNotifLoading] = useState(false);

  /* ── GİZLİLİK ── */
  const [profilePublic, setProfilePublic] = useState(true);
  const [plansPublic, setPlansPublic] = useState(false);
  const [followPublic, setFollowPublic] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [locationHistory, setLocationHistory] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [privacyStatus, setPrivacyStatus] = useState<Status>(null);
  const [privacyLoading, setPrivacyLoading] = useState(false);

  /* ── VERİLERİM ── */
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<Status>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ── DESTEK ── */
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [bugStatus, setBugStatus] = useState<Status>(null);
  const [bugLoading, setBugLoading] = useState(false);
  const [contactMsg, setContactMsg] = useState('');
  const [contactStatus, setContactStatus] = useState<Status>(null);

  /* ── Load Firestore ── */
  const loadUserData = useCallback(async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setDisplayName(d.displayName ?? user.displayName ?? '');
        setUsername(d.username ?? (user.displayName ?? '').toLowerCase().replace(/\s+/g, '') ?? 'kullanici');
        setBio(d.bio ?? '');
        setLanguage(d.language ?? 'Türkçe');
        setCurrency(d.currency ?? 'TRY — ₺');
        setDistanceKm(d.distanceKm ?? true);
        setTempCelsius(d.tempCelsius ?? true);
        setFollowPublic(d.followPublic ?? true);
        setProfilePublic(d.profilePublic ?? true);
        setPlansPublic(d.plansPublic ?? false);
        setEmailPlanNotif(d.emailPlanNotif ?? true);
        setEmailWeeklyDigest(d.emailWeeklyDigest ?? true);
        setPushEnabled(d.pushEnabled ?? false);
        setAnalyticsEnabled(d.analyticsEnabled ?? true);
        setDefaultBudget(d.defaultBudget ?? '15000');
        setDefaultCurrency(d.defaultCurrency ?? 'TRY — ₺');
        setDefaultPace(d.defaultPace ?? 'normal');
        setPassportCountry(d.passportCountry ?? 'Türkiye');
        setPassportExpiry(d.passportExpiry ?? '');
        setTimezone(d.timezone ?? 'Europe/Istanbul (UTC+3)');
      }
    } catch { /* Auth verisi yüklü */ }
  }, [user]);

  useEffect(() => { loadUserData(); }, [loadUserData]);

  /* ── Handlers ── */
  const handleProfileSave = async () => {
    if (!auth.currentUser || !user) return;
    setProfileLoading(true); setProfileStatus(null);
    try {
      await updateProfile(auth.currentUser, { displayName });
      await setDoc(doc(db, 'users', user.uid), { displayName, username, bio }, { merge: true });
      setProfileStatus({ type: 'success', message: 'Profil başarıyla güncellendi.' });
    } catch (err: any) {
      setProfileStatus({ type: 'error', message: firebaseErrorMsg(err.code) });
    } finally { setProfileLoading(false); }
  };

  const handleEmailSave = async () => {
    if (!auth.currentUser || !user?.email) return;
    const trimmed = newEmail.trim();
    if (!trimmed) { setEmailStatus({ type: 'error', message: 'Yeni e-posta boş olamaz.' }); return; }
    if (trimmed === user.email) { setEmailStatus({ type: 'error', message: 'Yeni e-posta mevcut e-posta ile aynı.' }); return; }
    if (!emailCurrentPassword) { setEmailStatus({ type: 'error', message: 'Mevcut şifrenizi girin.' }); return; }
    setEmailLoading(true); setEmailStatus(null);
    try {
      const cred = EmailAuthProvider.credential(user.email, emailCurrentPassword);
      await reauthenticateWithCredential(auth.currentUser, cred);
      // actionCodeSettings: doğrulama sonrası uygulamaya geri dönsün
      const actionCodeSettings = {
        url: `${window.location.origin}/settings`,
        handleCodeInApp: false,
      };
      await verifyBeforeUpdateEmail(auth.currentUser, trimmed, actionCodeSettings);
      setPendingEmail(trimmed);
      setEmailStatus({ type: 'success', message: `${trimmed} adresine doğrulama bağlantısı gönderildi. Bağlantıya tıkladıktan sonra "E-posta güncellendi mi?" butonuna basın.` });
      setNewEmail(''); setEmailCurrentPassword('');
    } catch (err: any) {
      setEmailStatus({ type: 'error', message: firebaseErrorMsg(err.code) });
    } finally { setEmailLoading(false); }
  };

  // Kullanıcının e-postasını Firebase'den yenile — doğrulama sonrası çağrılır
  const handleReloadEmail = async () => {
    if (!auth.currentUser) return;
    setReloadLoading(true);
    try {
      await auth.currentUser.reload();
      const freshUser = auth.currentUser;
      // Zustand store'u güncelle
      const { setUser } = useAuthStore.getState();
      setUser(freshUser);
      if (freshUser.email !== user?.email) {
        setPendingEmail(null);
        setEmailStatus({ type: 'success', message: `E-posta başarıyla ${freshUser.email} olarak güncellendi.` });
      } else {
        setEmailStatus({ type: 'error', message: 'E-posta henüz değişmedi. Önce doğrulama bağlantısına tıklayın.' });
      }
    } catch {
      setEmailStatus({ type: 'error', message: 'Durum kontrol edilemedi.' });
    } finally { setReloadLoading(false); }
  };

  const handlePasswordSave = async () => {
    if (!auth.currentUser || !user?.email) return;
    if (!currentPassword) { setPasswordStatus({ type: 'error', message: 'Mevcut şifrenizi girin.' }); return; }
    if (newPassword.length < 6) { setPasswordStatus({ type: 'error', message: 'Yeni şifre en az 6 karakter olmalı.' }); return; }
    if (newPassword === currentPassword) { setPasswordStatus({ type: 'error', message: 'Yeni şifre mevcut şifreyle aynı olamaz.' }); return; }
    if (newPassword !== confirmPassword) { setPasswordStatus({ type: 'error', message: 'Yeni şifreler eşleşmiyor.' }); return; }
    setPasswordLoading(true); setPasswordStatus(null);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPassword);
      setPasswordStatus({ type: 'success', message: 'Şifreniz başarıyla güncellendi.' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setShowCurrentPw(false); setShowNewPw(false); setShowConfirmPw(false);
    } catch (err: any) {
      setPasswordStatus({ type: 'error', message: firebaseErrorMsg(err.code) });
    } finally { setPasswordLoading(false); }
  };

  const handleTravelSave = async () => {
    if (!user) return;
    setTravelLoading(true); setTravelStatus(null);
    try {
      await setDoc(doc(db, 'users', user.uid), { defaultBudget, defaultCurrency, defaultPace, passportCountry, passportExpiry, timezone }, { merge: true });
      setTravelStatus({ type: 'success', message: 'Seyahat tercihleri kaydedildi.' });
    } catch {
      setTravelStatus({ type: 'error', message: 'Kaydedilemedi, tekrar deneyin.' });
    } finally { setTravelLoading(false); }
  };

  const handleAppearanceSave = async () => {
    if (!user) return;
    setAppearanceLoading(true); setAppearanceStatus(null);
    try {
      await setDoc(doc(db, 'users', user.uid), { language, currency, distanceKm, tempCelsius }, { merge: true });
      setAppearanceStatus({ type: 'success', message: 'Görünüm ayarları kaydedildi.' });
    } catch {
      setAppearanceStatus({ type: 'error', message: 'Kaydedilemedi, tekrar deneyin.' });
    } finally { setAppearanceLoading(false); }
  };

  const handleNotifSave = async () => {
    if (!user) return;
    setNotifLoading(true); setNotifStatus(null);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        appPlanNotif, appCommunityNotif, appUpdateNotif,
        emailPlanNotif, emailWeeklyDigest, emailPromoNotif,
        pushEnabled, pushSoundEnabled,
      }, { merge: true });
      setNotifStatus({ type: 'success', message: 'Bildirim ayarları kaydedildi.' });
    } catch {
      setNotifStatus({ type: 'error', message: 'Kaydedilemedi, tekrar deneyin.' });
    } finally { setNotifLoading(false); }
  };

  const handlePrivacySave = async () => {
    if (!user) return;
    setPrivacyLoading(true); setPrivacyStatus(null);
    try {
      await setDoc(doc(db, 'users', user.uid), { profilePublic, plansPublic, followPublic, locationEnabled, locationHistory, analyticsEnabled }, { merge: true });
      setPrivacyStatus({ type: 'success', message: 'Gizlilik ayarları kaydedildi.' });
    } catch {
      setPrivacyStatus({ type: 'error', message: 'Kaydedilemedi, tekrar deneyin.' });
    } finally { setPrivacyLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser || !user?.email) return;
    if (deleteConfirm !== 'HESABIMI SİL') { setDeleteStatus({ type: 'error', message: 'Onay metnini doğru yazın.' }); return; }
    setDeleteLoading(true); setDeleteStatus(null);
    try {
      const cred = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(auth.currentUser);
      navigate('/login');
    } catch (err: any) {
      setDeleteStatus({ type: 'error', message: firebaseErrorMsg(err.code) });
    } finally { setDeleteLoading(false); }
  };

  const handleBugReport = async () => {
    if (!bugTitle.trim() || !bugDesc.trim()) { setBugStatus({ type: 'error', message: 'Başlık ve açıklama zorunlu.' }); return; }
    setBugLoading(true); setBugStatus(null);
    try {
      if (user) {
        await setDoc(doc(db, 'bug_reports', `${user.uid}_${Date.now()}`), {
          uid: user.uid, email: user.email, title: bugTitle, desc: bugDesc, createdAt: new Date().toISOString(),
        });
      }
      setBugStatus({ type: 'success', message: 'Hata raporu gönderildi, teşekkürler!' });
      setBugTitle(''); setBugDesc('');
    } catch {
      setBugStatus({ type: 'error', message: 'Gönderilemedi, tekrar deneyin.' });
    } finally { setBugLoading(false); }
  };

  /* ── Helpers ── */
  const inputCls = (err = false) =>
    `w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-all bg-white dark:bg-slate-800
    ${err
      ? 'border-rose-200 focus:border-rose-300 focus:ring-2 focus:ring-rose-200/30'
      : 'border-slate-200 dark:border-slate-700 focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10'}`;

  const SaveBtn: React.FC<{ onClick: () => void; loading: boolean; label?: string; disabled?: boolean }> = ({
    onClick, loading, label = 'Kaydet', disabled = false,
  }) => (
    <button
      type="button" onClick={onClick} disabled={loading || disabled}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all bg-[#f8981d] hover:bg-[#e08518] text-white shadow-md shadow-[#f8981d]/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {label}
    </button>
  );

  const CardWrap: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="mb-5">
        <h2 className="font-bold text-slate-900 dark:text-white text-lg">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">

      {/* Top bar */}
      <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center px-6 shrink-0">
        <button
          type="button" onClick={() => navigate(-1)}
          className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors flex items-center gap-1.5"
        >
          <ChevronRight size={14} className="rotate-180" />
          Geri
        </button>
        <span className="ml-4 font-bold text-slate-900 dark:text-white text-sm">Ayarlar</span>
      </div>

      <div className="flex flex-1 max-w-5xl mx-auto w-full px-6 py-8 gap-8">

        {/* ── Left nav ── */}
        <aside className="w-56 shrink-0 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 px-3">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveSection(id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
                      ${activeSection === id
                        ? 'bg-[#f8981d]/10 text-[#f8981d] font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'}`}
                  >
                    <Icon size={15} className="shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* ── Content ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* ══ HESAP — Profil ══ */}
          {activeSection === 'profile' && (
            <CardWrap title="Profil Bilgileri">
              <StatusBanner status={profileStatus} />
              {/* Avatar */}
              <div className="flex items-center gap-5 mb-7">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#187fe7] to-[#f8981d] flex items-center justify-center text-white text-2xl font-black">
                    {displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <button type="button" className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">
                    <Camera size={13} className="text-slate-600 dark:text-slate-300" />
                  </button>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">Profil fotoğrafı</p>
                  <p className="text-xs text-slate-500 mt-0.5">PNG, JPG — maks. 2 MB</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Ad Soyad</label>
                    <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className={inputCls()} placeholder="Adınız Soyadınız" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Kullanıcı Adı</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
                      <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))} className={`${inputCls()} pl-8`} placeholder="kullaniciadi" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">E-posta</label>
                  <input type="email" value={user?.email ?? ''} readOnly className="w-full px-3.5 py-2.5 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-400 cursor-not-allowed outline-none" />
                  <p className="text-[11px] text-slate-400 mt-1">E-posta değiştirmek için "E-posta" bölümünü kullanın.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Hakkımda</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={160} className={`${inputCls()} resize-none`} placeholder="Kendinizden biraz bahsedin..." />
                  <p className="text-[11px] text-slate-400 mt-1 text-right">{bio.length}/160</p>
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                <SaveBtn onClick={handleProfileSave} loading={profileLoading} label="Değişiklikleri Kaydet" />
              </div>
            </CardWrap>
          )}

          {/* ══ HESAP — E-posta ══ */}
          {activeSection === 'email' && (
            <CardWrap title="E-posta Adresi">

              <StatusBanner status={emailStatus} />

              {/* Mevcut e-posta kartı */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                  <Mail size={15} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Mevcut E-posta</p>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{user?.email}</p>
                </div>
                {user?.emailVerified ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full shrink-0">
                    <Check size={10} strokeWidth={3} /> Doğrulandı
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full shrink-0">
                    Doğrulanmadı
                  </span>
                )}
              </div>

              {/* Bekleyen değişiklik bandı */}
              {pendingEmail && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl mb-5">
                  <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Bekleyen e-posta değişikliği</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      <span className="font-bold">{pendingEmail}</span> adresine doğrulama bağlantısı gönderildi.
                      Bağlantıya tıkladıktan sonra aşağıdaki butona basın.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleReloadEmail}
                    disabled={reloadLoading}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    {reloadLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    E-posta güncellendi mi?
                  </button>
                </div>
              )}

              {/* Yeni e-posta formu */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Yeni E-posta Adresi</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => { setNewEmail(e.target.value); setEmailStatus(null); }}
                    className={inputCls()}
                    placeholder="yeni@eposta.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Mevcut Şifreniz</label>
                  <input
                    type="password"
                    value={emailCurrentPassword}
                    onChange={e => { setEmailCurrentPassword(e.target.value); setEmailStatus(null); }}
                    className={inputCls()}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
                <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl">
                  <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    Yeni adrese bir doğrulama bağlantısı gönderilir. Bağlantıya tıklayana kadar e-postanız değişmez.
                    Doğrulandıktan sonra bir sonraki girişinizde yeni e-posta aktif olur.
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                <SaveBtn
                  onClick={handleEmailSave}
                  loading={emailLoading}
                  label="Doğrulama Bağlantısı Gönder"
                  disabled={!newEmail.trim() || !emailCurrentPassword || newEmail.trim() === user?.email}
                />
              </div>
            </CardWrap>
          )}

          {/* ══ HESAP — Şifre ══ */}
          {activeSection === 'password' && (() => {
            const strength = getPasswordStrength(newPassword);
            const pwMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
            const pwMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
            return (
              <CardWrap title="Şifre Değiştir">
                <StatusBanner status={passwordStatus} />

                <div className="space-y-4">
                  {/* Mevcut şifre */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Mevcut Şifre</label>
                    <div className="relative">
                      <input
                        type={showCurrentPw ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={e => { setCurrentPassword(e.target.value); setPasswordStatus(null); }}
                        className={inputCls() + ' pr-10'}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Yeni şifre */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Yeni Şifre</label>
                    <div className="relative">
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); setPasswordStatus(null); }}
                        className={inputCls() + ' pr-10'}
                        placeholder="En az 6 karakter"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {/* Güç göstergesi */}
                    {newPassword && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-all duration-300
                                ${i <= strength.score ? strength.color : 'bg-slate-200 dark:bg-slate-700'}`}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Güç: <span className="font-semibold">{strength.label}</span>
                          <span className="ml-2 text-slate-400">
                            {strength.score < 3 && '· Büyük harf, rakam ve sembol ekleyin'}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Şifre tekrar */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Yeni Şifre (tekrar)</label>
                    <div className="relative">
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setPasswordStatus(null); }}
                        className={`${inputCls(pwMismatch)} pr-10`}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {pwMismatch && <p className="text-[11px] text-rose-500 mt-1">Şifreler eşleşmiyor</p>}
                    {pwMatch   && <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1"><Check size={10} strokeWidth={3} /> Şifreler eşleşiyor</p>}
                  </div>

                  {/* İpuçları */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Güçlü şifre için:</p>
                    {[
                      { rule: newPassword.length >= 8,         text: 'En az 8 karakter' },
                      { rule: /[A-Z]/.test(newPassword),        text: 'En az bir büyük harf (A-Z)' },
                      { rule: /[0-9]/.test(newPassword),        text: 'En az bir rakam (0-9)' },
                      { rule: /[^A-Za-z0-9]/.test(newPassword), text: 'En az bir özel karakter (!@#...)' },
                    ].map(({ rule, text }) => (
                      <div key={text} className="flex items-center gap-1.5 mt-1">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors
                          ${rule ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                          <Check size={8} className="text-white" strokeWidth={3} />
                        </div>
                        <span className={`text-[11px] ${rule ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                  <SaveBtn
                    onClick={handlePasswordSave}
                    loading={passwordLoading}
                    label="Şifreyi Güncelle"
                    disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
                  />
                </div>
              </CardWrap>
            );
          })()}

          {/* ══ SEYAHAT — Varsayılan Tercihler ══ */}
          {activeSection === 'travel_defaults' && (
            <CardWrap title="Varsayılan Seyahat Tercihleri" subtitle="Plan oluştururken otomatik doldurulur.">
              <StatusBanner status={travelStatus} />
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Varsayılan Bütçe</label>
                    <input type="number" value={defaultBudget} onChange={e => setDefaultBudget(e.target.value)} className={inputCls()} placeholder="15000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Para Birimi</label>
                    <select value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value)} className={inputCls()}>
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Varsayılan Tempo</label>
                  <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-semibold">
                    {[{ label: '🛋️ Rahat', val: 'rahat' }, { label: '🚶 Normal', val: 'normal' }, { label: '🏃 Aktif', val: 'aktif' }, { label: '🧭 Esnek', val: 'esnek' }].map(({ label, val }) => (
                      <button key={val} type="button" onClick={() => setDefaultPace(val)}
                        className={`flex-1 py-2 transition-colors ${defaultPace === val ? 'bg-[#f8981d] text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >{label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                <SaveBtn onClick={handleTravelSave} loading={travelLoading} />
              </div>
            </CardWrap>
          )}

          {/* ══ SEYAHAT — Pasaport ══ */}
          {activeSection === 'passport' && (
            <CardWrap title="Pasaport & Vatandaşlık" subtitle="Vize bilgileri ve seyahat uyarıları için kullanılır.">
              <StatusBanner status={travelStatus} />
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Vatandaşlık / Pasaport Ülkesi</label>
                  <input type="text" value={passportCountry} onChange={e => setPassportCountry(e.target.value)} className={inputCls()} placeholder="Türkiye" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Pasaport Son Kullanma Tarihi</label>
                  <input type="date" value={passportExpiry} onChange={e => setPassportExpiry(e.target.value)} className={inputCls()} />
                  <p className="text-[11px] text-slate-400 mt-1">Sona ermeye yakın pasaportla seyahat uyarısı alırsınız.</p>
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                <SaveBtn onClick={handleTravelSave} loading={travelLoading} />
              </div>
            </CardWrap>
          )}

          {/* ══ SEYAHAT — Konum & Saat Dilimi ══ */}
          {activeSection === 'location_tz' && (
            <CardWrap title="Konum & Saat Dilimi" subtitle="Yerel önerilerin doğruluğunu artırır.">
              <StatusBanner status={travelStatus} />
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Saat Dilimi</label>
                  <select value={timezone} onChange={e => setTimezone(e.target.value)} className={inputCls()}>
                    {TIMEZONES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <MapPin size={16} className="text-[#f8981d] shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Konum Erişimi</p>
                    <p className="text-xs text-slate-400 mt-0.5">Tarayıcı izin ayarlarından değiştirilebilir.</p>
                  </div>
                  <ComingSoonBadge />
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                <SaveBtn onClick={handleTravelSave} loading={travelLoading} />
              </div>
            </CardWrap>
          )}

          {/* ══ GÖRÜNÜM — Tema ══ */}
          {activeSection === 'theme' && (
            <CardWrap title="Tema" subtitle="Arayüz renk temasını seç.">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Açık', icon: Sun, val: false, bg: 'bg-white', border: 'border-slate-200' },
                  { label: 'Koyu', icon: Moon, val: true, bg: 'bg-slate-900', border: 'border-slate-700' },
                ].map(({ label, icon: Icon, val, bg, border }) => {
                  const active = dark === val;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => { if (dark !== val) toggleTheme(); }}
                      className={`relative flex flex-col items-center gap-3 py-8 rounded-xl border-2 transition-all
                        ${active ? 'border-[#f8981d]' : `border-slate-200 dark:border-slate-700 ${bg} ${border}`}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-[#f8981d]/15' : val ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <Icon size={20} className={active ? 'text-[#f8981d]' : val ? 'text-slate-300' : 'text-slate-600'} />
                      </div>
                      <span className={`font-bold text-sm ${active ? 'text-[#f8981d]' : 'text-slate-700 dark:text-slate-300'}`}>{label}</span>
                      {active && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#f8981d] flex items-center justify-center">
                          <Check size={10} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardWrap>
          )}

          {/* ══ GÖRÜNÜM — Dil & Para Birimi ══ */}
          {activeSection === 'language_currency' && (
            <CardWrap title="Dil & Para Birimi">
              <StatusBanner status={appearanceStatus} />
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Uygulama Dili</label>
                  <select value={language} onChange={e => setLanguage(e.target.value)} className={inputCls()}>
                    {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Para Birimi</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputCls()}>
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                <SaveBtn onClick={handleAppearanceSave} loading={appearanceLoading} />
              </div>
            </CardWrap>
          )}

          {/* ══ GÖRÜNÜM — Ölçü Birimleri ══ */}
          {activeSection === 'units' && (
            <CardWrap title="Ölçü Birimleri">
              <StatusBanner status={appearanceStatus} />
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Mesafe</label>
                  <SegmentedControl options={[{ label: 'Kilometre (km)', val: true }, { label: 'Mil (mi)', val: false }]} value={distanceKm} onChange={setDistanceKm} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Sıcaklık</label>
                  <SegmentedControl options={[{ label: 'Celsius (°C)', val: true }, { label: 'Fahrenheit (°F)', val: false }]} value={tempCelsius} onChange={setTempCelsius} />
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                <SaveBtn onClick={handleAppearanceSave} loading={appearanceLoading} />
              </div>
            </CardWrap>
          )}

          {/* ══ BİLDİRİMLER — Uygulama ══ */}
          {activeSection === 'app_notif' && (
            <CardWrap title="Uygulama Bildirimleri" subtitle="Uygulama içi bildirim tercihlerini ayarla.">
              <StatusBanner status={notifStatus} />
              <SettingRow title="Plan güncellemeleri" desc="Planınızda değişiklik olduğunda"><Toggle value={appPlanNotif} onChange={setAppPlanNotif} /></SettingRow>
              <SettingRow title="Topluluk bildirimleri" desc="Beğeni, yorum ve takip istekleri"><Toggle value={appCommunityNotif} onChange={setAppCommunityNotif} /></SettingRow>
              <SettingRow title="Uygulama güncellemeleri" desc="Yeni özellik duyuruları"><Toggle value={appUpdateNotif} onChange={setAppUpdateNotif} /></SettingRow>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                <SaveBtn onClick={handleNotifSave} loading={notifLoading} />
              </div>
            </CardWrap>
          )}

          {/* ══ BİLDİRİMLER — E-posta ══ */}
          {activeSection === 'email_notif' && (
            <CardWrap title="E-posta Bildirimleri">
              <StatusBanner status={notifStatus} />
              <SettingRow title="Plan bildirimleri" desc="Plan oluşturma ve güncelleme e-postaları"><Toggle value={emailPlanNotif} onChange={setEmailPlanNotif} /></SettingRow>
              <SettingRow title="Haftalık özet" desc="Her Pazartesi seyahat önerileri"><Toggle value={emailWeeklyDigest} onChange={setEmailWeeklyDigest} /></SettingRow>
              <SettingRow title="Kampanya ve fırsatlar" desc="İndirimler ve özel teklifler"><Toggle value={emailPromoNotif} onChange={setEmailPromoNotif} /></SettingRow>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                <SaveBtn onClick={handleNotifSave} loading={notifLoading} />
              </div>
            </CardWrap>
          )}

          {/* ══ BİLDİRİMLER — Push ══ */}
          {activeSection === 'push_notif' && (
            <CardWrap title="Push Bildirimleri" subtitle="Tarayıcı ve mobil bildirimler.">
              <StatusBanner status={notifStatus} />
              <SettingRow title="Push bildirimleri" desc="Anlık tarayıcı bildirimleri"><Toggle value={pushEnabled} onChange={setPushEnabled} /></SettingRow>
              <SettingRow title="Bildirim sesi" desc="Bildirim geldiğinde ses çal"><Toggle value={pushSoundEnabled} onChange={setPushSoundEnabled} /></SettingRow>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                <SaveBtn onClick={handleNotifSave} loading={notifLoading} />
              </div>
            </CardWrap>
          )}

          {/* ══ GİZLİLİK — Profil & Plan ══ */}
          {activeSection === 'privacy_profile' && (
            <CardWrap title="Profil & Plan Gizliliği">
              <StatusBanner status={privacyStatus} />
              <SettingRow title="Herkese açık profil" desc="Profiliniz arama sonuçlarında görünsün"><Toggle value={profilePublic} onChange={setProfilePublic} /></SettingRow>
              <SettingRow title="Planlarım herkese açık" desc="Oluşturduğunuz planlar toplulukta görünsün"><Toggle value={plansPublic} onChange={setPlansPublic} /></SettingRow>
              <SettingRow title="Herkes takip edebilir" desc="Kapalıysa takip onayı gerekir"><Toggle value={followPublic} onChange={setFollowPublic} /></SettingRow>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                <SaveBtn onClick={handlePrivacySave} loading={privacyLoading} />
              </div>
            </CardWrap>
          )}

          {/* ══ GİZLİLİK — Lokasyon ══ */}
          {activeSection === 'privacy_location' && (
            <CardWrap title="Lokasyon Gizliliği">
              <StatusBanner status={privacyStatus} />
              <SettingRow title="Konum önerilerini etkinleştir" desc="Yakındaki mekanlar için konum kullan"><Toggle value={locationEnabled} onChange={setLocationEnabled} /></SettingRow>
              <SettingRow title="Konum geçmişi" desc="Ziyaret geçmişi kaydedilsin (daha iyi öneriler)"><Toggle value={locationHistory} onChange={setLocationHistory} /></SettingRow>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                <SaveBtn onClick={handlePrivacySave} loading={privacyLoading} />
              </div>
            </CardWrap>
          )}

          {/* ══ GİZLİLİK — Veri Kullanımı ══ */}
          {activeSection === 'privacy_data' && (
            <CardWrap title="Veri Kullanımı">
              <StatusBanner status={privacyStatus} />
              <SettingRow title="Analitik verilerini paylaş" desc="Hizmet iyileştirmek için anonim kullanım verisi"><Toggle value={analyticsEnabled} onChange={setAnalyticsEnabled} /></SettingRow>
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 mt-4">
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  Kişisel verileriniz 6698 sayılı KVKK kapsamında işlenmektedir. Verilerinizi indirmek veya hesabı silmek için "Verilerim" bölümünü kullanın.
                </p>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                <SaveBtn onClick={handlePrivacySave} loading={privacyLoading} />
              </div>
            </CardWrap>
          )}

          {/* ══ FATURALAMA — Abonelik ══ */}
          {activeSection === 'subscription' && (
            <CardWrap title="Abonelik">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800 dark:text-white text-sm">Ücretsiz Plan</span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">Aktif</span>
                </div>
                <p className="text-xs text-slate-500">Ayda 3 plan oluşturma hakkı</p>
              </div>
              <div className="relative bg-gradient-to-br from-[#187fe7] to-[#0a4d99] rounded-xl p-5 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#f8981d]/20 rounded-full blur-3xl" />
                <div className="relative">
                  <span className="inline-block px-2 py-0.5 bg-[#f8981d] text-white text-[9px] font-black uppercase tracking-widest rounded-full mb-3">Pro</span>
                  <p className="text-white font-bold text-base mb-1">Sınırsız Plan + Gelişmiş AI</p>
                  <p className="text-blue-100 text-xs leading-relaxed mb-4">Reklamsız deneyim, öncelikli destek ve tüm premium özellikler</p>
                  <button type="button" className="px-5 py-2 bg-white text-[#187fe7] font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors">
                    Pro'ya Yükselt
                  </button>
                </div>
              </div>
            </CardWrap>
          )}

          {/* ══ FATURALAMA — Fatura Geçmişi ══ */}
          {activeSection === 'billing_history' && (
            <CardWrap title="Fatura Geçmişi" subtitle="Geçmiş ödemelerinizi görüntüleyin.">
              <div className="py-12 text-center">
                <Receipt size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">Henüz fatura bulunmuyor</p>
                <p className="text-xs text-slate-400 mt-1">Pro aboneliğe geçtikten sonra faturalar burada görünür.</p>
              </div>
            </CardWrap>
          )}

          {/* ══ FATURALAMA — Ödeme Yöntemi ══ */}
          {activeSection === 'payment' && (
            <CardWrap title="Ödeme Yöntemi">
              <div className="py-12 text-center">
                <Wallet size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">Kayıtlı ödeme yöntemi yok</p>
                <p className="text-xs text-slate-400 mt-1">Pro aboneliğe geçerken ödeme yöntemi eklenecek.</p>
              </div>
            </CardWrap>
          )}

          {/* ══ VERİLERİM — Veri İndir ══ */}
          {activeSection === 'data_export' && (
            <CardWrap title="Verilerimi İndir" subtitle="KVKK kapsamında tüm verilerinizi dışa aktarın.">
              <div className="space-y-3">
                {[
                  { label: 'Profil bilgileri', desc: 'Ad, kullanıcı adı, biyografi' },
                  { label: 'Seyahat planları', desc: 'Tüm oluşturduğunuz planlar' },
                  { label: 'Bildirim ayarları', desc: 'Tercih ve ayarlarınız' },
                  { label: 'Hesap aktivitesi', desc: 'Giriş ve işlem geçmişi' },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </div>
                    <ComingSoonBadge />
                  </div>
                ))}
              </div>
              <div className="mt-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900">
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  Veri indirme talebi oluşturulduğunda e-posta adresinize bağlantı gönderilecektir.
                </p>
              </div>
              <div className="flex justify-end mt-4">
                <button type="button" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity">
                  <Download size={14} /> Tümünü İndir
                </button>
              </div>
            </CardWrap>
          )}

          {/* ══ VERİLERİM — Hesabı Sil ══ */}
          {activeSection === 'delete_account' && (
            <CardWrap title="Hesabı Sil">
              <StatusBanner status={deleteStatus} />
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 mb-5">
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300 mb-1">⚠️ Bu işlem geri alınamaz</p>
                <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
                  Hesabınız, tüm seyahat planlarınız ve kişisel verileriniz kalıcı olarak silinecektir.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    Onaylamak için <span className="font-bold text-slate-700 dark:text-slate-300">HESABIMI SİL</span> yazın
                  </label>
                  <input
                    type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                    className={inputCls()} placeholder="HESABIMI SİL"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Şifreniz</label>
                  <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} className={inputCls()} placeholder="••••••••" />
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirm !== 'HESABIMI SİL' || !deletePassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Hesabı Kalıcı Olarak Sil
                </button>
              </div>
            </CardWrap>
          )}

          {/* ══ DESTEK — SSS ══ */}
          {activeSection === 'faq' && (
            <CardWrap title="Sık Sorulan Sorular">
              <div className="space-y-3">
                {[
                  { q: 'Plan oluşturma limiti nedir?', a: 'Ücretsiz planda ayda 3 plan oluşturabilirsiniz. Pro planda sınırsızdır.' },
                  { q: 'AI planımı nasıl hazırlıyor?', a: 'Girdiğiniz destinasyon, tarih, bütçe ve tercihler Gemini AI ile analiz edilip kişiselleştirilmiş plan oluşturulur.' },
                  { q: 'Planlarımı başkalarıyla paylaşabilir miyim?', a: 'Evet, oluşturduğunuz planları toplulukla veya link ile paylaşabilirsiniz.' },
                  { q: 'Verilerimi nasıl silebilirim?', a: '"Verilerim → Hesabı Sil" bölümünden tüm verilerinizi kalıcı olarak kaldırabilirsiniz.' },
                ].map(({ q, a }) => (
                  <details key={q} className="group border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <summary className="flex items-center justify-between px-4 py-3.5 cursor-pointer list-none font-medium text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      {q}
                      <ChevronRight size={14} className="text-slate-400 shrink-0 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="px-4 pb-4 text-xs text-slate-500 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3">
                      {a}
                    </div>
                  </details>
                ))}
              </div>
            </CardWrap>
          )}

          {/* ══ DESTEK — İletişim ══ */}
          {activeSection === 'contact' && (
            <CardWrap title="İletişim" subtitle="Destek ekibimize mesaj gönderin.">
              <StatusBanner status={contactStatus} />
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Konu</label>
                  <input type="text" className={inputCls()} placeholder="Mesajınızın konusu" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Mesaj</label>
                  <textarea
                    value={contactMsg} onChange={e => setContactMsg(e.target.value)}
                    rows={5} className={`${inputCls()} resize-none`}
                    placeholder="Sorun veya önerinizi yazın..."
                  />
                </div>
              </div>
              <div className="flex justify-between items-center mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-400">destek@travyon.app · Yanıt süresi: 24 saat</p>
                <button
                  type="button"
                  onClick={() => { setContactStatus({ type: 'success', message: 'Mesajınız gönderildi!' }); setContactMsg(''); }}
                  disabled={!contactMsg.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#f8981d] hover:bg-[#e08518] text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Gönder
                </button>
              </div>
            </CardWrap>
          )}

          {/* ══ DESTEK — Hata Bildir ══ */}
          {activeSection === 'report_bug' && (
            <CardWrap title="Hata Bildir" subtitle="Bulduğunuz hatayı raporlayın, geliştirmemize yardımcı olun.">
              <StatusBanner status={bugStatus} />
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Hata Başlığı</label>
                  <input type="text" value={bugTitle} onChange={e => setBugTitle(e.target.value)} className={inputCls()} placeholder="Kısa ve açıklayıcı bir başlık" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Detaylı Açıklama</label>
                  <textarea
                    value={bugDesc} onChange={e => setBugDesc(e.target.value)}
                    rows={5} className={`${inputCls()} resize-none`}
                    placeholder="Hatayı nasıl tetiklediniz? Beklenen ve gerçekleşen durum neydi?"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleBugReport}
                  disabled={bugLoading || !bugTitle.trim() || !bugDesc.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#f8981d] hover:bg-[#e08518] text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {bugLoading ? <Loader2 size={14} className="animate-spin" /> : <Bug size={14} />}
                  Raporu Gönder
                </button>
              </div>
            </CardWrap>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
