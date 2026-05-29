import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useAppSettingsStore } from '../store/useAppSettingsStore';
import {
  getPublicFeed, followUser, unfollowUser, getFollowingList,
  type PublicPlan,
} from '../services/socialService';
import {
  ArrowLeft, MapPin, Calendar, Globe, Users, Loader2,
} from 'lucide-react';
import { relativeTime } from '../utils/timeUtils';

interface ProfileData {
  uid: string;
  displayName: string;
  photoURL: string | null;
  email?: string;
  createdAt?: string;
}

const PURPOSE_LABELS: Record<string, string> = {
  culture:   'Kültür',
  relax:     'Dinlenme',
  nightlife: 'Gece Hayatı',
  nature:    'Macera',
};

const UserProfile: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { photoURL: storePhotoURL } = useAppSettingsStore();

  const [profile, setProfile]           = useState<ProfileData | null>(null);
  const [plans, setPlans]               = useState<PublicPlan[]>([]);
  const [loading, setLoading]           = useState(true);
  const [isFollowing, setIsFollowing]   = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [unfollowConfirm, setUnfollowConfirm] = useState(false);

  const isOwnProfile = uid === user?.uid;

  const loadProfile = useCallback(async () => {
    if (!uid) return;
    setLoading(true);

    // Başlangıç: minimal profil — hiçbir şey bulunamazsa bile gösterilir
    let profileData: ProfileData = { uid, displayName: 'Gezgin', photoURL: null };

    try {
      // 1) Kendi profilimizse store + auth'tan al
      if (isOwnProfile) {
        profileData = {
          uid,
          displayName: user?.displayName || 'Gezgin',
          photoURL:    storePhotoURL || user?.photoURL || null,
          email:       user?.email ?? undefined,
        };
      } else {
        // 2) Başka kullanıcı: users/ koleksiyonunu dene
        try {
          const userSnap = await getDoc(doc(db, 'users', uid));
          if (userSnap.exists()) {
            const d = userSnap.data();
            profileData = {
              uid,
              displayName: (d.displayName as string) || 'Gezgin',
              photoURL:    (d.photoURL    as string | null) ?? null,
              email:       (d.email       as string | undefined),
              createdAt:   (d.createdAt   as string | undefined),
            };
          }
        } catch { /* Firestore rules izin vermeyebilir — publicPlans'tan alacağız */ }
      }

      // 3) Paylaşılan planlar
      const allPlans = await getPublicFeed(100);
      const userPlans = allPlans.filter(p => p.userId === uid);
      setPlans(userPlans);

      // 4) publicPlans'tan profil bilgisini zenginleştir (isim/foto eksikse)
      if (!isOwnProfile && userPlans.length > 0) {
        if (profileData.displayName === 'Gezgin' || !profileData.photoURL) {
          const planData = userPlans[0];
          if (profileData.displayName === 'Gezgin') profileData.displayName = planData.userDisplayName;
          if (!profileData.photoURL)               profileData.photoURL    = planData.userPhotoURL;
        }
      }

      setProfile(profileData);

      // 5) Takip durumu
      if (user && !isOwnProfile) {
        const following = await getFollowingList(user.uid);
        setIsFollowing(following.includes(uid));
      }
    } catch (e) {
      console.error(e);
      // Hata olsa bile minimal profili göster
      setProfile(profileData);
    } finally {
      setLoading(false);
    }
  }, [uid, user, isOwnProfile, storePhotoURL]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleToggleFollow = async () => {
    if (!user || !uid || isOwnProfile) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(user.uid, uid);
        setIsFollowing(false);
        setUnfollowConfirm(false);
      } else {
        await followUser(user.uid, uid);
        setIsFollowing(true);
      }
    } catch { /* hata */ }
    finally { setFollowLoading(false); }
  };

  /* ── Sayfa sınırları dışındaki durumlar ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f5f0e8] dark:bg-slate-900">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f0e8] dark:bg-slate-900 gap-3">
        <p className="text-slate-500">Kullanıcı bulunamadı.</p>
        <button onClick={() => navigate(-1)} className="text-sm font-semibold text-[#187fe7]">← Geri dön</button>
      </div>
    );
  }

  const initials = profile.displayName.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
  const totalDays = plans.reduce((sum, p) => sum + p.dailyPlanCount, 0);
  const destinations = [...new Set(plans.map(p => p.destination.split(',')[0].trim()))];

  return (
    <>
    <div className="min-h-screen bg-[#f5f0e8] dark:bg-slate-900">

      {/* ── Üst Bar ── */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={18} className="text-slate-600 dark:text-slate-300" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{profile.displayName}</p>
            <p className="text-[11px] text-slate-400">{plans.length} paylaşılan plan</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">

        {/* ── Profil Kartı ── */}
        <div className="pt-8 pb-6 flex flex-col items-center text-center">

          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#187fe7] to-[#f8981d] flex items-center justify-center overflow-hidden mb-4 ring-4 ring-white dark:ring-slate-800 shadow-lg">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-white text-2xl font-black">{initials}</span>
            )}
          </div>

          {/* İsim */}
          <h1 className="text-xl font-black text-slate-900 dark:text-white">{profile.displayName}</h1>
          {profile.email && (
            <p className="text-sm text-slate-400 mt-0.5">{profile.email}</p>
          )}
          {profile.createdAt && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Calendar size={11} />
              {new Date(profile.createdAt).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} tarihinde katıldı
            </p>
          )}

          {/* Takip butonu */}
          {!isOwnProfile && (
            <div className="mt-4">
              {unfollowConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Takibi bırak?</span>
                  <button
                    onClick={handleToggleFollow}
                    disabled={followLoading}
                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50"
                  >
                    {followLoading ? <Loader2 size={12} className="animate-spin" /> : 'Evet'}
                  </button>
                  <button
                    onClick={() => setUnfollowConfirm(false)}
                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
                  >
                    İptal
                  </button>
                </div>
              ) : isFollowing ? (
                <button
                  onClick={() => setUnfollowConfirm(true)}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-slate-100 text-slate-600 font-bold text-sm hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  <Users size={14} /> Takip Ediliyor
                </button>
              ) : (
                <button
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#187fe7] text-white font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
                >
                  {followLoading ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                  Takip Et
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── İstatistikler ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-[#187fe7]">{plans.length}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Paylaşılan Plan</p>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-[#f8981d]">{totalDays}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Toplam Gün</p>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-500">{destinations.length}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Farklı Şehir</p>
          </div>
        </div>

        {/* ── Ziyaret edilen şehirler ── */}
        {destinations.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MapPin size={12} className="text-[#f8981d]" /> Gezilen Yerler
            </p>
            <div className="flex flex-wrap gap-2">
              {destinations.map(dest => (
                <span key={dest} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-600 dark:text-slate-300">
                  <Globe size={11} className="text-[#187fe7]" /> {dest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Planlar ── */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Globe size={12} className="text-[#187fe7]" /> Paylaşılan Planlar
          </p>

          {plans.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center">
              <p className="text-2xl mb-2">🗺️</p>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Henüz paylaşılan plan yok</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plans.map(plan => {
                const purposeLabel = PURPOSE_LABELS[plan.tripPurpose] ?? plan.tripPurpose;
                const avgDisplay = plan.ratingCount > 0 ? plan.avgRating.toFixed(1) : null;
                return (
                  <div
                    key={plan.id}
                    onClick={() => navigate(`/plan/${plan.id}`)}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <p className="text-sm font-bold text-slate-800 dark:text-white">
                            {plan.destination.split(',')[0]}
                          </p>
                          {purposeLabel && (
                            <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                              {purposeLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {plan.dailyPlanCount} gün · {plan.currencySymbol}{plan.budget.toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-slate-400">{relativeTime(plan.createdAt)}</p>
                        {avgDisplay && (
                          <p className="text-xs font-bold text-amber-500 mt-0.5">★ {avgDisplay}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-[#187fe7] font-semibold mt-2">Planı gör →</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>


    </>
  );
};

export default UserProfile;
