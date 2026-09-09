import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, CalendarDays, Check, Copy, ExternalLink, Pencil, Plus, Trash2, X,
} from 'lucide-react';
import AppIcon from '../components/AppIcon';
import IconBadge from '../components/IconBadge';
import { useAuthStore } from '../store/useAuthStore';
import { useUserPlans } from '../store/useSavedPlansStore';
import {
  EMPTY_WALLET_ENTRIES,
  normalizeWalletUrl,
  useTravelWalletStore,
  type TravelWalletCategory,
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

const emptyForm = (planId: string): TravelWalletInput => ({
  planId,
  category: 'flight',
  title: '',
  reference: '',
  date: '',
  note: '',
  url: '',
});

const TravelWallet: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
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

  const categoryCount = new Set(entries.map((entry) => entry.category)).size;
  const today = new Date().toISOString().slice(0, 10);
  const upcomingCount = entries.filter((entry) => entry.date && entry.date >= today).length;
  const locale = i18n.language === 'en' ? 'en-US' : 'tr-TR';

  const categoryIcon = (category: TravelWalletCategory) =>
    CATEGORIES.find((item) => item.id === category)?.icon ?? 'compass';

  const openNewEntry = () => {
    setEditingId(null);
    setForm(emptyForm(planId));
    setFormError('');
    setFormOpen(true);
  };

  const openEditEntry = (entry: TravelWalletEntry) => {
    setEditingId(entry.id);
    setForm({
      planId: entry.planId,
      category: entry.category,
      title: entry.title,
      reference: entry.reference,
      date: entry.date,
      note: entry.note,
      url: entry.url,
    });
    setFormError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setFormError('');
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
    else addEntry(input);
    closeForm();
  };

  const handlePlanChange = (nextPlanId: string) => {
    setSearchParams({ planId: nextPlanId });
    setDeleteId(null);
  };

  const copyReference = async (entry: TravelWalletEntry) => {
    try {
      await navigator.clipboard.writeText(entry.reference);
      setCopiedId(entry.id);
      window.setTimeout(() => setCopiedId((current) => current === entry.id ? null : current), 1800);
    } catch {
      setCopiedId(null);
    }
  };

  const formatDate = (value: string) => {
    if (!value) return '';
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
      .format(new Date(`${value}T12:00:00`));
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-7 sm:py-10">
        <button
          type="button"
          onClick={() => navigate('/hub')}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-text"
        >
          <ArrowLeft size={15} strokeWidth={2.3} /> {t('travelWallet.back')}
        </button>

        <header className="relative mb-5 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#52613f] to-[#34412d] px-6 py-7 text-[#fffaf2] shadow-[0_18px_45px_rgba(54,65,42,0.18)] sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-12 -top-20 size-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-20 right-24 size-44 rounded-full bg-white/[0.04]" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 flex items-center gap-2 text-[10px] font-heading uppercase tracking-[0.18em] text-white/65">
                <AppIcon name="shield" size={14} /> {t('travelWallet.eyebrow')}
              </p>
              <h1 className="font-heading text-3xl leading-tight sm:text-4xl">{t('travelWallet.title')}</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/72">
                {t('travelWallet.subtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={openNewEntry}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#fffaf2] px-5 py-3 text-sm font-heading text-[#485537] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white sm:w-auto"
            >
              <Plus size={16} /> {t('travelWallet.addEntry')}
            </button>
          </div>
        </header>

        <section className="mb-5 rounded-3xl border border-divider bg-surface p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <label htmlFor="travel-wallet-plan" className="mb-1.5 block text-[10px] font-heading uppercase tracking-widest text-muted">
                {t('travelWallet.currentTrip')}
              </label>
              {plans.length > 0 ? (
                <div className="relative">
                  <select
                    id="travel-wallet-plan"
                    value={planId}
                    onChange={(event) => handlePlanChange(event.target.value)}
                    className="w-full appearance-none rounded-xl border border-divider bg-surface py-2.5 pl-3 pr-10 text-sm font-semibold text-text outline-none transition-colors focus:border-sage sm:min-w-72"
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.customName || plan.plan.destination}
                      </option>
                    ))}
                  </select>
                  <AppIcon name="map-pin" size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                </div>
              ) : (
                <p className="text-sm font-semibold text-text">{t('travelWallet.general')}</p>
              )}
            </div>

            <div className="grid grid-cols-3 divide-x divide-divider rounded-2xl border border-divider bg-surface-2 px-2 py-3 sm:min-w-[390px]">
              <div className="px-3 text-center">
                <p className="font-heading text-lg text-text">{entries.length}</p>
                <p className="text-[10px] text-muted">{t('travelWallet.stats.records')}</p>
              </div>
              <div className="px-3 text-center">
                <p className="font-heading text-lg text-text">{categoryCount}</p>
                <p className="text-[10px] text-muted">{t('travelWallet.stats.categories')}</p>
              </div>
              <div className="px-3 text-center">
                <p className="font-heading text-lg text-text">{upcomingCount}</p>
                <p className="text-[10px] text-muted">{t('travelWallet.stats.upcoming')}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-sage/20 bg-sage/5 px-4 py-3 text-xs leading-relaxed text-muted">
          <AppIcon name="lock" size={16} className="mt-0.5 text-sage-700" />
          <p>{t('travelWallet.localOnly')}</p>
        </div>

        {entries.length === 0 ? (
          <section className="flex min-h-72 flex-col items-center justify-center rounded-[28px] border border-dashed border-divider bg-surface px-6 py-12 text-center">
            <span className="mb-5 inline-flex size-14 items-center justify-center rounded-2xl bg-sage/10 text-sage-700">
              <AppIcon name="ticket" size={26} />
            </span>
            <h2 className="font-heading text-xl text-text">{t('travelWallet.empty.title')}</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{t('travelWallet.empty.description', { city })}</p>
            <button
              type="button"
              onClick={openNewEntry}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-heading text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent-700"
            >
              <Plus size={15} /> {t('travelWallet.empty.cta')}
            </button>
          </section>
        ) : (
          <section aria-labelledby="wallet-records-title">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="wallet-records-title" className="text-xs font-heading uppercase tracking-wider text-muted">
                {t('travelWallet.recordsTitle')}
              </h2>
              <span className="text-xs text-muted">{t('travelWallet.recordCount', { count: entries.length })}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {entries.map((entry) => (
                <article key={entry.id} className="group flex min-h-60 flex-col rounded-3xl border border-divider bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-sage/35 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <IconBadge icon={categoryIcon(entry.category)} variant="inline" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-heading uppercase tracking-widest text-muted">
                          {t(`travelWallet.categories.${entry.category}`)}
                        </p>
                        <h3 className="mt-0.5 truncate font-heading text-base text-text">{entry.title}</h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditEntry(entry)}
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-divider text-muted transition-colors hover:border-sage/40 hover:text-text"
                      aria-label={t('travelWallet.actions.edit')}
                    >
                      <Pencil size={14} />
                    </button>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {entry.reference && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-divider bg-surface-2 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-[9px] font-heading uppercase tracking-widest text-muted">{t('travelWallet.reference')}</p>
                          <p className="mt-0.5 truncate font-mono text-sm font-semibold tracking-wide text-text">{entry.reference}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyReference(entry)}
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-sage/10 hover:text-sage-700"
                          aria-label={t('travelWallet.actions.copy')}
                        >
                          {copiedId === entry.id ? <Check size={15} /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}
                    {entry.date && (
                      <p className="flex items-center gap-2 text-xs text-muted">
                        <CalendarDays size={14} className="text-sage-700" /> {formatDate(entry.date)}
                      </p>
                    )}
                    {entry.note && <p className="line-clamp-3 text-xs leading-relaxed text-muted">{entry.note}</p>}
                  </div>

                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-divider pt-4">
                    {entry.url ? (
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 text-xs font-heading text-accent transition-colors hover:text-accent-700"
                      >
                        {t('travelWallet.actions.openLink')} <ExternalLink size={12} />
                      </a>
                    ) : <span />}

                    {deleteId === entry.id ? (
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setDeleteId(null)} className="text-[11px] font-semibold text-muted hover:text-text">
                          {t('travelWallet.actions.cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { removeEntry(entry.id); setDeleteId(null); }}
                          className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40"
                        >
                          {t('travelWallet.actions.confirmDelete')}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteId(entry.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted transition-colors hover:text-rose-600"
                      >
                        <Trash2 size={13} /> {t('travelWallet.actions.delete')}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wallet-form-title"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}
        >
          <form onSubmit={handleSubmit} className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-divider bg-surface p-5 shadow-2xl sm:max-w-2xl sm:rounded-[28px] sm:p-7">
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
                      onClick={() => setForm((current) => ({ ...current, category: category.id }))}
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
                  placeholder={t('travelWallet.form.titlePlaceholder')}
                  className="w-full rounded-2xl border border-divider bg-surface px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted/65 focus:border-sage"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-text">{t('travelWallet.form.referenceLabel')}</span>
                <input
                  value={form.reference}
                  onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))}
                  maxLength={80}
                  placeholder={t('travelWallet.form.referencePlaceholder')}
                  className="w-full rounded-2xl border border-divider bg-surface px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted/65 focus:border-sage"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-text">{t('travelWallet.form.dateLabel')}</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  className="w-full rounded-2xl border border-divider bg-surface px-4 py-3 text-sm text-text outline-none transition-colors focus:border-sage"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-text">{t('travelWallet.form.urlLabel')}</span>
                <input
                  type="text"
                  inputMode="url"
                  value={form.url}
                  onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                  maxLength={500}
                  placeholder={t('travelWallet.form.urlPlaceholder')}
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
                  placeholder={t('travelWallet.form.notePlaceholder')}
                  className="w-full resize-none rounded-2xl border border-divider bg-surface px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted/65 focus:border-sage"
                />
              </label>
            </div>

            {formError && (
              <p className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/30">
                <AppIcon name="warning" size={15} /> {formError}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-divider pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeForm} className="rounded-full border border-divider px-5 py-2.5 text-sm font-heading text-muted transition-colors hover:text-text">
                {t('travelWallet.actions.cancel')}
              </button>
              <button type="submit" className="rounded-full bg-accent px-6 py-2.5 text-sm font-heading text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent-700">
                {editingId ? t('travelWallet.actions.update') : t('travelWallet.actions.save')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TravelWallet;
