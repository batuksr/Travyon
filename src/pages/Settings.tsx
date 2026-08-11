import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  deleteUser,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useAppSettingsStore, CURRENCY_MAP } from '../store/useAppSettingsStore';
import {
  User, Mail, Lock, ChevronRight, Check, AlertCircle, Loader2, Camera,
  Settings2, BookOpen, MapPin, Globe, Ruler,
  BellRing, Smartphone, Eye, EyeOff, Database,
  CreditCard, Receipt, Wallet, Download, Trash2,
  HelpCircle, MessageCircle, Bug, LogOut,
  type LucideIcon,
} from 'lucide-react';

/* ── Types ── */
type Section =
  | 'profile' | 'email' | 'password'
  | 'travel_defaults' | 'passport' | 'location_tz'
  | 'language_currency' | 'units'
  | 'app_notif' | 'email_notif' | 'push_notif'
  | 'privacy_profile' | 'privacy_location' | 'privacy_data'
  | 'subscription' | 'billing_history' | 'payment'
  | 'data_export' | 'delete_account'
  | 'faq' | 'contact' | 'report_bug';

type Status = { type: 'success' | 'error'; message: string } | null;

const LANGUAGES = ['Türkçe', 'English', 'Français', 'Español', 'Deutsch'];
const CURRENCIES = ['TRY — ₺', 'USD — $', 'EUR — €', 'GBP — £', 'JPY — ¥'];

const TIMEZONES = [
  'Europe/Istanbul (UTC+3)',
  'Europe/London (UTC+0)',
  'Europe/Paris (UTC+1)',
  'Europe/Berlin (UTC+1)',
  'Europe/Moscow (UTC+3)',
  'Europe/Athens (UTC+2)',
  'Europe/Rome (UTC+1)',
  'Europe/Madrid (UTC+1)',
  'Europe/Amsterdam (UTC+1)',
  'Europe/Warsaw (UTC+1)',
  'America/New_York (UTC-5)',
  'America/Chicago (UTC-6)',
  'America/Denver (UTC-7)',
  'America/Los_Angeles (UTC-8)',
  'America/Sao_Paulo (UTC-3)',
  'America/Buenos_Aires (UTC-3)',
  'America/Toronto (UTC-5)',
  'America/Mexico_City (UTC-6)',
  'Asia/Dubai (UTC+4)',
  'Asia/Riyadh (UTC+3)',
  'Asia/Tokyo (UTC+9)',
  'Asia/Seoul (UTC+9)',
  'Asia/Shanghai (UTC+8)',
  'Asia/Singapore (UTC+8)',
  'Asia/Kolkata (UTC+5:30)',
  'Asia/Bangkok (UTC+7)',
  'Asia/Jakarta (UTC+7)',
  'Asia/Tehran (UTC+3:30)',
  'Africa/Cairo (UTC+2)',
  'Africa/Johannesburg (UTC+2)',
  'Pacific/Sydney (UTC+10)',
  'Pacific/Auckland (UTC+12)',
];

const PASSPORT_COUNTRIES = [
  'Türkiye', 'Almanya', 'Fransa', 'İtalya', 'İspanya', 'İngiltere',
  'Amerika Birleşik Devletleri', 'Kanada', 'Avustralya', 'Japonya',
  'Çin', 'Rusya', 'Brezilya', 'Hindistan', 'Güney Kore', 'Hollanda',
  'Belçika', 'İsveç', 'Norveç', 'Danimarka', 'Finlandiya', 'İsviçre',
  'Avusturya', 'Portekiz', 'Polonya', 'Çek Cumhuriyeti', 'Yunanistan',
  'Macaristan', 'Romanya', 'Bulgaristan', 'Hırvatistan', 'Sırbistan',
  'Ukrayna', 'İsrail', 'Suudi Arabistan', 'BAE', 'Mısır', 'Fas',
  'Güney Afrika', 'Nijerya', 'Meksika', 'Arjantin', 'Şili', 'Kolombiya',
  'Singapur', 'Malezya', 'Tayland', 'Endonezya', 'Vietnam', 'Filipinler',
  'Yeni Zelanda', 'Diğer',
];

// Tarayıcı saat dilimini TIMEZONES listesiyle eşleştirir
const detectTimezone = (): string => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; // örn. "Europe/Istanbul"
    const match = TIMEZONES.find(t => t.startsWith(tz));
    return match ?? TIMEZONES[0];
  } catch {
    return TIMEZONES[0];
  }
};

// Pasaport süre kontrolü — kaç gün kaldı
const passportDaysLeft = (expiry: string): number | null => {
  if (!expiry) return null;
  const diff = new Date(expiry).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

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
    role="switch"
    aria-checked={value}
    onClick={() => onChange(!value)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none
      ${value ? 'bg-accent' : 'bg-divider'}`}
  >
    <span
      aria-hidden="true"
      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out
        ${value ? 'translate-x-5' : 'translate-x-0'}`}
    />
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
  <div className="flex rounded-lg border border-divider overflow-hidden text-xs font-semibold">
    {options.map(({ label, val }) => (
      <button key={label} type="button" onClick={() => onChange(val)}
        className={`flex-1 py-2 transition-colors ${value === val ? 'bg-accent text-white' : 'text-muted hover:bg-surface-2'}`}
      >{label}</button>
    ))}
  </div>
);

const SettingRow: React.FC<{ title: string; desc: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <div className="flex items-center justify-between py-4 border-b border-divider last:border-0">
    <div>
      <p className="text-sm font-medium text-text">{title}</p>
      <p className="text-xs text-muted mt-0.5">{desc}</p>
    </div>
    {children}
  </div>
);

const ComingSoonBadge = () => (
  <span className="text-[10px] font-bold bg-surface-2 text-muted px-2 py-0.5 rounded-full uppercase tracking-widest">Yakında</span>
);

/* Profil sayfası satır bileşeni — Airbnb tarzı inline edit */
const ProfileRow: React.FC<{
  label: string;
  display: React.ReactNode;
  isEditing: boolean;
  onEdit: () => void;
  actionLabel?: string;
  children?: React.ReactNode;
}> = ({ label, display, isEditing, onEdit, actionLabel = 'Düzenle', children }) => (
  <div className="border-b border-divider last:border-0">
    <div className="flex items-start py-4 gap-4">
      <p className="w-24 sm:w-40 shrink-0 text-[11px] sm:text-[13px] font-semibold text-muted pt-0.5 uppercase tracking-wide">{label}</p>
      <div className="flex-1 min-w-0 text-sm pt-0.5">{display}</div>
      {!isEditing && (
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 text-sm font-bold text-accent hover:text-accent-700 transition-colors underline underline-offset-2 decoration-accent/40"
        >
          {actionLabel}
        </button>
      )}
    </div>
    {isEditing && children && (
      <div className="pb-5 sm:pl-44">{children}</div>
    )}
  </div>
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
      { id: 'language_currency', icon: Globe,   label: 'Dil' },
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

/* Sunum bileşenleri — modül seviyesinde (render içinde tanımlanırsa input focus kaybeder) */
const SaveBtn: React.FC<{ onClick: () => void; loading: boolean; label?: string; disabled?: boolean }> = ({
  onClick, loading, label = 'Kaydet', disabled = false,
}) => (
  <button
    type="button" onClick={onClick} disabled={loading || disabled}
    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-heading transition-all bg-accent hover:brightness-105 text-white shadow-md shadow-accent/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
  >
    {loading && <Loader2 size={14} className="animate-spin" />}
    {label}
  </button>
);

const CardWrap: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="bg-surface rounded-2xl border border-divider p-4 sm:p-6">
    <div className="mb-5">
      <h2 className="font-bold text-text text-lg">{title}</h2>
      {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setSettings } = useAppSettingsStore();

  const [activeSection, setActiveSection] = useState<Section>('profile');

  /* ── HESAP ── */
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState((user?.displayName ?? '').toLowerCase().replace(/\s+/g, '') || '');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [nationality, setNationality] = useState('Türkiye');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [localPhotoURL, setLocalPhotoURL] = useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

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
  const [defaultPeopleCount, setDefaultPeopleCount] = useState('2');
  const [travelDefaultsStatus, setTravelDefaultsStatus] = useState<Status>(null);
  const [travelDefaultsLoading, setTravelDefaultsLoading] = useState(false);

  const [passportCountry, setPassportCountry] = useState('Türkiye');
  const [passportNumber, setPassportNumber] = useState('');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [passportStatus, setPassportStatus] = useState<Status>(null);
  const [passportLoading, setPassportLoading] = useState(false);

  const [timezone, setTimezone] = useState(() => detectTimezone());
  const [locationStatus, setLocationStatus] = useState<Status>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  /* ── GÖRÜNÜM ── */
  const [language, setLanguage] = useState('Türkçe');
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

  /* ── FATURALAMA ── */
  const [isPro, setIsPro] = useState(false);
  const [plansUsedThisMonth, setPlansUsedThisMonth] = useState(0);
  const [savedCard, setSavedCard] = useState<{ last4: string; brand: string; expiry: string } | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardStatus, setCardStatus] = useState<Status>(null);
  const [cardLoading, setCardLoading] = useState(false);

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
        setPhone(d.phone ?? '');
        setBirthDate(d.birthDate ?? '');
        setNationality(d.nationality ?? 'Türkiye');
        setGender(d.gender ?? '');
        setAddress(d.address ?? '');
        if (d.photoURL) setLocalPhotoURL(d.photoURL);
        setLanguage(d.language ?? 'Türkçe');
        setDistanceKm(d.distanceKm ?? true);
        setTempCelsius(d.tempCelsius ?? true);
        setFollowPublic(d.followPublic ?? true);
        setProfilePublic(d.profilePublic ?? true);
        setPlansPublic(d.plansPublic ?? false);
        setAppPlanNotif(d.appPlanNotif ?? true);
        setAppCommunityNotif(d.appCommunityNotif ?? true);
        setAppUpdateNotif(d.appUpdateNotif ?? false);
        setEmailPlanNotif(d.emailPlanNotif ?? true);
        setEmailWeeklyDigest(d.emailWeeklyDigest ?? true);
        setEmailPromoNotif(d.emailPromoNotif ?? false);
        setPushEnabled(d.pushEnabled ?? false);
        setPushSoundEnabled(d.pushSoundEnabled ?? true);
        setAnalyticsEnabled(d.analyticsEnabled ?? true);
        setDefaultBudget(d.defaultBudget ?? '15000');
        setDefaultCurrency(d.defaultCurrency ?? 'TRY — ₺');
        setDefaultPace(d.defaultPace ?? 'normal');
        setDefaultPeopleCount(d.defaultPeopleCount ?? '2');
        setPassportCountry(d.passportCountry ?? 'Türkiye');
        setPassportNumber(d.passportNumber ?? '');
        setPassportExpiry(d.passportExpiry ?? '');
        setTimezone(d.timezone ?? detectTimezone());
        setIsPro(d.isPro ?? false);
        setPlansUsedThisMonth(d.plansUsedThisMonth ?? 0);
        setSavedCard(d.savedCard ?? null);
      }
    } catch { /* Auth verisi yüklü */ }
  }, [user]);

  useEffect(() => { loadUserData(); }, [loadUserData]);

  /* ── Handlers ── */

  /* Canvas ile resim küçültme → JPEG base64 */
  const resizeToBase64 = (file: File, maxPx = 256): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        if (width > height) {
          if (width > maxPx) { height = Math.round((height * maxPx) / width); width = maxPx; }
        } else {
          if (height > maxPx) { width = Math.round((width * maxPx) / height); height = maxPx; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = objectUrl;
    });

  /* Profil fotoğrafı yükleme — canvas resize + Firestore */
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      setProfileStatus({ type: 'error', message: 'Dosya 5 MB\'dan büyük olamaz.' }); return;
    }
    if (!file.type.startsWith('image/')) {
      setProfileStatus({ type: 'error', message: 'Yalnızca PNG, JPG veya WebP yüklenebilir.' }); return;
    }
    setPhotoLoading(true); setProfileStatus(null);
    try {
      const dataUrl = await resizeToBase64(file, 256);
      // Firestore'a kaydet (Firebase Auth base64 data URL kabul etmiyor)
      await setDoc(doc(db, 'users', user.uid), { photoURL: dataUrl }, { merge: true });
      // Local state + global store güncelle — Sidebar dahil her yer anında görsün
      setLocalPhotoURL(dataUrl);
      setSettings({ photoURL: dataUrl });
      setProfileStatus({ type: 'success', message: 'Profil fotoğrafı güncellendi.' });
      setTimeout(() => setProfileStatus(null), 3000);
    } catch (err) {
      console.error('Photo upload error:', err);
      setProfileStatus({ type: 'error', message: 'Yükleme başarısız, tekrar deneyin.' });
    } finally {
      setPhotoLoading(false);
      e.target.value = '';
    }
  };

  /* Alan bazlı kaydetme — profil satır düzeni için */
  const handleFieldSave = async (data: Record<string, unknown>) => {
    if (!user || !auth.currentUser) return;
    setProfileLoading(true); setProfileStatus(null);
    try {
      if ('displayName' in data) {
        const newName = data.displayName as string;
        await updateProfile(auth.currentUser, { displayName: newName });
        // Paylaşılmış planlardaki ismi de güncelle (toplulukta yansısın)
        const currentPhoto = useAppSettingsStore.getState().photoURL || auth.currentUser.photoURL || null;
        import('../services/socialService').then(({ syncSharedPlansIdentity }) =>
          syncSharedPlansIdentity(user.uid, newName, currentPhoto).catch(() => {})
        );
      }
      await setDoc(doc(db, 'users', user.uid), data, { merge: true });
      setProfileStatus({ type: 'success', message: 'Kaydedildi.' });
      setEditingField(null);
      setTimeout(() => setProfileStatus(null), 3000);
    } catch {
      setProfileStatus({ type: 'error', message: 'Kaydedilemedi, tekrar deneyin.' });
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

  const handleTravelDefaultsSave = async () => {
    if (!user) return;
    setTravelDefaultsLoading(true); setTravelDefaultsStatus(null);
    try {
      await setDoc(doc(db, 'users', user.uid), { defaultBudget, defaultCurrency, defaultPace, defaultPeopleCount }, { merge: true });
      // Para birimi store'unu güncelle — tüm uygulamada yansır
      const curr = CURRENCY_MAP[defaultCurrency] ?? { code: 'TRY', symbol: '₺' };
      setSettings({ currencyLabel: defaultCurrency, currencyCode: curr.code, currencySymbol: curr.symbol });
      setTravelDefaultsStatus({ type: 'success', message: 'Varsayılan tercihler kaydedildi. Yeni plan oluştururken otomatik uygulanacak.' });
    } catch {
      setTravelDefaultsStatus({ type: 'error', message: 'Kaydedilemedi, tekrar deneyin.' });
    } finally { setTravelDefaultsLoading(false); }
  };

  const handlePassportSave = async () => {
    if (!user) return;
    if (passportExpiry) {
      const days = passportDaysLeft(passportExpiry);
      if (days !== null && days < 0) {
        setPassportStatus({ type: 'error', message: 'Pasaport süresi dolmuş. Lütfen geçerli bir tarih girin.' });
        return;
      }
    }
    setPassportLoading(true); setPassportStatus(null);
    try {
      await setDoc(doc(db, 'users', user.uid), { passportCountry, passportNumber, passportExpiry }, { merge: true });
      setPassportStatus({ type: 'success', message: 'Pasaport bilgileri kaydedildi.' });
    } catch {
      setPassportStatus({ type: 'error', message: 'Kaydedilemedi, tekrar deneyin.' });
    } finally { setPassportLoading(false); }
  };

  const handleLocationSave = async () => {
    if (!user) return;
    setLocationLoading(true); setLocationStatus(null);
    try {
      await setDoc(doc(db, 'users', user.uid), { timezone }, { merge: true });
      setLocationStatus({ type: 'success', message: 'Saat dilimi kaydedildi.' });
    } catch {
      setLocationStatus({ type: 'error', message: 'Kaydedilemedi, tekrar deneyin.' });
    } finally { setLocationLoading(false); }
  };

  const handleAppearanceSave = async () => {
    if (!user) return;
    setAppearanceLoading(true); setAppearanceStatus(null);
    try {
      await setDoc(doc(db, 'users', user.uid), { language, distanceKm, tempCelsius }, { merge: true });
      // Zustand store'u anında güncelle — tüm uygulama etkilenir
      setSettings({ language, distanceKm, tempCelsius });
      setAppearanceStatus({ type: 'success', message: 'Ölçü birimi ayarları kaydedildi ve uygulandı.' });
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
      // Zustand store'u güncelle — Bildirimler sayfası anında tepki verir
      setSettings({
        appPlanNotif, appCommunityNotif, appUpdateNotif,
        emailPlanNotif, emailWeeklyDigest, emailPromoNotif,
        pushEnabled, pushSoundEnabled,
      });
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
      // Store'u güncelle — Community, Hub anında tepki verir
      setSettings({ profilePublic, plansPublic, followPublic, locationEnabled, locationHistory, analyticsEnabled });
      setPrivacyStatus({ type: 'success', message: 'Gizlilik ayarları kaydedildi ve uygulandı.' });
    } catch {
      setPrivacyStatus({ type: 'error', message: 'Kaydedilemedi, tekrar deneyin.' });
    } finally { setPrivacyLoading(false); }
  };

  /* ── Kart formatters ── */
  const fmtCardNumber = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const fmtCardExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };
  const detectBrand = (num: string) => {
    const n = num.replace(/\s/g, '');
    if (n.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(n)) return 'Mastercard';
    if (/^3[47]/.test(n)) return 'Amex';
    return 'Kart';
  };

  const handleCardSave = async () => {
    if (!user) return;
    const digits = cardNumber.replace(/\s/g, '');
    if (digits.length < 13) { setCardStatus({ type: 'error', message: 'Geçersiz kart numarası.' }); return; }
    if (!cardName.trim()) { setCardStatus({ type: 'error', message: 'Kart üzerindeki adı girin.' }); return; }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) { setCardStatus({ type: 'error', message: 'Son kullanma tarihi MM/YY formatında olmalı.' }); return; }
    const [mm, yy] = cardExpiry.split('/').map(Number);
    const expDate = new Date(2000 + yy, mm - 1, 1);
    if (expDate < new Date()) { setCardStatus({ type: 'error', message: 'Kartın son kullanma tarihi geçmiş.' }); return; }
    if (cardCvv.length < 3) { setCardStatus({ type: 'error', message: 'Geçersiz CVV kodu.' }); return; }
    setCardLoading(true); setCardStatus(null);
    try {
      const card = { last4: digits.slice(-4), brand: detectBrand(digits), expiry: cardExpiry };
      await setDoc(doc(db, 'users', user.uid), { savedCard: card }, { merge: true });
      setSavedCard(card);
      setShowCardForm(false);
      setCardNumber(''); setCardName(''); setCardExpiry(''); setCardCvv('');
      setCardStatus({ type: 'success', message: 'Kart başarıyla kaydedildi.' });
    } catch {
      setCardStatus({ type: 'error', message: 'Kaydedilemedi, tekrar deneyin.' });
    } finally { setCardLoading(false); }
  };

  const handleCardDelete = async () => {
    if (!user || !savedCard) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { savedCard: null }, { merge: true });
      setSavedCard(null);
      setCardStatus({ type: 'success', message: 'Kart kaldırıldı.' });
    } catch {
      setCardStatus({ type: 'error', message: 'İşlem başarısız, tekrar deneyin.' });
    }
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

  const handleMobileLogout = async () => {
    setSettings({ photoURL: null });
    await signOut(auth);
    navigate('/login');
  };

  /* ── Helpers ── */
  const inputCls = (err = false) =>
    `w-full px-3.5 py-2.5 rounded-2xl border-[1.5px] text-sm text-text placeholder:text-muted outline-none transition-all bg-surface-2
    ${err
      ? 'border-rose-300 focus:border-rose-400'
      : 'border-divider focus:border-accent'}`;

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* Top bar */}
      <div className="h-14 bg-surface border-b border-divider flex items-center px-4 sm:px-6 shrink-0">
        <button
          type="button" onClick={() => navigate(-1)}
          className="text-sm text-muted hover:text-text transition-colors flex items-center gap-1.5"
        >
          <ChevronRight size={14} className="rotate-180" />
          Geri
        </button>
        <span className="ml-4 font-heading text-text text-sm">Ayarlar</span>
      </div>

      <div className="flex flex-1 flex-col sm:flex-row max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-8 gap-6 sm:gap-8">

        {/* ── Left nav ── */}
        <aside className="hidden sm:block w-56 shrink-0 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1.5 px-3">
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
                        ? 'bg-accent-100 text-accent-700 font-semibold'
                        : 'text-muted hover:bg-surface-2 font-medium'}`}
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

          {/* Mobile section selector */}
          <div className="sm:hidden mb-2">
            <select
              value={activeSection}
              onChange={e => setActiveSection(e.target.value as Section)}
              className="w-full px-3.5 py-2.5 rounded-2xl border-[1.5px] border-divider bg-surface-2 text-sm font-medium text-text outline-none focus:border-accent"
            >
              {NAV_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.items.map(({ id, label }) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* ══ HESAP — Profil ══ */}
          {activeSection === 'profile' && (() => {
            const fmtBirthDate = (d: string) => {
              if (!d) return null;
              return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
            };
            const EditBtns = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={onSave} disabled={profileLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-heading bg-accent text-white hover:brightness-105 transition-opacity disabled:opacity-40">
                  {profileLoading && <Loader2 size={13} className="animate-spin" />} Kaydet
                </button>
                <button type="button" onClick={onCancel}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-muted border border-divider hover:bg-surface-2 transition-colors">
                  İptal
                </button>
              </div>
            );
            return (
              <div className="bg-surface rounded-2xl border border-divider overflow-hidden">

                {/* Başlık + avatar */}
                <div className="flex items-center gap-4 p-4 sm:p-6 border-b border-divider">
                  {/* Gizli dosya input */}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />

                  {/* Avatar */}
                  <div className="relative shrink-0 group">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-accent to-sage flex items-center justify-center text-white text-2xl font-heading ring-4 ring-surface shadow-md">
                      {(localPhotoURL || user?.photoURL)
                        ? <img src={localPhotoURL || user?.photoURL!} alt="avatar" className="w-full h-full object-cover" />
                        : (displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U')
                      }
                    </div>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoLoading}
                      className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center disabled:cursor-wait"
                      aria-label="Fotoğraf değiştir"
                    >
                      {photoLoading
                        ? <Loader2 size={18} className="text-white animate-spin" />
                        : <Camera size={18} className="text-white" />
                      }
                    </button>
                    {/* Alt köşe chip */}
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-accent rounded-full flex items-center justify-center shadow-md pointer-events-none">
                      <Camera size={12} className="text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-text text-lg leading-tight truncate">{displayName || 'Profil Bilgileri'}</h2>
                    {username && <p className="text-sm text-muted mt-0.5">@{username}</p>}
                    <p className="text-[11px] text-muted mt-1.5">PNG, JPG veya WebP — maks. 2 MB</p>
                  </div>
                </div>

                {/* Durum bandı */}
                {profileStatus && (
                  <div className={`flex items-center gap-2 px-4 py-2.5 text-sm ${profileStatus.type === 'success' ? 'bg-green-50 text-green-700 border-b border-green-200' : 'bg-rose-50 text-rose-700 border-b border-rose-200'}`}>
                    {profileStatus.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                    {profileStatus.message}
                  </div>
                )}

                {/* Satırlar */}
                <div className="px-3 sm:px-6">

                  {/* Ad */}
                  <ProfileRow label="Ad"
                    display={displayName
                      ? <span className="font-semibold text-text">{displayName}</span>
                      : <span className="text-muted">Adınızı girin</span>}
                    isEditing={editingField === 'displayName'}
                    onEdit={() => { setEditingField('displayName'); setProfileStatus(null); }}>
                    <div className="max-w-sm space-y-1">
                      <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className={inputCls()} placeholder="Ad Soyad" />
                      <EditBtns onSave={() => handleFieldSave({ displayName })} onCancel={() => setEditingField(null)} />
                    </div>
                  </ProfileRow>

                  {/* Profil adı */}
                  <ProfileRow label="Profil adı"
                    display={username
                      ? <span className="font-medium text-text">@{username}</span>
                      : <span className="text-muted">Bir profil adı seçin</span>}
                    isEditing={editingField === 'username'}
                    onEdit={() => { setEditingField('username'); setProfileStatus(null); }}>
                    <div className="max-w-sm space-y-1">
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">@</span>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))} className={`${inputCls()} pl-8`} placeholder="kullaniciadi" />
                      </div>
                      <EditBtns onSave={() => handleFieldSave({ username })} onCancel={() => setEditingField(null)} />
                    </div>
                  </ProfileRow>

                  {/* Telefon */}
                  <ProfileRow label="Telefon numarası"
                    display={phone
                      ? <span className="font-medium text-text">🇹🇷 +90 {phone}</span>
                      : <span className="text-muted">Telefon numarası ekleyin</span>}
                    isEditing={editingField === 'phone'}
                    actionLabel={phone ? 'Düzenle' : 'Ekle'}
                    onEdit={() => { setEditingField('phone'); setProfileStatus(null); }}>
                    <div className="max-w-sm space-y-1">
                      <div className="flex gap-2">
                        <span className="flex items-center px-3.5 rounded-lg border border-divider bg-surface-2 text-sm text-muted shrink-0 whitespace-nowrap">
                          🇹🇷 +90
                        </span>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className={inputCls()} placeholder="530 823 45 96" />
                      </div>
                      <p className="text-[11px] text-muted">Rezervasyon ve seyahat uyarıları için kullanılır.</p>
                      <EditBtns onSave={() => handleFieldSave({ phone })} onCancel={() => setEditingField(null)} />
                    </div>
                  </ProfileRow>

                  {/* Doğum tarihi */}
                  <ProfileRow label="Doğum tarihi"
                    display={birthDate
                      ? <span className="font-medium text-text">{fmtBirthDate(birthDate)}</span>
                      : <span className="text-muted">Doğum tarihinizi girin</span>}
                    isEditing={editingField === 'birthDate'}
                    actionLabel={birthDate ? 'Düzenle' : 'Ekle'}
                    onEdit={() => { setEditingField('birthDate'); setProfileStatus(null); }}>
                    <div className="max-w-sm space-y-1">
                      <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputCls()}
                        max={new Date().toISOString().split('T')[0]} />
                      <p className="text-[11px] text-muted">18 yaşından büyük olmak gerekmektedir.</p>
                      <EditBtns onSave={() => handleFieldSave({ birthDate })} onCancel={() => setEditingField(null)} />
                    </div>
                  </ProfileRow>

                  {/* Uyruk */}
                  <ProfileRow label="Uyruk"
                    display={<span className="font-medium text-text">{nationality}</span>}
                    isEditing={editingField === 'nationality'}
                    onEdit={() => { setEditingField('nationality'); setProfileStatus(null); }}>
                    <div className="max-w-sm space-y-1">
                      <select value={nationality} onChange={e => setNationality(e.target.value)} className={inputCls()}>
                        {PASSPORT_COUNTRIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <EditBtns onSave={() => handleFieldSave({ nationality })} onCancel={() => setEditingField(null)} />
                    </div>
                  </ProfileRow>

                  {/* Cinsiyet */}
                  <ProfileRow label="Cinsiyet"
                    display={gender
                      ? <span className="font-medium text-text">{gender}</span>
                      : <span className="text-muted">Cinsiyetinizi seçin</span>}
                    isEditing={editingField === 'gender'}
                    actionLabel={gender ? 'Düzenle' : 'Ekle'}
                    onEdit={() => { setEditingField('gender'); setProfileStatus(null); }}>
                    <div className="max-w-sm space-y-1">
                      <div className="grid grid-cols-2 gap-2">
                        {['Erkek', 'Kadın', 'Diğer', 'Belirtmek istemiyorum'].map(g => (
                          <button key={g} type="button" onClick={() => setGender(g)}
                            className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all
                              ${gender === g ? 'border-accent bg-accent-100 text-accent-700' : 'border-divider text-muted hover:border-accent/40'}`}>
                            {g}
                          </button>
                        ))}
                      </div>
                      <EditBtns onSave={() => handleFieldSave({ gender })} onCancel={() => setEditingField(null)} />
                    </div>
                  </ProfileRow>

                  {/* Adres */}
                  <ProfileRow label="Adres"
                    display={address
                      ? <span className="font-medium text-text whitespace-pre-line">{address}</span>
                      : <span className="text-muted">Adresinizi ekleyin</span>}
                    isEditing={editingField === 'address'}
                    actionLabel={address ? 'Düzenle' : 'Ekle'}
                    onEdit={() => { setEditingField('address'); setProfileStatus(null); }}>
                    <div className="max-w-sm space-y-1">
                      <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3}
                        className={`${inputCls()} resize-none`} placeholder="Sokak, mahalle, şehir, ülke" />
                      <EditBtns onSave={() => handleFieldSave({ address })} onCancel={() => setEditingField(null)} />
                    </div>
                  </ProfileRow>

                </div>
              </div>
            );
          })()}

          {/* ══ HESAP — E-posta ══ */}
          {activeSection === 'email' && (
            <CardWrap title="E-posta Adresi">

              <StatusBanner status={emailStatus} />

              {/* Mevcut e-posta kartı */}
              <div className="flex items-center gap-3 p-4 bg-surface-2 rounded-xl border border-divider mb-5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                  <Mail size={15} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-0.5">Mevcut E-posta</p>
                  <p className="font-semibold text-sm text-text truncate">{user?.email}</p>
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
                  <label className="block text-xs font-medium text-muted mb-1.5">Yeni E-posta Adresi</label>
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
                  <label className="block text-xs font-medium text-muted mb-1.5">Mevcut Şifreniz</label>
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

              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
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
                    <label className="block text-xs font-medium text-muted mb-1.5">Mevcut Şifre</label>
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                      >
                        {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Yeni şifre */}
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">Yeni Şifre</label>
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
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
                                ${i <= strength.score ? strength.color : 'bg-divider'}`}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] text-muted">
                          Güç: <span className="font-semibold">{strength.label}</span>
                          <span className="ml-2 text-muted">
                            {strength.score < 3 && '· Büyük harf, rakam ve sembol ekleyin'}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Şifre tekrar */}
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">Yeni Şifre (tekrar)</label>
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                      >
                        {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {pwMismatch && <p className="text-[11px] text-rose-500 mt-1">Şifreler eşleşmiyor</p>}
                    {pwMatch   && <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1"><Check size={10} strokeWidth={3} /> Şifreler eşleşiyor</p>}
                  </div>

                  {/* İpuçları */}
                  <div className="p-3 bg-surface-2 rounded-xl border border-divider">
                    <p className="text-[11px] font-semibold text-muted mb-1.5">Güçlü şifre için:</p>
                    {[
                      { rule: newPassword.length >= 8,         text: 'En az 8 karakter' },
                      { rule: /[A-Z]/.test(newPassword),        text: 'En az bir büyük harf (A-Z)' },
                      { rule: /[0-9]/.test(newPassword),        text: 'En az bir rakam (0-9)' },
                      { rule: /[^A-Za-z0-9]/.test(newPassword), text: 'En az bir özel karakter (!@#...)' },
                    ].map(({ rule, text }) => (
                      <div key={text} className="flex items-center gap-1.5 mt-1">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors
                          ${rule ? 'bg-emerald-500' : 'bg-divider'}`}>
                          <Check size={8} className="text-white" strokeWidth={3} />
                        </div>
                        <span className={`text-[11px] ${rule ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted'}`}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end mt-6 pt-5 border-t border-divider">
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
          {/* ══ SEYAHAT — Varsayılan Tercihler ══ */}
          {activeSection === 'travel_defaults' && (
            <CardWrap title="Varsayılan Seyahat Tercihleri" subtitle="Yeni plan oluştururken bu değerler otomatik doldurulur.">
              <StatusBanner status={travelDefaultsStatus} />
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">Varsayılan Bütçe</label>
                    <input
                      type="number" min="100"
                      value={defaultBudget}
                      onChange={e => setDefaultBudget(e.target.value)}
                      className={inputCls(Number(defaultBudget) < 100)}
                      placeholder="15000"
                    />
                    {Number(defaultBudget) < 100 && Number(defaultBudget) > 0 && (
                      <p className="text-[11px] text-rose-500 mt-1">En az 100 olmalı</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">Para Birimi</label>
                    <select value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value)} className={inputCls()}>
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Varsayılan Kişi Sayısı</label>
                  <div className="flex items-center gap-4">
                    <button type="button"
                      onClick={() => setDefaultPeopleCount(v => String(Math.max(1, Number(v) - 1)))}
                      className="w-9 h-9 rounded-xl border border-divider flex items-center justify-center text-muted hover:border-accent/40 transition-all"
                    >−</button>
                    <span className="text-2xl font-black text-text tabular-nums w-8 text-center">{defaultPeopleCount}</span>
                    <button type="button"
                      onClick={() => setDefaultPeopleCount(v => String(Math.min(15, Number(v) + 1)))}
                      className="w-9 h-9 rounded-2xl border border-accent flex items-center justify-center text-accent hover:bg-accent-100 transition-all"
                    >+</button>
                    <span className="text-xs text-muted">kişi</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Varsayılan Tempo</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: '🛋️', sub: 'Rahat', val: 'rahat' },
                      { label: '🚶', sub: 'Normal', val: 'normal' },
                      { label: '🏃', sub: 'Aktif', val: 'aktif' },
                      { label: '🧭', sub: 'Esnek', val: 'esnek' },
                    ].map(({ label, sub, val }) => (
                      <button key={val} type="button" onClick={() => setDefaultPace(val)}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-center transition-all
                          ${defaultPace === val
                            ? 'border-accent bg-accent-100'
                            : 'border-divider bg-surface-2 hover:border-accent/40'}`}
                      >
                        <span className="text-xl">{label}</span>
                        <span className={`text-[11px] font-semibold ${defaultPace === val ? 'text-accent' : 'text-muted'}`}>{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl">
                  <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    Bu değerler "Plan Oluştur" sayfasındaki başlangıç değerlerini belirler. Plan oluştururken istediğin zaman değiştirebilirsin.
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <SaveBtn onClick={handleTravelDefaultsSave} loading={travelDefaultsLoading} label="Tercihleri Kaydet" />
              </div>
            </CardWrap>
          )}

          {/* ══ SEYAHAT — Pasaport ══ */}
          {activeSection === 'passport' && (() => {
            const daysLeft = passportDaysLeft(passportExpiry);
            const isExpired   = daysLeft !== null && daysLeft < 0;
            const isWarning   = daysLeft !== null && daysLeft >= 0 && daysLeft <= 180;
            const isOk        = daysLeft !== null && daysLeft > 180;
            return (
              <CardWrap title="Pasaport & Vatandaşlık" subtitle="Vize bilgileri ve seyahat uyarıları için kullanılır.">
                <StatusBanner status={passportStatus} />

                {/* Süre uyarı bandı */}
                {isExpired && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl mb-4">
                    <AlertCircle size={15} className="text-rose-500 shrink-0" />
                    <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Pasaportunuzun süresi dolmuş!</p>
                  </div>
                )}
                {isWarning && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl mb-4">
                    <AlertCircle size={15} className="text-amber-500 shrink-0" />
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                      Pasaportunuz <span className="font-black">{daysLeft} gün</span> içinde sona eriyor. Seyahat planı yapmadan önce yenileyin.
                    </p>
                  </div>
                )}
                {isOk && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl mb-4">
                    <Check size={15} className="text-emerald-500 shrink-0" strokeWidth={3} />
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      Pasaport geçerli — <span className="font-semibold">{daysLeft} gün</span> kaldı.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">Vatandaşlık / Pasaport Ülkesi</label>
                    <select value={passportCountry} onChange={e => setPassportCountry(e.target.value)} className={inputCls()}>
                      {PASSPORT_COUNTRIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">
                      Pasaport Numarası <span className="text-muted font-normal">(isteğe bağlı)</span>
                    </label>
                    <input
                      type="text"
                      value={passportNumber}
                      onChange={e => setPassportNumber(e.target.value.toUpperCase())}
                      className={inputCls()}
                      placeholder="Örn. U12345678"
                      maxLength={20}
                    />
                    <p className="text-[11px] text-muted mt-1">Yalnızca cihazınızda saklanır, üçüncü taraflarla paylaşılmaz.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">Son Kullanma Tarihi</label>
                    <input
                      type="date"
                      value={passportExpiry}
                      onChange={e => setPassportExpiry(e.target.value)}
                      className={inputCls(isExpired)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                  <SaveBtn onClick={handlePassportSave} loading={passportLoading} label="Bilgileri Kaydet" disabled={isExpired} />
                </div>
              </CardWrap>
            );
          })()}

          {/* ══ SEYAHAT — Konum & Saat Dilimi ══ */}
          {activeSection === 'location_tz' && (
            <CardWrap title="Konum & Saat Dilimi">
              <StatusBanner status={locationStatus} />
              <div className="space-y-4">

                {/* Otomatik algıla */}
                <div className="flex items-center justify-between p-4 bg-surface-2 rounded-xl border border-divider">
                  <div>
                    <p className="text-sm font-semibold text-text">Otomatik Algıla</p>
                    <p className="text-xs text-muted mt-0.5">Tarayıcıdan saat dilimini tespit et</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const detected = detectTimezone();
                      setTimezone(detected);
                      setLocationStatus({ type: 'success', message: `Algılandı: ${detected}` });
                    }}
                    className="px-3.5 py-2 rounded-full bg-accent-100 text-accent-700 text-xs font-bold hover:bg-accent-200 transition-colors"
                  >
                    Algıla
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Saat Dilimi</label>
                  <select value={timezone} onChange={e => setTimezone(e.target.value)} className={inputCls()}>
                    {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <p className="text-[11px] text-muted mt-1">
                    Şu an seçili: <span className="font-semibold text-muted">{timezone.split(' ')[0]}</span>
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <SaveBtn onClick={handleLocationSave} loading={locationLoading} label="Kaydet" />
              </div>
            </CardWrap>
          )}

          {/* ══ GÖRÜNÜM — Dil ══ */}
          {activeSection === 'language_currency' && (
            <CardWrap title="Dil" subtitle="Uygulama arayüz dili.">
              <StatusBanner status={appearanceStatus} />
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-xs font-medium text-muted">Uygulama Dili</label>
                  <ComingSoonBadge />
                </div>
                <select value={language} onChange={e => setLanguage(e.target.value)} className={inputCls()} disabled>
                  {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                </select>
                <p className="text-[11px] text-muted mt-1.5">Çok dilli destek yakında eklenecek. Şimdilik Türkçe aktif.</p>
              </div>
            </CardWrap>
          )}

          {/* ══ GÖRÜNÜM — Ölçü Birimleri ══ */}
          {activeSection === 'units' && (
            <CardWrap title="Ölçü Birimleri" subtitle="Mesafe ve sıcaklık birimleri plan detaylarında kullanılır.">
              <StatusBanner status={appearanceStatus} />
              <div className="space-y-6">

                {/* Mesafe */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Mesafe</label>
                  <SegmentedControl
                    options={[{ label: 'Kilometre (km)', val: true }, { label: 'Mil (mi)', val: false }]}
                    value={distanceKm}
                    onChange={setDistanceKm}
                  />
                  <p className="text-[11px] text-muted mt-1.5">
                    Mevcut: <span className="font-semibold text-muted">{distanceKm ? 'km — Kilometre' : 'mi — Mil'}</span>
                  </p>
                </div>

                {/* Sıcaklık */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Sıcaklık</label>
                  <SegmentedControl
                    options={[{ label: 'Celsius (°C)', val: true }, { label: 'Fahrenheit (°F)', val: false }]}
                    value={tempCelsius}
                    onChange={setTempCelsius}
                  />
                  <p className="text-[11px] text-muted mt-1.5">
                    Mevcut: <span className="font-semibold text-muted">{tempCelsius ? '°C — Celsius' : '°F — Fahrenheit'}</span>
                  </p>
                </div>

                {/* Önizleme */}
                <div className="p-3.5 bg-surface-2 rounded-xl border border-divider">
                  <p className="text-[11px] font-semibold text-muted mb-2">Plan önizleme</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-text font-medium">📍 Mesafe: <strong>{distanceKm ? '2.4 km' : '1.5 mi'}</strong></span>
                    <span className="text-text font-medium">🌡️ Hava: <strong>{tempCelsius ? '24°C' : '75°F'}</strong></span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <SaveBtn onClick={handleAppearanceSave} loading={appearanceLoading} label="Uygula & Kaydet" />
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
              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
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
              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <SaveBtn onClick={handleNotifSave} loading={notifLoading} />
              </div>
            </CardWrap>
          )}

          {/* ══ BİLDİRİMLER — Push ══ */}
          {activeSection === 'push_notif' && (() => {
            const browserSupported = 'Notification' in window;
            const currentPerm = browserSupported ? Notification.permission : 'unsupported';
            const isGranted = currentPerm === 'granted';
            const isDenied  = currentPerm === 'denied';

            const requestPermission = async () => {
              if (!browserSupported) return;
              const result = await Notification.requestPermission();
              if (result === 'granted') {
                setPushEnabled(true);
                setSettings({ pushPermission: 'granted', pushEnabled: true });
                // Test bildirimi gönder
                new Notification('Travyon Bildirimleri Aktif 🎉', {
                  body: 'Seyahat uyarılarını artık anlık alacaksınız.',
                  icon: '/favicon.ico',
                });
              } else {
                setSettings({ pushPermission: result as 'denied' | 'default' });
              }
            };

            return (
              <CardWrap title="Push Bildirimleri" subtitle="Tarayıcı anlık bildirimlerini yönet.">
                <StatusBanner status={notifStatus} />

                {/* İzin durumu kartı */}
                <div className={`flex items-start gap-3 p-4 rounded-xl border mb-5
                  ${isGranted ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                  : isDenied  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                  : !browserSupported ? 'bg-surface-2 border-divider'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'}`}>
                  <div className={`mt-0.5 text-lg shrink-0`}>
                    {isGranted ? '🔔' : isDenied ? '🔕' : !browserSupported ? '🚫' : '⏳'}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold
                      ${isGranted ? 'text-emerald-800 dark:text-emerald-300'
                      : isDenied  ? 'text-rose-800 dark:text-rose-300'
                      : !browserSupported ? 'text-muted'
                      : 'text-amber-800 dark:text-amber-300'}`}>
                      {isGranted ? 'Bildirim izni verildi'
                      : isDenied ? 'Bildirim izni reddedildi'
                      : !browserSupported ? 'Tarayıcınız push bildirimleri desteklemiyor'
                      : 'Bildirim izni bekleniyor'}
                    </p>
                    <p className={`text-xs mt-0.5
                      ${isGranted ? 'text-emerald-700 dark:text-emerald-400'
                      : isDenied  ? 'text-rose-600 dark:text-rose-400'
                      : 'text-amber-700 dark:text-amber-400'}`}>
                      {isGranted ? 'Tarayıcı anlık bildirimleri aktif.'
                      : isDenied ? 'Tarayıcı adres çubuğundaki kilit ikonundan izin verebilirsiniz.'
                      : !browserSupported ? 'Farklı bir tarayıcı deneyin (Chrome, Edge, Firefox).'
                      : 'Bildirimleri etkinleştirmek için aşağıdaki butona basın.'}
                    </p>
                  </div>
                  {!isGranted && !isDenied && browserSupported && (
                    <button
                      type="button"
                      onClick={requestPermission}
                      className="shrink-0 px-3.5 py-2 rounded-full bg-accent text-white text-xs font-bold hover:brightness-105 transition-colors shadow-sm"
                    >
                      İzin Ver
                    </button>
                  )}
                </div>

                <SettingRow title="Push bildirimleri" desc="Seyahat yaklaştığında anlık uyarı al">
                  <Toggle
                    value={pushEnabled}
                    onChange={(v) => {
                      if (v && !isGranted) { requestPermission(); return; }
                      setPushEnabled(v);
                    }}
                  />
                </SettingRow>
                <SettingRow title="Bildirim sesi" desc="Bildirim geldiğinde ses çal">
                  <Toggle value={pushSoundEnabled} onChange={setPushSoundEnabled} />
                </SettingRow>

                <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                  <SaveBtn onClick={handleNotifSave} loading={notifLoading} disabled={!browserSupported} />
                </div>
              </CardWrap>
            );
          })()}

          {/* ══ GİZLİLİK — Profil & Plan ══ */}
          {activeSection === 'privacy_profile' && (
            <CardWrap title="Profil & Plan Gizliliği" subtitle="Diğer kullanıcıların sizi nasıl göreceğini kontrol edin.">
              <StatusBanner status={privacyStatus} />

              {/* Genel durum özeti */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { label: 'Profil',  active: profilePublic, on: 'Herkese açık', off: 'Gizli' },
                  { label: 'Planlar', active: plansPublic,   on: 'Paylaşılabilir', off: 'Kilitli' },
                  { label: 'Takip',   active: followPublic,  on: 'Serbest', off: 'Onaylı' },
                ].map(({ label, active, on, off }) => (
                  <div key={label} className={`p-3 rounded-xl border text-center transition-colors
                    ${active ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                             : 'bg-surface-2 border-divider'}`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-0.5">{label}</p>
                    <p className={`text-xs font-bold ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted'}`}>
                      {active ? on : off}
                    </p>
                  </div>
                ))}
              </div>

              {/* Profil */}
              <div className="border border-divider rounded-xl overflow-hidden mb-3">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text">Herkese açık profil</p>
                    <p className="text-xs text-muted mt-0.5">
                      {profilePublic
                        ? '✅ Toplulukta görünür — diğer kullanıcılar sizi bulabilir'
                        : '🔒 Gizli mod — kimse profilinizi göremez'}
                    </p>
                  </div>
                  <Toggle value={profilePublic} onChange={setProfilePublic} />
                </div>
              </div>

              {/* Planlar */}
              <div className="border border-divider rounded-xl overflow-hidden mb-3">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text">Planlarım herkese açık</p>
                    <p className="text-xs text-muted mt-0.5">
                      {plansPublic
                        ? '✅ Toplulukta paylaşabilirsiniz'
                        : '🔒 Paylaşım kapalı — Topluluk sayfasında paylaşım butonu kilitlenir'}
                    </p>
                  </div>
                  <Toggle value={plansPublic} onChange={setPlansPublic} />
                </div>
                {!plansPublic && (
                  <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-100 dark:border-amber-900">
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      ⚠️ Bu ayar kapalıyken planlarınızı Topluluk sayfasından paylaşamazsınız.
                    </p>
                  </div>
                )}
              </div>

              {/* Takip */}
              <div className="border border-divider rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text">Herkes takip edebilir</p>
                    <p className="text-xs text-muted mt-0.5">
                      {followPublic
                        ? '✅ Onaysız takip — herkes takip edebilir'
                        : '🔒 Onaylı takip — takip istekleri onayınızı bekler'}
                    </p>
                  </div>
                  <Toggle value={followPublic} onChange={setFollowPublic} />
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <SaveBtn onClick={handlePrivacySave} loading={privacyLoading} label="Kaydet & Uygula" />
              </div>
            </CardWrap>
          )}

          {/* ══ GİZLİLİK — Lokasyon ══ */}
          {activeSection === 'privacy_location' && (
            <CardWrap title="Lokasyon Gizliliği" subtitle="Konumunuzun nasıl kullanılacağını kontrol edin.">
              <StatusBanner status={privacyStatus} />

              {/* Mevcut konum izni */}
              {(() => {
                const geoSupported = 'geolocation' in navigator;
                return (
                  <div className={`flex items-start gap-3 p-4 rounded-xl border mb-5
                    ${geoSupported ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900'
                                   : 'bg-surface-2 border-divider'}`}>
                    <span className="text-lg shrink-0 mt-0.5">{geoSupported ? '📍' : '🚫'}</span>
                    <div>
                      <p className="text-sm font-semibold text-text">
                        {geoSupported ? 'Tarayıcı Konum API' : 'Konum desteklenmiyor'}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {geoSupported
                          ? 'Tarayıcınız konum desteğine sahip. Konum özellikleri bu uygulama için seçimlidir.'
                          : 'Tarayıcınız konumu desteklemiyor.'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3">
                <div className="border border-divider rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-text">Konum tabanlı öneriler</p>
                      <p className="text-xs text-muted mt-0.5">
                        {locationEnabled
                          ? '✅ Yakındaki mekanlar ve akıllı öneriler için konum kullanılır'
                          : '🔒 Konum özellikleri devre dışı — genel öneriler gösterilir'}
                      </p>
                    </div>
                    <Toggle value={locationEnabled} onChange={setLocationEnabled} />
                  </div>
                </div>

                <div className="border border-divider rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-text">Konum geçmişi</p>
                      <p className="text-xs text-muted mt-0.5">
                        {locationHistory
                          ? '✅ Ziyaret geçmişi kaydediliyor — gelecek planlar için daha iyi öneriler'
                          : '🔒 Konum geçmişi saklanmıyor'}
                      </p>
                    </div>
                    <Toggle value={locationHistory} onChange={setLocationHistory} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <SaveBtn onClick={handlePrivacySave} loading={privacyLoading} label="Kaydet & Uygula" />
              </div>
            </CardWrap>
          )}

          {/* ══ GİZLİLİK — Veri Kullanımı ══ */}
          {activeSection === 'privacy_data' && (
            <CardWrap title="Veri Kullanımı" subtitle="Verilerinizin nasıl işlendiğini kontrol edin.">
              <StatusBanner status={privacyStatus} />

              <div className="border border-divider rounded-xl overflow-hidden mb-4">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text">Analitik verisi paylaş</p>
                    <p className="text-xs text-muted mt-0.5">
                      {analyticsEnabled
                        ? '✅ Anonim kullanım verisi — hizmet iyileştirmek için gönderilir'
                        : '🔒 Hiçbir kullanım verisi gönderilmez'}
                    </p>
                  </div>
                  <Toggle value={analyticsEnabled} onChange={setAnalyticsEnabled} />
                </div>
              </div>

              {/* Veri özeti */}
              <div className="rounded-xl border border-divider overflow-hidden mb-4">
                <div className="px-4 py-3 bg-surface-2 border-b border-divider">
                  <p className="text-xs font-bold text-muted uppercase tracking-widest">Hesabınızda saklanan veriler</p>
                </div>
                {[
                  { icon: '👤', label: 'Profil bilgileri', desc: 'Ad, e-posta, fotoğraf' },
                  { icon: '✈️', label: 'Seyahat planları', desc: 'Oluşturduğunuz tüm planlar' },
                  { icon: '⚙️', label: 'Tercihler & ayarlar', desc: 'Bildirim, görünüm, gizlilik' },
                  { icon: '📍', label: 'Pasaport & konum', desc: 'Seyahat ile ilgili kişisel bilgiler' },
                ].map(({ icon, label, desc }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-3 border-b border-divider last:border-0">
                    <span className="text-base w-7 shrink-0">{icon}</span>
                    <div>
                      <p className="text-sm font-medium text-text">{label}</p>
                      <p className="text-[11px] text-muted">{desc}</p>
                    </div>
                    <span className="ml-auto text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">Şifreli</span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  🔐 Kişisel verileriniz 6698 sayılı KVKK kapsamında işlenmektedir.
                  Verilerinizi indirmek veya hesabınızı silmek için <strong>Verilerim</strong> bölümünü kullanın.
                </p>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <SaveBtn onClick={handlePrivacySave} loading={privacyLoading} label="Kaydet & Uygula" />
              </div>
            </CardWrap>
          )}

          {/* ══ FATURALAMA — Abonelik ══ */}
          {activeSection === 'subscription' && (() => {
            const FREE_LIMIT = 3;
            const usagePct = Math.min(100, (plansUsedThisMonth / FREE_LIMIT) * 100);
            const barColor = usagePct >= 100 ? 'bg-rose-500' : usagePct >= 67 ? 'bg-amber-400' : 'bg-emerald-500';
            return (
              <CardWrap title="Abonelik" subtitle="Mevcut planınız ve kullanım durumunuz.">

                {/* Mevcut plan kartı */}
                <div className={`rounded-xl border p-5 mb-5 ${isPro
                  ? 'bg-gradient-to-br from-sage-200 to-sage-200 border-sage/30'
                  : 'bg-surface-2 border-divider'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-text text-base">
                        {isPro ? '✨ Pro Plan' : 'Ücretsiz Plan'}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {isPro ? 'Sınırsız plan + Gelişmiş AI + Reklamsız' : 'Ayda 3 plan oluşturma hakkı'}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${isPro
                      ? 'bg-sage text-white'
                      : 'bg-divider text-muted'}`}>
                      {isPro ? 'Pro' : 'Ücretsiz'}
                    </span>
                  </div>

                  {/* Aylık kullanım metresi — sadece Free'de */}
                  {!isPro && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-muted">Bu ay oluşturulan planlar</p>
                        <p className={`text-xs font-black tabular-nums ${usagePct >= 100 ? 'text-rose-500' : 'text-text'}`}>
                          {plansUsedThisMonth} / {FREE_LIMIT}
                        </p>
                      </div>
                      <div className="h-2 bg-divider rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${usagePct}%` }}
                        />
                      </div>
                      {usagePct >= 100 && (
                        <p className="text-[11px] text-rose-500 font-semibold mt-1.5">
                          ⚠️ Aylık limitinize ulaştınız. Pro'ya geçerek sınırsız plan oluşturun.
                        </p>
                      )}
                      {usagePct >= 67 && usagePct < 100 && (
                        <p className="text-[11px] text-amber-500 font-semibold mt-1.5">
                          Bu ay {FREE_LIMIT - plansUsedThisMonth} plan hakkınız kaldı.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Özellik karşılaştırması */}
                <div className="rounded-xl border border-divider overflow-hidden mb-5">
                  <div className="grid grid-cols-3 bg-surface-2 border-b border-divider">
                    <div className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-widest text-muted">Özellik</div>
                    <div className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-widest text-muted text-center">Ücretsiz</div>
                    <div className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-widest text-sage-700 text-center">Pro</div>
                  </div>
                  {[
                    { label: 'Plan oluşturma',        free: '3 / ay',      pro: 'Sınırsız' },
                    { label: 'AI plan kalitesi',       free: 'Standart',    pro: 'Gelişmiş' },
                    { label: 'Reklam',                 free: '✅',         pro: '-' },
                    { label: 'Topluluk paylaşımı',     free: '✅',          pro: '✅' },
                    { label: 'Öncelikli destek',       free: '—',           pro: '✅' },
                    { label: 'Erken erişim',           free: '—',           pro: '✅' },
                  ].map(({ label, free, pro }) => (
                    <div key={label} className="grid grid-cols-3 border-b border-divider last:border-0">
                      <div className="px-4 py-3 text-xs font-medium text-muted">{label}</div>
                      <div className="px-4 py-3 text-xs text-muted text-center">{free}</div>
                      <div className="px-4 py-3 text-xs font-semibold text-sage-700 text-center">{pro}</div>
                    </div>
                  ))}
                </div>

                {/* Upgrade CTA — sadece Free kullanıcılara */}
                {!isPro && (
                  <div className="relative bg-gradient-to-br from-sage to-sage-700 rounded-2xl p-5 overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-32 h-32 bg-accent/25 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative flex items-center justify-between gap-4">
                      <div>
                        <span className="inline-block px-2 py-0.5 bg-accent text-white text-[9px] font-black uppercase tracking-widest rounded-full mb-2">Pro</span>
                        <p className="text-white font-bold text-sm mb-0.5">Sınırsız Plan + Gelişmiş AI</p>
                        <p className="text-blue-100 text-xs">Reklamsız deneyim, öncelikli destek ve tüm premium özellikler.</p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 px-5 py-2.5 bg-white text-sage-700 font-bold text-sm rounded-full hover:bg-slate-50 transition-colors shadow-lg"
                      >
                        Yükselt →
                      </button>
                    </div>
                  </div>
                )}

                {/* Pro iptal */}
                {isPro && (
                  <div className="p-4 rounded-xl bg-surface-2 border border-divider flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text">Aboneliği İptal Et</p>
                      <p className="text-xs text-muted mt-0.5">Dönem sonunda ücretsiz plana geçilir.</p>
                    </div>
                    <button type="button" className="px-3.5 py-2 text-xs font-bold text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors">
                      İptal Et
                    </button>
                  </div>
                )}
              </CardWrap>
            );
          })()}

          {/* ══ FATURALAMA — Fatura Geçmişi ══ */}
          {activeSection === 'billing_history' && (
            <CardWrap title="Fatura Geçmişi" subtitle="Geçmiş ödemelerinizi görüntüleyin.">
              {isPro ? (
                /* Pro kullanıcı — tablo (başlangıçta boş, ilerleyen dönemde dolar) */
                <div className="rounded-xl border border-divider overflow-hidden">
                  <div className="grid grid-cols-4 bg-surface-2 border-b border-divider px-4 py-2.5">
                    {['Tarih', 'Tutar', 'Durum', 'Belge'].map(h => (
                      <p key={h} className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{h}</p>
                    ))}
                  </div>
                  <div className="py-10 text-center">
                    <Receipt size={32} className="mx-auto text-divider mb-2" />
                    <p className="text-sm text-muted font-medium">İlk faturanız burada görünecek.</p>
                    <p className="text-xs text-muted mt-1">Bir sonraki dönem sonunda otomatik oluşturulur.</p>
                  </div>
                </div>
              ) : (
                /* Free kullanıcı */
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                    <Receipt size={28} className="text-muted" />
                  </div>
                  <p className="text-sm font-semibold text-muted mb-1">Henüz fatura bulunmuyor</p>
                  <p className="text-xs text-muted max-w-xs leading-relaxed">
                    Pro aboneliğe geçtikten sonra tüm faturalarınız burada listelenir ve indirilebilir hale gelir.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveSection('subscription')}
                    className="mt-5 px-5 py-2.5 bg-sage text-white text-sm font-bold rounded-full hover:brightness-105 transition-colors"
                  >
                    Pro'ya Geç →
                  </button>
                </div>
              )}
            </CardWrap>
          )}

          {/* ══ FATURALAMA — Ödeme Yöntemi ══ */}
          {activeSection === 'payment' && (
            <CardWrap title="Ödeme Yöntemi" subtitle="Abonelik ödemelerinde kullanılacak kartı yönetin.">
              <StatusBanner status={cardStatus} />

              {/* Kayıtlı kart */}
              {savedCard && !showCardForm && (
                <div className="flex items-center gap-4 p-4 rounded-xl border border-divider bg-surface-2 mb-5">
                  <div className="w-12 h-8 rounded-md bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0">
                    <CreditCard size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text">
                      {savedCard.brand} •••• {savedCard.last4}
                    </p>
                    <p className="text-xs text-muted mt-0.5">Son kullanma: {savedCard.expiry}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => { setShowCardForm(true); setCardStatus(null); }}
                      className="px-3 py-1.5 text-xs font-semibold text-muted border border-divider rounded-lg hover:bg-surface-2 transition-colors"
                    >
                      Değiştir
                    </button>
                    <button
                      type="button"
                      onClick={handleCardDelete}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
              )}

              {/* Boş durum — kart yok ve form kapalı */}
              {!savedCard && !showCardForm && (
                <div className="flex flex-col items-center py-10 text-center mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                    <Wallet size={28} className="text-muted" />
                  </div>
                  <p className="text-sm font-semibold text-muted mb-1">Kayıtlı ödeme yöntemi yok</p>
                  <p className="text-xs text-muted max-w-xs leading-relaxed">
                    Pro aboneliğe geçmek için bir kart ekleyin. Verileriniz şifreli olarak saklanır.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShowCardForm(true); setCardStatus(null); }}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-bold rounded-full hover:brightness-105 transition-colors"
                  >
                    <CreditCard size={14} /> Kart Ekle
                  </button>
                </div>
              )}

              {/* Kart formu */}
              {showCardForm && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl flex items-start gap-2 mb-2">
                    <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                      Kart bilgileriniz şifreli olarak saklanır. CVV numarası hiçbir zaman kaydedilmez.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">Kart Numarası</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={e => setCardNumber(fmtCardNumber(e.target.value))}
                        className={inputCls()}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        autoComplete="cc-number"
                      />
                      {cardNumber && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted">
                          {detectBrand(cardNumber)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">Kart Üzerindeki Ad</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={e => setCardName(e.target.value.toUpperCase())}
                      className={inputCls()}
                      placeholder="AD SOYAD"
                      autoComplete="cc-name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1.5">Son Kullanma (MM/YY)</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(fmtCardExpiry(e.target.value))}
                        className={inputCls()}
                        placeholder="12/27"
                        maxLength={5}
                        autoComplete="cc-exp"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1.5">CVV</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className={inputCls()}
                        placeholder="•••"
                        maxLength={4}
                        autoComplete="cc-csc"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-divider">
                    <button
                      type="button"
                      onClick={() => { setShowCardForm(false); setCardStatus(null); setCardNumber(''); setCardName(''); setCardExpiry(''); setCardCvv(''); }}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-muted border border-divider hover:bg-surface-2 transition-colors"
                    >
                      İptal
                    </button>
                    <SaveBtn onClick={handleCardSave} loading={cardLoading} label="Kartı Kaydet" />
                  </div>
                </div>
              )}

              {/* Güvenlik notu */}
              {!showCardForm && (
                <div className="flex items-center gap-2 mt-2 text-[11px] text-muted">
                  <span>🔐</span>
                  <span>Ödeme bilgileri 256-bit SSL şifreleme ile korunur.</span>
                </div>
              )}
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
                  <div key={label} className="flex items-center justify-between p-3.5 rounded-xl border border-divider">
                    <div>
                      <p className="text-sm font-medium text-text">{label}</p>
                      <p className="text-xs text-muted mt-0.5">{desc}</p>
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
                <button type="button" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-heading bg-accent text-white hover:brightness-105 transition-opacity">
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
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Onaylamak için <span className="font-bold text-text">HESABIMI SİL</span> yazın
                  </label>
                  <input
                    type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                    className={inputCls()} placeholder="HESABIMI SİL"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Şifreniz</label>
                  <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} className={inputCls()} placeholder="••••••••" />
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
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
                  <details key={q} className="group border border-divider rounded-xl overflow-hidden">
                    <summary className="flex items-center justify-between px-4 py-3.5 cursor-pointer list-none font-medium text-sm text-text hover:bg-surface-2 transition-colors">
                      {q}
                      <ChevronRight size={14} className="text-muted shrink-0 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="px-4 pb-4 text-xs text-muted leading-relaxed border-t border-divider pt-3">
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
                  <label className="block text-xs font-medium text-muted mb-1.5">Konu</label>
                  <input type="text" className={inputCls()} placeholder="Mesajınızın konusu" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Mesaj</label>
                  <textarea
                    value={contactMsg} onChange={e => setContactMsg(e.target.value)}
                    rows={5} className={`${inputCls()} resize-none`}
                    placeholder="Sorun veya önerinizi yazın..."
                  />
                </div>
              </div>
              <div className="flex justify-between items-center mt-6 pt-5 border-t border-divider">
                <p className="text-xs text-muted">destek@travyon.app · Yanıt süresi: 24 saat</p>
                <button
                  type="button"
                  onClick={() => { setContactStatus({ type: 'success', message: 'Mesajınız gönderildi!' }); setContactMsg(''); }}
                  disabled={!contactMsg.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-accent hover:brightness-105 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
                  <label className="block text-xs font-medium text-muted mb-1.5">Hata Başlığı</label>
                  <input type="text" value={bugTitle} onChange={e => setBugTitle(e.target.value)} className={inputCls()} placeholder="Kısa ve açıklayıcı bir başlık" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Detaylı Açıklama</label>
                  <textarea
                    value={bugDesc} onChange={e => setBugDesc(e.target.value)}
                    rows={5} className={`${inputCls()} resize-none`}
                    placeholder="Hatayı nasıl tetiklediniz? Beklenen ve gerçekleşen durum neydi?"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <button
                  type="button"
                  onClick={handleBugReport}
                  disabled={bugLoading || !bugTitle.trim() || !bugDesc.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-accent hover:brightness-105 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {bugLoading ? <Loader2 size={14} className="animate-spin" /> : <Bug size={14} />}
                  Raporu Gönder
                </button>
              </div>
            </CardWrap>
          )}

          {/* Mobile logout button */}
          <div className="sm:hidden mt-2 pb-4">
            <button
              type="button"
              onClick={handleMobileLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-500 bg-surface border border-red-100 dark:border-red-900/40 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <LogOut size={16} />
              Çıkış Yap
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
