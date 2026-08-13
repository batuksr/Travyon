import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map as MapIcon, Calendar, Wallet, Users, Trash2, Star,
  StarOff, Pencil, Plus, Search,
  MapPin, ArrowRight, Sparkles, Link2, Check,
} from 'lucide-react';
import { useSavedPlansStore, useUserPlans, type SavedPlan } from '../store/useSavedPlansStore';
import { usePlanStore } from '../store/usePlanStore';
import { useAuthStore } from '../store/useAuthStore';
import { sharePlanAsLink, unshareplan } from '../services/socialService';
import { isEmailVerified, resendVerification } from '../utils/authUtils';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80';

// Modül seviyesi önbellek — bileşen yeniden render edilse bile istek tekrarlanmaz
const photoCache = new Map<string, string>();

const useCityPhoto = (destination: string): string => {
  const city = destination.split(',')[0].trim();
  const [url, setUrl] = useState<string>(photoCache.get(city) ?? FALLBACK_IMG);

  useEffect(() => {
    if (photoCache.has(city)) {
      // Modül-seviyesi önbellekte zaten varsa senkron kullan — bilinçli erken çıkış.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(photoCache.get(city)!);
      return;
    }
    let cancelled = false;

    const fetchPhoto = async () => {
      try {
        // generator=search ile hem arama hem resim tek istekte — "Roma" → "Rome" gibi redirect'leri otomatik çözer
        const res = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(city)}&gsrlimit=5&prop=pageimages&pithumbsize=1000&format=json&origin=*`
        );
        const data = await res.json();
        const pages: Record<string, { thumbnail?: { source: string } }> = data?.query?.pages ?? {};

        // İlk resmi olan sayfayı al
        const photo = Object.values(pages)
          .map((p) => p?.thumbnail?.source)
          .find(Boolean);

        const finalPhoto = photo ?? FALLBACK_IMG;
        if (!cancelled) { photoCache.set(city, finalPhoto); setUrl(finalPhoto); }
      } catch {
        if (!cancelled) setUrl(FALLBACK_IMG);
      }
    };

    fetchPhoto();
    return () => { cancelled = true; };
  }, [city]);

  return url;
};

interface PlanCardProps {
  savedPlan: SavedPlan;
  onOpen: (p: SavedPlan) => void;
  onToggleFavorite: (id: string) => void;
  onRename: (p: SavedPlan) => void;
  onDelete: (id: string) => void;
  onShareLink: (p: SavedPlan) => void;
  linkCopied: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({ savedPlan, onOpen, onToggleFavorite, onRename, onDelete, onShareLink, linkCopied }) => {
  const { t, i18n } = useTranslation();
  const coverPhoto = useCityPhoto(savedPlan.plan.destination);
  const locale = i18n.language === 'en' ? 'en-US' : 'tr-TR';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-surface rounded-3xl border border-divider overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      {/* Görsel */}
      <div
        className="relative aspect-[16/10] bg-surface-2 cursor-pointer overflow-hidden"
        onClick={() => onOpen(savedPlan)}
      >
        <img
          src={coverPhoto}
          alt={savedPlan.plan.destination}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          style={{ filter: 'saturate(.72) contrast(.92) brightness(1.04)' }}
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c140c]/72 via-[#1c140c]/15 to-transparent" />

        {/* Favori butonu */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(savedPlan.id); }}
          className="absolute top-3 right-3 w-9 h-9 bg-surface/95 backdrop-blur rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg"
        >
          {savedPlan.isFavorite
            ? <Star size={15} className="fill-amber-400 text-amber-400" />
            : <StarOff size={15} className="text-muted" />}
        </button>

        {/* Şehir adı */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin size={11} strokeWidth={2.5} className="text-white/80" />
            <span className="text-[10px] font-heading text-white/80 uppercase tracking-widest">{t('savedPlans.card.destination')}</span>
          </div>
          <h3 className="font-heading text-xl text-white leading-tight truncate">
            {savedPlan.customName || savedPlan.plan.destination}
          </h3>
        </div>
      </div>

      {/* Detaylar */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3 text-xs text-muted">
          <div className="flex items-center gap-1">
            <Calendar size={11} strokeWidth={2.5} className="text-accent" />
            <span className="font-semibold text-text">{savedPlan.plan.dailyPlans.length}</span>
            <span>{t('savedPlans.card.days')}</span>
          </div>
          <div className="w-px h-3 bg-divider" />
          <div className="flex items-center gap-1">
            <span className="font-semibold text-text">
              {savedPlan.plan.dailyPlans.reduce((s, d) => s + d.activities.length, 0)}
            </span>
            <span>{t('savedPlans.card.activities')}</span>
          </div>
          <div className="w-px h-3 bg-divider" />
          <div className="flex items-center gap-1">
            <Users size={11} strokeWidth={2.5} className="text-muted" />
            <span className="font-semibold text-text">{savedPlan.onboardingData.peopleCount}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pb-3 mb-3 border-b border-divider">
          <div className="flex items-center gap-1.5">
            <Wallet size={12} strokeWidth={2.5} className="text-accent" />
            <span className="text-xs font-semibold text-muted">{t('savedPlans.card.totalBudget')}</span>
          </div>
          <span className="font-heading text-sm text-text">
            {savedPlan.plan.currencySymbol}{savedPlan.plan.totalEstimatedCost.toLocaleString()}
          </span>
        </div>

        <p className="text-[10px] text-muted mb-3">{t('savedPlans.card.createdOn', { date: formatDate(savedPlan.createdAt, locale) })}</p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpen(savedPlan)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-accent hover:brightness-105 text-white font-heading text-xs rounded-full transition-all"
          >
            {t('savedPlans.card.open')} <ArrowRight size={11} strokeWidth={2.75} />
          </button>
          {/* Link kopyala */}
          <button
            type="button"
            onClick={() => onShareLink(savedPlan)}
            className={`w-9 h-9 border-[1.5px] rounded-full flex items-center justify-center transition-all ${
              linkCopied
                ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                : 'border-divider hover:border-blue-300 hover:bg-blue-50 text-muted hover:text-blue-600'
            }`}
            title={t('savedPlans.card.copyLink')}
          >
            {linkCopied ? <Check size={12} strokeWidth={2.5} /> : <Link2 size={12} strokeWidth={2.5} />}
          </button>
          <button
            type="button"
            onClick={() => onRename(savedPlan)}
            className="w-9 h-9 border-[1.5px] border-divider rounded-full hover:border-accent/40 flex items-center justify-center text-muted hover:text-accent transition-all"
            title={t('savedPlans.card.rename')}
          >
            <Pencil size={12} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(savedPlan.id)}
            className="w-9 h-9 border-[1.5px] border-divider rounded-full hover:border-red-300 hover:bg-red-50 flex items-center justify-center text-muted hover:text-red-600 transition-all"
            title={t('savedPlans.card.delete')}
          >
            <Trash2 size={12} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const formatDate = (timestamp: number, locale: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const SavedPlans: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const plans = useUserPlans();
  const { removePlan, toggleFavorite, renamePlan } = useSavedPlansStore();
  const { setPlan, setSavedPlanId } = usePlanStore();
  const { user } = useAuthStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [linkCopiedId, setLinkCopiedId] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState<string | null>(null);

  const filteredPlans = plans
    .filter((p) => {
      if (filter === 'favorites' && !p.isFavorite) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.plan.destination.toLowerCase().includes(q) ||
          p.customName?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  const handleOpenPlan = (savedPlan: SavedPlan) => {
    setPlan(savedPlan.plan);
    setSavedPlanId(savedPlan.id);
    navigate('/dashboard');
  };

  const handleDelete = (id: string) => {
    removePlan(id);
    setDeleteConfirm(null);
    // Plan paylaşılmışsa topluluktan da kaldır (paylaşılmamışsa no-op)
    unshareplan(id).catch(() => { /* paylaşılmamış olabilir, sessizce geç */ });
  };

  const handleShareLink = async (savedPlan: SavedPlan) => {
    if (!user || linkLoading) return;
    // E-posta doğrulama — link paylaşmak için zorunlu
    if (!(await isEmailVerified())) {
      resendVerification().catch(() => {});
      alert(t('savedPlans.alerts.verifyEmailForLink'));
      return;
    }
    setLinkLoading(savedPlan.id);
    try {
      await sharePlanAsLink(savedPlan.id, savedPlan.plan, savedPlan.onboardingData, {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
      const url = `${window.location.origin}/plan/${savedPlan.id}`;
      await navigator.clipboard.writeText(url);
      setLinkCopiedId(savedPlan.id);
      setTimeout(() => setLinkCopiedId(null), 2500);
    } catch {
      alert(t('savedPlans.alerts.copyFailed'));
    } finally {
      setLinkLoading(null);
    }
  };

  const startRename = (plan: SavedPlan) => {
    setRenameId(plan.id);
    setRenameValue(plan.customName || plan.plan.destination);
  };

  const saveRename = () => {
    if (renameId && renameValue.trim()) {
      renamePlan(renameId, renameValue.trim());
    }
    setRenameId(null);
    setRenameValue('');
  };

  return (
    <div className="min-h-screen bg-bg">

      {/* Üst Bar */}
      <div className="border-b border-divider">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <p className="text-xs font-heading text-accent uppercase tracking-widest mb-1">
                {t('savedPlans.eyebrow')}
              </p>
              <h1 className="font-heading text-2xl text-text">{t('savedPlans.title')}</h1>
              <p className="text-sm text-muted mt-1">
                {plans.length === 0
                  ? t('savedPlans.subtitle.empty')
                  : t('savedPlans.subtitle.count', { count: plans.length })}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="inline-flex items-center gap-2 px-3.5 sm:px-5 py-2.5 bg-accent hover:brightness-105 text-white font-heading rounded-full text-sm transition-all shadow-[0_10px_22px_rgba(198,113,57,0.28)]"
            >
              <Plus size={16} strokeWidth={2.75} />
              <span className="hidden sm:inline">{t('savedPlans.newPlan')}</span>
            </button>
          </div>

          {/* Arama + Filtre */}
          {plans.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search size={15} strokeWidth={2.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('savedPlans.searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border-[1.5px] border-divider bg-surface-2 focus:border-accent outline-none text-sm placeholder:text-muted transition-all"
                />
              </div>

              <div className="flex items-center gap-1 bg-surface-2 p-0.5 rounded-full">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-4 py-1.5 text-xs font-heading rounded-full transition-all ${
                    filter === 'all'
                      ? 'bg-surface shadow-sm text-text'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {t('savedPlans.filters.all')}
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('favorites')}
                  className={`px-4 py-1.5 text-xs font-heading rounded-full transition-all flex items-center gap-1 ${
                    filter === 'favorites'
                      ? 'bg-surface shadow-sm text-text'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  <Star size={11} strokeWidth={2.5} />
                  {t('savedPlans.filters.favorites')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* İçerik */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Boş durum */}
        {plans.length === 0 ? (
          <div className="bg-surface rounded-3xl border border-divider p-12 text-center max-w-md mx-auto">
            <div className="w-20 h-20 bg-accent-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <MapIcon size={32} strokeWidth={2.5} className="text-accent" />
            </div>
            <h2 className="font-heading text-xl text-text mb-2">
              {t('savedPlans.empty.title')}
            </h2>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              {t('savedPlans.empty.description')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-accent hover:brightness-105 text-white font-heading rounded-full text-sm transition-all"
            >
              <Sparkles size={15} />
              {t('savedPlans.empty.cta')}
            </button>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted">
              {search ? t('savedPlans.noResults.search') : t('savedPlans.noResults.favorites')}
            </p>
          </div>
        ) : (
          /* Plan kartları grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {filteredPlans.map((savedPlan) => (
                <PlanCard
                  key={savedPlan.id}
                  savedPlan={savedPlan}
                  onOpen={handleOpenPlan}
                  onToggleFavorite={toggleFavorite}
                  onRename={startRename}
                  onDelete={setDeleteConfirm}
                  onShareLink={handleShareLink}
                  linkCopied={linkCopiedId === savedPlan.id}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Silme Onay Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="fixed inset-0 bg-[#1c140c]/45 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-3xl p-6 max-w-sm w-full z-50 shadow-2xl mx-4"
            >
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={20} strokeWidth={2.5} className="text-red-500" />
              </div>
              <h3 className="font-heading text-lg text-text mb-2">{t('savedPlans.deleteModal.title')}</h3>
              <p className="text-sm text-muted mb-6 leading-relaxed">
                {t('savedPlans.deleteModal.message')}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 border-[1.5px] border-divider rounded-full text-sm font-heading text-text hover:bg-surface-2 transition-all"
                >
                  {t('savedPlans.deleteModal.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-heading rounded-full transition-all"
                >
                  {t('savedPlans.deleteModal.confirm')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Rename Modal */}
      <AnimatePresence>
        {renameId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRenameId(null)}
              className="fixed inset-0 bg-[#1c140c]/45 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-3xl p-6 max-w-sm w-full z-50 shadow-2xl mx-4"
            >
              <h3 className="font-heading text-lg text-text mb-4">{t('savedPlans.renameModal.title')}</h3>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                placeholder={t('savedPlans.renameModal.placeholder')}
                autoFocus
                className="w-full px-4 py-3.5 rounded-2xl border-[1.5px] border-divider bg-surface-2 focus:border-accent outline-none text-sm font-medium mb-4"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRenameId(null)}
                  className="flex-1 py-3 border-[1.5px] border-divider rounded-full text-sm font-heading text-text hover:bg-surface-2 transition-all"
                >
                  {t('savedPlans.renameModal.cancel')}
                </button>
                <button
                  type="button"
                  onClick={saveRename}
                  className="flex-1 py-3 bg-accent hover:brightness-105 text-white text-sm font-heading rounded-full transition-all"
                >
                  {t('savedPlans.renameModal.save')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SavedPlans;
