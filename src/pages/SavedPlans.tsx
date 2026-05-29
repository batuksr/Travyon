import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map as MapIcon, Calendar, Wallet, Users, Trash2, Star,
  StarOff, Pencil, Plus, Search,
  MapPin, ArrowRight, Sparkles,
} from 'lucide-react';
import { useSavedPlansStore, useUserPlans, type SavedPlan } from '../store/useSavedPlansStore';
import { usePlanStore } from '../store/usePlanStore';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80';

// Modül seviyesi önbellek — bileşen yeniden render edilse bile istek tekrarlanmaz
const photoCache = new Map<string, string>();

const useCityPhoto = (destination: string): string => {
  const city = destination.split(',')[0].trim();
  const [url, setUrl] = useState<string>(photoCache.get(city) ?? FALLBACK_IMG);

  useEffect(() => {
    if (photoCache.has(city)) {
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
}

const PlanCard: React.FC<PlanCardProps> = ({ savedPlan, onOpen, onToggleFavorite, onRename, onDelete }) => {
  const coverPhoto = useCityPhoto(savedPlan.plan.destination);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/60 transition-all"
    >
      {/* Görsel */}
      <div
        className="relative aspect-[16/10] bg-slate-100 cursor-pointer overflow-hidden"
        onClick={() => onOpen(savedPlan)}
      >
        <img
          src={coverPhoto}
          alt={savedPlan.plan.destination}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Favori butonu */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(savedPlan.id); }}
          className="absolute top-3 right-3 w-9 h-9 bg-white/95 backdrop-blur rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg"
        >
          {savedPlan.isFavorite
            ? <Star size={15} className="fill-amber-400 text-amber-400" />
            : <StarOff size={15} className="text-slate-400" />}
        </button>

        {/* Şehir adı */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin size={11} className="text-white/80" />
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Destinasyon</span>
          </div>
          <h3 className="text-xl font-black text-white leading-tight truncate">
            {savedPlan.customName || savedPlan.plan.destination}
          </h3>
        </div>
      </div>

      {/* Detaylar */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Calendar size={11} className="text-[#f8981d]" />
            <span className="font-semibold text-slate-700">{savedPlan.plan.dailyPlans.length}</span>
            <span>gün</span>
          </div>
          <div className="w-px h-3 bg-slate-200" />
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-700">
              {savedPlan.plan.dailyPlans.reduce((s, d) => s + d.activities.length, 0)}
            </span>
            <span>aktivite</span>
          </div>
          <div className="w-px h-3 bg-slate-200" />
          <div className="flex items-center gap-1">
            <Users size={11} className="text-slate-400" />
            <span className="font-semibold text-slate-700">{savedPlan.onboardingData.peopleCount}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <Wallet size={12} className="text-[#f8981d]" />
            <span className="text-xs font-semibold text-slate-500">Toplam Bütçe</span>
          </div>
          <span className="text-sm font-black text-slate-900">
            {savedPlan.plan.currencySymbol}{savedPlan.plan.totalEstimatedCost.toLocaleString()}
          </span>
        </div>

        <p className="text-[10px] text-slate-400 mb-3">{formatDate(savedPlan.createdAt)} tarihinde oluşturuldu</p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpen(savedPlan)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#f8981d] hover:bg-[#e08518] text-white font-bold text-xs rounded-lg transition-all"
          >
            Aç <ArrowRight size={11} />
          </button>
          <button
            type="button"
            onClick={() => onRename(savedPlan)}
            className="w-9 h-8 border border-slate-200 rounded-lg hover:border-slate-300 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all"
            title="Yeniden adlandır"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(savedPlan.id)}
            className="w-9 h-8 border border-slate-200 rounded-lg hover:border-red-300 hover:bg-red-50 flex items-center justify-center text-slate-500 hover:text-red-600 transition-all"
            title="Sil"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const SavedPlans: React.FC = () => {
  const navigate = useNavigate();
  const plans = useUserPlans();
  const { removePlan, toggleFavorite, renamePlan } = useSavedPlansStore();
  const { setPlan, setSavedPlanId } = usePlanStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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
    <div className="min-h-screen bg-[#f5f0e8] dark:bg-slate-900">

      {/* Üst Bar */}
      <div className="bg-gray border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <p className="text-xs font-bold text-[#f8981d] uppercase tracking-widest mb-1">
                Kayıtlı Planlar
              </p>
              <h1 className="text-2xl font-black text-slate-900">Planlarım</h1>
              <p className="text-sm text-slate-500 mt-1">
                {plans.length === 0
                  ? 'Henüz kayıtlı planın yok'
                  : `${plans.length} plan kaydedildi`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="inline-flex items-center gap-2 px-3 sm:px-5 py-2.5 bg-[#f8981d] hover:bg-[#e08518] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#f8981d]/20 hover:-translate-y-px"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Yeni Plan</span>
            </button>
          </div>

          {/* Arama + Filtre */}
          {plans.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Şehir veya plan adı ara..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 outline-none text-sm placeholder:text-slate-400 transition-all"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    filter === 'all'
                      ? 'bg-white shadow-sm text-slate-900'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Tümü
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('favorites')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                    filter === 'favorites'
                      ? 'bg-white shadow-sm text-slate-900'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Star size={11} />
                  Favoriler
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
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto">
            <div className="w-20 h-20 bg-[#f8981d]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <MapIcon size={32} className="text-[#f8981d]" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">
              Henüz Kayıtlı Plan Yok
            </h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              İlk planını oluştur ve kaydet. Tüm planların burada listelenecek, istediğin zaman geri dönebilirsin.
            </p>
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#f8981d] hover:bg-[#e08518] text-white font-bold rounded-xl text-sm transition-all"
            >
              <Sparkles size={15} />
              İlk Planı Oluştur
            </button>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500">
              {search ? 'Aramayla eşleşen plan bulunamadı' : 'Favori plan yok'}
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
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 max-w-sm w-full z-50 shadow-2xl mx-4"
            >
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Planı Sil</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Bu planı kalıcı olarak silmek istediğinden emin misin? Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-all"
                >
                  Sil
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
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 max-w-sm w-full z-50 shadow-2xl mx-4"
            >
              <h3 className="text-lg font-black text-slate-900 mb-4">Planı Yeniden Adlandır</h3>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                placeholder="Plan adı"
                autoFocus
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 outline-none text-sm font-medium mb-4"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRenameId(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={saveRename}
                  className="flex-1 py-2.5 bg-[#f8981d] hover:bg-[#e08518] text-white text-sm font-bold rounded-xl transition-all"
                >
                  Kaydet
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
