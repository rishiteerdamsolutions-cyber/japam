import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-white font-mono text-sm">
          <h1 className="text-[#FFD700] text-lg font-semibold mb-4">Something went wrong</h1>
          <pre className="text-red-400 text-xs max-w-full overflow-auto p-4 bg-[#151515] rounded-xl">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 rounded-xl bg-[#FFD700] text-black font-medium"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
