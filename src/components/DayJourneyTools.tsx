import { Check, Navigation, Undo2, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DailyPlan } from '../services/aiService';
import { useAuthStore } from '../store/useAuthStore';
import { useTravelWalletStore, EMPTY_WALLET_ENTRIES, normalizeWalletUrl } from '../store/useTravelWalletStore';
import { directionsUrl, walletEntriesForDay } from '../utils/planJourney';

interface Props { day: DailyPlan; destination: string; planId: string | null; canUndo: boolean; onUndo: () => void }

export default function DayJourneyTools({ day, destination, planId, canUndo, onUndo }: Props) {
  const { t } = useTranslation();
  const uid = useAuthStore(state => state.user?.uid);
  const allEntries = useTravelWalletStore(state => state.entriesByUser[uid ?? 'anonymous'] ?? EMPTY_WALLET_ENTRIES);
  const entries = walletEntriesForDay(allEntries, planId, day.date);
  const completed = day.activities.filter(activity => activity.completed).length;
  const next = day.activities.find(activity => !activity.completed);
  const text = (key: string) => t(`dashboard.journey.${key}`);
  return (
    <div className="border-b border-divider bg-surface px-4 py-3 text-text" data-testid="day-journey-tools">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="flex items-center gap-1.5 text-xs font-semibold text-sage-700"><Check size={14} />{t('dashboard.journey.progress', { done: completed, total: day.activities.length })}</p>
        <button type="button" onClick={onUndo} disabled={!canUndo} title={text('undoHint')} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-divider px-2 text-xs disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent"><Undo2 size={14} />{text('undo')}</button>
      </div>
      {next ? <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 text-xs leading-relaxed"><span className="text-muted">{text('next')} </span><strong className="break-words">{next.placeName}</strong></p>
        <a href={directionsUrl(next, destination)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-accent-700"><Navigation size={13} />{text('directions')}</a>
      </div> : <p className="mt-2 text-xs text-muted">{text(day.activities.length ? 'allDone' : 'noStops')}</p>}
      <details className="mt-2 rounded-xl border border-divider bg-bg/40">
        <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold"><span className="ml-1 inline-flex items-center gap-2"><Wallet size={14} />{text('wallet')} · {entries.length}</span></summary>
        <div className="max-h-56 space-y-2 overflow-y-auto px-3 pb-3">
          {!entries.length && <p className="text-xs leading-relaxed text-muted">{text(planId ? 'emptyWallet' : 'unsavedWallet')}</p>}
          {entries.map(entry => {
            const safeUrl = normalizeWalletUrl(entry.url);
            return <details key={entry.id} className="rounded-lg border border-divider bg-surface p-2.5">
              <summary className="cursor-pointer text-xs"><span className="font-semibold">{entry.title}</span><span className="ml-2 text-muted">{entry.details?.time || t(`travelWallet.categories.${entry.category}`)}</span></summary>
              <dl className="mt-2 space-y-2 text-xs">
                {entry.reference && <div><dt className="text-muted">{t(`travelWallet.form.referenceLabels.${entry.category}`)}</dt><dd className="break-all font-semibold">{entry.reference}</dd></div>}
                <div><dt className="text-muted">{t(`travelWallet.form.dateLabels.${entry.category}`)}</dt><dd>{entry.date}</dd></div>
                {Object.entries(entry.details ?? {}).filter(([, value]) => value).map(([key, value]) => <div key={key}><dt className="text-muted">{t(`travelWallet.fields.${key}.label`, { defaultValue: key })}</dt><dd className="break-words">{value}</dd></div>)}
              </dl>
              {entry.note && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-muted">{entry.note}</p>}
              {safeUrl && <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-9 items-center text-xs text-accent-700 underline">{text('openBooking')}</a>}
            </details>;
          })}
          <p className="text-[10px] leading-relaxed text-muted">{text('walletNote')}</p>
        </div>
      </details>
    </div>
  );
}
