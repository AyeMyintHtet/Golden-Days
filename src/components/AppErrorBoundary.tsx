import { Component, type ReactNode } from "react";

export default class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed)
      return (
        <main className="app-error" role="alert">
          <h1>Let’s open your memories again.</h1>
          <p>The album couldn’t open properly. Please try reloading it.</p>
          <button
            className="button button-gold"
            onClick={() => window.location.reload()}
          >
            Reload album
          </button>
        </main>
      );
    return this.props.children;
  }
}
