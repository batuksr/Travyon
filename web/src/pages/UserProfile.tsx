import AppIcon from '../components/AppIcon';
import TravelerProfileCard from '../components/TravelerProfileCard';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { useAppSettingsStore } from '../store/useAppSettingsStore';
import {
  getPublicPlansByUser, followUser, unfollowUser, getFollowingList,
  getPublicUserProfile,
  type PublicPlan,
} from '../services/socialService';
import {
  ArrowLeft, Globe, Users, Loader2, EyeOff,
} from 'lucide-react';
import { relativeTime } from '../utils/timeUtils';

interface ProfileData {
  uid: string;
  displayName: string;
  photoURL: string | null;
  email?: string;
  createdAt?: string;
}

const UserProfile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const localeCode = i18n.language === 'en' ? 'en-US' : 'tr-TR';
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
  const [profilePrivate, setProfilePrivate]   = useState(false);

  const isOwnProfile = uid === user?.uid;

  const loadProfile = useCallback(async () => {
    if (!uid) return;
    setLoading(true);

    // Başlangıç: minimal profil — hiçbir şey bulunamazsa bile gösterilir
    let profileData: ProfileData = { uid, displayName: t('userProfile.defaultName'), photoURL: null };

    try {
      // 1) Kendi profilimizse store + auth'tan al
      if (isOwnProfile) {
        profileData = {
          uid,
          displayName: user?.displayName || t('userProfile.defaultName'),
          photoURL:    storePhotoURL || user?.photoURL || null,
          email:       user?.email ?? undefined,
        };
      } else {
        const publicProfile = await getPublicUserProfile(uid);
        if (!publicProfile.exists) { setProfile(null); return; }
        if (!publicProfile.isPublic) {
          setProfilePrivate(true);
          setPlans([]);
          setProfile({ uid, displayName: t('userProfile.defaultName'), photoURL: null });
          return;
        }
        setProfilePrivate(false);
        profileData = {
          uid,
          displayName: publicProfile.displayName || t('userProfile.defaultName'),
          photoURL: publicProfile.photoURL ?? null,
        };
      }

      // 3) Paylaşılan planlar
      const userPlans = await getPublicPlansByUser(uid, 100);
      setPlans(userPlans);

      // 4) publicPlans'tan profil bilgisini zenginleştir (isim/foto eksikse)
      if (!isOwnProfile && userPlans.length > 0) {
        if (profileData.displayName === t('userProfile.defaultName') || !profileData.photoURL) {
          const planData = userPlans[0];
          if (profileData.displayName === t('userProfile.defaultName')) profileData.displayName = planData.userDisplayName;
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
      if (import.meta.env.DEV) console.error(e);
      // Hata olsa bile minimal profili göster
      setProfile(profileData);
    } finally {
      setLoading(false);
    }
  }, [uid, user, isOwnProfile, storePhotoURL, t]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <Loader2 size={28} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg gap-3">
        <p className="text-muted">{t('userProfile.notFound')}</p>
        <button onClick={() => navigate(-1)} className="text-sm font-heading text-accent">← {t('userProfile.backToPrevious')}</button>
      </div>
    );
  }

  if (profilePrivate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg gap-3 px-6 text-center">
        <EyeOff size={32} className="text-muted" aria-hidden="true" />
        <p className="font-heading text-xl text-text">{t('userProfile.privateTitle')}</p>
        <p className="text-sm text-muted">{t('userProfile.privateDescription')}</p>
        <button onClick={() => navigate(-1)} className="text-sm font-heading text-accent">← {t('userProfile.backToPrevious')}</button>
      </div>
    );
  }

  const totalDays = plans.reduce((sum, p) => sum + p.dailyPlanCount, 0);
  const destinations = [...new Set(plans.map(p => p.destination.split(',')[0].trim()))];

  return (
    <>
    <div className="min-h-screen bg-bg">

      {/* ── Üst Bar ── */}
      <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur border-b border-divider">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label={t('userProfile.backToPrevious')}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-2 transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={2.5} className="text-text" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-heading text-text truncate">{profile.displayName}</p>
            <p className="text-[11px] text-muted">{t('userProfile.sharedPlansCount', { count: plans.length })}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">

        {/* ── Profil Kartı ── */}
        <TravelerProfileCard
          displayName={profile.displayName}
          photoURL={profile.photoURL}
          planCount={plans.length}
          totalDays={totalDays}
          destinations={destinations}
        >
          {/* Takip butonu */}
          {!isOwnProfile && (
            <div>
              {unfollowConfirm ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-full text-xs text-[#d5dcc7]">{t('userProfile.unfollowConfirm')}</span>
                  <button
                    onClick={handleToggleFollow}
                    disabled={followLoading}
                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50"
                  >
                    {followLoading ? <Loader2 size={12} className="animate-spin" /> : t('userProfile.yes')}
                  </button>
                  <button
                    onClick={() => setUnfollowConfirm(false)}
                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-surface-2 text-muted hover:bg-divider transition-all"
                  >
                    {t('userProfile.cancel')}
                  </button>
                </div>
              ) : isFollowing ? (
                <button
                  onClick={() => setUnfollowConfirm(true)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-surface-2 text-text font-heading text-sm hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  <Users size={14} strokeWidth={2.5} /> {t('userProfile.following')}
                </button>
              ) : (
                <button
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-accent text-white font-heading text-sm hover:brightness-105 transition-all disabled:opacity-50 shadow-[0_10px_22px_rgba(198,113,57,0.28)]"
                >
                  {followLoading ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} strokeWidth={2.5} />}
                  {t('userProfile.follow')}
                </button>
              )}
            </div>
          )}
        </TravelerProfileCard>

        {/* ── Planlar ── */}
        <div>
          <p className="text-xs font-heading text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Globe size={12} strokeWidth={2.5} className="text-sage-700" /> {t('userProfile.sharedPlans')}
          </p>

          {plans.length === 0 ? (
            <div className="bg-surface border border-dashed border-divider rounded-3xl p-10 text-center">
              <p className="mb-2 text-sage-700"><AppIcon name="map" size={32} /></p>
              <p className="text-sm font-heading text-text">{t('userProfile.noSharedPlans')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plans.map(plan => {
                const purposeLabel = t(`userProfile.purposes.${plan.tripPurpose}`, { defaultValue: plan.tripPurpose });
                const avgDisplay = plan.ratingCount > 0 ? plan.avgRating.toFixed(1) : null;
                return (
                  <div
                    key={plan.id}
                    onClick={() => navigate(`/plan/${plan.id}`)}
                    className="bg-surface border border-divider rounded-3xl p-4 cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <p className="text-sm font-bold text-text">
                            {plan.destination.split(',')[0]}
                          </p>
                          {purposeLabel && (
                            <span className="text-[9px] font-bold bg-surface-2 text-muted px-1.5 py-0.5 rounded-full">
                              {purposeLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted">
                          {t('userProfile.daysCount', { count: plan.dailyPlanCount })} · {plan.currencySymbol}{plan.budget.toLocaleString(localeCode)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted">{relativeTime(plan.createdAt, localeCode)}</p>
                        {avgDisplay && (
                          <p className="text-xs font-bold text-amber-500 mt-0.5"><AppIcon name="star" /> {avgDisplay}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-accent font-semibold mt-2">{t('userProfile.viewPlan')} →</p>
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
