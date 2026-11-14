// src/components/ErrorBoundary.jsx: surfaces render errors so they don't show as blank page
import React from "react";
import { isMissingPart, reloadForNewBuild } from "../lib/stale-build";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
    // A part of the site a deploy replaced: the page loads again, once.
    if (isMissingPart(error)) reloadForNewBuild();
  }
  componentDidUpdate(prevProps, prevState) {
    // Somewhere else now (Back, a link), with a fault from before: it may not happen there.
    if (this.state.error && prevState.error && prevProps.resetKey !== this.props.resetKey) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-ink text-bone font-mono p-6 md:p-10">
          <div className="max-w-3xl mx-auto pt-20">
            <div className="mono-micro text-blood mb-4">
              [ system_error ]
            </div>
            <h1 className="font-display uppercase text-display-2 text-bone mb-6">Render fault</h1>
            <pre className="bg-ink-raised border border-blood/40 p-4 text-xs text-muted whitespace-pre-wrap overflow-auto max-h-[40vh]">
              {String(this.state.error?.stack || this.state.error)}
            </pre>
            <p className="font-mono text-xs text-dim mt-4">
              open devtools → console for full trace, then reload.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
