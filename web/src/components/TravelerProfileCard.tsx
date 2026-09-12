import { useState, type ReactNode } from 'react';
import { Compass, MapPin, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './TravelerProfileCard.css';

interface TravelerProfileCardProps {
  displayName: string;
  photoURL: string | null;
  planCount: number;
  totalDays: number;
  destinations: string[];
  children?: ReactNode;
}

export default function TravelerProfileCard({ displayName, photoURL, planCount, totalDays, destinations, children }: TravelerProfileCardProps) {
  const { t } = useTranslation();
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const initials = displayName.trim().split(/\s+/).map(word => Array.from(word)[0] ?? '').join('').slice(0, 2).toLocaleUpperCase() || 'T';
  const stats = [
    { value: planCount, label: t('userProfile.stats.sharedPlans') },
    { value: totalDays, label: t('userProfile.travelerCard.plannedDays') },
    { value: destinations.length, label: t('userProfile.stats.differentCities') },
  ];

  return (
    <section className="traveler-profile-card" aria-label={t('userProfile.travelerCard.title')}>
      <svg className="traveler-profile-map" viewBox="0 0 850 420" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g stroke="currentColor" strokeWidth=".7">
          <ellipse cx="670" cy="160" rx="245" ry="195" /><ellipse cx="670" cy="160" rx="210" ry="160" />
          <ellipse cx="670" cy="160" rx="168" ry="125" /><ellipse cx="670" cy="160" rx="125" ry="90" />
          <path d="M350 0C340 130 430 190 570 240S780 320 850 420M480 0C450 90 510 165 655 185S810 275 850 305M300 60L830 330M530 0L620 420M390 345L850 50" />
        </g>
        <path d="M410 318C420 215 532 315 583 206S710 165 756 77" stroke="#ddb777" strokeWidth="1.2" strokeDasharray="4 7" />
        <g fill="#ddb777"><circle cx="410" cy="318" r="3" /><circle cx="583" cy="206" r="3" /><circle cx="756" cy="77" r="3" /></g>
      </svg>
      <div className="traveler-profile-top">
        <span><Compass size={16} strokeWidth={1.5} />{t('userProfile.travelerCard.title')}</span>
        <span className="traveler-profile-brand"><Send size={18} strokeWidth={1.3} /><span>travyon</span></span>
      </div>

      <div className="traveler-profile-main">
        <div className="traveler-profile-identity">
          <div className="traveler-profile-avatar">
            {photoURL && failedPhoto !== photoURL
              ? <img src={photoURL} alt="" referrerPolicy="no-referrer" onError={() => setFailedPhoto(photoURL)} />
              : <span>{initials}</span>}
          </div>
          <div className="traveler-profile-name">
            <p>{t('userProfile.travelerCard.eyebrow')}</p>
            <h1>{displayName}</h1>
            {children && <div className="traveler-profile-actions">{children}</div>}
          </div>
        </div>
        <dl className="traveler-profile-stats">
          {stats.map(stat => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}
        </dl>
      </div>

      <div className="traveler-profile-bottom">
        <p className="traveler-profile-city-label"><MapPin size={13} />{t('userProfile.travelerCard.cities')}</p>
        {destinations.length > 0 ? (
          <ul className="traveler-profile-stamps">
            {destinations.map(city => <li key={city}><Compass size={15} strokeWidth={1.2} aria-hidden="true" /><span>{city}</span></li>)}
          </ul>
        ) : <p className="traveler-profile-empty">{t('userProfile.travelerCard.empty')}</p>}
        <p className="traveler-profile-footnote">{t('userProfile.travelerCard.note')}</p>
      </div>
    </section>
  );
}
