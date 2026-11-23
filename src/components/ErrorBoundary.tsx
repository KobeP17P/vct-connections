import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  message: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return {
      message: error instanceof Error ? error.message : "Something went wrong",
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("COMMS crashed", error, info.componentStack);
  }

  render() {
    if (!this.state.message) return this.props.children;

    return (
      <div className="mx-auto max-w-[390px] py-16 text-center">
        <h1 className="font-display text-3xl text-comms-text">Signal lost</h1>
        <p className="mt-2 font-body text-sm text-comms-muted">
          {this.state.message}
        </p>
        <button
          type="button"
          onClick={() => {
            this.setState({ message: null });
            window.location.assign("/");
          }}
          className="clip-angled mt-6 bg-comms-accent px-5 py-3 font-body text-sm font-semibold uppercase tracking-wide text-white"
        >
          Back to COMMS
        </button>
      </div>
    );
  }
}
