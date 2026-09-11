import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { Hotel, Plane, Send, Ticket, WalletCards } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './TravelWalletPocket.css';
import './HomeTravelWallet.css';

const records = [
  { category: 'flight', Icon: Plane, code: 'IST → FCO' },
  { category: 'stay', Icon: Hotel, code: '02 / 05' },
  { category: 'ticket', Icon: Ticket, code: '09:30' },
] as const;

export default function HomeTravelWallet() {
  const { t } = useTranslation();
  const sceneRef = useRef<HTMLDivElement>(null);
  const visible = useInView(sceneRef, { amount: 0.25 });

  return (
    <section className="home-wallet" aria-labelledby="home-wallet-title">
      <div className="home-wallet-layout">
        <div className="home-wallet-copy">
          <p className="home-wallet-eyebrow"><WalletCards size={16} strokeWidth={1.6} />{t('home.wallet.eyebrow')}</p>
          <h2 id="home-wallet-title">{t('home.wallet.title')}</h2>
          <p className="home-wallet-description">{t('home.wallet.description')}</p>
          <ul className="home-wallet-features">
            {records.map(({ category, Icon }) => (
              <li key={category}>
                <span className="home-wallet-feature-icon"><Icon size={18} strokeWidth={1.6} /></span>
                <span><strong>{t(`home.wallet.${category}.label`)}</strong><small>{t(`home.wallet.${category}.description`)}</small></span>
              </li>
            ))}
          </ul>
        </div>

        <div ref={sceneRef} className={`home-wallet-visual${visible ? ' is-visible' : ''}`}>
          <div className="home-wallet-orbit" aria-hidden="true" />
          <div className="home-wallet-art wallet-scene" aria-hidden="true">
            <div className="wallet-ground-shadow" />
            <div className="wallet-leather wallet-back" />
            <div className="wallet-lining" />
            {records.map(({ category, Icon, code }) => (
              <div key={category} className={`wallet-pocket-card wallet-tone-${category} home-wallet-card home-wallet-card--${category}`}>
                <span className="wallet-pocket-card-icon"><Icon size={18} strokeWidth={1.6} /></span>
                <span className="wallet-pocket-card-text">
                  <span className="wallet-pocket-card-category">{t(`home.wallet.${category}.label`)}</span>
                  <span className="wallet-pocket-card-title">{t(`home.wallet.${category}.sample`)}</span>
                </span>
                <span className="home-wallet-card-code">{code}</span>
                <span className="wallet-pocket-card-rule" />
                <span className="home-wallet-card-barcode" />
              </div>
            ))}
            <div className="wallet-leather wallet-front">
              <div className="wallet-stitching" />
              <div className="wallet-embossed-logo"><Send size={26} strokeWidth={1.3} /><span>travyon</span></div>
              <div className="wallet-embossed-footer"><span>{t('home.wallet.personal')}</span><span>ROMA</span></div>
            </div>
            <div className="wallet-leather wallet-strap"><span className="wallet-snap" /></div>
          </div>
          <p className="home-wallet-caption"><span />{t('home.wallet.caption')}</p>
        </div>
      </div>
    </section>
  );
}
