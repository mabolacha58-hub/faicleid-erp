import { useState } from "react";
import { useNavigate } from "react-router";
import { authAPI } from "../lib/api";
import { validatePassword, PasswordStrengthBar } from "../lib/passwordStrength";
import type { UserRole } from "../../types/domain";
import { Eye, EyeOff, School, User, Mail, Lock, Shield, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";

const ROLES: { value: UserRole; label: string; desc: string; color: string; bg: string; border: string }[] = [
  { value: "admin",      label: "Administrador",  desc: "Gere financeiro e configurações",      color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)" },
  { value: "director",   label: "Director",        desc: "Gere pedagogia e utilizadores",        color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)" },
  { value: "pedagogico", label: "Pedagógico",      desc: "Visualiza dados pedagógicos",          color: "#34d399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.25)" },
  { value: "professor",  label: "Professor",       desc: "Lança notas da sua turma/disciplina",  color: "#60a5fa", bg: "rgba(96,165,250,0.1)",  border: "rgba(96,165,250,0.25)" },
  { value: "secretaria", label: "Secretaria",      desc: "Consulta dados financeiros",           color: "#f472b6", bg: "rgba(244,114,182,0.1)", border: "rgba(244,114,182,0.25)" },
];

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<{ name: string; email: string; password: string; role: UserRole }>({ name: "", email: "", password: "", role: "professor" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validar senha forte
    const strength = validatePassword(formData.password);
    if (!strength.valid) {
      setError("Senha fraca — " + strength.errors.join(", "));
      return;
    }

    setLoading(true);
    try {
      await authAPI.signup({ email: formData.email, password: formData.password, name: formData.name, role: formData.role });
      setSuccess(true);
      setTimeout(() => navigate("/"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 14px 11px 42px",
    background: "#111827", border: "1px solid #1a2035",
    borderRadius: 10, fontSize: 14, color: "#e2e8f0",
    outline: "none", fontFamily: "inherit",
    transition: "border-color 0.2s",
  };

  const lbl: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 600,
    color: "#4a5568", marginBottom: 6,
    textTransform: "uppercase", letterSpacing: 0.8,
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: "#0b0f1a",
      fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
      color: "#e2e8f0",
    }}>
      {/* ── PAINEL ESQUERDO ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "48px 56px", position: "relative", overflow: "hidden" }} className="hidden-mobile">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
          .hidden-mobile { display: flex; flex-direction: column; }
          @media (max-width: 768px) { .hidden-mobile { display: none !important; } .signup-right { width: 100% !important; } }
          input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
          select:focus { border-color: #6366f1 !important; }
        `}</style>

        {/* Blobs decorativos */}
        <div style={{ position: "absolute", top: -100, left: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <School style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: 0, letterSpacing: 0.5 }}>FAICLEID</p>
            <p style={{ fontSize: 10, color: "#4a5568", margin: 0 }}>Instituto Politécnico</p>
          </div>
        </div>

        {/* Centro */}
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.2, margin: "0 0 16px" }}>
            Criar nova<br />
            <span style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>conta de acesso</span>
          </h1>
          <p style={{ fontSize: 14, color: "#4a5568", lineHeight: 1.7, maxWidth: 340 }}>
            Preencha os dados para criar uma conta no sistema de gestão do Instituto Politécnico FaiCleid.
          </p>

          {/* Papéis disponíveis */}
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 10 }}>
            {ROLES.map(r => (
              <div key={r.value} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#718096" }}>
                  <strong style={{ color: "#e2e8f0" }}>{r.label}</strong> — {r.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ fontSize: 11, color: "#2d3748", margin: 0 }}>© 2026 Instituto Politécnico FaiCleid, LDA · Maputo, Moçambique</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: "#2d3748" }}>Desenvolvido por</span>
            <span style={{ fontSize: 12, fontWeight: 800, fontFamily: "monospace", background: "linear-gradient(135deg, #a78bfa, #00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MM.dev</span>
          </div>
        </div>
      </div>

      {/* ── PAINEL DIREITO — FORMULÁRIO ── */}
      <div className="signup-right" style={{
        width: 500, flexShrink: 0, display: "flex", alignItems: "center",
        justifyContent: "center", padding: "40px 48px",
        background: "rgba(255,255,255,0.02)",
        borderLeft: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>

          {/* Header do formulário */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: "#e2e8f0", margin: "0 0 8px" }}>Criar Conta</h2>
            <p style={{ fontSize: 13, color: "#4a5568", margin: 0 }}>Preencha todos os campos abaixo</p>
          </div>

          {/* Erro */}
          {error && (
            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "12px 14px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 8 }}>
              <AlertTriangle style={{ width: 15, height: 15, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: "#f87171", margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Sucesso */}
          {success && (
            <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "12px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 style={{ width: 15, height: 15, color: "#10b981", flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: "#10b981", margin: 0 }}>Conta criada! A redirecionar para o login...</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Nome */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Nome Completo</label>
              <div style={{ position: "relative" }}>
                <User style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#4a5568" }} />
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Ex: João da Silva" style={inp} />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Email</label>
              <div style={{ position: "relative" }}>
                <Mail style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#4a5568" }} />
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required placeholder="utilizador@escola.mz" style={inp} autoComplete="email" />
              </div>
            </div>

            {/* Senha */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Senha</label>
              <div style={{ position: "relative" }}>
                <Lock style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#4a5568" }} />
                <input type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required minLength={8} placeholder="Mín. 8 car., maiúscula, número, símbolo" style={{ ...inp, paddingRight: 44 }} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4a5568" }}>
                  {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
              <PasswordStrengthBar password={formData.password} />
            </div>

            {/* Papel */}
            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Papel no Sistema</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {ROLES.map(r => (
                  <button key={r.value} type="button" onClick={() => setFormData({ ...formData, role: r.value })}
                    style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${formData.role === r.value ? r.border : "#1a2035"}`, background: formData.role === r.value ? r.bg : "transparent", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <Shield style={{ width: 12, height: 12, color: r.color }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: formData.role === r.value ? r.color : "#718096" }}>{r.label}</span>
                    </div>
                    <p style={{ fontSize: 10, color: "#4a5568", margin: 0, lineHeight: 1.4 }}>{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Botão */}
            <button type="submit" disabled={loading || success}
              style={{ width: "100%", background: loading || success ? "#2d3748" : "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 700, cursor: loading || success ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  A criar conta...
                </>
              ) : success ? (
                <><CheckCircle2 style={{ width: 16, height: 16 }} /> Conta criada!</>
              ) : (
                <>Criar Conta <ChevronRight style={{ width: 16, height: 16 }} /></>
              )}
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </form>

          <div style={{ marginTop: 24, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#4a5568", margin: 0 }}>
              Já tem conta?{" "}
              <a href="/" style={{ color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>Fazer login</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}