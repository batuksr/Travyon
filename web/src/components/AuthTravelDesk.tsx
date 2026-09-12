import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass, Globe2, Hotel, MapPin, Plane, Send, Ticket } from 'lucide-react';
import TravyonLogo from './TravyonLogo';
import AuthAtlasBackground from './AuthAtlasBackground';
import './AuthTravelDesk.css';

interface AuthTravelDeskProps {
  variant: 'login' | 'register';
}

// Decorative travel stationery: sample cards, independent of account or wallet data.
export default function AuthTravelDesk({ variant }: AuthTravelDeskProps) {
  const { t } = useTranslation();

  return (
    <aside className={`auth-travel-desk auth-travel-desk--${variant}`} aria-labelledby={`auth-desk-title-${variant}`}>
      <div className="auth-desk-inner">
        <AuthAtlasBackground />
        <div className="auth-desk-brand-row">
          <Link to="/" className="auth-desk-home" aria-label={t('auth.desk.home')}>
            <TravyonLogo size={64} light />
          </Link>
        </div>

        <div className="auth-desk-scene" aria-hidden="true">
          <div className="auth-desk-orbit" />
          <div className="auth-desk-scenery">
            <div className="auth-desk-map">
              <div className="auth-desk-map-heading">
                <span><Compass size={13} strokeWidth={1.5} />{t('auth.desk.mapTitle')}</span>
                <span>NO. 001</span>
              </div>
              <svg className="auth-desk-map-drawing" viewBox="0 0 440 280" fill="none">
                <path d="M0 46 46 58 65 42 89 56 113 30 146 24 160 9 198 0H440V183L409 184 391 168 359 179 339 174 314 186 301 175 280 187 261 158 240 156 227 146 214 154 230 176 237 195 260 214 254 230 241 220 229 207 212 198 196 176 180 162 154 167 132 188 125 213 105 227 71 220 53 204 35 190 11 197 0 179Z" fill="#dbe0c6" stroke="#bdc5aa" strokeWidth="1.2" />
                <path d="m175 220-5 18 4 15 7-3 1-21Zm43 23 12 13 21 2-7-9-15-5Z" fill="#dbe0c6" stroke="#bdc5aa" />
                <g stroke="#b9c2a5" strokeWidth=".8" strokeDasharray="3 4">
                  <path d="m114 30 15 48 30 25-13 30 34 29M159 103l48-13 33 14-13 42M240 104l34 18 21-3 19 29-13 27M35 190l35-26 47 11 15 13M295 119l39-29 29 20 29-12 48 19" />
                </g>
                <g stroke="#fcfaf0" strokeWidth="3" strokeLinecap="round" opacity=".7">
                  <path d="M64 80q50 60 81 17t95 18 128 23M98 201q40-84 111-39t162 11M178 37l22 61 37 18 24 42M300 17l-21 58 13 54" />
                </g>
                <path d="M354 176C334 125 264 102 225 178S127 170 144 100" stroke="#b16f44" strokeOpacity=".25" strokeWidth="1.6" strokeDasharray="4 6" />
                <path className="auth-desk-route" pathLength="1" d="M354 176C334 125 264 102 225 178S127 170 144 100" stroke="#c67139" strokeWidth="2.2" strokeLinecap="round" />
                <g className="auth-desk-stop auth-desk-stop--first"><circle className="auth-desk-stop-halo" cx="354" cy="176" r="9" /><circle cx="354" cy="176" r="7" fill="#f9f4e7" /><circle cx="354" cy="176" r="3" fill="#b66937" /></g>
                <g className="auth-desk-stop auth-desk-stop--second"><circle className="auth-desk-stop-halo" cx="225" cy="178" r="9" /><circle cx="225" cy="178" r="7" fill="#f9f4e7" /><circle cx="225" cy="178" r="3" fill="#b66937" /></g>
                <g className="auth-desk-stop auth-desk-stop--third"><circle className="auth-desk-stop-halo" cx="144" cy="100" r="9" /><circle cx="144" cy="100" r="7" fill="#f9f4e7" /><circle cx="144" cy="100" r="3" fill="#b66937" /></g>
                <g className="auth-desk-map-labels" fill="#53634e">
                  <text x="363" y="197">{t('auth.desk.istanbul')}</text>
                  <text x="228" y="203">{t('auth.desk.rome')}</text>
                  <text x="119" y="85">Paris</text>
                </g>
                <g className="auth-desk-plane">
                  <path d="m-11-8 24 8-24 8 4-8Z" fill="#c67139" stroke="#fff8e8" strokeWidth="1.5" strokeLinejoin="round" />
                </g>
                <g transform="translate(44 118)" stroke="#7c9077" strokeWidth="1" opacity=".6">
                  <circle r="17" /><path d="M0-24v48M-24 0h48M0-13 4 0 0 13-4 0Z" />
                </g>
              </svg>
              <div className="auth-desk-map-footer"><span>41° 00′ N · 28° 58′ E</span><span>{t('auth.desk.mapFooter')}</span></div>
              <div className="auth-desk-folds" />
            </div>

            <div className="auth-desk-stamp"><Globe2 size={24} strokeWidth={1.2} /><span>TRAVYON</span><small>{t('auth.desk.stamp')}</small></div>

            <div className="auth-desk-boarding">
              <div className="auth-desk-boarding-heading"><span><Plane size={13} />{t('auth.desk.boarding')}</span><span>01</span></div>
              <div className="auth-desk-airports">
                <div><strong>IST</strong><span>{t('auth.desk.istanbul')}</span></div>
                <div className="auth-desk-flight-line"><span /><Plane size={18} strokeWidth={1.4} /><span /></div>
                <div><strong>FCO</strong><span>{t('auth.desk.rome')}</span></div>
              </div>
              <div className="auth-desk-boarding-bottom"><span>{t(`auth.desk.${variant}.ticketNote`)}</span><span className="auth-desk-barcode" /></div>
            </div>

            <div className="auth-desk-wallet">
              <div className="auth-desk-wallet-back" />
              <div className="auth-desk-stay-card"><Hotel size={15} strokeWidth={1.5} /><span>{t('auth.desk.stay')}<strong>{t('auth.desk.rome')} · {t('auth.desk.oldTown')}</strong></span></div>
              <div className="auth-desk-event-card"><Ticket size={15} strokeWidth={1.5} /><span>{t('auth.desk.experience')}<strong>Colosseo</strong></span></div>
              <div className="auth-desk-wallet-front">
                <div className="auth-desk-wallet-mark"><Send size={23} strokeWidth={1.3} /><span>travyon</span></div>
                <span className="auth-desk-wallet-caption">{t('auth.desk.wallet')}</span>
              </div>
              <div className="auth-desk-wallet-strap"><span /></div>
            </div>
            <div className="auth-desk-note"><MapPin size={13} /><span>{t(`auth.desk.${variant}.sceneNote`)}</span></div>
          </div>
        </div>

        <div className="auth-desk-story">
          <h2 id={`auth-desk-title-${variant}`}>{t(`auth.desk.${variant}.title`)}</h2>
          <p className="auth-desk-description">{t(`auth.desk.${variant}.description`)}</p>
        </div>
      </div>
    </aside>
  );
}
