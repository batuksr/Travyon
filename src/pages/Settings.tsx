import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
  User, Mail, Bell, Lock, CreditCard,
  Camera, ChevronRight, Check,
} from 'lucide-react';

type Section = 'profile' | 'email' | 'notifications' | 'password' | 'subscription';

const LANGUAGES = ['Türkçe', 'English', 'Français', 'Español', 'Deutsch', 'Italiano'];
const CURRENCIES = ['TRY — ₺', 'USD — $', 'EUR — €', 'GBP — £', 'JPY — ¥'];

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [activeSection, setActiveSection] = useState<Section>('profile');

  /* Profile state */
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(
    (user?.displayName ?? '').toLowerCase().replace(/\s+/g, '') || 'kullanici'
  );
  const [bio, setBio] = useState('');

  /* Preferences */
  const [language, setLanguage] = useState('Türkçe');
  const [currency, setCurrency] = useState('TRY — ₺');
  const [distanceKm, setDistanceKm] = useState(true);
  const [tempCelsius, setTempCelsius] = useState(true);
  const [followPublic, setFollowPublic] = useState(true);

  /* Email / password / notification states */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const navItems: { id: Section; icon: React.ElementType; label: string; group: string }[] = [
    { id: 'profile',      icon: User,       label: 'Profil',        group: 'Hesap' },
    { id: 'email',        icon: Mail,       label: 'E-posta',       group: 'Hesap' },
    { id: 'notifications',icon: Bell,       label: 'Bildirimler',   group: 'Hesap' },
    { id: 'password',     icon: Lock,       label: 'Şifre',         group: 'Hesap' },
    { id: 'subscription', icon: CreditCard, label: 'Abonelik',      group: 'Faturalama' },
  ];

  const groups = ['Hesap', 'Faturalama'];

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
          {groups.map((group) => (
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

          {/* ---- PROFILE ---- */}
          {activeSection === 'profile' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 text-lg mb-6">Profil Bilgileri</h2>

              {/* Avatar */}
              <div className="flex items-center gap-5 mb-8">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#187fe7] to-[#f8981d] flex items-center justify-center text-white text-2xl font-black">
                    {displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <button
                    type="button"
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors"
                  >
                    <Camera size={13} className="text-slate-600" />
                  </button>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Profil fotoğrafı</p>
                  <p className="text-xs text-slate-500 mt-0.5">PNG, JPG veya GIF — maks. 2 MB</p>
                  <button type="button" className="mt-2 text-xs font-semibold text-[#f8981d] hover:text-[#e08518] transition-colors">
                    Fotoğraf yükle
                  </button>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Ad Soyad</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 transition-all"
                      placeholder="Adınız Soyadınız"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Kullanıcı Adı</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 transition-all"
                        placeholder="kullaniciadi"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">E-posta</label>
                  <input
                    type="email"
                    value={user?.email ?? ''}
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-100 bg-slate-50 text-sm text-slate-400 cursor-not-allowed outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">E-posta adresi değiştirilemez.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Hakkımda</label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={3}
                    maxLength={160}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 transition-all resize-none"
                    placeholder="Kendinizden biraz bahsedin..."
                  />
                  <p className="text-[11px] text-slate-400 mt-1 text-right">{bio.length}/160</p>
                </div>

                {/* Preferences */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-700 mb-4">Tercihler</p>
                  <div className="space-y-4">

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Dil</label>
                        <select
                          value={language}
                          onChange={e => setLanguage(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 transition-all bg-white"
                        >
                          {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Para Birimi</label>
                        <select
                          value={currency}
                          onChange={e => setCurrency(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 transition-all bg-white"
                        >
                          {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-2">Mesafe</label>
                        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => setDistanceKm(true)}
                            className={`flex-1 py-2 transition-colors ${distanceKm ? 'bg-[#f8981d] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                          >
                            km
                          </button>
                          <button
                            type="button"
                            onClick={() => setDistanceKm(false)}
                            className={`flex-1 py-2 transition-colors ${!distanceKm ? 'bg-[#f8981d] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                          >
                            mil
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-2">Sıcaklık</label>
                        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => setTempCelsius(true)}
                            className={`flex-1 py-2 transition-colors ${tempCelsius ? 'bg-[#f8981d] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                          >
                            °C
                          </button>
                          <button
                            type="button"
                            onClick={() => setTempCelsius(false)}
                            className={`flex-1 py-2 transition-colors ${!tempCelsius ? 'bg-[#f8981d] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                          >
                            °F
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Sizi kim takip edebilir?</p>
                        <p className="text-xs text-slate-400 mt-0.5">Takip isteklerini yönetin</p>
                      </div>
                      <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setFollowPublic(true)}
                          className={`px-3 py-1.5 transition-colors ${followPublic ? 'bg-[#f8981d] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                          Herkes
                        </button>
                        <button
                          type="button"
                          onClick={() => setFollowPublic(false)}
                          className={`px-3 py-1.5 transition-colors ${!followPublic ? 'bg-[#f8981d] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                          Onaylı
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSave}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                    ${saved
                      ? 'bg-green-500 text-white'
                      : 'bg-[#f8981d] hover:bg-[#e08518] text-white shadow-md shadow-[#f8981d]/25'
                    }`}
                >
                  {saved ? <><Check size={14} /> Kaydedildi</> : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </div>
          )}

          {/* ---- EMAIL ---- */}
          {activeSection === 'email' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 text-lg mb-6">E-posta Adresi</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Mevcut E-posta</label>
                  <input
                    type="email"
                    value={user?.email ?? ''}
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-100 bg-slate-50 text-sm text-slate-400 cursor-not-allowed outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Yeni E-posta</label>
                  <input
                    type="email"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 transition-all"
                    placeholder="yeni@eposta.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Mevcut Şifre (doğrulama)</label>
                  <input
                    type="password"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSave}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                    ${saved ? 'bg-green-500 text-white' : 'bg-[#f8981d] hover:bg-[#e08518] text-white shadow-md shadow-[#f8981d]/25'}`}
                >
                  {saved ? <><Check size={14} /> Kaydedildi</> : 'E-postayı Güncelle'}
                </button>
              </div>
            </div>
          )}

          {/* ---- NOTIFICATIONS ---- */}
          {activeSection === 'notifications' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 text-lg mb-6">Bildirim Ayarları</h2>
              <div className="space-y-4">
                {[
                  { label: 'E-posta bildirimleri', desc: 'Plan güncellemeleri ve önemli duyurular', value: emailNotif, set: setEmailNotif },
                  { label: 'Push bildirimleri', desc: 'Tarayıcı ve mobil bildirimler', value: pushNotif, set: setPushNotif },
                  { label: 'Haftalık özet', desc: 'Her Pazartesi seyahat önerileri', value: weeklyDigest, set: setWeeklyDigest },
                ].map(({ label, desc, value, set }) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => set(!value)}
                      className={`relative w-10 h-5.5 rounded-full transition-colors ${value ? 'bg-[#f8981d]' : 'bg-slate-200'}`}
                      style={{ height: 22, width: 40 }}
                    >
                      <span
                        className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`}
                        style={{ width: 18, height: 18, top: 2, left: value ? 18 : 2 }}
                      />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSave}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                    ${saved ? 'bg-green-500 text-white' : 'bg-[#f8981d] hover:bg-[#e08518] text-white shadow-md shadow-[#f8981d]/25'}`}
                >
                  {saved ? <><Check size={14} /> Kaydedildi</> : 'Kaydet'}
                </button>
              </div>
            </div>
          )}

          {/* ---- PASSWORD ---- */}
          {activeSection === 'password' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 text-lg mb-6">Şifre Değiştir</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Mevcut Şifre</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Yeni Şifre</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 transition-all"
                    placeholder="En az 8 karakter"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Yeni Şifre (tekrar)</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 transition-all
                      ${confirmPassword && confirmPassword !== newPassword
                        ? 'border-rose-200 bg-rose-50/20 focus:border-rose-300 focus:ring-rose-200/30'
                        : 'border-slate-200 focus:border-[#f8981d] focus:ring-[#f8981d]/10'
                      }`}
                    placeholder="••••••••"
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-[11px] text-rose-500 mt-1">Şifreler eşleşmiyor</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all bg-[#f8981d] hover:bg-[#e08518] text-white shadow-md shadow-[#f8981d]/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  Şifreyi Güncelle
                </button>
              </div>
            </div>
          )}

          {/* ---- SUBSCRIPTION ---- */}
          {activeSection === 'subscription' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 text-lg mb-6">Abonelik</h2>
              <div className="rounded-xl border border-slate-200 p-5 mb-5">
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
                  <button
                    type="button"
                    className="px-5 py-2 bg-white text-[#187fe7] font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors"
                  >
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
