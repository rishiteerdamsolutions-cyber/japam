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
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a1a2e] text-white p-6">
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
      );
    }
    return this.props.children;
  }
}
