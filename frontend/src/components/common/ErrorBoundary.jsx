import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          resetError: this.handleReset,
        });
      }

      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-foreground">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger ring-1 ring-danger/20">
            <AlertTriangle className="size-6" />
          </div>
          <h3 className="text-lg font-bold">Something went wrong</h3>
          <p className="mt-1 max-w-sm text-xs text-muted">
            An unexpected error occurred while rendering this component.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-4 flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground shadow-sm hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="size-3.5" /> Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
