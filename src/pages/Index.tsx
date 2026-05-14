import { RLGameNew } from "@/components/RL/RLGameNew";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Component, type ErrorInfo, type ReactNode } from "react";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("CAUGHT ERROR:", error.message, error.stack);
    console.error("COMPONENT STACK:", info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "monospace", background: "#1a1a1a", color: "#ff6b6b", minHeight: "100vh" }}>
          <h2>Runtime Error — check console for details</h2>
          <pre style={{ whiteSpace: "pre-wrap", color: "#ffa" }}>
            {(this.state.error as Error).message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const Index = () => {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <RLGameNew />
      </LanguageProvider>
    </ErrorBoundary>
  );
};

export default Index;
