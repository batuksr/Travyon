import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays, Check, Copy, ExternalLink, Pencil, Plus, Trash2, X,
} from 'lucide-react';
import AppIcon from '../components/AppIcon';
import IconBadge from '../components/IconBadge';
import TravelWalletPocket from '../components/TravelWalletPocket';
import { useAuthStore } from '../store/useAuthStore';
import { useUserPlans } from '../store/useSavedPlansStore';
import {
  EMPTY_WALLET_ENTRIES,
  normalizeWalletUrl,
  useTravelWalletStore,
  type TravelWalletCategory,
  type TravelWalletDetailKey,
  type TravelWalletEntry,
  type TravelWalletInput,
} from '../store/useTravelWalletStore';

const CATEGORIES: Array<{ id: TravelWalletCategory; icon: string }> = [
  { id: 'flight', icon: 'plane' },
  { id: 'stay', icon: 'hotel' },
  { id: 'ticket', icon: 'ticket' },
  { id: 'insurance', icon: 'shield' },
  { id: 'document', icon: 'document' },
  { id: 'other', icon: 'compass' },
];

type WalletFieldType = 'text' | 'date' | 'time' | 'tel';
type WalletCategoryField = { key: TravelWalletDetailKey; type?: WalletFieldType; wide?: boolean };

const CATEGORY_FIELDS: Record<TravelWalletCategory, WalletCategoryField[]> = {
  flight: [
    { key: 'airline' }, { key: 'flightNumber' },
    { key: 'origin' }, { key: 'destination' },
    { key: 'time', type: 'time' }, { key: 'terminal' },
    { key: 'seat' }, { key: 'baggage' },
  ],
  stay: [
    { key: 'address', wide: true },
    { key: 'checkOut', type: 'date' },
    { key: 'roomType' }, { key: 'contact', type: 'tel' },
  ],
  ticket: [
    { key: 'venue', wide: true }, { key: 'time', type: 'time' },
    { key: 'seat' }, { key: 'gate' },
  ],
  insurance: [
    { key: 'insurer' }, { key: 'endDate', type: 'date' },
    { key: 'emergencyPhone', type: 'tel', wide: true },
  ],
  document: [
    { key: 'documentType' },
    { key: 'expiryDate', type: 'date' }, { key: 'issuer' },
  ],
  other: [],
};

const emptyForm = (planId: string): TravelWalletInput => ({
  planId,
  category: 'flight',
  title: '',
  reference: '',
  date: '',
  note: '',
  url: '',
  details: {},
});

const TravelWallet: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = useAuthStore((state) => state.user?.uid ?? '');
  const plans = useUserPlans();
  const allEntries = useTravelWalletStore(
    (state) => state.entriesByUser[userId] ?? EMPTY_WALLET_ENTRIES,
  );
  const addEntry = useTravelWalletStore((state) => state.addEntry);
  const updateEntry = useTravelWalletStore((state) => state.updateEntry);
  const removeEntry = useTravelWalletStore((state) => state.removeEntry);

  const requestedPlanId = searchParams.get('planId');
  const selectedPlan = plans.find((plan) => plan.id === requestedPlanId) ?? plans[0];
  const planId = selectedPlan?.id ?? 'general';
  const city = selectedPlan?.plan.destination.split(',')[0].trim() ?? t('travelWallet.general');
  const entries = useMemo(
    () => allEntries
      .filter((entry) => entry.planId === planId)
      .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || b.createdAt - a.createdAt),
    [allEntries, planId],
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TravelWalletInput>(() => emptyForm(planId));
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newEntryId, setNewEntryId] = useState<string | null>(null);
  const selectedEntry = entries.find(entry => entry.id === selectedId) ?? entries[0];
  const walletRef = useRef<HTMLElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const formTriggerRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!formOpen) return;
    const previousFocus = formTriggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFormOpen(false);
      if (event.key !== 'Tab') return;
      const controls = formRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input, textarea, select, a[href]');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [formOpen]);

  const categoryCount = new Set(entries.map((entry) => entry.category)).size;
  const locale = i18n.language === 'en' ? 'en-US' : 'tr-TR';
  const categoryFields = CATEGORY_FIELDS[form.category];
  const selectedDetailFields = selectedEntry
    ? CATEGORY_FIELDS[selectedEntry.category].filter((field) => selectedEntry.details?.[field.key])
    : [];

  const categoryIcon = (category: TravelWalletCategory) =>
    CATEGORIES.find((item) => item.id === category)?.icon ?? 'compass';

  const openNewEntry = () => {
    formTriggerRef.current = document.activeElement as HTMLElement | null;
    setEditingId(null);
    setForm(emptyForm(planId));
    setFormError('');
    setFormOpen(true);
  };

  const openEditEntry = (entry: TravelWalletEntry) => {
    formTriggerRef.current = document.activeElement as HTMLElement | null;
    setEditingId(entry.id);
    setForm({
      planId: entry.planId,
      category: entry.category,
      title: entry.title,
      reference: entry.reference,
      date: entry.date,
      note: entry.note,
      url: entry.url,
      details: { ...(entry.details ?? {}) },
    });
    setFormError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setFormError('');
  };

  const selectEntry = (id: string, revealDetails = false) => {
    setSelectedId(id);
    setDeleteId(null);
    setCopiedId(null);
    setCopyFeedback('');
    if (revealDetails && window.matchMedia('(max-width: 900px)').matches) {
      detailRef.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setFormError(t('travelWallet.form.titleRequired'));
      return;
    }
    if (normalizeWalletUrl(form.url) === null) {
      setFormError(t('travelWallet.form.urlInvalid'));
      return;
    }

    const input = { ...form, planId };
    if (editingId) updateEntry(editingId, input);
    else {
      const id = addEntry(input);
      selectEntry(id);
      setNewEntryId(reducedMotion ? null : id);
    }
    closeForm();
    // Bring the pocket into view before the new card slides into it, including on mobile.
    walletRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
  };

  const handlePlanChange = (nextPlanId: string) => {
    setSearchParams({ planId: nextPlanId });
    selectEntry('');
    setNewEntryId(null);
  };

  const copyReference = async (entry: TravelWalletEntry) => {
    try {
      await navigator.clipboard.writeText(entry.reference);
      setCopiedId(entry.id);
      setCopyFeedback(t('travelWallet.pocket.copied'));
    } catch {
      setCopiedId(null);
      setCopyFeedback(t('travelWallet.pocket.copyFailed'));
    }
  };

  const formatDate = (value: string) => {
    if (!value) return '';
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
      .format(new Date(`${value}T12:00:00`));
  };

  const formatDetailValue = (field: WalletCategoryField, value: string) =>
    field.type === 'date' ? formatDate(value) : value;

  const setDetailValue = (key: TravelWalletDetailKey, value: string) => {
    setForm((current) => ({
      ...current,
      details: { ...(current.details ?? {}), [key]: value },
    }));
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-4 pt-4 pb-6 sm:px-7 sm:pt-6 sm:pb-10">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="mb-2 text-[10px] font-heading uppercase tracking-[0.18em] text-accent-700">{t('travelWallet.eyebrow')}</p>
            <h1 className="font-heading text-3xl leading-tight text-text sm:text-4xl">{t('travelWallet.title')}</h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">{t('travelWallet.pocket.subtitle')}</p>
          </div>
          <button type="button" onClick={openNewEntry} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#43563d] px-5 py-3 text-sm font-heading text-[#fffaf2] shadow-sm transition-colors hover:bg-[#34452e]">
            <Plus size={16} /> {t('travelWallet.addEntry')}
          </button>
        </header>

        <section className="flex flex-col gap-4 border-y border-divider py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <AppIcon name="map-pin" size={19} className="text-sage-700" />
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <label htmlFor="travel-wallet-plan" className="mb-1 block text-[9px] font-semibold uppercase tracking-widest text-muted">{t('travelWallet.currentTrip')}</label>
              {plans.length > 0 ? (
                <select id="travel-wallet-plan" value={planId} onChange={event => handlePlanChange(event.target.value)} className="w-full rounded-lg border border-divider px-2.5 py-2 text-xs font-semibold text-text outline-none focus:border-sage">
                  {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.customName || plan.plan.destination}</option>)}
                </select>
              ) : <p className="text-sm font-semibold text-text">{t('travelWallet.general')}</p>}
            </div>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted">
            <span><span className="mr-1 font-semibold text-text">{entries.length}</span> {t('travelWallet.stats.records')}</span>
            <span><span className="mr-1 font-semibold text-text">{categoryCount}</span> {t('travelWallet.stats.categories')}</span>
          </div>
        </section>

        <section ref={walletRef} className="wallet-workspace" aria-label={t('travelWallet.recordsTitle')}>
          <TravelWalletPocket
            key={planId}
            entries={entries}
            selectedId={selectedEntry?.id}
            newEntryId={newEntryId}
            city={city}
            onSelect={selectEntry}
            onAdd={openNewEntry}
            onStored={() => setNewEntryId(null)}
          />

          <div ref={detailRef} className="wallet-detail-area">
            <AnimatePresence mode="wait" initial={false}>
              {selectedEntry ? (
                <motion.div
                  key={selectedEntry.id}
                  initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.2 }}
                >
                  <div className="wallet-detail-overline">
                    <p>{t('travelWallet.pocket.selectedCard')}</p>
                    <span role="status"><Check size={12} />{t(newEntryId ? 'travelWallet.pocket.storing' : 'travelWallet.pocket.stored')}</span>
                  </div>
                  <article id="wallet-selected-record" className="wallet-record-detail" aria-labelledby="wallet-detail-title">
                    <div className={`wallet-detail-top wallet-tone-${selectedEntry.category}`}>
                      <p className="wallet-detail-category"><AppIcon name={categoryIcon(selectedEntry.category)} size={18} />{t(`travelWallet.categories.${selectedEntry.category}`)}</p>
                      <h2 id="wallet-detail-title" className="wallet-detail-title">{selectedEntry.title}</h2>
                      <p className="wallet-detail-city"><AppIcon name="map-pin" size={12} />{city}</p>
                    </div>

                    <div className="wallet-detail-body">
                      {selectedEntry.reference && (
                        <div className="flex min-w-0 items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="wallet-detail-label">{t(`travelWallet.form.referenceLabels.${selectedEntry.category}`)}</span>
                            <p className="wallet-detail-reference">{selectedEntry.reference}</p>
                          </div>
                          <button type="button" onClick={() => copyReference(selectedEntry)} className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-divider text-sage-700 hover:bg-sage/10" aria-label={t('travelWallet.actions.copy')}>
                            {copiedId === selectedEntry.id ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        </div>
                      )}
                      {selectedEntry.date && (
                        <div>
                          <span className="wallet-detail-label">{t(`travelWallet.form.dateLabels.${selectedEntry.category}`)}</span>
                          <p className="flex items-center gap-2 text-sm text-text"><CalendarDays size={15} className="text-muted" />{formatDate(selectedEntry.date)}</p>
                        </div>
                      )}
                      {selectedDetailFields.length > 0 && (
                        <dl className="wallet-detail-grid">
                          {selectedDetailFields.map((field) => {
                            const value = selectedEntry.details?.[field.key] ?? '';
                            return (
                              <div key={field.key} className={field.wide ? 'sm:col-span-2' : ''}>
                                <dt className="wallet-detail-label">{t(`travelWallet.fields.${field.key}.label`)}</dt>
                                <dd className="wallet-detail-value">{formatDetailValue(field, value)}</dd>
                              </div>
                            );
                          })}
                        </dl>
                      )}
                      {selectedEntry.note && (
                        <div>
                          <span className="wallet-detail-label">{t('travelWallet.form.noteLabel')}</span>
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{selectedEntry.note}</p>
                        </div>
                      )}
                      {!selectedEntry.reference && !selectedEntry.date && selectedDetailFields.length === 0 && !selectedEntry.note && !selectedEntry.url && (
                        <p className="text-sm leading-relaxed text-muted">{t('travelWallet.pocket.addDetails')}</p>
                      )}
                      {selectedEntry.url && (
                        <a href={selectedEntry.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 text-xs font-semibold text-accent-700">
                          {t('travelWallet.actions.openLink')} <ExternalLink size={13} />
                        </a>
                      )}
                    </div>

                    <div className="wallet-detail-actions">
                      <button type="button" onClick={() => openEditEntry(selectedEntry)} className="wallet-detail-edit"><Pencil size={13} />{t('travelWallet.actions.edit')}</button>
                      {deleteId === selectedEntry.id ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <button type="button" onClick={() => setDeleteId(null)} className="py-2 text-xs text-muted">{t('travelWallet.actions.cancel')}</button>
                          <button type="button" onClick={() => { removeEntry(selectedEntry.id); setDeleteId(null); }} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 dark:bg-rose-950/40">{t('travelWallet.actions.confirmDelete')}</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setDeleteId(selectedEntry.id)} className="inline-flex items-center gap-1.5 py-2 text-xs text-muted hover:text-rose-600"><Trash2 size={13} />{t('travelWallet.actions.delete')}</button>
                      )}
                    </div>
                  </article>
                  <p className="mt-3 min-h-4 text-center text-xs text-sage-700" role="status">{copyFeedback}</p>
                </motion.div>
              ) : (
                <motion.div key="empty-wallet" id="wallet-selected-record" className="wallet-empty-detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.2 }}>
                  <h2>{t('travelWallet.pocket.emptyTitle')}</h2>
                  <p>{t('travelWallet.pocket.emptyDescription')}</p>
                  <ul>
                    {['flight', 'stay', 'ticket'].map(category => (
                      <li key={category}>
                        <IconBadge icon={categoryIcon(category as TravelWalletCategory)} variant="inline" />
                        {t(`travelWallet.pocket.examples.${category}`)}
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={openNewEntry} className="inline-flex items-center gap-2 text-sm font-semibold text-accent-700"><Plus size={15} />{t('travelWallet.empty.cta')}</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <p className="wallet-storage-note"><AppIcon name="lock" size={14} />{t('travelWallet.pocket.storageNote')}</p>
      </div>
      {formOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wallet-form-title"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}
        >
          <form ref={formRef} onSubmit={handleSubmit} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] border border-divider bg-surface p-5 shadow-2xl sm:max-w-2xl sm:rounded-[28px] sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-heading uppercase tracking-widest text-accent">{city}</p>
                <h2 id="wallet-form-title" className="mt-1 font-heading text-2xl text-text">
                  {editingId ? t('travelWallet.form.editTitle') : t('travelWallet.form.addTitle')}
                </h2>
              </div>
              <button type="button" onClick={closeForm} className="inline-flex size-10 items-center justify-center rounded-full border border-divider text-muted hover:text-text" aria-label={t('travelWallet.actions.close')}>
                <X size={17} />
              </button>
            </div>

            <fieldset className="mb-5">
              <legend className="mb-2 text-[10px] font-heading uppercase tracking-widest text-muted">{t('travelWallet.form.category')}</legend>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {CATEGORIES.map((category) => {
                  const selected = form.category === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setForm((current) => ({ ...current, category: category.id, details: {} }))}
                      className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center transition-colors ${selected ? 'border-accent bg-accent-100 text-accent-700' : 'border-divider bg-surface text-muted hover:border-sage/40 hover:text-text'}`}
                    >
                      <AppIcon name={category.icon} size={19} />
                      <span className="text-[10px] font-semibold leading-tight">{t(`travelWallet.categories.${category.id}`)}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-text">{t('travelWallet.form.titleLabel')} *</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  maxLength={100}
                  autoFocus
                  placeholder={t(`travelWallet.form.titlePlaceholders.${form.category}`)}
                  className="w-full rounded-2xl border border-divider bg-surface px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted/65 focus:border-sage"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-text">{t(`travelWallet.form.referenceLabels.${form.category}`)}</span>
                <input
                  value={form.reference}
                  onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))}
                  maxLength={80}
                  placeholder={t(`travelWallet.form.referencePlaceholders.${form.category}`)}
                  className="w-full rounded-2xl border border-divider bg-surface px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted/65 focus:border-sage"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-text">{t(`travelWallet.form.dateLabels.${form.category}`)}</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  className="w-full rounded-2xl border border-divider bg-surface px-4 py-3 text-sm text-text outline-none transition-colors focus:border-sage"
                />
              </label>
              {categoryFields.length > 0 && (
                <fieldset className="sm:col-span-2 rounded-2xl border border-divider bg-bg/45 p-4">
                  <legend className="px-2 text-[10px] font-heading uppercase tracking-widest text-accent-700">
                    {t(`travelWallet.form.categoryDetails.${form.category}`)}
                  </legend>
                  <p className="mb-4 text-xs leading-relaxed text-muted">{t('travelWallet.form.categoryDetailsHint')}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {categoryFields.map((field) => (
                      <label key={field.key} className={field.wide ? 'sm:col-span-2' : ''}>
                        <span className="mb-1.5 block text-xs font-semibold text-text">{t(`travelWallet.fields.${field.key}.label`)}</span>
                        <input
                          type={field.type ?? 'text'}
                          value={form.details?.[field.key] ?? ''}
                          onChange={(event) => setDetailValue(field.key, event.target.value)}
                          maxLength={160}
                          placeholder={t(`travelWallet.fields.${field.key}.placeholder`)}
                          className="w-full rounded-xl border border-divider bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-muted/60 focus:border-sage"
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-text">{t('travelWallet.form.urlLabel')}</span>
                <input
                  type="text"
                  inputMode="url"
                  value={form.url}
                  onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                  maxLength={500}
                  placeholder={t(`travelWallet.form.urlPlaceholders.${form.category}`)}
                  className="w-full rounded-2xl border border-divider bg-surface px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted/65 focus:border-sage"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-text">{t('travelWallet.form.noteLabel')}</span>
                <textarea
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  maxLength={500}
                  rows={3}
                  placeholder={t(`travelWallet.form.notePlaceholders.${form.category}`)}
                  className="w-full resize-none rounded-2xl border border-divider bg-surface px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted/65 focus:border-sage"
                />
              </label>
            </div>

            {formError && (
              <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/30">
                <AppIcon name="warning" size={15} /> {formError}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-divider pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeForm} className="rounded-full border border-divider px-5 py-2.5 text-sm font-heading text-muted transition-colors hover:text-text">
                {t('travelWallet.actions.cancel')}
              </button>
              <button type="submit" className="rounded-full bg-accent px-6 py-2.5 text-sm font-heading text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent-700">
                {editingId ? t('travelWallet.actions.update') : t('travelWallet.pocket.putInWallet')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TravelWallet;
