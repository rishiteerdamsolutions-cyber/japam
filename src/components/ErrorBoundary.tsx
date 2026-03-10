import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../lib/errorMonitor';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches uncaught React errors and shows a fallback UI instead of a white screen.
 * Logs errors for monitoring (console + optional callback for Sentry etc).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportError(error, { componentStack: errorInfo.componentStack });
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="relative min-h-screen flex flex-col items-center justify-center text-white p-6 bg-cover bg-center" style={{ backgroundImage: 'url(/images/errorpagebg.png)' }}>
          <div className="absolute inset-0 bg-black/60" aria-hidden />
          <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-xl font-bold text-amber-400 mb-2">Something went wrong</h1>
          <p className="text-amber-200/80 text-sm text-center mb-4 max-w-md">
            We&apos;re sorry. The app encountered an error. Please refresh the page or try again later.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-400 transition-colors"
          >
            Reload
          </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
