import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useUserPlans } from '../store/useSavedPlansStore';
import { useAppSettingsStore } from '../store/useAppSettingsStore';
import {
  Users, Search, X as XIcon, ChevronDown, ChevronUp, Loader2, Globe,
} from 'lucide-react';
import {
  getPublicFeed, getMySharedPlanIds, getFollowingList,
  shareplan, unshareplan, ratePlan, getUserRatings,
  followUser, unfollowUser, getUserProfiles,
  type PublicPlan, type UserProfile,
} from '../services/socialService';
import { PublicPlanCard } from '../components/PublicPlanCard';
import { isEmailVerified, resendVerification } from '../utils/authUtils';

const FEED_INITIAL = 3;

const Community: React.FC = () => {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const plans     = useUserPlans();
  const { plansPublic, profilePublic, followPublic, photoURL: storePhotoURL } = useAppSettingsStore();

  // Her zaman güncel fotoğraf: store (Firestore'dan) > Firebase Auth
  const currentUserPhoto = storePhotoURL || user?.photoURL || null;

  /* ── Social state ── */
  const [publicFeed, setPublicFeed]       = useState<PublicPlan[]>([]);
  const [feedLoading, setFeedLoading]     = useState(false);
  const [feedError, setFeedError]         = useState(false);
  const [shareError, setShareError]       = useState<string | null>(null);
  const [feedTab, setFeedTab]             = useState<'all' | 'following' | 'top'>('all');
  const [followingSet, setFollowingSet]   = useState<Set<string>>(new Set());
  const [sharedPlanIds, setSharedPlanIds] = useState<Set<string>>(new Set());
  const [userRatings, setUserRatings]     = useState<Record<string, number>>({});
  const [followingProfiles, setFollowingProfiles]     = useState<UserProfile[]>([]);
  const [profilesLoading, setProfilesLoading]         = useState(false);
  const [unfollowConfirm, setUnfollowConfirm]         = useState<string | null>(null); // uid
  const [savingShare, setSavingShare]              = useState<string | null>(null);
  const [savingRating, setSavingRating]   = useState<string | null>(null);
  const [feedSearch, setFeedSearch]       = useState('');
  const [feedShowAll, setFeedShowAll]     = useState(false);

  /* Timeout yardımcısı */
  const withTimeout = <T,>(p: Promise<T>, ms = 5000): Promise<T> =>
    Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  const loadFeed = useCallback(() => {
    if (!user) return;
    setFeedLoading(true);
    setFeedError(false);
    withTimeout(
      Promise.all([
        getPublicFeed(50),
        getFollowingList(user.uid),
        getMySharedPlanIds(user.uid),
      ]),
    )
    .then(async ([feed, following, shared]) => {
      setPublicFeed(feed);
      setFollowingSet(new Set(following));
      setSharedPlanIds(shared);
      const planIds = feed.map(p => p.id);
      if (planIds.length) {
        getUserRatings(user.uid, planIds).then(setUserRatings).catch(() => {});
      }
      // Eski paylaşımlardaki isim/fotoğrafı arka planda güncelle
      const latestPhoto = useAppSettingsStore.getState().photoURL || user.photoURL || null;
      const latestName  = user.displayName ?? 'Gezgin';
      const needsSync = feed.some(p =>
        p.userId === user.uid && (p.userPhotoURL !== latestPhoto || p.userDisplayName !== latestName)
      );
      if (needsSync) {
        import('../services/socialService').then(({ syncSharedPlansIdentity }) =>
          syncSharedPlansIdentity(user.uid, latestName, latestPhoto).catch(() => {})
        );
      }
    })
    .catch(() => setFeedError(true))
    .finally(() => setFeedLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  /* Takip Ettiklerim sekmesinde profilleri yükle */
  useEffect(() => {
    if (feedTab !== 'following' || followingSet.size === 0) return;
    setProfilesLoading(true);
    getUserProfiles([...followingSet])
      .then(setFollowingProfiles)
      .catch(() => {})
      .finally(() => setProfilesLoading(false));
  }, [feedTab, followingSet]);

  /* Social handlers */
  const handleShare = useCallback(async (planId: string) => {
    if (!user) return;
    // E-posta doğrulama — paylaşmak için zorunlu (geri alma serbest)
    if (!sharedPlanIds.has(planId) && !(await isEmailVerified())) {
      resendVerification().catch(() => {});
      setShareError('Plan paylaşmak için önce e-postanı doğrulamalısın. Doğrulama maili (tekrar) gönderildi — gelen kutunu ve Spam klasörünü kontrol et.');
      setTimeout(() => setShareError(null), 6000);
      return;
    }
    // Gizlilik ayarı — plan paylaşımı kapalı, sadece geri almaya izin ver
    if (!plansPublic && !sharedPlanIds.has(planId)) {
      setShareError('Plan paylaşımı gizlilik ayarlarınızda kapalı. Ayarlar → Gizlilik → Planlarım herkese açık seçeneğini etkinleştirin.');
      setTimeout(() => setShareError(null), 5000);
      return;
    }
    setSavingShare(planId);
    setShareError(null);
    try {
      if (sharedPlanIds.has(planId)) {
        await withTimeout(unshareplan(planId));
        setSharedPlanIds(prev => { const n = new Set(prev); n.delete(planId); return n; });
        setPublicFeed(prev => prev.filter(p => p.id !== planId));
      } else {
        const savedPlan = plans.find(p => p.id === planId);
        if (!savedPlan) return;
        await withTimeout(
          shareplan(planId, savedPlan.plan, savedPlan.onboardingData, {
            uid: user.uid, displayName: user.displayName, photoURL: currentUserPhoto,
          })
        );
        setSharedPlanIds(prev => new Set([...prev, planId]));
        setPublicFeed(prev => [{
          id: planId,
          userId:          user.uid,
          userDisplayName: user.displayName ?? 'Gezgin',
          userPhotoURL:    currentUserPhoto,
          destination:     savedPlan.plan.destination,
          dailyPlanCount:  savedPlan.plan.dailyPlans.length,
          budget:          savedPlan.onboardingData.budget,
          currencySymbol:  savedPlan.onboardingData.currencySymbol ?? '₺',
          tripPurpose:     savedPlan.onboardingData.tripPurpose ?? '',
          createdAt: Date.now(), avgRating: 0, ratingCount: 0,
        }, ...prev]);
      }
    } catch (err) {
      const msg = err instanceof Error && err.message === 'timeout'
        ? 'Bağlantı zaman aşımı'
        : 'Paylaşım başarısız';
      setShareError(msg);
      setTimeout(() => setShareError(null), 4000);
    } finally {
      setSavingShare(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sharedPlanIds, plans]);

  const handleRate = useCallback(async (planId: string, rating: number) => {
    if (!user) return;
    // Optimistik: anında yıldızları sabitle — hata olsa bile geri alma
    setUserRatings(prev => ({ ...prev, [planId]: rating }));
    setSavingRating(planId);
    try {
      const { newAvg, newCount } = await ratePlan(planId, user.uid, rating);
      setPublicFeed(prev => prev.map(p =>
        p.id === planId ? { ...p, avgRating: newAvg, ratingCount: newCount } : p
      ));
    } catch {
      // Yıldız görünümünü geri alma; sadece ortalama güncellenemiyor olabilir
    }
    finally { setSavingRating(null); }
  }, [user]);

  const handleToggleFollow = useCallback(async (targetUid: string) => {
    if (!user) return;
    try {
      if (followingSet.has(targetUid)) {
        await unfollowUser(user.uid, targetUid);
        setFollowingSet(prev => { const n = new Set(prev); n.delete(targetUid); return n; });
        setFollowingProfiles(prev => prev.filter(p => p.uid !== targetUid));
      } else {
        await followUser(user.uid, targetUid);
        setFollowingSet(prev => new Set([...prev, targetUid]));
      }
    } catch { /* hata */ }
  }, [user, followingSet]);

  /* ── Puana göre sıralı tüm planlar (sekme için) ── */
  const topPlans = useMemo(() =>
    [...publicFeed]
      .filter(p => p.ratingCount > 0)
      .sort((a, b) => b.avgRating - a.avgRating || b.ratingCount - a.ratingCount),
  [publicFeed]);

  /* ── Filtered feed ── */
  const displayedFeed = useMemo(() => {
    const base = feedTab === 'all'
      ? publicFeed.filter(p => p.userId !== user?.uid)
      : publicFeed.filter(p => followingSet.has(p.userId));
    if (!feedSearch.trim()) return base;
    const q = feedSearch.toLowerCase().trim();
    return base.filter(p =>
      p.destination.toLowerCase().includes(q) ||
      p.userDisplayName.toLowerCase().includes(q)
    );
  }, [publicFeed, feedTab, followingSet, user?.uid, feedSearch]);

  const visibleFeed = feedShowAll ? displayedFeed : displayedFeed.slice(0, FEED_INITIAL);

  return (
    <>
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1150px] mx-auto px-4 sm:px-10 py-6 sm:py-10">

        {/* Başlık */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} strokeWidth={2.5} className="text-accent" />
            <p className="text-xs font-heading text-accent uppercase tracking-widest">Topluluk</p>
          </div>
          <h1 className="font-heading text-2xl text-text">Gezgin Akışı</h1>
          <p className="text-muted text-sm mt-1">Diğer gezginlerin planlarını keşfet, takip et ve ilham al.</p>
        </div>

        {/* Gizlilik uyarı banner'ları */}
        {(!profilePublic || !plansPublic || !followPublic) && (
          <div className="mb-5 space-y-2">
            {!profilePublic && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-surface-2 border border-divider rounded-2xl">
                <span className="text-base">🔒</span>
                <p className="text-xs text-muted">
                  <strong className="text-text">Gizli profil:</strong> Profiliniz başkaları tarafından görüntülenemiyor.
                  <a href="/settings" className="ml-1.5 text-accent font-semibold hover:underline">Ayarları değiştir →</a>
                </p>
              </div>
            )}
            {!plansPublic && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <span className="text-base">🔕</span>
                <p className="text-xs text-amber-800">
                  <strong>Plan paylaşımı kapalı:</strong> Planlarınızı toplulukta paylaşamazsınız.
                  <a href="/settings" className="ml-1.5 font-semibold hover:underline">Ayarlardan aç →</a>
                </p>
              </div>
            )}
            {!followPublic && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
                <span className="text-base">👤</span>
                <p className="text-xs text-blue-700">
                  <strong>Onaylı takip modu:</strong> Yeni takip istekleri onayınızı bekler.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Header: tabs + arama */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          {/* Tabs */}
          <div className="flex bg-surface-2 rounded-full p-0.5 gap-0.5 shrink-0">
            <button
              onClick={() => { setFeedTab('all'); setFeedShowAll(false); }}
              className={`text-[11px] font-heading px-3.5 py-1.5 rounded-full transition-all ${
                feedTab === 'all'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              Herkes
            </button>
            <button
              onClick={() => { setFeedTab('following'); setFeedShowAll(false); }}
              className={`text-[11px] font-heading px-3.5 py-1.5 rounded-full transition-all ${
                feedTab === 'following'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              Takip Ettiklerim
            </button>
            <button
              onClick={() => { setFeedTab('top'); setFeedShowAll(false); }}
              className={`text-[11px] font-heading px-3.5 py-1.5 rounded-full transition-all ${
                feedTab === 'top'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              En Beğenilenler
            </button>
          </div>

          {/* Arama */}
          <div className="relative flex-1">
            <Search size={13} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              value={feedSearch}
              onChange={e => { setFeedSearch(e.target.value); setFeedShowAll(false); }}
              placeholder={feedTab === 'following' ? 'Kişi ara...' : 'Kişi, şehir veya ülke ara...'}
              className="w-full pl-9 pr-8 py-2.5 text-xs rounded-2xl border-[1.5px] border-divider bg-surface-2 focus:border-accent outline-none placeholder:text-muted transition-all"
            />
            {feedSearch && (
              <button
                onClick={() => setFeedSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
              >
                <XIcon size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Share error toast */}
        {shareError && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-2.5 rounded-2xl">
            <span>⚠️</span><span>{shareError}</span>
          </div>
        )}

        {/* ══ EN BEĞENİLENLER SEKMESİ ══ */}
        {feedTab === 'top' ? (
          topPlans.length === 0 ? (
            <div className="bg-surface border border-dashed border-divider rounded-3xl p-12 text-center">
              <p className="text-3xl mb-3">🏆</p>
              <p className="text-sm font-heading text-text">Henüz puanlanan plan yok</p>
              <p className="text-xs text-muted mt-1">Planlara yıldız verdikçe burada sıralama oluşur</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topPlans.map((plan, idx) => {
                const medals  = ['🥇', '🥈', '🥉'];
                const medal   = medals[idx] ?? `${idx + 1}.`;
                const leftBorder = idx === 0
                  ? 'border-l-4 border-amber-400'
                  : idx === 1
                    ? 'border-l-4 border-slate-300'
                    : idx === 2
                      ? 'border-l-4 border-orange-300'
                      : 'border-l-4 border-divider';
                return (
                  <div key={plan.id} className={`bg-surface rounded-3xl border border-divider overflow-hidden ${leftBorder} hover:shadow-md transition-all`}>
                    <div className="flex items-center gap-4 px-4 py-4">
                      {/* Sıra rozeti */}
                      <span className="text-2xl flex-shrink-0 w-8 text-center">{medal}</span>

                      {/* Plan kartı (aynı PublicPlanCard) */}
                      <div className="flex-1 min-w-0">
                        <PublicPlanCard
                          plan={{
                            ...plan,
                            userPhotoURL: plan.userId === user?.uid ? currentUserPhoto : plan.userPhotoURL,
                          }}
                          currentUserId={user?.uid}
                          isFollowing={followingSet.has(plan.userId)}
                          userRating={userRatings[plan.id]}
                          isSavingRating={savingRating === plan.id}
                          onRate={handleRate}
                          onToggleFollow={handleToggleFollow}
                          onOpen={p => navigate(`/plan/${p.id}`)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )

        /* ══ TAKİP ETTİKLERİM SEKMESİ — Kişi listesi ══ */
        ) : feedTab === 'following' ? (
          profilesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-surface border border-divider rounded-3xl p-4 animate-pulse flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-surface-2 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 bg-surface-2 rounded" />
                    <div className="h-3 w-20 bg-surface-2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : followingProfiles.length > 0 ? (() => {
            const filteredProfiles = feedSearch.trim()
              ? followingProfiles.filter(p =>
                  p.displayName.toLowerCase().includes(feedSearch.toLowerCase().trim())
                )
              : followingProfiles;
            return (
            <div className="bg-surface border border-divider rounded-3xl overflow-hidden">
              <div className="px-4 py-3 border-b border-divider">
                <p className="text-xs font-heading text-muted uppercase tracking-wider">
                  {filteredProfiles.length} kişi {feedSearch ? 'bulundu' : 'takip ediliyor'}
                </p>
              </div>
              <div className="divide-y divide-divider">
                {filteredProfiles.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-muted">"{feedSearch}" ile eşleşen kişi yok</p>
                  </div>
                ) : filteredProfiles.map(profile => {
                  const initials = profile.displayName
                    .split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
                  const isPending = unfollowConfirm === profile.uid;
                  return (
                    <div key={profile.uid} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors cursor-pointer" onClick={() => navigate(`/profile/${profile.uid}`)}>
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent to-sage flex items-center justify-center overflow-hidden shrink-0">
                        {profile.photoURL ? (
                          <img src={profile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-white text-xs font-heading">{initials}</span>
                        )}
                      </div>
                      {/* İsim */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-heading text-text truncate">{profile.displayName}</p>
                      </div>
                      {/* Takipten çık — onay popup */}
                      {isPending ? (
                        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                          <span className="text-[11px] text-muted font-medium">Takibi bırak?</span>
                          <button
                            onClick={() => { handleToggleFollow(profile.uid); setUnfollowConfirm(null); }}
                            className="text-[11px] font-heading px-2.5 py-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all"
                          >
                            Evet
                          </button>
                          <button
                            onClick={() => setUnfollowConfirm(null)}
                            className="text-[11px] font-heading px-2.5 py-1 rounded-full bg-surface-2 text-muted hover:bg-divider transition-all"
                          >
                            İptal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); setUnfollowConfirm(profile.uid); }}
                          className="shrink-0 text-[11px] font-heading px-3 py-1.5 rounded-full bg-surface-2 text-muted hover:bg-red-50 hover:text-red-400 transition-all"
                        >
                          ✓ Takip Ediliyor
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })() : (
            <div className="bg-surface border border-dashed border-divider rounded-3xl p-12 text-center">
              <p className="text-3xl mb-3">👥</p>
              <p className="text-sm font-heading text-text">Henüz kimseyi takip etmiyorsun</p>
              <p className="text-xs text-muted mt-1">"Herkes" sekmesinden gezginleri keşfet ve takip et</p>
              <button
                onClick={() => setFeedTab('all')}
                className="mt-3 text-xs font-heading text-blue-500 hover:text-blue-700 transition-colors"
              >
                Herkese bak →
              </button>
            </div>
          )

        /* ══ HERKES SEKMESİ — Plan akışı ══ */
        ) : feedLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-surface border border-divider rounded-3xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-surface-2 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 bg-surface-2 rounded" />
                    <div className="h-3 w-44 bg-surface-2 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : feedError ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
            <span className="text-xl mt-0.5">⚠️</span>
            <div>
              <p className="text-sm font-bold text-red-700">Topluluk verisi yüklenemedi</p>
              <p className="text-xs text-red-500 mt-0.5 leading-relaxed">
                Firebase bağlantısı veya kurallar kontrol edilmeli.
              </p>
              <button
                onClick={loadFeed}
                className="mt-2 text-xs font-bold text-red-600 hover:text-red-800 transition-colors"
              >
                Tekrar dene →
              </button>
            </div>
          </div>
        ) : displayedFeed.length > 0 ? (
          <div>
            <div className="space-y-3">
              {visibleFeed.map(plan => (
                <PublicPlanCard
                  key={plan.id}
                  plan={{
                    ...plan,
                    userPhotoURL: plan.userId === user?.uid ? currentUserPhoto : plan.userPhotoURL,
                  }}
                  currentUserId={user?.uid}
                  isFollowing={followingSet.has(plan.userId)}
                  userRating={userRatings[plan.id]}
                  isSavingRating={savingRating === plan.id}
                  onRate={handleRate}
                  onToggleFollow={handleToggleFollow}
                  onOpen={p => navigate(`/plan/${p.id}`)}
                />
              ))}
            </div>

            {displayedFeed.length > FEED_INITIAL && (
              <button
                onClick={() => setFeedShowAll(v => !v)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-divider bg-surface hover:bg-surface-2 text-xs font-heading text-muted hover:text-text transition-all"
              >
                {feedShowAll ? (
                  <><ChevronUp size={13} /> Daha az göster</>
                ) : (
                  <><ChevronDown size={13} /> {displayedFeed.length - FEED_INITIAL} plan daha göster</>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="bg-surface border border-dashed border-divider rounded-3xl p-12 text-center">
            {feedSearch ? (
              <>
                <p className="text-3xl mb-3">🔍</p>
                <p className="text-sm font-heading text-text">Sonuç bulunamadı</p>
                <p className="text-xs text-muted mt-1">"{feedSearch}" ile eşleşen plan yok</p>
                <button
                  onClick={() => setFeedSearch('')}
                  className="mt-3 text-xs font-heading text-accent hover:text-accent-700 transition-colors"
                >
                  Aramayı temizle →
                </button>
              </>
            ) : (
              <>
                <p className="text-3xl mb-3">🌍</p>
                <p className="text-sm font-heading text-text">Henüz paylaşılan plan yok</p>
                <p className="text-xs text-muted mt-1">Planlarını paylaşarak topluluğa katkı sağla</p>
              </>
            )}
          </div>
        )}

        {/* Paylaşılmamış planlar için hızlı paylaşım — sadece Herkes sekmesinde */}
        {feedTab === 'all' && !feedLoading && !feedError && plans.length > 0 && (
          <div className="mt-8 bg-surface border border-divider rounded-3xl p-5">
            <p className="text-xs font-heading text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Globe size={12} strokeWidth={2.5} /> Planlarımı Paylaş
            </p>
            <div className="space-y-2">
              {plans.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{p.plan.destination}</p>
                    <p className="text-xs text-muted">{p.plan.dailyPlans.length} gün</p>
                  </div>
                  <button
                    onClick={() => handleShare(p.id)}
                    disabled={savingShare === p.id}
                    className={`flex items-center gap-1.5 text-[11px] font-heading px-3 py-1.5 rounded-full border shrink-0 transition-all ${
                      sharedPlanIds.has(p.id)
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-red-50 hover:text-red-400 hover:border-red-200'
                        : 'bg-surface-2 text-muted border-divider hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
                    }`}
                  >
                    {savingShare === p.id
                      ? <Loader2 size={10} className="animate-spin" />
                      : sharedPlanIds.has(p.id)
                        ? <><Globe size={10} /> Paylaşıldı</>
                        : <><Globe size={10} /> Paylaş</>
                    }
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>

    </>
  );
};

export default Community;
