import React from 'react';
import * as Sentry from '@sentry/react';

interface State { hasError: boolean }

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const english = document.documentElement.lang === 'en';
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-6 text-center">
        <div className="max-w-md rounded-3xl border border-divider bg-surface p-8">
          <h1 className="font-heading text-2xl text-text">
            {english ? 'Something went wrong' : 'Bir şeyler ters gitti'}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {english ? 'Your data is safe. Reload the page to try again.' : 'Verilerin güvende. Tekrar denemek için sayfayı yenile.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
          >
            {english ? 'Reload' : 'Sayfayı yenile'}
          </button>
        </div>
      </main>
    );
  }
}
