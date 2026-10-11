import { useState } from "react";
import { useNavigate } from "react-router";
import { Key, School, CheckCircle2, AlertTriangle, ChevronRight, Shield } from "lucide-react";
import { activationAPI } from "../lib/api";

export default function Activate() {
  const navigate = useNavigate();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [schoolName, setSchoolName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!key.trim()) {
      setError("Insere a chave de activação");
      return;
    }

    // Validar formato básico
    if (!key.toUpperCase().startsWith("FCLEID-")) {
      setError("Formato inválido. A chave deve começar com FCLEID-");
      return;
    }

    setLoading(true);
    try {
      // Passo 1 — verificar se a chave é válida
      const verifyRes = await activationAPI.verify(key.trim());
      if (!verifyRes.valid) {
        setError(verifyRes.error || "Chave inválida");
        setLoading(false);
        return;
      }

      // Passo 2 — activar o sistema (marca chave como usada + guarda licença)
      const activateRes = await activationAPI.activate(key.trim());
      if (!activateRes.success) {
        setError(activateRes.error || "Erro ao activar sistema");
        setLoading(false);
        return;
      }

      // Sucesso!
      setSuccess(true);
      setSchoolName(activateRes.school || verifyRes.school || "");
      localStorage.setItem("systemActivated", "true");
      setTimeout(() => navigate("/signup"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao verificar chave");
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "13px 16px 13px 46px",
    background: "#111827", border: "1px solid #1a2035",
    borderRadius: 10, fontSize: 15, color: "#e2e8f0",
    outline: "none", fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: 1.5, textTransform: "uppercase",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0b0f1a", fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
      padding: 24,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: "linear-gradient(135deg, #6366f1, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 0 40px rgba(99,102,241,0.3)" }}>
            <School style={{ width: 36, height: 36, color: "white" }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>FaiCleid ERP</h1>
          <p style={{ fontSize: 13, color: "#4a5568", margin: "6px 0 0" }}>Instituto Politécnico FaiCleid, LDA</p>
        </div>

        {/* Card */}
        <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 16, padding: "36px 40px", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>

          {!success ? (
            <>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Key style={{ width: 20, height: 20, color: "#6366f1" }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Activar Sistema</h2>
                  <p style={{ fontSize: 12, color: "#4a5568", margin: 0 }}>Insere a chave de licença fornecida pelo developer</p>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "12px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle style={{ width: 15, height: 15, color: "#f87171", flexShrink: 0 }} />
                  <p style={{ fontSize: 13, color: "#f87171", margin: 0 }}>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Campo chave */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#4a5568", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Chave de Activação
                  </label>
                  <div style={{ position: "relative" }}>
                    <Key style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#4a5568" }} />
                    <input
                      type="text"
                      value={key}
                      onChange={e => setKey(e.target.value.toUpperCase())}
                      placeholder="FCLEID-X-XXXX-XXXX-XXXX-XXXX"
                      style={inp}
                      maxLength={30}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: "#2d3748", marginTop: 6 }}>
                    Formato: FCLEID-X-XXXX-XXXX-XXXX-XXXX (trial) ou FCLEID-A-... (anual)
                  </p>
                </div>

                {/* Info */}
                <div style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 10, padding: "12px 14px", marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <Shield style={{ width: 14, height: 14, color: "#818cf8", flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontSize: 12, color: "#818cf8", fontWeight: 600, margin: "0 0 3px" }}>Só é necessário uma vez</p>
                      <p style={{ fontSize: 11, color: "#4a5568", margin: 0 }}>
                        Após a activação, o sistema fica disponível para todos os utilizadores. A chave não é necessária para fazer login.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botão */}
                <button type="submit" disabled={loading}
                  style={{ width: "100%", background: loading ? "#2d3748" : "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white", border: "none", borderRadius: 10, padding: "14px", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {loading ? (
                    <>
                      <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      A verificar chave...
                    </>
                  ) : (
                    <>Activar Sistema <ChevronRight style={{ width: 16, height: 16 }} /></>
                  )}
                </button>
              </form>

              <div style={{ marginTop: 20, textAlign: "center" }}>
                <p style={{ fontSize: 12, color: "#2d3748", margin: 0 }}>
                  Não tens chave? Contacta{" "}
                  <a href="https://wa.me/258846880525" target="_blank" rel="noreferrer"
                    style={{ color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>MM.dev</a>
                </p>
              </div>
            </>
          ) : (
            /* Sucesso */
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <CheckCircle2 style={{ width: 32, height: 32, color: "#10b981" }} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#10b981", margin: "0 0 8px" }}>Sistema Activado!</h2>
              {schoolName && (
                <p style={{ fontSize: 14, color: "#e2e8f0", margin: "0 0 6px", fontWeight: 600 }}>{schoolName}</p>
              )}
              <p style={{ fontSize: 13, color: "#4a5568", margin: "0 0 24px" }}>
                A redirecionar para criar o primeiro administrador...
              </p>
              <div style={{ width: 28, height: 28, border: "2px solid #1a2035", borderTopColor: "#10b981", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <p style={{ fontSize: 11, color: "#2d3748", margin: 0 }}>
            © 2026 Instituto Politécnico FaiCleid, LDA · Desenvolvido por{" "}
            <span style={{ fontFamily: "monospace", fontWeight: 800, background: "linear-gradient(135deg, #a78bfa, #00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MM.dev</span>
          </p>
        </div>
      </div>
    </div>
  );
}