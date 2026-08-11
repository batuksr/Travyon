import React, { useState, memo } from 'react';
import { Loader2 } from 'lucide-react';
import type { PublicPlan } from '../services/socialService';
import { relativeTime } from '../utils/timeUtils';

const PURPOSE_LABELS: Record<string, string> = {
  culture:   'Kültür',
  relax:     'Dinlenme',
  nightlife: 'Gece Hayatı',
  nature:    'Macera',
};

interface Props {
  plan:          PublicPlan;
  currentUserId: string | undefined;
  isFollowing:   boolean;
  userRating:    number | undefined;
  isSavingRating: boolean;
  onRate:          (planId: string, rating: number) => void;
  onToggleFollow:  (userId: string) => void;
  onOpen?:         (plan: PublicPlan) => void;
}

export const PublicPlanCard: React.FC<Props> = memo(({
  plan, currentUserId, isFollowing, userRating, isSavingRating, onRate, onToggleFollow, onOpen,
}) => {
  const [hoverStar, setHoverStar] = useState(0);

  const initials = plan.userDisplayName
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isOwn      = plan.userId === currentUserId;
  const activeStar = hoverStar || userRating || 0;
  const avgDisplay = plan.ratingCount > 0 ? plan.avgRating.toFixed(1) : null;
  const purposeLabel = PURPOSE_LABELS[plan.tripPurpose] ?? plan.tripPurpose;

  return (
    <div className="bg-surface border border-divider rounded-3xl p-4 hover:shadow-md transition-all">

      {/* ── Top row: avatar + info + time — clickable to view plan ── */}
      <div
        className={`flex items-start justify-between gap-3 ${onOpen ? 'cursor-pointer' : ''}`}
        onClick={() => onOpen?.(plan)}
      >
        <div className="flex items-start gap-3">

          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-sage flex items-center justify-center overflow-hidden flex-shrink-0">
            {plan.userPhotoURL ? (
              <img src={plan.userPhotoURL} className="w-9 h-9 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-white text-[11px] font-heading select-none">{initials}</span>
            )}
          </div>

          {/* Name + destination */}
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-heading text-sm text-text leading-tight">{plan.userDisplayName}</p>
              {isOwn && (
                <span className="text-[9px] font-bold bg-accent-100 text-accent-700 px-1.5 py-0.5 rounded-full">Sen</span>
              )}
              {purposeLabel && (
                <span className="text-[9px] font-bold bg-surface-2 text-muted px-1.5 py-0.5 rounded-full">
                  {purposeLabel}
                </span>
              )}
              {onOpen && (
                <span className="text-[9px] font-bold bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full">
                  Planı gör →
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              <span className="font-semibold text-text">{plan.destination.split(',')[0]}</span>
              {' · '}{plan.dailyPlanCount} gün
              {' · '}{plan.currencySymbol}{plan.budget.toLocaleString('tr-TR')}
            </p>
          </div>
        </div>

        {/* Time */}
        <span className="text-[10px] text-muted whitespace-nowrap flex-shrink-0 mt-0.5">
          {relativeTime(plan.createdAt)}
        </span>
      </div>

      {/* ── Bottom row: stars + follow ── */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-divider gap-2">

        {/* Sol: yıldızlar + ortalama */}
        <div className="flex items-center gap-2 flex-wrap">
          {isOwn ? (
            <span className="text-[11px] text-muted italic">Kendi planın</span>
          ) : (
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  onMouseEnter={() => !isSavingRating && setHoverStar(s)}
                  onMouseLeave={() => setHoverStar(0)}
                  onClick={() => !isSavingRating && onRate(plan.id, s)}
                  disabled={isSavingRating}
                  aria-label={`${s} yıldız`}
                  className={`text-xl leading-none transition-all duration-100 ${
                    s <= activeStar
                      ? hoverStar
                        ? 'text-amber-300 scale-110'
                        : 'text-amber-400'
                      : isSavingRating
                        ? 'text-divider cursor-wait'
                        : 'text-divider hover:text-amber-200 hover:scale-110'
                  }`}
                >
                  ★
                </button>
              ))}
              {isSavingRating && <Loader2 size={12} className="animate-spin text-muted ml-1" />}
            </div>
          )}

          {/* Ortalama badge — hem kendi planında hem başkasının planında göster */}
          {avgDisplay ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 tabular-nums">
              <span className="text-amber-400 text-xs leading-none">★</span>
              <span className="text-xs font-bold text-amber-600">{avgDisplay}</span>
              <span className="text-[10px] text-muted font-medium">/ 5</span>
              <span className="text-[10px] text-muted mx-0.5">·</span>
              <span className="text-[10px] text-muted">{plan.ratingCount} oy</span>
            </span>
          ) : (
            !isOwn && (
              <span className="text-[10px] text-muted italic">Henüz oy yok</span>
            )
          )}
        </div>

        {/* Sağ: takip butonu */}
        {!isOwn && (
          <button
            onClick={() => onToggleFollow(plan.userId)}
            className={`text-[11px] font-heading px-2.5 py-1 rounded-full transition-all flex-shrink-0 ${
              isFollowing
                ? 'bg-surface-2 text-muted hover:bg-red-50 hover:text-red-400'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            {isFollowing ? '✓ Takip Ediliyor' : '+ Takip Et'}
          </button>
        )}
      </div>
    </div>
  );
});

PublicPlanCard.displayName = 'PublicPlanCard';
