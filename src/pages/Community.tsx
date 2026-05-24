import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useUserPlans } from '../store/useSavedPlansStore';
import {
  Users, Search, X as XIcon, ChevronDown, ChevronUp, Loader2, Globe,
} from 'lucide-react';
import {
  getPublicFeed, getMySharedPlanIds, getFollowingList,
  shareplan, unshareplan, ratePlan, getUserRatings,
  followUser, unfollowUser,
  type PublicPlan,
} from '../services/socialService';
import { PublicPlanCard } from '../components/PublicPlanCard';
import SharedPlanModal from '../components/SharedPlanModal';

const FEED_INITIAL = 3;

const Community: React.FC = () => {
  const { user }  = useAuthStore();
  const plans     = useUserPlans();

  /* ── Social state ── */
  const [publicFeed, setPublicFeed]       = useState<PublicPlan[]>([]);
  const [feedLoading, setFeedLoading]     = useState(false);
  const [feedError, setFeedError]         = useState(false);
  const [shareError, setShareError]       = useState<string | null>(null);
  const [feedTab, setFeedTab]             = useState<'all' | 'following'>('all');
  const [followingSet, setFollowingSet]   = useState<Set<string>>(new Set());
  const [sharedPlanIds, setSharedPlanIds] = useState<Set<string>>(new Set());
  const [userRatings, setUserRatings]     = useState<Record<string, number>>({});
  const [savingShare, setSavingShare]     = useState<string | null>(null);
  const [savingRating, setSavingRating]   = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan]   = useState<PublicPlan | null>(null);
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
    })
    .catch(() => setFeedError(true))
    .finally(() => setFeedLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  /* Social handlers */
  const handleShare = useCallback(async (planId: string) => {
    if (!user) return;
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
            uid: user.uid, displayName: user.displayName, photoURL: user.photoURL,
          })
        );
        setSharedPlanIds(prev => new Set([...prev, planId]));
        setPublicFeed(prev => [{
          id: planId,
          userId:          user.uid,
          userDisplayName: user.displayName ?? 'Gezgin',
          userPhotoURL:    user.photoURL ?? null,
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
    setSavingRating(planId);
    try {
      const { newAvg, newCount } = await ratePlan(planId, user.uid, rating);
      setUserRatings(prev => ({ ...prev, [planId]: rating }));
      setPublicFeed(prev => prev.map(p =>
        p.id === planId ? { ...p, avgRating: newAvg, ratingCount: newCount } : p
      ));
    } catch { /* hata */ }
    finally { setSavingRating(null); }
  }, [user]);

  const handleToggleFollow = useCallback(async (targetUid: string) => {
    if (!user) return;
    try {
      if (followingSet.has(targetUid)) {
        await unfollowUser(user.uid, targetUid);
        setFollowingSet(prev => { const n = new Set(prev); n.delete(targetUid); return n; });
      } else {
        await followUser(user.uid, targetUid);
        setFollowingSet(prev => new Set([...prev, targetUid]));
      }
    } catch { /* hata */ }
  }, [user, followingSet]);

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
    <div className="min-h-screen bg-[#fafaf9] dark:bg-slate-900">
      <div className="max-w-[1150px] mx-auto px-10 py-10">

        {/* Başlık */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} className="text-[#f8981d]" />
            <p className="text-xs font-bold text-[#f8981d] uppercase tracking-widest">Topluluk</p>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Gezgin Akışı</h1>
          <p className="text-slate-400 text-sm mt-1">Diğer gezginlerin planlarını keşfet, takip et ve ilham al.</p>
        </div>

        {/* Header: tabs + arama */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 gap-0.5 shrink-0">
            {(['all', 'following'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setFeedTab(tab); setFeedShowAll(false); }}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                  feedTab === tab
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab === 'all' ? 'Herkes' : (
                  <span className="flex items-center gap-1">
                    Takip Ettiklerim
                    {followingSet.size > 0 && (
                      <span className="bg-blue-500 text-white text-[9px] font-black px-1 rounded-full">
                        {followingSet.size}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Arama */}
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={feedSearch}
              onChange={e => { setFeedSearch(e.target.value); setFeedShowAll(false); }}
              placeholder="Kişi, şehir veya ülke ara..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 outline-none placeholder:text-slate-400 transition-all"
            />
            {feedSearch && (
              <button
                onClick={() => setFeedSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XIcon size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Share error toast */}
        {shareError && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-2.5 rounded-xl">
            <span>⚠️</span><span>{shareError}</span>
          </div>
        )}

        {/* Feed */}
        {feedLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 bg-slate-100 rounded" />
                    <div className="h-3 w-44 bg-slate-100 rounded" />
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
                  plan={plan}
                  currentUserId={user?.uid}
                  isFollowing={followingSet.has(plan.userId)}
                  userRating={userRatings[plan.id]}
                  isSavingRating={savingRating === plan.id}
                  onRate={handleRate}
                  onToggleFollow={handleToggleFollow}
                  onOpen={setSelectedPlan}
                />
              ))}
            </div>

            {displayedFeed.length > FEED_INITIAL && (
              <button
                onClick={() => setFeedShowAll(v => !v)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-all"
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
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
            {feedTab === 'following' ? (
              <>
                <p className="text-3xl mb-3">👥</p>
                <p className="text-sm font-bold text-slate-700">Henüz kimseyi takip etmiyorsun</p>
                <p className="text-xs text-slate-400 mt-1">"Herkes" sekmesinde gezginleri keşfet</p>
                <button
                  onClick={() => setFeedTab('all')}
                  className="mt-3 text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors"
                >
                  Herkese bak →
                </button>
              </>
            ) : feedSearch ? (
              <>
                <p className="text-3xl mb-3">🔍</p>
                <p className="text-sm font-bold text-slate-700">Sonuç bulunamadı</p>
                <p className="text-xs text-slate-400 mt-1">"{feedSearch}" ile eşleşen plan yok</p>
                <button
                  onClick={() => setFeedSearch('')}
                  className="mt-3 text-xs font-bold text-[#f8981d] hover:text-[#e08518] transition-colors"
                >
                  Aramayı temizle →
                </button>
              </>
            ) : (
              <>
                <p className="text-3xl mb-3">🌍</p>
                <p className="text-sm font-bold text-slate-700">Henüz paylaşılan plan yok</p>
                <p className="text-xs text-slate-400 mt-1">Planlarını paylaşarak topluluğa katkı sağla</p>
              </>
            )}
          </div>
        )}

        {/* Paylaşılmamış planlar için hızlı paylaşım */}
        {!feedLoading && !feedError && plans.length > 0 && (
          <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Globe size={12} /> Planlarımı Paylaş
            </p>
            <div className="space-y-2">
              {plans.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.plan.destination}</p>
                    <p className="text-xs text-slate-400">{p.plan.dailyPlans.length} gün</p>
                  </div>
                  <button
                    onClick={() => handleShare(p.id)}
                    disabled={savingShare === p.id}
                    className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border shrink-0 transition-all ${
                      sharedPlanIds.has(p.id)
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-red-50 hover:text-red-400 hover:border-red-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
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

    {selectedPlan && (
      <SharedPlanModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
    )}
    </>
  );
};

export default Community;
