import { Link } from 'react-router-dom';
import { ArrowLeft, MapPinOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const NotFound: React.FC = () => {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-accent-100 text-accent flex items-center justify-center">
          <MapPinOff size={30} aria-hidden="true" />
        </div>
        <p className="font-heading text-accent text-sm mb-2">404</p>
        <h1 className="font-heading text-3xl text-text">{t('notFound.title')}</h1>
        <p className="text-muted mt-3 mb-7">{t('notFound.description')}</p>
        <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white">
          <ArrowLeft size={16} aria-hidden="true" /> {t('notFound.back')}
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
