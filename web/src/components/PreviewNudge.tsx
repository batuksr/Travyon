import React from 'react';
import { useTranslation } from 'react-i18next';

interface PreviewNudgeProps {
  onClose: () => void;
}

/* Ana sayfadaki canlı önizleme widget'ının tamamını kaplayan tanıtım modalı — animasyonsuz,
   yalnızca bulanık arka plan + ortalanmış kart. Kullanıcı "Tamam" deyip kapatana kadar
   altındaki önizleme etkileşimli değildir. */
const PreviewNudge: React.FC<PreviewNudgeProps> = ({ onClose }) => {
  const { t } = useTranslation();

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#1c140c]/55 backdrop-blur-[3px] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.4)] px-7 py-8 max-w-[380px] w-full text-center"
      >
        <h3 className="font-heading text-[19px] text-text leading-snug">
          {t('home.product.nudge.title')}
        </h3>
        <p className="text-[13.5px] text-muted mt-2.5 leading-relaxed">
          {t('home.product.nudge.body')}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full py-2.5 bg-accent hover:brightness-105 text-white text-[14px] font-heading font-semibold rounded-full transition-all"
        >
          {t('home.product.nudge.ok')}
        </button>
      </div>
    </div>
  );
};

export default PreviewNudge;
