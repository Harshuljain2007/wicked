import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Wicked ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F5EF] text-[#1F2A1C] flex items-center justify-center p-6">
          <div className="max-w-lg w-full border border-[#C5D1B8] bg-[#FCFBF7] p-8 rounded-lg">
            <h1 className="font-display text-2xl font-bold mb-3">Something paused on this page</h1>
            <p className="text-sm text-[#4D5A48] mb-6 leading-relaxed">
              {this.state.message.startsWith('{')
                ? 'A database permission or network check stopped this view. Please sign in or reload.'
                : this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#9CAF88] text-[#1F2A1C] font-semibold rounded-md hover:bg-[#8EA379] transition-colors"
            >
              Reload Storefront
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
