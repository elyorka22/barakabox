'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class CourierErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CourierErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback message={this.state.error.message} onRetry={() => this.setState({ error: null })} />
      );
    }
    return this.props.children;
  }
}

function ErrorFallback({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-lg p-6 text-center">
      <p className="text-sm font-semibold text-rose-700">Kuryer paneli xatosi</p>
      <p className="mt-2 text-xs text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl bg-[#16A34A] px-4 py-2 text-sm font-semibold text-white"
      >
        Qayta urinish
      </button>
    </div>
  );
}
