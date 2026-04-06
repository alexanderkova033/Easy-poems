import { Component, type ErrorInfo, type ReactNode } from "react";

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
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div
          role="alert"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100dvh",
            padding: "2rem",
            textAlign: "center",
            gap: "1rem",
            fontFamily: "var(--font-ui, system-ui, sans-serif)",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", margin: 0 }}>Something went wrong</h1>
          <p style={{ margin: 0, opacity: 0.7, maxWidth: "36ch" }}>
            An unexpected error occurred. Your drafts are stored in your browser
            and should still be here after a refresh.
          </p>
          <details style={{ maxWidth: "42ch", textAlign: "left", opacity: 0.6 }}>
            <summary style={{ cursor: "pointer" }}>Error details</summary>
            <pre
              style={{
                marginTop: "0.5rem",
                fontSize: "0.75rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {error.message}
            </pre>
          </details>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "6px",
              border: "1px solid currentColor",
              background: "transparent",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
