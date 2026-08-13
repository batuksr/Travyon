import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  deleteUser,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { submitBugReport } from '../services/bugReportService';
import { initiateSubscriptionCheckout, cancelSubscription as cancelSubscriptionCall } from '../services/subscriptionService';
import IyzicoCheckoutModal from '../components/IyzicoCheckoutModal';
import { useAuthStore } from '../store/useAuthStore';
import { useAppSettingsStore, CURRENCY_MAP } from '../store/useAppSettingsStore';
import {
  User, Mail, Lock, ChevronRight, Check, AlertCircle, Loader2, Camera,
  Settings2, BookOpen, MapPin, Globe, Ruler,
  BellRing, Smartphone, Eye, EyeOff, Database,
  CreditCard, Receipt, Download, Trash2,
  HelpCircle, MessageCircle, Bug, LogOut, IdCard,
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

const LANGUAGES = ['Türkçe', 'English'];
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

type TFunc = (key: string, options?: Record<string, unknown>) => string;

/* Şifre gücü: 0-4 */
const getPasswordStrength = (pw: string, t: TFunc): { score: number; label: string; color: string } => {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score: 1, label: t('settings.password.strength.veryWeak'), color: 'bg-rose-500' };
  if (score === 2) return { score: 2, label: t('settings.password.strength.weak'), color: 'bg-orange-400' };
  if (score === 3) return { score: 3, label: t('settings.password.strength.medium'), color: 'bg-amber-400' };
  if (score === 4) return { score: 4, label: t('settings.password.strength.strong'), color: 'bg-emerald-500' };
  return { score: 5, label: t('settings.password.strength.veryStrong'), color: 'bg-emerald-600' };
};

const firebaseErrorMsg = (code: string, t: TFunc): string => {
  const map: Record<string, string> = {
    'auth/wrong-password': t('settings.errors.wrongPassword'),
    'auth/invalid-credential': t('settings.errors.wrongPassword'),
    'auth/weak-password': t('settings.errors.weakPassword'),
    'auth/email-already-in-use': t('settings.errors.emailInUse'),
    'auth/invalid-email': t('settings.errors.invalidEmail'),
    'auth/requires-recent-login': t('settings.errors.requiresRecentLogin'),
    'auth/too-many-requests': t('settings.errors.tooManyRequests'),
  };
  return map[code] ?? t('settings.errors.generic');
};

const getErrCode = (err: unknown): string =>
  (err as { code?: string })?.code ?? '';

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

// iyzico ödeme altyapısı (Cloud Functions, firestore.rules) hazır ve tam
// çalışır durumda, ama iyzico sandbox/prod secret'ları henüz girilmedi —
// site lansmanında "Yükselt" akışı bilinçli olarak pasif tutuluyor. İlgi
// olursa: secret'lar girilip sandbox'ta test edildikten sonra bu tek satır
// true yapılır, başka hiçbir kod değişikliği gerekmez.
const PRO_CHECKOUT_ENABLED = false;

const ComingSoonBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className="text-[10px] font-bold bg-surface-2 text-muted px-2 py-0.5 rounded-full uppercase tracking-widest">{label}</span>
);

/* Profil sayfası satır bileşeni — Airbnb tarzı inline edit */
const ProfileRow: React.FC<{
  label: string;
  display: React.ReactNode;
  isEditing: boolean;
  onEdit: () => void;
  actionLabel: string;
  children?: React.ReactNode;
}> = ({ label, display, isEditing, onEdit, actionLabel, children }) => (
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
const NAV_GROUPS: { labelKey: string; items: { id: Section; icon: LucideIcon; labelKey: string }[] }[] = [
  {
    labelKey: 'settings.nav.groups.account',
    items: [
      { id: 'profile',  icon: User, labelKey: 'settings.nav.items.profile' },
      { id: 'email',    icon: Mail, labelKey: 'settings.nav.items.email' },
      { id: 'password', icon: Lock, labelKey: 'settings.nav.items.password' },
    ],
  },
  {
    labelKey: 'settings.nav.groups.travel',
    items: [
      { id: 'travel_defaults', icon: Settings2, labelKey: 'settings.nav.items.travelDefaults' },
      { id: 'passport',        icon: BookOpen,  labelKey: 'settings.nav.items.passport' },
      { id: 'location_tz',     icon: MapPin,    labelKey: 'settings.nav.items.locationTz' },
    ],
  },
  {
    labelKey: 'settings.nav.groups.appearance',
    items: [
      { id: 'language_currency', icon: Globe,   labelKey: 'settings.nav.items.language' },
      { id: 'units',             icon: Ruler,   labelKey: 'settings.nav.items.units' },
    ],
  },
  {
    labelKey: 'settings.nav.groups.notifications',
    items: [
      { id: 'app_notif',   icon: BellRing,     labelKey: 'settings.nav.items.appNotif' },
      { id: 'email_notif', icon: Mail,         labelKey: 'settings.nav.items.emailNotif' },
      { id: 'push_notif',  icon: Smartphone,   labelKey: 'settings.nav.items.pushNotif' },
    ],
  },
  {
    labelKey: 'settings.nav.groups.privacy',
    items: [
      { id: 'privacy_profile',  icon: Eye,      labelKey: 'settings.nav.items.privacyProfile' },
      { id: 'privacy_location', icon: MapPin,   labelKey: 'settings.nav.items.privacyLocation' },
      { id: 'privacy_data',     icon: Database, labelKey: 'settings.nav.items.privacyData' },
    ],
  },
  {
    labelKey: 'settings.nav.groups.billing',
    items: [
      { id: 'subscription',    icon: CreditCard, labelKey: 'settings.nav.items.subscription' },
      { id: 'billing_history', icon: Receipt,    labelKey: 'settings.nav.items.billingHistory' },
      { id: 'payment',         icon: IdCard,     labelKey: 'settings.nav.items.billingDetails' },
    ],
  },
  {
    labelKey: 'settings.nav.groups.data',
    items: [
      { id: 'data_export',   icon: Download, labelKey: 'settings.nav.items.dataExport' },
      { id: 'delete_account', icon: Trash2,   labelKey: 'settings.nav.items.deleteAccount' },
    ],
  },
  {
    labelKey: 'settings.nav.groups.support',
    items: [
      { id: 'faq',        icon: HelpCircle,    labelKey: 'settings.nav.items.faq' },
      { id: 'contact',    icon: MessageCircle, labelKey: 'settings.nav.items.contact' },
      { id: 'report_bug', icon: Bug,           labelKey: 'settings.nav.items.reportBug' },
    ],
  },
];

/* Sunum bileşenleri — modül seviyesinde (render içinde tanımlanırsa input focus kaybeder) */
const SaveBtn: React.FC<{ onClick: () => void; loading: boolean; label: string; disabled?: boolean }> = ({
  onClick, loading, label, disabled = false,
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
  const { t, i18n } = useTranslation();

  const countryLabels = t('settings.countries', { returnObjects: true }) as string[];
  const countryLabel = (c: string) => {
    const idx = PASSPORT_COUNTRIES.indexOf(c);
    return idx >= 0 ? (countryLabels[idx] ?? c) : c;
  };
  const GENDERS: { value: string; key: string }[] = [
    { value: 'Erkek', key: 'male' },
    { value: 'Kadın', key: 'female' },
    { value: 'Diğer', key: 'other' },
    { value: 'Belirtmek istemiyorum', key: 'preferNotToSay' },
  ];
  const deleteConfirmPhrase = t('settings.deleteAccount.confirmPhrase');

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
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<number | null>(null);
  const [plansUsedThisMonth, setPlansUsedThisMonth] = useState(0);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [subscriptionStatusMsg, setSubscriptionStatusMsg] = useState<Status>(null);
  const [checkoutFormHtml, setCheckoutFormHtml] = useState<string | null>(null);
  const [billingHistory, setBillingHistory] = useState<{ id: string; amount: string; currency: string; createdAt: number }[]>([]);

  /* ── FATURA BİLGİLERİ (checkout için iyzico'nun zorunlu kıldığı alanlar) ── */
  const [identityNumber, setIdentityNumber] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingStatus, setBillingStatus] = useState<Status>(null);
  const [billingLoading, setBillingLoading] = useState(false);

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
        setSubscriptionStatus(d.subscriptionStatus ?? null);
        setCurrentPeriodEnd(d.currentPeriodEnd instanceof Timestamp ? d.currentPeriodEnd.toMillis() : null);
        setPlansUsedThisMonth(d.plansUsedThisMonth ?? 0);
        setIdentityNumber(d.identityNumber ?? '');
        setBillingCity(d.billingCity ?? '');
      }
    } catch { /* Auth verisi yüklü */ }
  }, [user]);

  // Pro erişimi isPro TEK BAŞINA yeterli değil — abonelik iptal edilse bile
  // ödenen dönem sonuna kadar erişim sürer (bkz. functions/src/index.ts isProActive()).
  // eslint-disable-next-line react-hooks/purity -- salt görüntüleme kontrolü, milisaniyelik render-arası fark önemsiz
  const currentlyPro = isPro && (currentPeriodEnd === null || Date.now() < currentPeriodEnd);

  /* Fatura geçmişi — sadece kendi ödemeleri (firestore.rules: payments okuma kendi uid'iyle sınırlı) */
  const loadBillingHistory = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'payments'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setBillingHistory(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          amount: data.amount ?? '0',
          currency: data.currency ?? 'TRY',
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
        };
      }));
    } catch { /* sessiz — boş durum gösterilir */ }
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadBillingHistory(); }, [loadBillingHistory]);

  /* Checkout redirect sonucu — subscriptionCallback bizi buraya ?checkout=success|failed ile yönlendirir */
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const checkoutResult = searchParams.get('checkout');
    if (!checkoutResult) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubscriptionStatusMsg(
      checkoutResult === 'success'
        ? { type: 'success', message: t('settings.subscription.checkoutSuccess') }
        : { type: 'error', message: t('settings.subscription.checkoutFailed') }
    );
    if (checkoutResult === 'success') { loadUserData(); loadBillingHistory(); }
    setSearchParams(prev => { prev.delete('checkout'); return prev; }, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
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
      setProfileStatus({ type: 'error', message: t('settings.profile.errors.fileTooLarge') }); return;
    }
    if (!file.type.startsWith('image/')) {
      setProfileStatus({ type: 'error', message: t('settings.profile.errors.invalidFileType') }); return;
    }
    setPhotoLoading(true); setProfileStatus(null);
    try {
      const dataUrl = await resizeToBase64(file, 256);
      // Firestore'a kaydet (Firebase Auth base64 data URL kabul etmiyor)
      await setDoc(doc(db, 'users', user.uid), { photoURL: dataUrl }, { merge: true });
      // Local state + global store güncelle — Sidebar dahil her yer anında görsün
      setLocalPhotoURL(dataUrl);
      setSettings({ photoURL: dataUrl });
      setProfileStatus({ type: 'success', message: t('settings.profile.success.photoUpdated') });
      setTimeout(() => setProfileStatus(null), 3000);
    } catch (err) {
      console.error('Photo upload error:', err);
      setProfileStatus({ type: 'error', message: t('settings.profile.errors.uploadFailed') });
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
      setProfileStatus({ type: 'success', message: t('settings.profile.success.saved') });
      setEditingField(null);
      setTimeout(() => setProfileStatus(null), 3000);
    } catch {
      setProfileStatus({ type: 'error', message: t('settings.common.saveFailed') });
    } finally { setProfileLoading(false); }
  };

  const handleEmailSave = async () => {
    if (!auth.currentUser || !user?.email) return;
    const trimmed = newEmail.trim();
    if (!trimmed) { setEmailStatus({ type: 'error', message: t('settings.email.errors.emptyEmail') }); return; }
    if (trimmed === user.email) { setEmailStatus({ type: 'error', message: t('settings.email.errors.sameEmail') }); return; }
    if (!emailCurrentPassword) { setEmailStatus({ type: 'error', message: t('settings.common.currentPasswordRequired') }); return; }
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
      setEmailStatus({ type: 'success', message: t('settings.email.verificationSent', { email: trimmed }) });
      setNewEmail(''); setEmailCurrentPassword('');
    } catch (err: unknown) {
      setEmailStatus({ type: 'error', message: firebaseErrorMsg(getErrCode(err), t) });
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
        setEmailStatus({ type: 'success', message: t('settings.email.updateSuccess', { email: freshUser.email }) });
      } else {
        setEmailStatus({ type: 'error', message: t('settings.email.notChangedYet') });
      }
    } catch {
      setEmailStatus({ type: 'error', message: t('settings.email.statusCheckFailed') });
    } finally { setReloadLoading(false); }
  };

  const handlePasswordSave = async () => {
    if (!auth.currentUser || !user?.email) return;
    if (!currentPassword) { setPasswordStatus({ type: 'error', message: t('settings.common.currentPasswordRequired') }); return; }
    if (newPassword.length < 6) { setPasswordStatus({ type: 'error', message: t('settings.errors.weakPassword') }); return; }
    if (newPassword === currentPassword) { setPasswordStatus({ type: 'error', message: t('settings.password.errors.sameAsCurrent') }); return; }
    if (newPassword !== confirmPassword) { setPasswordStatus({ type: 'error', message: t('settings.password.errors.mismatch') }); return; }
    setPasswordLoading(true); setPasswordStatus(null);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPassword);
      setPasswordStatus({ type: 'success', message: t('settings.password.success') });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setShowCurrentPw(false); setShowNewPw(false); setShowConfirmPw(false);
    } catch (err: unknown) {
      setPasswordStatus({ type: 'error', message: firebaseErrorMsg(getErrCode(err), t) });
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
      setTravelDefaultsStatus({ type: 'success', message: t('settings.travelDefaults.success') });
    } catch {
      setTravelDefaultsStatus({ type: 'error', message: t('settings.common.saveFailed') });
    } finally { setTravelDefaultsLoading(false); }
  };

  const handlePassportSave = async () => {
    if (!user) return;
    if (passportExpiry) {
      const days = passportDaysLeft(passportExpiry);
      if (days !== null && days < 0) {
        setPassportStatus({ type: 'error', message: t('settings.passport.errors.expired') });
        return;
      }
    }
    setPassportLoading(true); setPassportStatus(null);
    try {
      await setDoc(doc(db, 'users', user.uid), { passportCountry, passportNumber, passportExpiry }, { merge: true });
      setPassportStatus({ type: 'success', message: t('settings.passport.success') });
    } catch {
      setPassportStatus({ type: 'error', message: t('settings.common.saveFailed') });
    } finally { setPassportLoading(false); }
  };

  const handleLocationSave = async () => {
    if (!user) return;
    setLocationLoading(true); setLocationStatus(null);
    try {
      await setDoc(doc(db, 'users', user.uid), { timezone }, { merge: true });
      setLocationStatus({ type: 'success', message: t('settings.locationTz.success') });
    } catch {
      setLocationStatus({ type: 'error', message: t('settings.common.saveFailed') });
    } finally { setLocationLoading(false); }
  };

  const handleAppearanceSave = async () => {
    if (!user) return;
    setAppearanceLoading(true); setAppearanceStatus(null);
    try {
      await setDoc(doc(db, 'users', user.uid), { language, distanceKm, tempCelsius }, { merge: true });
      // Zustand store'u anında güncelle — tüm uygulama etkilenir
      setSettings({ language, distanceKm, tempCelsius });
      setAppearanceStatus({ type: 'success', message: t('settings.units.success') });
    } catch {
      setAppearanceStatus({ type: 'error', message: t('settings.common.saveFailed') });
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
      setNotifStatus({ type: 'success', message: t('settings.notif.success') });
    } catch {
      setNotifStatus({ type: 'error', message: t('settings.common.saveFailed') });
    } finally { setNotifLoading(false); }
  };

  const handlePrivacySave = async () => {
    if (!user) return;
    setPrivacyLoading(true); setPrivacyStatus(null);
    try {
      await setDoc(doc(db, 'users', user.uid), { profilePublic, plansPublic, followPublic, locationEnabled, locationHistory, analyticsEnabled }, { merge: true });
      // Store'u güncelle — Community, Hub anında tepki verir
      setSettings({ profilePublic, plansPublic, followPublic, locationEnabled, locationHistory, analyticsEnabled });
      setPrivacyStatus({ type: 'success', message: t('settings.privacy.success') });
    } catch {
      setPrivacyStatus({ type: 'error', message: t('settings.common.saveFailed') });
    } finally { setPrivacyLoading(false); }
  };

  /* ── Fatura bilgileri (TCKN/şehir) — telefon/adres zaten Profil sekmesinde ── */
  const IDENTITY_NUMBER_RE = /^\d{11}$/;

  const handleBillingSave = async () => {
    if (!user) return;
    if (!IDENTITY_NUMBER_RE.test(identityNumber)) {
      setBillingStatus({ type: 'error', message: t('settings.billingDetails.errors.invalidIdentity') }); return;
    }
    if (!billingCity.trim()) {
      setBillingStatus({ type: 'error', message: t('settings.billingDetails.errors.cityRequired') }); return;
    }
    setBillingLoading(true); setBillingStatus(null);
    try {
      await setDoc(doc(db, 'users', user.uid), { identityNumber, billingCity }, { merge: true });
      setBillingStatus({ type: 'success', message: t('settings.common.saved') });
    } catch {
      setBillingStatus({ type: 'error', message: t('settings.common.saveFailed') });
    } finally { setBillingLoading(false); }
  };

  const billingDetailsComplete = IDENTITY_NUMBER_RE.test(identityNumber) && !!billingCity.trim() && !!phone.trim() && !!address.trim();

  /* ── iyzico checkout ── */
  const handleUpgradeClick = async () => {
    if (!billingDetailsComplete) {
      setActiveSection('payment');
      setSubscriptionStatusMsg({ type: 'error', message: t('settings.subscription.billingDetailsRequired') });
      return;
    }
    setUpgradeLoading(true); setSubscriptionStatusMsg(null);
    try {
      const result = await initiateSubscriptionCheckout({
        identityNumber, phone: `+90${phone}`, address, city: billingCity, country: 'Turkey',
      });
      if (result.paymentPageUrl) {
        window.location.href = result.paymentPageUrl;
      } else if (result.checkoutFormContent) {
        setCheckoutFormHtml(result.checkoutFormContent);
      } else {
        setSubscriptionStatusMsg({ type: 'error', message: t('settings.subscription.checkoutFailed') });
      }
    } catch (e) {
      setSubscriptionStatusMsg({ type: 'error', message: e instanceof Error ? e.message : t('settings.subscription.checkoutFailed') });
    } finally { setUpgradeLoading(false); }
  };

  const handleCancelClick = async () => {
    setCancelLoading(true); setSubscriptionStatusMsg(null);
    try {
      await cancelSubscriptionCall();
      await loadUserData();
      setSubscriptionStatusMsg({ type: 'success', message: t('settings.subscription.cancelSuccess') });
    } catch (e) {
      setSubscriptionStatusMsg({ type: 'error', message: e instanceof Error ? e.message : t('settings.common.saveFailed') });
    } finally { setCancelLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser || !user?.email) return;
    if (deleteConfirm !== deleteConfirmPhrase) { setDeleteStatus({ type: 'error', message: t('settings.deleteAccount.errors.wrongConfirm') }); return; }
    setDeleteLoading(true); setDeleteStatus(null);
    try {
      const cred = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(auth.currentUser);
      navigate('/login');
    } catch (err: unknown) {
      setDeleteStatus({ type: 'error', message: firebaseErrorMsg(getErrCode(err), t) });
    } finally { setDeleteLoading(false); }
  };

  const handleBugReport = async () => {
    if (!bugTitle.trim() || !bugDesc.trim()) { setBugStatus({ type: 'error', message: t('settings.reportBug.errors.required') }); return; }
    setBugLoading(true); setBugStatus(null);
    try {
      if (user) {
        await submitBugReport(bugTitle, bugDesc);
      }
      setBugStatus({ type: 'success', message: t('settings.reportBug.success') });
      setBugTitle(''); setBugDesc('');
    } catch {
      setBugStatus({ type: 'error', message: t('settings.reportBug.errors.sendFailed') });
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
          {t('settings.topbar.back')}
        </button>
        <span className="ml-4 font-heading text-text text-sm">{t('settings.topbar.title')}</span>
      </div>

      <div className="flex flex-1 flex-col sm:flex-row max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-8 gap-6 sm:gap-8">

        {/* ── Left nav ── */}
        <aside className="hidden sm:block w-56 shrink-0 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.labelKey}>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1.5 px-3">
                {t(group.labelKey)}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ id, icon: Icon, labelKey }) => (
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
                    <span className="truncate">{t(labelKey)}</span>
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
                <optgroup key={group.labelKey} label={t(group.labelKey)}>
                  {group.items.map(({ id, labelKey }) => (
                    <option key={id} value={id}>{t(labelKey)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* ══ HESAP — Profil ══ */}
          {activeSection === 'profile' && (() => {
            const fmtBirthDate = (d: string) => {
              if (!d) return null;
              return new Date(d).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
            };
            const EditBtns = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={onSave} disabled={profileLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-heading bg-accent text-white hover:brightness-105 transition-opacity disabled:opacity-40">
                  {profileLoading && <Loader2 size={13} className="animate-spin" />} {t('settings.common.save')}
                </button>
                <button type="button" onClick={onCancel}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-muted border border-divider hover:bg-surface-2 transition-colors">
                  {t('settings.common.cancel')}
                </button>
              </div>
            );
            const genderLabel = (g: string) => {
              const found = GENDERS.find(x => x.value === g);
              return found ? t(`settings.profile.genders.${found.key}`) : g;
            };
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
                        ? <img src={localPhotoURL || user?.photoURL || ''} alt="avatar" className="w-full h-full object-cover" />
                        : (displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U')
                      }
                    </div>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoLoading}
                      className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center disabled:cursor-wait"
                      aria-label={t('settings.profile.changePhotoAria')}
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
                    <h2 className="font-bold text-text text-lg leading-tight truncate">{displayName || t('settings.profile.titleFallback')}</h2>
                    {username && <p className="text-sm text-muted mt-0.5">@{username}</p>}
                    <p className="text-[11px] text-muted mt-1.5">{t('settings.profile.photoHint')}</p>
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
                  <ProfileRow label={t('settings.profile.fields.name')}
                    display={displayName
                      ? <span className="font-semibold text-text">{displayName}</span>
                      : <span className="text-muted">{t('settings.profile.placeholders.name')}</span>}
                    isEditing={editingField === 'displayName'}
                    actionLabel={t('settings.common.edit')}
                    onEdit={() => { setEditingField('displayName'); setProfileStatus(null); }}>
                    <div className="max-w-sm space-y-1">
                      <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className={inputCls()} placeholder={t('settings.profile.inputPlaceholders.name')} />
                      <EditBtns onSave={() => handleFieldSave({ displayName })} onCancel={() => setEditingField(null)} />
                    </div>
                  </ProfileRow>

                  {/* Profil adı */}
                  <ProfileRow label={t('settings.profile.fields.username')}
                    display={username
                      ? <span className="font-medium text-text">@{username}</span>
                      : <span className="text-muted">{t('settings.profile.placeholders.username')}</span>}
                    isEditing={editingField === 'username'}
                    actionLabel={t('settings.common.edit')}
                    onEdit={() => { setEditingField('username'); setProfileStatus(null); }}>
                    <div className="max-w-sm space-y-1">
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">@</span>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))} className={`${inputCls()} pl-8`} placeholder={t('settings.profile.inputPlaceholders.username')} />
                      </div>
                      <EditBtns onSave={() => handleFieldSave({ username })} onCancel={() => setEditingField(null)} />
                    </div>
                  </ProfileRow>

                  {/* Telefon */}
                  <ProfileRow label={t('settings.profile.fields.phone')}
                    display={phone
                      ? <span className="font-medium text-text">🇹🇷 +90 {phone}</span>
                      : <span className="text-muted">{t('settings.profile.placeholders.phone')}</span>}
                    isEditing={editingField === 'phone'}
                    actionLabel={phone ? t('settings.common.edit') : t('settings.common.add')}
                    onEdit={() => { setEditingField('phone'); setProfileStatus(null); }}>
                    <div className="max-w-sm space-y-1">
                      <div className="flex gap-2">
                        <span className="flex items-center px-3.5 rounded-lg border border-divider bg-surface-2 text-sm text-muted shrink-0 whitespace-nowrap">
                          🇹🇷 +90
                        </span>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className={inputCls()} placeholder={t('settings.profile.inputPlaceholders.phone')} />
                      </div>
                      <p className="text-[11px] text-muted">{t('settings.profile.helpers.phone')}</p>
                      <EditBtns onSave={() => handleFieldSave({ phone })} onCancel={() => setEditingField(null)} />
                    </div>
                  </ProfileRow>

                  {/* Doğum tarihi */}
                  <ProfileRow label={t('settings.profile.fields.birthDate')}
                    display={birthDate
                      ? <span className="font-medium text-text">{fmtBirthDate(birthDate)}</span>
                      : <span className="text-muted">{t('settings.profile.placeholders.birthDate')}</span>}
                    isEditing={editingField === 'birthDate'}
                    actionLabel={birthDate ? t('settings.common.edit') : t('settings.common.add')}
                    onEdit={() => { setEditingField('birthDate'); setProfileStatus(null); }}>
                    <div className="max-w-sm space-y-1">
                      <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputCls()}
                        max={new Date().toISOString().split('T')[0]} />
                      <p className="text-[11px] text-muted">{t('settings.profile.helpers.birthDate')}</p>
                      <EditBtns onSave={() => handleFieldSave({ birthDate })} onCancel={() => setEditingField(null)} />
                    </div>
                  </ProfileRow>

                  {/* Uyruk */}
                  <ProfileRow label={t('settings.profile.fields.nationality')}
                    display={<span className="font-medium text-text">{countryLabel(nationality)}</span>}
                    isEditing={editingField === 'nationality'}
                    actionLabel={t('settings.common.edit')}
                    onEdit={() => { setEditingField('nationality'); setProfileStatus(null); }}>
                    <div className="max-w-sm space-y-1">
                      <select value={nationality} onChange={e => setNationality(e.target.value)} className={inputCls()}>
                        {PASSPORT_COUNTRIES.map(c => <option key={c} value={c}>{countryLabel(c)}</option>)}
                      </select>
                      <EditBtns onSave={() => handleFieldSave({ nationality })} onCancel={() => setEditingField(null)} />
                    </div>
                  </ProfileRow>

                  {/* Cinsiyet */}
                  <ProfileRow label={t('settings.profile.fields.gender')}
                    display={gender
                      ? <span className="font-medium text-text">{genderLabel(gender)}</span>
                      : <span className="text-muted">{t('settings.profile.placeholders.gender')}</span>}
                    isEditing={editingField === 'gender'}
                    actionLabel={gender ? t('settings.common.edit') : t('settings.common.add')}
                    onEdit={() => { setEditingField('gender'); setProfileStatus(null); }}>
                    <div className="max-w-sm space-y-1">
                      <div className="grid grid-cols-2 gap-2">
                        {GENDERS.map(({ value, key }) => (
                          <button key={value} type="button" onClick={() => setGender(value)}
                            className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all
                              ${gender === value ? 'border-accent bg-accent-100 text-accent-700' : 'border-divider text-muted hover:border-accent/40'}`}>
                            {t(`settings.profile.genders.${key}`)}
                          </button>
                        ))}
                      </div>
                      <EditBtns onSave={() => handleFieldSave({ gender })} onCancel={() => setEditingField(null)} />
                    </div>
                  </ProfileRow>

                  {/* Adres */}
                  <ProfileRow label={t('settings.profile.fields.address')}
                    display={address
                      ? <span className="font-medium text-text whitespace-pre-line">{address}</span>
                      : <span className="text-muted">{t('settings.profile.placeholders.address')}</span>}
                    isEditing={editingField === 'address'}
                    actionLabel={address ? t('settings.common.edit') : t('settings.common.add')}
                    onEdit={() => { setEditingField('address'); setProfileStatus(null); }}>
                    <div className="max-w-sm space-y-1">
                      <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3}
                        className={`${inputCls()} resize-none`} placeholder={t('settings.profile.inputPlaceholders.address')} />
                      <EditBtns onSave={() => handleFieldSave({ address })} onCancel={() => setEditingField(null)} />
                    </div>
                  </ProfileRow>

                </div>
              </div>
            );
          })()}

          {/* ══ HESAP — E-posta ══ */}
          {activeSection === 'email' && (
            <CardWrap title={t('settings.email.title')}>

              <StatusBanner status={emailStatus} />

              {/* Mevcut e-posta kartı */}
              <div className="flex items-center gap-3 p-4 bg-surface-2 rounded-xl border border-divider mb-5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                  <Mail size={15} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-0.5">{t('settings.email.current')}</p>
                  <p className="font-semibold text-sm text-text truncate">{user?.email}</p>
                </div>
                {user?.emailVerified ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full shrink-0">
                    <Check size={10} strokeWidth={3} /> {t('settings.email.verified')}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full shrink-0">
                    {t('settings.email.notVerified')}
                  </span>
                )}
              </div>

              {/* Bekleyen değişiklik bandı */}
              {pendingEmail && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl mb-5">
                  <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('settings.email.pendingTitle')}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      <span className="font-bold">{pendingEmail}</span> {t('settings.email.pendingDescSuffix')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleReloadEmail}
                    disabled={reloadLoading}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    {reloadLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    {t('settings.email.confirmUpdateBtn')}
                  </button>
                </div>
              )}

              {/* Yeni e-posta formu */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.email.newEmailLabel')}</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => { setNewEmail(e.target.value); setEmailStatus(null); }}
                    className={inputCls()}
                    placeholder={t('settings.email.newEmailPlaceholder')}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.email.currentPasswordLabel')}</label>
                  <input
                    type="password"
                    value={emailCurrentPassword}
                    onChange={e => { setEmailCurrentPassword(e.target.value); setEmailStatus(null); }}
                    className={inputCls()}
                    placeholder={t('settings.common.passwordPlaceholder')}
                    autoComplete="current-password"
                  />
                </div>
                <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl">
                  <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    {t('settings.email.infoNote')}
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <SaveBtn
                  onClick={handleEmailSave}
                  loading={emailLoading}
                  label={t('settings.email.sendVerificationBtn')}
                  disabled={!newEmail.trim() || !emailCurrentPassword || newEmail.trim() === user?.email}
                />
              </div>
            </CardWrap>
          )}

          {/* ══ HESAP — Şifre ══ */}
          {activeSection === 'password' && (() => {
            const strength = getPasswordStrength(newPassword, t);
            const pwMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
            const pwMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
            const passwordTips = t('settings.password.tips', { returnObjects: true }) as string[];
            return (
              <CardWrap title={t('settings.password.title')}>
                <StatusBanner status={passwordStatus} />

                <div className="space-y-4">
                  {/* Mevcut şifre */}
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.password.labels.current')}</label>
                    <div className="relative">
                      <input
                        type={showCurrentPw ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={e => { setCurrentPassword(e.target.value); setPasswordStatus(null); }}
                        className={inputCls() + ' pr-10'}
                        placeholder={t('settings.common.passwordPlaceholder')}
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
                    <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.password.labels.new')}</label>
                    <div className="relative">
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); setPasswordStatus(null); }}
                        className={inputCls() + ' pr-10'}
                        placeholder={t('settings.password.newPlaceholder')}
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
                          {t('settings.password.strengthPrefix')} <span className="font-semibold">{strength.label}</span>
                          <span className="ml-2 text-muted">
                            {strength.score < 3 && t('settings.password.strength.hint')}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Şifre tekrar */}
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.password.labels.confirm')}</label>
                    <div className="relative">
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setPasswordStatus(null); }}
                        className={`${inputCls(pwMismatch)} pr-10`}
                        placeholder={t('settings.common.passwordPlaceholder')}
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
                    {pwMismatch && <p className="text-[11px] text-rose-500 mt-1">{t('settings.password.mismatch')}</p>}
                    {pwMatch   && <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1"><Check size={10} strokeWidth={3} /> {t('settings.password.match')}</p>}
                  </div>

                  {/* İpuçları */}
                  <div className="p-3 bg-surface-2 rounded-xl border border-divider">
                    <p className="text-[11px] font-semibold text-muted mb-1.5">{t('settings.password.tipsTitle')}</p>
                    {[
                      { rule: newPassword.length >= 8,         text: passwordTips[0] },
                      { rule: /[A-Z]/.test(newPassword),        text: passwordTips[1] },
                      { rule: /[0-9]/.test(newPassword),        text: passwordTips[2] },
                      { rule: /[^A-Za-z0-9]/.test(newPassword), text: passwordTips[3] },
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
                    label={t('settings.password.updateBtn')}
                    disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
                  />
                </div>
              </CardWrap>
            );
          })()}

          {/* ══ SEYAHAT — Varsayılan Tercihler ══ */}
          {/* ══ SEYAHAT — Varsayılan Tercihler ══ */}
          {activeSection === 'travel_defaults' && (
            <CardWrap title={t('settings.travelDefaults.title')} subtitle={t('settings.travelDefaults.subtitle')}>
              <StatusBanner status={travelDefaultsStatus} />
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.travelDefaults.labels.budget')}</label>
                    <input
                      type="number" min="100"
                      value={defaultBudget}
                      onChange={e => setDefaultBudget(e.target.value)}
                      className={inputCls(Number(defaultBudget) < 100)}
                      placeholder="15000"
                    />
                    {Number(defaultBudget) < 100 && Number(defaultBudget) > 0 && (
                      <p className="text-[11px] text-rose-500 mt-1">{t('settings.travelDefaults.errors.minBudget')}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.travelDefaults.labels.currency')}</label>
                    <select value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value)} className={inputCls()}>
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.travelDefaults.labels.peopleCount')}</label>
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
                    <span className="text-xs text-muted">{t('settings.travelDefaults.peopleUnit')}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-2">{t('settings.travelDefaults.labels.pace')}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: '🛋️', subKey: 'rahat', val: 'rahat' },
                      { label: '🚶', subKey: 'normal', val: 'normal' },
                      { label: '🏃', subKey: 'aktif', val: 'aktif' },
                      { label: '🧭', subKey: 'esnek', val: 'esnek' },
                    ].map(({ label, subKey, val }) => (
                      <button key={val} type="button" onClick={() => setDefaultPace(val)}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-center transition-all
                          ${defaultPace === val
                            ? 'border-accent bg-accent-100'
                            : 'border-divider bg-surface-2 hover:border-accent/40'}`}
                      >
                        <span className="text-xl">{label}</span>
                        <span className={`text-[11px] font-semibold ${defaultPace === val ? 'text-accent' : 'text-muted'}`}>{t(`settings.travelDefaults.pace.${subKey}`)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl">
                  <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    {t('settings.travelDefaults.infoNote')}
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <SaveBtn onClick={handleTravelDefaultsSave} loading={travelDefaultsLoading} label={t('settings.travelDefaults.saveBtn')} />
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
              <CardWrap title={t('settings.passport.title')} subtitle={t('settings.passport.subtitle')}>
                <StatusBanner status={passportStatus} />

                {/* Süre uyarı bandı */}
                {isExpired && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl mb-4">
                    <AlertCircle size={15} className="text-rose-500 shrink-0" />
                    <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{t('settings.passport.expired')}</p>
                  </div>
                )}
                {isWarning && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl mb-4">
                    <AlertCircle size={15} className="text-amber-500 shrink-0" />
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                      {t('settings.passport.expiringPrefix')} <span className="font-black">{t('settings.passport.daysCount', { count: daysLeft })}</span> {t('settings.passport.expiringSuffix')}
                    </p>
                  </div>
                )}
                {isOk && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl mb-4">
                    <Check size={15} className="text-emerald-500 shrink-0" strokeWidth={3} />
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      {t('settings.passport.validPrefix')} <span className="font-semibold">{t('settings.passport.daysCount', { count: daysLeft })}</span> {t('settings.passport.validSuffix')}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.passport.labels.country')}</label>
                    <select value={passportCountry} onChange={e => setPassportCountry(e.target.value)} className={inputCls()}>
                      {PASSPORT_COUNTRIES.map(c => <option key={c} value={c}>{countryLabel(c)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">
                      {t('settings.passport.labels.number')} <span className="text-muted font-normal">{t('settings.passport.labels.optional')}</span>
                    </label>
                    <input
                      type="text"
                      value={passportNumber}
                      onChange={e => setPassportNumber(e.target.value.toUpperCase())}
                      className={inputCls()}
                      placeholder={t('settings.passport.numberPlaceholder')}
                      maxLength={20}
                    />
                    <p className="text-[11px] text-muted mt-1">{t('settings.passport.numberHelper')}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.passport.labels.expiry')}</label>
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
                  <SaveBtn onClick={handlePassportSave} loading={passportLoading} label={t('settings.passport.saveBtn')} disabled={isExpired} />
                </div>
              </CardWrap>
            );
          })()}

          {/* ══ SEYAHAT — Konum & Saat Dilimi ══ */}
          {activeSection === 'location_tz' && (
            <CardWrap title={t('settings.locationTz.title')}>
              <StatusBanner status={locationStatus} />
              <div className="space-y-4">

                {/* Otomatik algıla */}
                <div className="flex items-center justify-between p-4 bg-surface-2 rounded-xl border border-divider">
                  <div>
                    <p className="text-sm font-semibold text-text">{t('settings.locationTz.autoDetect.title')}</p>
                    <p className="text-xs text-muted mt-0.5">{t('settings.locationTz.autoDetect.desc')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const detected = detectTimezone();
                      setTimezone(detected);
                      setLocationStatus({ type: 'success', message: t('settings.locationTz.detectedMsg', { tz: detected }) });
                    }}
                    className="px-3.5 py-2 rounded-full bg-accent-100 text-accent-700 text-xs font-bold hover:bg-accent-200 transition-colors"
                  >
                    {t('settings.locationTz.autoDetect.btn')}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.locationTz.label')}</label>
                  <select value={timezone} onChange={e => setTimezone(e.target.value)} className={inputCls()}>
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                  <p className="text-[11px] text-muted mt-1">
                    {t('settings.locationTz.currentPrefix')} <span className="font-semibold text-muted">{timezone.split(' ')[0]}</span>
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <SaveBtn onClick={handleLocationSave} loading={locationLoading} label={t('settings.common.save')} />
              </div>
            </CardWrap>
          )}

          {/* ══ GÖRÜNÜM — Dil ══ */}
          {activeSection === 'language_currency' && (
            <CardWrap title={t('settings.language.title')} subtitle={t('settings.language.subtitle')}>
              <StatusBanner status={appearanceStatus} />
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.language.label')}</label>
                <select
                  value={language}
                  onChange={e => {
                    const newLang = e.target.value;
                    setLanguage(newLang);
                    setSettings({ language: newLang });
                    if (user) {
                      setDoc(doc(db, 'users', user.uid), { language: newLang }, { merge: true }).catch(() => {});
                    }
                    setAppearanceStatus({ type: 'success', message: t('settings.language.saved') });
                    setTimeout(() => setAppearanceStatus(null), 3000);
                  }}
                  className={inputCls()}
                >
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </CardWrap>
          )}

          {/* ══ GÖRÜNÜM — Ölçü Birimleri ══ */}
          {activeSection === 'units' && (
            <CardWrap title={t('settings.units.title')} subtitle={t('settings.units.subtitle')}>
              <StatusBanner status={appearanceStatus} />
              <div className="space-y-6">

                {/* Mesafe */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">{t('settings.units.distance.label')}</label>
                  <SegmentedControl
                    options={[{ label: t('settings.units.distance.km'), val: true }, { label: t('settings.units.distance.mi'), val: false }]}
                    value={distanceKm}
                    onChange={setDistanceKm}
                  />
                  <p className="text-[11px] text-muted mt-1.5">
                    {t('settings.units.currentPrefix')} <span className="font-semibold text-muted">{distanceKm ? t('settings.units.distance.currentKm') : t('settings.units.distance.currentMi')}</span>
                  </p>
                </div>

                {/* Sıcaklık */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">{t('settings.units.temp.label')}</label>
                  <SegmentedControl
                    options={[{ label: t('settings.units.temp.celsius'), val: true }, { label: t('settings.units.temp.fahrenheit'), val: false }]}
                    value={tempCelsius}
                    onChange={setTempCelsius}
                  />
                  <p className="text-[11px] text-muted mt-1.5">
                    {t('settings.units.currentPrefix')} <span className="font-semibold text-muted">{tempCelsius ? t('settings.units.temp.currentCelsius') : t('settings.units.temp.currentFahrenheit')}</span>
                  </p>
                </div>

                {/* Önizleme */}
                <div className="p-3.5 bg-surface-2 rounded-xl border border-divider">
                  <p className="text-[11px] font-semibold text-muted mb-2">{t('settings.units.previewTitle')}</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-text font-medium">📍 {t('settings.units.previewDistance')} <strong>{distanceKm ? '2.4 km' : '1.5 mi'}</strong></span>
                    <span className="text-text font-medium">🌡️ {t('settings.units.previewWeather')} <strong>{tempCelsius ? '24°C' : '75°F'}</strong></span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <SaveBtn onClick={handleAppearanceSave} loading={appearanceLoading} label={t('settings.units.saveBtn')} />
              </div>
            </CardWrap>
          )}

          {/* ══ BİLDİRİMLER — Uygulama ══ */}
          {activeSection === 'app_notif' && (
            <CardWrap title={t('settings.appNotif.title')} subtitle={t('settings.appNotif.subtitle')}>
              <StatusBanner status={notifStatus} />
              <SettingRow title={t('settings.appNotif.rows.planUpdates.title')} desc={t('settings.appNotif.rows.planUpdates.desc')}><Toggle value={appPlanNotif} onChange={setAppPlanNotif} /></SettingRow>
              <SettingRow title={t('settings.appNotif.rows.community.title')} desc={t('settings.appNotif.rows.community.desc')}><Toggle value={appCommunityNotif} onChange={setAppCommunityNotif} /></SettingRow>
              <SettingRow title={t('settings.appNotif.rows.appUpdates.title')} desc={t('settings.appNotif.rows.appUpdates.desc')}><Toggle value={appUpdateNotif} onChange={setAppUpdateNotif} /></SettingRow>
              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <SaveBtn onClick={handleNotifSave} loading={notifLoading} label={t('settings.common.save')} />
              </div>
            </CardWrap>
          )}

          {/* ══ BİLDİRİMLER — E-posta ══ */}
          {activeSection === 'email_notif' && (
            <CardWrap title={t('settings.emailNotif.title')}>
              <StatusBanner status={notifStatus} />
              <SettingRow title={t('settings.emailNotif.rows.plan.title')} desc={t('settings.emailNotif.rows.plan.desc')}><Toggle value={emailPlanNotif} onChange={setEmailPlanNotif} /></SettingRow>
              <SettingRow title={t('settings.emailNotif.rows.weeklyDigest.title')} desc={t('settings.emailNotif.rows.weeklyDigest.desc')}><Toggle value={emailWeeklyDigest} onChange={setEmailWeeklyDigest} /></SettingRow>
              <SettingRow title={t('settings.emailNotif.rows.promo.title')} desc={t('settings.emailNotif.rows.promo.desc')}><Toggle value={emailPromoNotif} onChange={setEmailPromoNotif} /></SettingRow>
              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <SaveBtn onClick={handleNotifSave} loading={notifLoading} label={t('settings.common.save')} />
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
                new Notification(t('settings.pushNotif.testNotifTitle'), {
                  body: t('settings.pushNotif.testNotifBody'),
                  icon: '/favicon.ico',
                });
              } else {
                setSettings({ pushPermission: result as 'denied' | 'default' });
              }
            };

            return (
              <CardWrap title={t('settings.pushNotif.title')} subtitle={t('settings.pushNotif.subtitle')}>
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
                      {isGranted ? t('settings.pushNotif.status.granted.title')
                      : isDenied ? t('settings.pushNotif.status.denied.title')
                      : !browserSupported ? t('settings.pushNotif.status.unsupported.title')
                      : t('settings.pushNotif.status.pending.title')}
                    </p>
                    <p className={`text-xs mt-0.5
                      ${isGranted ? 'text-emerald-700 dark:text-emerald-400'
                      : isDenied  ? 'text-rose-600 dark:text-rose-400'
                      : 'text-amber-700 dark:text-amber-400'}`}>
                      {isGranted ? t('settings.pushNotif.status.granted.desc')
                      : isDenied ? t('settings.pushNotif.status.denied.desc')
                      : !browserSupported ? t('settings.pushNotif.status.unsupported.desc')
                      : t('settings.pushNotif.status.pending.desc')}
                    </p>
                  </div>
                  {!isGranted && !isDenied && browserSupported && (
                    <button
                      type="button"
                      onClick={requestPermission}
                      className="shrink-0 px-3.5 py-2 rounded-full bg-accent text-white text-xs font-bold hover:brightness-105 transition-colors shadow-sm"
                    >
                      {t('settings.pushNotif.grantBtn')}
                    </button>
                  )}
                </div>

                <SettingRow title={t('settings.pushNotif.rows.push.title')} desc={t('settings.pushNotif.rows.push.desc')}>
                  <Toggle
                    value={pushEnabled}
                    onChange={(v) => {
                      if (v && !isGranted) { requestPermission(); return; }
                      setPushEnabled(v);
                    }}
                  />
                </SettingRow>
                <SettingRow title={t('settings.pushNotif.rows.sound.title')} desc={t('settings.pushNotif.rows.sound.desc')}>
                  <Toggle value={pushSoundEnabled} onChange={setPushSoundEnabled} />
                </SettingRow>

                <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                  <SaveBtn onClick={handleNotifSave} loading={notifLoading} label={t('settings.common.save')} disabled={!browserSupported} />
                </div>
              </CardWrap>
            );
          })()}

          {/* ══ GİZLİLİK — Profil & Plan ══ */}
          {activeSection === 'privacy_profile' && (
            <CardWrap title={t('settings.privacyProfile.title')} subtitle={t('settings.privacyProfile.subtitle')}>
              <StatusBanner status={privacyStatus} />

              {/* Genel durum özeti */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { label: t('settings.privacyProfile.summary.profile.label'), active: profilePublic, on: t('settings.privacyProfile.summary.profile.on'), off: t('settings.privacyProfile.summary.profile.off') },
                  { label: t('settings.privacyProfile.summary.plans.label'), active: plansPublic,   on: t('settings.privacyProfile.summary.plans.on'), off: t('settings.privacyProfile.summary.plans.off') },
                  { label: t('settings.privacyProfile.summary.follow.label'), active: followPublic,  on: t('settings.privacyProfile.summary.follow.on'), off: t('settings.privacyProfile.summary.follow.off') },
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
                    <p className="text-sm font-semibold text-text">{t('settings.privacyProfile.publicProfile.title')}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {profilePublic
                        ? t('settings.privacyProfile.publicProfile.on')
                        : t('settings.privacyProfile.publicProfile.off')}
                    </p>
                  </div>
                  <Toggle value={profilePublic} onChange={setProfilePublic} />
                </div>
              </div>

              {/* Planlar */}
              <div className="border border-divider rounded-xl overflow-hidden mb-3">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text">{t('settings.privacyProfile.publicPlans.title')}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {plansPublic
                        ? t('settings.privacyProfile.publicPlans.on')
                        : t('settings.privacyProfile.publicPlans.off')}
                    </p>
                  </div>
                  <Toggle value={plansPublic} onChange={setPlansPublic} />
                </div>
                {!plansPublic && (
                  <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-100 dark:border-amber-900">
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      {t('settings.privacyProfile.publicPlans.warning')}
                    </p>
                  </div>
                )}
              </div>

              {/* Takip */}
              <div className="border border-divider rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text">{t('settings.privacyProfile.publicFollow.title')}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {followPublic
                        ? t('settings.privacyProfile.publicFollow.on')
                        : t('settings.privacyProfile.publicFollow.off')}
                    </p>
                  </div>
                  <Toggle value={followPublic} onChange={setFollowPublic} />
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <SaveBtn onClick={handlePrivacySave} loading={privacyLoading} label={t('settings.common.saveAndApply')} />
              </div>
            </CardWrap>
          )}

          {/* ══ GİZLİLİK — Lokasyon ══ */}
          {activeSection === 'privacy_location' && (
            <CardWrap title={t('settings.privacyLocation.title')} subtitle={t('settings.privacyLocation.subtitle')}>
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
                        {geoSupported ? t('settings.privacyLocation.geoStatus.supported.title') : t('settings.privacyLocation.geoStatus.unsupported.title')}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {geoSupported
                          ? t('settings.privacyLocation.geoStatus.supported.desc')
                          : t('settings.privacyLocation.geoStatus.unsupported.desc')}
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3">
                <div className="border border-divider rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-text">{t('settings.privacyLocation.suggestions.title')}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {locationEnabled
                          ? t('settings.privacyLocation.suggestions.on')
                          : t('settings.privacyLocation.suggestions.off')}
                      </p>
                    </div>
                    <Toggle value={locationEnabled} onChange={setLocationEnabled} />
                  </div>
                </div>

                <div className="border border-divider rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-text">{t('settings.privacyLocation.history.title')}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {locationHistory
                          ? t('settings.privacyLocation.history.on')
                          : t('settings.privacyLocation.history.off')}
                      </p>
                    </div>
                    <Toggle value={locationHistory} onChange={setLocationHistory} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <SaveBtn onClick={handlePrivacySave} loading={privacyLoading} label={t('settings.common.saveAndApply')} />
              </div>
            </CardWrap>
          )}

          {/* ══ GİZLİLİK — Veri Kullanımı ══ */}
          {activeSection === 'privacy_data' && (
            <CardWrap title={t('settings.privacyData.title')} subtitle={t('settings.privacyData.subtitle')}>
              <StatusBanner status={privacyStatus} />

              <div className="border border-divider rounded-xl overflow-hidden mb-4">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text">{t('settings.privacyData.analytics.title')}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {analyticsEnabled
                        ? t('settings.privacyData.analytics.on')
                        : t('settings.privacyData.analytics.off')}
                    </p>
                  </div>
                  <Toggle value={analyticsEnabled} onChange={setAnalyticsEnabled} />
                </div>
              </div>

              {/* Veri özeti */}
              <div className="rounded-xl border border-divider overflow-hidden mb-4">
                <div className="px-4 py-3 bg-surface-2 border-b border-divider">
                  <p className="text-xs font-bold text-muted uppercase tracking-widest">{t('settings.privacyData.storedDataHeader')}</p>
                </div>
                {(t('settings.privacyData.items', { returnObjects: true }) as { label: string; desc: string }[]).map((item, i) => {
                  const icon = ['👤', '✈️', '⚙️', '📍'][i];
                  return (
                    <div key={item.label} className="flex items-center gap-3 px-4 py-3 border-b border-divider last:border-0">
                      <span className="text-base w-7 shrink-0">{icon}</span>
                      <div>
                        <p className="text-sm font-medium text-text">{item.label}</p>
                        <p className="text-[11px] text-muted">{item.desc}</p>
                      </div>
                      <span className="ml-auto text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">{t('settings.privacyData.encryptedBadge')}</span>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  🔐 {t('settings.privacyData.kvkkPrefix')} <strong>{t('settings.privacyData.kvkkDataSection')}</strong> {t('settings.privacyData.kvkkSuffix')}
                </p>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <SaveBtn onClick={handlePrivacySave} loading={privacyLoading} label={t('settings.common.saveAndApply')} />
              </div>
            </CardWrap>
          )}

          {/* ══ FATURALAMA — Abonelik ══ */}
          {activeSection === 'subscription' && (() => {
            const FREE_LIMIT = 3;
            const usagePct = Math.min(100, (plansUsedThisMonth / FREE_LIMIT) * 100);
            const barColor = usagePct >= 100 ? 'bg-rose-500' : usagePct >= 67 ? 'bg-amber-400' : 'bg-emerald-500';
            return (
              <CardWrap title={t('settings.subscription.title')} subtitle={t('settings.subscription.subtitle')}>
                <StatusBanner status={subscriptionStatusMsg} />

                {/* Mevcut plan kartı */}
                <div className={`rounded-xl border p-5 mb-5 ${currentlyPro
                  ? 'bg-gradient-to-br from-sage-200 to-sage-200 border-sage/30'
                  : 'bg-surface-2 border-divider'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-text text-base">
                        {currentlyPro ? `✨ ${t('settings.subscription.proPlanName')}` : t('settings.subscription.freePlanName')}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {currentlyPro ? t('settings.subscription.proDesc') : t('settings.subscription.freeDesc')}
                      </p>
                      {currentlyPro && subscriptionStatus === 'cancelling' && currentPeriodEnd && (
                        <p className="text-[11px] text-amber-600 font-semibold mt-1">
                          {t('settings.subscription.cancellingUntil', { date: new Date(currentPeriodEnd).toLocaleDateString('tr-TR') })}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${currentlyPro
                      ? 'bg-sage text-white'
                      : 'bg-divider text-muted'}`}>
                      {currentlyPro ? t('settings.subscription.proBadge') : t('settings.subscription.freeBadge')}
                    </span>
                  </div>

                  {/* Aylık kullanım metresi — sadece Free'de */}
                  {!currentlyPro && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-muted">{t('settings.subscription.usageLabel')}</p>
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
                          {t('settings.subscription.limitReached')}
                        </p>
                      )}
                      {usagePct >= 67 && usagePct < 100 && (
                        <p className="text-[11px] text-amber-500 font-semibold mt-1.5">
                          {t('settings.subscription.remainingPlans', { count: FREE_LIMIT - plansUsedThisMonth })}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Özellik karşılaştırması */}
                <div className="rounded-xl border border-divider overflow-hidden mb-5">
                  <div className="grid grid-cols-3 bg-surface-2 border-b border-divider">
                    <div className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-widest text-muted">{t('settings.subscription.compare.headers.feature')}</div>
                    <div className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-widest text-muted text-center">{t('settings.subscription.compare.headers.free')}</div>
                    <div className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-widest text-sage-700 text-center">{t('settings.subscription.compare.headers.pro')}</div>
                  </div>
                  {(t('settings.subscription.compare.rows', { returnObjects: true }) as { label: string; free: string; pro: string }[]).map(({ label, free, pro }) => (
                    <div key={label} className="grid grid-cols-3 border-b border-divider last:border-0">
                      <div className="px-4 py-3 text-xs font-medium text-muted">{label}</div>
                      <div className="px-4 py-3 text-xs text-muted text-center">{free}</div>
                      <div className="px-4 py-3 text-xs font-semibold text-sage-700 text-center">{pro}</div>
                    </div>
                  ))}
                </div>

                {/* Upgrade CTA — sadece Free kullanıcılara */}
                {!currentlyPro && (
                  <div className="relative bg-gradient-to-br from-sage to-sage-700 rounded-2xl p-5 overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-32 h-32 bg-accent/25 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative flex items-center justify-between gap-4">
                      <div>
                        <span className="inline-block px-2 py-0.5 bg-accent text-white text-[9px] font-black uppercase tracking-widest rounded-full mb-2">{t('settings.subscription.cta.badge')}</span>
                        <p className="text-white font-bold text-sm mb-0.5">{t('settings.subscription.cta.title')}</p>
                        <p className="text-blue-100 text-xs">{t('settings.subscription.cta.desc')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleUpgradeClick}
                        disabled={upgradeLoading || !PRO_CHECKOUT_ENABLED}
                        className="shrink-0 px-5 py-2.5 bg-white text-sage-700 font-bold text-sm rounded-full hover:bg-slate-50 transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                      >
                        {upgradeLoading && <Loader2 size={14} className="animate-spin" />}
                        {PRO_CHECKOUT_ENABLED ? t('settings.subscription.cta.btn') : t('settings.common.comingSoon')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Pro iptal */}
                {currentlyPro && subscriptionStatus !== 'cancelling' && (
                  <div className="p-4 rounded-xl bg-surface-2 border border-divider flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text">{t('settings.subscription.cancel.title')}</p>
                      <p className="text-xs text-muted mt-0.5">{t('settings.subscription.cancel.desc')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelClick}
                      disabled={cancelLoading}
                      className="px-3.5 py-2 text-xs font-bold text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-60 inline-flex items-center gap-2"
                    >
                      {cancelLoading && <Loader2 size={12} className="animate-spin" />}
                      {t('settings.subscription.cancel.btn')}
                    </button>
                  </div>
                )}
              </CardWrap>
            );
          })()}

          {/* ══ FATURALAMA — Fatura Geçmişi ══ */}
          {activeSection === 'billing_history' && (
            <CardWrap title={t('settings.billingHistory.title')} subtitle={t('settings.billingHistory.subtitle')}>
              {currentlyPro || billingHistory.length > 0 ? (
                <div className="rounded-xl border border-divider overflow-hidden">
                  <div className="grid grid-cols-4 bg-surface-2 border-b border-divider px-4 py-2.5">
                    {(t('settings.billingHistory.headers', { returnObjects: true }) as string[]).map(h => (
                      <p key={h} className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{h}</p>
                    ))}
                  </div>
                  {billingHistory.length === 0 ? (
                    <div className="py-10 text-center">
                      <Receipt size={32} className="mx-auto text-divider mb-2" />
                      <p className="text-sm text-muted font-medium">{t('settings.billingHistory.emptyPro.title')}</p>
                      <p className="text-xs text-muted mt-1">{t('settings.billingHistory.emptyPro.desc')}</p>
                    </div>
                  ) : (
                    billingHistory.map(row => (
                      <div key={row.id} className="grid grid-cols-4 px-4 py-3 border-b border-divider last:border-0 text-xs">
                        <p className="text-text font-medium">{new Date(row.createdAt).toLocaleDateString('tr-TR')}</p>
                        <p className="text-muted">{t('settings.subscription.proPlanName')}</p>
                        <p className="text-text font-semibold">₺{row.amount}</p>
                        <p className="text-emerald-600 font-semibold">{t('settings.billingHistory.paid')}</p>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Free kullanıcı */
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                    <Receipt size={28} className="text-muted" />
                  </div>
                  <p className="text-sm font-semibold text-muted mb-1">{t('settings.billingHistory.emptyFree.title')}</p>
                  <p className="text-xs text-muted max-w-xs leading-relaxed">
                    {t('settings.billingHistory.emptyFree.desc')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveSection('subscription')}
                    className="mt-5 px-5 py-2.5 bg-sage text-white text-sm font-bold rounded-full hover:brightness-105 transition-colors"
                  >
                    {t('settings.billingHistory.emptyFree.btn')}
                  </button>
                </div>
              )}
            </CardWrap>
          )}

          {/* ══ FATURALAMA — Fatura Bilgileri ══ */}
          {activeSection === 'payment' && (
            <CardWrap title={t('settings.billingDetails.title')} subtitle={t('settings.billingDetails.subtitle')}>
              <StatusBanner status={billingStatus} />

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl flex items-start gap-2 mb-4">
                <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  {t('settings.billingDetails.info')}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.billingDetails.labels.identityNumber')}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={identityNumber}
                    onChange={e => setIdentityNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className={inputCls()}
                    placeholder={t('settings.billingDetails.placeholders.identityNumber')}
                    maxLength={11}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.billingDetails.labels.city')}</label>
                  <input
                    type="text"
                    value={billingCity}
                    onChange={e => setBillingCity(e.target.value)}
                    className={inputCls()}
                    placeholder={t('settings.billingDetails.placeholders.city')}
                  />
                </div>

                {(!phone.trim() || !address.trim()) && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-xl flex items-start gap-2">
                    <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                      {t('settings.billingDetails.phoneAddressMissing')}
                    </p>
                  </div>
                )}

                <div className="flex justify-end pt-3 border-t border-divider">
                  <SaveBtn onClick={handleBillingSave} loading={billingLoading} label={t('settings.common.save')} />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 text-[11px] text-muted">
                <span>🔐</span>
                <span>{t('settings.billingDetails.securityNote')}</span>
              </div>
            </CardWrap>
          )}

          {/* ══ VERİLERİM — Veri İndir ══ */}
          {activeSection === 'data_export' && (
            <CardWrap title={t('settings.dataExport.title')} subtitle={t('settings.dataExport.subtitle')}>
              <div className="space-y-3">
                {(t('settings.dataExport.items', { returnObjects: true }) as { label: string; desc: string }[]).map(({ label, desc }) => (
                  <div key={label} className="flex items-center justify-between p-3.5 rounded-xl border border-divider">
                    <div>
                      <p className="text-sm font-medium text-text">{label}</p>
                      <p className="text-xs text-muted mt-0.5">{desc}</p>
                    </div>
                    <ComingSoonBadge label={t('settings.common.comingSoon')} />
                  </div>
                ))}
              </div>
              <div className="mt-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900">
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  {t('settings.dataExport.note')}
                </p>
              </div>
              <div className="flex justify-end mt-4">
                <button type="button" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-heading bg-accent text-white hover:brightness-105 transition-opacity">
                  <Download size={14} /> {t('settings.dataExport.downloadAllBtn')}
                </button>
              </div>
            </CardWrap>
          )}

          {/* ══ VERİLERİM — Hesabı Sil ══ */}
          {activeSection === 'delete_account' && (
            <CardWrap title={t('settings.deleteAccount.title')}>
              <StatusBanner status={deleteStatus} />
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 mb-5">
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300 mb-1">{t('settings.deleteAccount.warning.title')}</p>
                <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
                  {t('settings.deleteAccount.warning.desc')}
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    {t('settings.deleteAccount.confirmLabelPrefix')} <span className="font-bold text-text">{deleteConfirmPhrase}</span> {t('settings.deleteAccount.confirmLabelSuffix')}
                  </label>
                  <input
                    type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                    className={inputCls()} placeholder={deleteConfirmPhrase}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.deleteAccount.passwordLabel')}</label>
                  <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} className={inputCls()} placeholder={t('settings.common.passwordPlaceholder')} />
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-divider">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirm !== deleteConfirmPhrase || !deletePassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {t('settings.deleteAccount.deleteBtn')}
                </button>
              </div>
            </CardWrap>
          )}

          {/* ══ DESTEK — SSS ══ */}
          {activeSection === 'faq' && (
            <CardWrap title={t('settings.faq.title')}>
              <div className="space-y-3">
                {(t('settings.faq.items', { returnObjects: true }) as { q: string; a: string }[]).map(({ q, a }) => (
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
            <CardWrap title={t('settings.contact.title')} subtitle={t('settings.contact.subtitle')}>
              <StatusBanner status={contactStatus} />
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.contact.labels.subject')}</label>
                  <input type="text" className={inputCls()} placeholder={t('settings.contact.placeholders.subject')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.contact.labels.message')}</label>
                  <textarea
                    value={contactMsg} onChange={e => setContactMsg(e.target.value)}
                    rows={5} className={`${inputCls()} resize-none`}
                    placeholder={t('settings.contact.placeholders.message')}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center mt-6 pt-5 border-t border-divider">
                <p className="text-xs text-muted">{t('settings.contact.footerNote')}</p>
                <button
                  type="button"
                  onClick={() => { setContactStatus({ type: 'success', message: t('settings.contact.success') }); setContactMsg(''); }}
                  disabled={!contactMsg.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-accent hover:brightness-105 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('settings.contact.sendBtn')}
                </button>
              </div>
            </CardWrap>
          )}

          {/* ══ DESTEK — Hata Bildir ══ */}
          {activeSection === 'report_bug' && (
            <CardWrap title={t('settings.reportBug.title')} subtitle={t('settings.reportBug.subtitle')}>
              <StatusBanner status={bugStatus} />
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.reportBug.labels.title')}</label>
                  <input type="text" value={bugTitle} onChange={e => setBugTitle(e.target.value)} className={inputCls()} placeholder={t('settings.reportBug.placeholders.title')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">{t('settings.reportBug.labels.description')}</label>
                  <textarea
                    value={bugDesc} onChange={e => setBugDesc(e.target.value)}
                    rows={5} className={`${inputCls()} resize-none`}
                    placeholder={t('settings.reportBug.placeholders.description')}
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
                  {t('settings.reportBug.sendBtn')}
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
              {t('settings.common.logout')}
            </button>
          </div>

        </div>
      </div>

      {checkoutFormHtml && (
        <IyzicoCheckoutModal
          formContent={checkoutFormHtml}
          onClose={() => setCheckoutFormHtml(null)}
        />
      )}
    </div>
  );
};

export default Settings;
