import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "An unexpected application error occurred.",
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0D11] text-[#F3F5F8] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#11141A] border border-white/[0.1] rounded-xl p-6 space-y-4">
            <h1 className="font-display text-lg font-semibold text-zinc-100">
              Something went wrong
            </h1>
            <p className="text-xs text-zinc-400 break-words leading-relaxed">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[#F43F5E] hover:bg-[#E11D48] text-white transition-colors"
            >
              Reload ClipDeck
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
