// src/components/ErrorBoundary.jsx — surfaces render errors so they don't show as blank page
import React from "react";

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
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-ink text-bone font-mono p-6 md:p-10">
          <div className="max-w-3xl mx-auto pt-20">
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-signal mb-4">
              [ system_error ]
            </div>
            <h1 className="serif-display italic text-4xl text-bone mb-6">render fault.</h1>
            <pre className="bg-ink-raised border border-signal/40 p-4 text-xs text-muted whitespace-pre-wrap overflow-auto max-h-[40vh]">
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
