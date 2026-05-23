import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import {
  User, Mail, Bell, Lock, CreditCard,
  Camera, ChevronRight, Check, AlertCircle, Loader2,
  type LucideIcon,
} from 'lucide-react';

type Section = 'profile' | 'email' | 'notifications' | 'password' | 'subscription';
type Status = { type: 'success' | 'error'; message: string } | null;

const LANGUAGES = ['Türkçe', 'English', 'Français', 'Español', 'Deutsch'];
const CURRENCIES = ['TRY — ₺', 'USD — $', 'EUR — €', 'GBP — £', 'JPY — ¥'];

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

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-[#f8981d]' : 'bg-slate-200'}`}
  >
    <span
      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`}
    />
  </button>
);

const StatusBanner: React.FC<{ status: Status }> = ({ status }) => {
  if (!status) return null;
  const isSuccess = status.type === 'success';
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm mb-5 ${isSuccess ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
      {isSuccess ? <Check size={14} /> : <AlertCircle size={14} />}
      {status.message}
    </div>
  );
};

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [activeSection, setActiveSection] = useState<Section>('profile');

  /* ── Profile ── */
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(
    (user?.displayName ?? '').toLowerCase().replace(/\s+/g, '') || ''
  );
  const [bio, setBio] = useState('');
  const [language, setLanguage] = useState('Türkçe');
  const [currency, setCurrency] = useState('TRY — ₺');
  const [distanceKm, setDistanceKm] = useState(true);
  const [tempCelsius, setTempCelsius] = useState(true);
  const [followPublic, setFollowPublic] = useState(true);
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  /* ── Email ── */
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [emailStatus, setEmailStatus] = useState<Status>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  /* ── Password ── */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  /* ── Notifications ── */
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [notifStatus, setNotifStatus] = useState<Status>(null);
  const [notifLoading, setNotifLoading] = useState(false);

  /* Load user data from Firestore */
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
        setEmailNotif(d.emailNotif ?? true);
        setPushNotif(d.pushNotif ?? false);
        setWeeklyDigest(d.weeklyDigest ?? true);
      } else {
        setDisplayName(user.displayName ?? '');
      }
    } catch {
      // Firestore bağlantı hatası — Auth verisi zaten yüklü
    }
  }, [user]);

  useEffect(() => { loadUserData(); }, [loadUserData]);

  /* ── Handlers ── */

  const handleProfileSave = async () => {
    if (!auth.currentUser || !user) return;
    setProfileLoading(true);
    setProfileStatus(null);
    try {
      await updateProfile(auth.currentUser, { displayName });
      await setDoc(doc(db, 'users', user.uid), {
        displayName,
        username,
        bio,
        language,
        currency,
        distanceKm,
        tempCelsius,
        followPublic,
      }, { merge: true });
      setProfileStatus({ type: 'success', message: 'Profil başarıyla güncellendi.' });
    } catch (err: any) {
      setProfileStatus({ type: 'error', message: firebaseErrorMsg(err.code) });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleEmailSave = async () => {
    if (!auth.currentUser || !user?.email) return;
    if (!newEmail.trim()) { setEmailStatus({ type: 'error', message: 'Yeni e-posta boş olamaz.' }); return; }
    setEmailLoading(true);
    setEmailStatus(null);
    try {
      const credential = EmailAuthProvider.credential(user.email, emailCurrentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await verifyBeforeUpdateEmail(auth.currentUser, newEmail.trim());
      setEmailStatus({ type: 'success', message: `${newEmail} adresine doğrulama e-postası gönderildi. Onayladıktan sonra değişecek.` });
      setNewEmail('');
      setEmailCurrentPassword('');
    } catch (err: any) {
      setEmailStatus({ type: 'error', message: firebaseErrorMsg(err.code) });
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!auth.currentUser || !user?.email) return;
    if (newPassword !== confirmPassword) { setPasswordStatus({ type: 'error', message: 'Yeni şifreler eşleşmiyor.' }); return; }
    if (newPassword.length < 6) { setPasswordStatus({ type: 'error', message: 'Şifre en az 6 karakter olmalı.' }); return; }
    setPasswordLoading(true);
    setPasswordStatus(null);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setPasswordStatus({ type: 'success', message: 'Şifreniz başarıyla güncellendi.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordStatus({ type: 'error', message: firebaseErrorMsg(err.code) });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNotifSave = async () => {
    if (!user) return;
    setNotifLoading(true);
    setNotifStatus(null);
    try {
      await setDoc(doc(db, 'users', user.uid), { emailNotif, pushNotif, weeklyDigest }, { merge: true });
      setNotifStatus({ type: 'success', message: 'Bildirim ayarları kaydedildi.' });
    } catch {
      setNotifStatus({ type: 'error', message: 'Kaydedilemedi, lütfen tekrar deneyin.' });
    } finally {
      setNotifLoading(false);
    }
  };

  /* ── Nav items ── */
  const navItems: { id: Section; icon: LucideIcon; label: string; group: string }[] = [
    { id: 'profile',       icon: User,       label: 'Profil',      group: 'Hesap' },
    { id: 'email',         icon: Mail,       label: 'E-posta',     group: 'Hesap' },
    { id: 'notifications', icon: Bell,       label: 'Bildirimler', group: 'Hesap' },
    { id: 'password',      icon: Lock,       label: 'Şifre',       group: 'Hesap' },
    { id: 'subscription',  icon: CreditCard, label: 'Abonelik',    group: 'Faturalama' },
  ];

  const inputCls = (err = false) =>
    `w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all
    ${err
      ? 'border-rose-200 bg-rose-50/20 focus:border-rose-300 focus:ring-2 focus:ring-rose-200/30'
      : 'border-slate-200 bg-white focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10'
    }`;

  const SaveBtn: React.FC<{ onClick: () => void; loading: boolean; label?: string; disabled?: boolean }> = ({
    onClick, loading, label = 'Kaydet', disabled = false,
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all bg-[#f8981d] hover:bg-[#e08518] text-white shadow-md shadow-[#f8981d]/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Top bar */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center px-6 shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5"
        >
          <ChevronRight size={14} className="rotate-180" />
          Geri
        </button>
        <span className="ml-4 font-semibold text-slate-900 text-sm">Ayarlar</span>
      </div>

      <div className="flex flex-1 max-w-5xl mx-auto w-full px-6 py-8 gap-8">

        {/* Left nav */}
        <aside className="w-52 shrink-0">
          {['Hesap', 'Faturalama'].map((group) => (
            <div key={group} className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-3">
                {group}
              </p>
              <div className="space-y-0.5">
                {navItems.filter(n => n.group === group).map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveSection(id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
                      ${activeSection === id
                        ? 'bg-[#f8981d]/10 text-[#f8981d] font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 font-medium'
                      }`}
                  >
                    <Icon size={15} className="shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* ══ PROFILE ══ */}
          {activeSection === 'profile' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 text-lg mb-5">Profil Bilgileri</h2>
              <StatusBanner status={profileStatus} />

              {/* Avatar */}
              <div className="flex items-center gap-5 mb-7">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#187fe7] to-[#f8981d] flex items-center justify-center text-white text-2xl font-black">
                    {displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <button type="button" className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">
                    <Camera size={13} className="text-slate-600" />
                  </button>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Profil fotoğrafı</p>
                  <p className="text-xs text-slate-500 mt-0.5">PNG, JPG — maks. 2 MB</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Ad Soyad</label>
                    <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className={inputCls()} placeholder="Adınız Soyadınız" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Kullanıcı Adı</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        className={`${inputCls()} pl-8`}
                        placeholder="kullaniciadi"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">E-posta</label>
                  <input type="email" value={user?.email ?? ''} readOnly className="w-full px-3.5 py-2.5 rounded-lg border border-slate-100 bg-slate-50 text-sm text-slate-400 cursor-not-allowed outline-none" />
                  <p className="text-[11px] text-slate-400 mt-1">E-posta değiştirmek için "E-posta" bölümünü kullanın.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Hakkımda</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={160} className={`${inputCls()} resize-none`} placeholder="Kendinizden biraz bahsedin..." />
                  <p className="text-[11px] text-slate-400 mt-1 text-right">{bio.length}/160</p>
                </div>

                {/* Preferences */}
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-700 mb-4">Tercihler</p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Dil</label>
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

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-2">Mesafe</label>
                        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
                          {[{ label: 'km', val: true }, { label: 'mil', val: false }].map(({ label, val }) => (
                            <button key={label} type="button" onClick={() => setDistanceKm(val)}
                              className={`flex-1 py-2 transition-colors ${distanceKm === val ? 'bg-[#f8981d] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                            >{label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-2">Sıcaklık</label>
                        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
                          {[{ label: '°C', val: true }, { label: '°F', val: false }].map(({ label, val }) => (
                            <button key={label} type="button" onClick={() => setTempCelsius(val)}
                              className={`flex-1 py-2 transition-colors ${tempCelsius === val ? 'bg-[#f8981d] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                            >{label}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Sizi kim takip edebilir?</p>
                        <p className="text-xs text-slate-400 mt-0.5">Takip isteklerini yönetin</p>
                      </div>
                      <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
                        {[{ label: 'Herkes', val: true }, { label: 'Onaylı', val: false }].map(({ label, val }) => (
                          <button key={label} type="button" onClick={() => setFollowPublic(val)}
                            className={`px-3 py-1.5 transition-colors ${followPublic === val ? 'bg-[#f8981d] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                          >{label}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100">
                <SaveBtn onClick={handleProfileSave} loading={profileLoading} label="Değişiklikleri Kaydet" />
              </div>
            </div>
          )}

          {/* ══ EMAIL ══ */}
          {activeSection === 'email' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 text-lg mb-5">E-posta Adresi</h2>
              <StatusBanner status={emailStatus} />

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Mevcut E-posta</label>
                  <input type="email" value={user?.email ?? ''} readOnly className="w-full px-3.5 py-2.5 rounded-lg border border-slate-100 bg-slate-50 text-sm text-slate-400 cursor-not-allowed outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Yeni E-posta</label>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className={inputCls()} placeholder="yeni@eposta.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Mevcut Şifre (doğrulama için)</label>
                  <input type="password" value={emailCurrentPassword} onChange={e => setEmailCurrentPassword(e.target.value)} className={inputCls()} placeholder="••••••••" />
                </div>
                <p className="text-xs text-slate-400">Yeni adrese bir doğrulama e-postası gönderilecek. Onayladıktan sonra değişecek.</p>
              </div>

              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100">
                <SaveBtn
                  onClick={handleEmailSave}
                  loading={emailLoading}
                  label="Doğrulama Gönder"
                  disabled={!newEmail || !emailCurrentPassword}
                />
              </div>
            </div>
          )}

          {/* ══ NOTIFICATIONS ══ */}
          {activeSection === 'notifications' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 text-lg mb-5">Bildirim Ayarları</h2>
              <StatusBanner status={notifStatus} />

              <div className="space-y-1">
                {[
                  { label: 'E-posta bildirimleri', desc: 'Plan güncellemeleri ve önemli duyurular', value: emailNotif, set: setEmailNotif },
                  { label: 'Push bildirimleri', desc: 'Tarayıcı ve mobil bildirimler', value: pushNotif, set: setPushNotif },
                  { label: 'Haftalık özet', desc: 'Her Pazartesi seyahat önerileri', value: weeklyDigest, set: setWeeklyDigest },
                ].map(({ label, desc, value, set }) => (
                  <div key={label} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </div>
                    <Toggle value={value} onChange={set} />
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100">
                <SaveBtn onClick={handleNotifSave} loading={notifLoading} label="Kaydet" />
              </div>
            </div>
          )}

          {/* ══ PASSWORD ══ */}
          {activeSection === 'password' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 text-lg mb-5">Şifre Değiştir</h2>
              <StatusBanner status={passwordStatus} />

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Mevcut Şifre</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputCls()} placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Yeni Şifre</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls()} placeholder="En az 6 karakter" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Yeni Şifre (tekrar)</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={inputCls(!!confirmPassword && confirmPassword !== newPassword)}
                    placeholder="••••••••"
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-[11px] text-rose-500 mt-1">Şifreler eşleşmiyor</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100">
                <SaveBtn
                  onClick={handlePasswordSave}
                  loading={passwordLoading}
                  label="Şifreyi Güncelle"
                  disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
                />
              </div>
            </div>
          )}

          {/* ══ SUBSCRIPTION ══ */}
          {activeSection === 'subscription' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 text-lg mb-6">Abonelik</h2>
              <div className="rounded-xl border border-slate-200 p-5 mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800 text-sm">Ücretsiz Plan</span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">Aktif</span>
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
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
