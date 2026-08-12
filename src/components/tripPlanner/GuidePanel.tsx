import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Bus, Users, Lightbulb } from 'lucide-react';

interface GuidePanelProps {
  onClose: () => void;
}

const SECTIONS = [
  { key: 'transport', Icon: Bus },
  { key: 'culture', Icon: Users },
  { key: 'tips', Icon: Lightbulb },
] as const;

const GuidePanel: React.FC<GuidePanelProps> = ({ onClose }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="absolute inset-y-0 right-0 w-full sm:w-[min(430px,90%)] bg-surface border-l border-divider shadow-2xl flex flex-col z-30"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-divider shrink-0">
        <p className="font-heading font-semibold text-[17px] text-text">{t('home.product.demo.guide.panelTitle')}</p>
        <button type="button" onClick={onClose} className="text-muted hover:text-text transition-colors p-1">
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {SECTIONS.map(({ key, Icon }) => (
          <div key={key} className="mb-6 last:mb-0">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <Icon size={17} strokeWidth={2} />
              <span className="font-heading font-bold text-[11px] uppercase tracking-[0.14em]">
                {t(`home.product.demo.guide.${key}.title`)}
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-muted">{t(`home.product.demo.guide.${key}.body`)}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default GuidePanel;
