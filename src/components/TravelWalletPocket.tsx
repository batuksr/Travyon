import { motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Plus, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppIcon from './AppIcon';
import type { TravelWalletEntry } from '../store/useTravelWalletStore';
import './TravelWalletPocket.css';

interface Props {
  entries: TravelWalletEntry[];
  selectedId?: string;
  newEntryId: string | null;
  city: string;
  onSelect: (id: string, revealDetails?: boolean) => void;
  onAdd: () => void;
  onStored: () => void;
}

const ICONS = {
  flight: 'plane', stay: 'hotel', ticket: 'ticket',
  insurance: 'shield', document: 'document', other: 'compass',
};
const CARDS_PER_POCKET = 4;

export default function TravelWalletPocket({
  entries, selectedId, newEntryId, city, onSelect, onAdd, onStored,
}: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const selectedIndex = Math.max(0, entries.findIndex(entry => entry.id === selectedId));
  const page = Math.floor(selectedIndex / CARDS_PER_POCKET);
  const pageCount = Math.max(1, Math.ceil(entries.length / CARDS_PER_POCKET));
  const visibleEntries = entries.slice(page * CARDS_PER_POCKET, (page + 1) * CARDS_PER_POCKET);

  return (
    <div className="travel-wallet-object">
      <div className="wallet-scene" aria-label={t('travelWallet.pocket.label')}>
        <div className="wallet-ground-shadow" aria-hidden="true" />
        <div className="wallet-leather wallet-back" aria-hidden="true" />
        <div className="wallet-lining" aria-hidden="true" />

        {visibleEntries.map((entry, index) => {
          const selected = entry.id === selectedId;
          const isNew = entry.id === newEntryId;
          return (
            <motion.button
              type="button"
              key={entry.id}
              className={`wallet-pocket-card wallet-tone-${entry.category}${selected ? ' is-selected' : ''}`}
              style={{ top: 208 - (visibleEntries.length - 1 - index) * 56, zIndex: index + 2 }}
              initial={isNew && !reducedMotion ? { y: -210, rotate: -9, scale: 1.04, opacity: 0 } : false}
              animate={{ y: selected ? -8 : 0, rotate: 0, scale: 1, opacity: 1 }}
              transition={isNew
                ? { duration: reducedMotion ? 0 : 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.12 }
                : { duration: reducedMotion ? 0 : 0.25 }}
              onAnimationComplete={() => { if (isNew) onStored(); }}
              onClick={() => onSelect(entry.id, true)}
              aria-pressed={selected}
              aria-controls="wallet-selected-record"
              aria-label={t('travelWallet.pocket.openCard', { title: entry.title, category: t(`travelWallet.categories.${entry.category}`) })}
            >
              <span className="wallet-pocket-card-icon"><AppIcon name={ICONS[entry.category]} size={19} /></span>
              <span className="wallet-pocket-card-text">
                <span className="wallet-pocket-card-category">{t(`travelWallet.categories.${entry.category}`)}</span>
                <span className="wallet-pocket-card-title">{entry.title}</span>
              </span>
              <span className="wallet-pocket-card-indicator" aria-hidden="true">
                {selected ? <Check size={13} /> : <ChevronRight size={14} />}
              </span>
              <span className="wallet-pocket-card-rule" aria-hidden="true" />
            </motion.button>
          );
        })}

        {entries.length === 0 && (
          <button type="button" className="wallet-pocket-card wallet-blank-card" onClick={onAdd}>
            <span className="wallet-pocket-card-icon"><Plus size={20} /></span>
            <span className="wallet-pocket-card-text">
              <span className="wallet-pocket-card-category">{t('travelWallet.pocket.firstJourney')}</span>
              <span className="wallet-pocket-card-title">{t('travelWallet.empty.cta')}</span>
            </span>
            <span className="wallet-pocket-card-rule" aria-hidden="true" />
          </button>
        )}

        <div className="wallet-leather wallet-front" aria-hidden="true">
          <div className="wallet-stitching" />
          <div className="wallet-embossed-logo"><Send size={25} strokeWidth={1.3} /><span>travyon</span></div>
          <div className="wallet-embossed-footer"><span>{t('travelWallet.pocket.personal')}</span><span>{city}</span></div>
        </div>
        <div className="wallet-leather wallet-strap" aria-hidden="true"><span className="wallet-snap" /></div>
      </div>

      <div className="wallet-object-caption">
        <span><span className="wallet-caption-dot" />{t('travelWallet.recordCount', { count: entries.length })}</span>
        {pageCount > 1 && (
          <div className="wallet-pocket-pagination" aria-label={t('travelWallet.pocket.pages')}>
            <button type="button" disabled={page === 0} onClick={() => onSelect(entries[(page - 1) * CARDS_PER_POCKET].id)} aria-label={t('travelWallet.pocket.previous')}><ChevronLeft size={16} /></button>
            <span>{page + 1} / {pageCount}</span>
            <button type="button" disabled={page + 1 === pageCount} onClick={() => onSelect(entries[(page + 1) * CARDS_PER_POCKET].id)} aria-label={t('travelWallet.pocket.next')}><ChevronRight size={16} /></button>
          </div>
        )}
        <button type="button" className="wallet-add-card" onClick={onAdd}><Plus size={14} />{t('travelWallet.pocket.addCard')}</button>
      </div>
      <p className="wallet-object-hint">{t(entries.length ? 'travelWallet.pocket.hint' : 'travelWallet.pocket.emptyHint')}</p>
    </div>
  );
}
