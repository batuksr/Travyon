import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/useThemeStore';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'travyon-pwa-dismissed';

const PwaInstallBanner: React.FC = () => {
  const { t } = useTranslation();
  const { dark } = useThemeStore();
  const [prompt, setPrompt]       = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow]           = useState(false);
  const [isIOS, setIsIOS]         = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Zaten standalone modda (yüklü uygulama) çalışıyorsa gösterme
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone
    ) {
      // Tarayıcı API'sini mount sonrası okuyup duruma göre erken çıkış — bilinçli.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInstalled(true);
      return;
    }

    // Daha önce kapatılmışsa gösterme
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const ua = navigator.userAgent;
    const iosDevice = /iPhone|iPad|iPod/i.test(ua);

    if (iosDevice) {
      // iOS Safari: native prompt yok, manuel talimat göster
      setIsIOS(true);
      // 3 saniye sonra göster (sayfanın yüklenmesini bekle)
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    }

    // Chrome / Edge / Android: beforeinstallprompt dinle
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Yükleme tamamlandığında banner'ı gizle
    const installed = () => setInstalled(true);
    window.addEventListener('appinstalled', installed);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  if (!show || installed) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-80 z-[60] animate-in slide-in-from-bottom-4 duration-300">
      <div className={`rounded-2xl shadow-2xl border p-4 ${
        dark
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-start gap-3">
          {/* İkon */}
          <div className="w-10 h-10 rounded-xl bg-[#f8981d]/10 flex items-center justify-center shrink-0">
            <Download size={18} className="text-[#f8981d]" />
          </div>

          {/* İçerik */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              {t('pwaBanner.title')}
            </p>
            {isIOS ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                <Share size={10} className="inline mb-0.5 mr-0.5" />
                {t('pwaBanner.iosPrefix')} <strong className="text-slate-700 dark:text-slate-200">"{t('pwaBanner.addToHomeScreen')}"</strong> {t('pwaBanner.iosSuffix')}
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {t('pwaBanner.subtitle')}
              </p>
            )}
          </div>

          {/* Kapat */}
          <button
            onClick={handleDismiss}
            className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Yükle butonu — sadece Android/Chrome */}
        {!isIOS && prompt && (
          <button
            onClick={handleInstall}
            className="mt-3 w-full py-2.5 bg-[#f8981d] hover:bg-[#e08518] text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#f8981d]/20"
          >
            {t('pwaBanner.installButton')}
          </button>
        )}
      </div>
    </div>
  );
};

export default PwaInstallBanner;
