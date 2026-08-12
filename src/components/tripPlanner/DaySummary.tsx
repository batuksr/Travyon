import React from 'react';
import { useTranslation } from 'react-i18next';

interface DaySummaryProps {
  dateLabel: string;
  summary: string;
  estimate: number;
}

const DaySummary: React.FC<DaySummaryProps> = ({ dateLabel, summary, estimate }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-start justify-between gap-4 px-3.5 py-3 border-b border-divider shrink-0">
      <div className="min-w-0">
        <p className="text-[11px] text-muted mb-1">{dateLabel}</p>
        <p className="text-[14px] font-medium leading-snug text-text">{summary}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[11px] text-muted">{t('dashboard.daySummary.estimated')}</p>
        <p className="font-medium text-[16px] text-accent-700">€{estimate}</p>
      </div>
    </div>
  );
};

export default DaySummary;
