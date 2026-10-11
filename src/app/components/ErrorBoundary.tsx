import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Erro não tratado:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0f1a",
          padding: 24,
          fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: "100%",
            background: "#0d1117",
            border: "1px solid #1a2035",
            borderRadius: 14,
            padding: "32px 28px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              fontSize: 24,
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: "0 0 8px" }}>
            Algo correu mal
          </h1>
          <p style={{ fontSize: 13, color: "#4a5568", margin: "0 0 20px", lineHeight: 1.5 }}>
            Ocorreu um erro inesperado na aplicação. Podes tentar recarregar a página ou terminar a sessão.
          </p>
          {this.state.error && (
            <pre
              style={{
                textAlign: "left",
                background: "#111827",
                border: "1px solid #1a2035",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 11,
                color: "#f87171",
                overflow: "auto",
                maxHeight: 120,
                margin: "0 0 20px",
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={this.handleReload}
              style={{
                background: "#6366f1",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Recarregar
            </button>
            <button
              onClick={this.handleLogout}
              style={{
                background: "transparent",
                color: "#818cf8",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Terminar sessão
            </button>
          </div>
        </div>
      </div>
    );
  }
}
