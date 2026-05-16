import { Component, type ErrorInfo, type ReactNode } from 'react';

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

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[100dvh] bg-[#ECE3D2] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-white border-2 border-red-200 p-6 text-center">
            <h1 className="text-lg font-bold text-[#241F18] mb-2">Something went wrong</h1>
            <p className="text-sm text-[#524A3D] mb-4">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#C06B45] text-white rounded-full font-semibold"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
