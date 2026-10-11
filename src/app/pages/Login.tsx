import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { fastSignIn, storeAuth } from "../lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setLoadingMessage("Verificando credenciais...");

    try {
      setLoadingMessage("Autenticando...");
      const { user, accessToken } = await fastSignIn(email, password);

      setLoadingMessage("Carregando perfil...");
      storeAuth(user, accessToken);

      setLoadingMessage("Redirecionando...");
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email ou senha incorrectos");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const h = time.getHours().toString().padStart(2, "0");
  const m = time.getMinutes().toString().padStart(2, "0");
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const dateStr = `${days[time.getDay()]}, ${time.getDate()} ${months[time.getMonth()]} ${time.getFullYear()}`;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      background: "#0f172a",
      overflow: "hidden",
      position: "relative",
    }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(1deg); }
          66% { transform: translateY(-10px) rotate(-1deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .form-input {
          width: 100%;
          padding: 13px 16px;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: white;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .form-input:focus {
          border-color: #6366f1;
          background: rgba(99,102,241,0.08);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .form-input::placeholder { color: rgba(255,255,255,0.25); }
        .login-btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #7c3aed 100%);
          color: white;
          position: relative;
          overflow: hidden;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(99,102,241,0.4);
        }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .login-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        .eye-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.35);
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        .eye-btn:hover { color: rgba(255,255,255,0.7); }
      `}</style>

      {/* Animated background blobs */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", top: -200, left: -200, animation: "float 8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)", bottom: -150, right: -100, animation: "float 10s ease-in-out infinite reverse" }} />
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)", top: "40%", right: "20%", animation: "float 7s ease-in-out infinite 2s" }} />

        {/* Grid pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      </div>

      {/* Left panel — branding */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px",
        position: "relative",
        zIndex: 1,
      }}
        className="hidden-mobile"
      >
        <style>{`
          @media (max-width: 768px) { .hidden-mobile { display: none !important; } .login-right { width: 100% !important; } }
        `}</style>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg, #6366f1, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <div style={{ position: "absolute", inset: -4, borderRadius: 20, border: "1px solid rgba(99,102,241,0.3)", animation: "pulse-ring 2s ease-out infinite" }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: 2, margin: 0 }}>Instituto Politécnico</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: "white", margin: 0, letterSpacing: -0.5 }}>FaiCleid, LDA</p>
          </div>
        </div>

        {/* Center content */}
        <div style={{ animation: mounted ? "fadeUp 0.8s ease forwards" : "none" }}>
          {/* Clock display */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 72, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: -3, fontVariantNumeric: "tabular-nums" }}>
              {h}<span style={{ color: "#6366f1", animation: "pulse-ring 1s step-end infinite" }}>:</span>{m}
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginTop: 8, letterSpacing: 1 }}>{dateStr}</div>
          </div>

          <h1 style={{ fontSize: 36, fontWeight: 900, color: "white", lineHeight: 1.2, margin: "0 0 12px", letterSpacing: -1 }}>
            Sistema de{" "}
            <span style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Gestão Escolar
            </span>
          </h1>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
            {[
              { icon: "🎓", label: "Pré-Escolar, Primária e Secundária" },
              { icon: "📊", label: "Notas, frequência e relatórios" },
              { icon: "💰", label: "Gestão financeira e mensalidades" },
              { icon: "📋", label: "Recibos e comprovativos em PDF" },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                  {icon}
                </div>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
            © {new Date().getFullYear()} Instituto Politécnico FaiCleid, LDA · Nampula, Moçambique
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>Desenvolvido por</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.6, transition: "opacity 0.2s", cursor: "default" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "0.6"}>
              <svg width="18" height="18" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M36 4L64 20V52L36 68L8 52V20L36 4Z"
                  stroke="url(#mmdev-hex)" strokeWidth="3" fill="none"/>
                <path d="M18 52V24L36 38L54 24V52"
                  stroke="url(#mmdev-m)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="36" cy="60" r="3" fill="url(#mmdev-dot)"/>
                <defs>
                  <linearGradient id="mmdev-hex" x1="8" y1="4" x2="64" y2="68" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#a78bfa"/>
                    <stop offset="100%" stopColor="#00d4ff"/>
                  </linearGradient>
                  <linearGradient id="mmdev-m" x1="18" y1="24" x2="54" y2="52" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff"/>
                    <stop offset="100%" stopColor="#c4b5fd"/>
                  </linearGradient>
                  <linearGradient id="mmdev-dot" x1="33" y1="57" x2="39" y2="63" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#a78bfa"/>
                    <stop offset="100%" stopColor="#00d4ff"/>
                  </linearGradient>
                </defs>
              </svg>
              <span style={{
                fontSize: 13,
                fontWeight: 800,
                fontFamily: "monospace",
                letterSpacing: 1,
                background: "linear-gradient(135deg, #a78bfa, #00d4ff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>MM.dev</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="login-right" style={{
        width: 480,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 48px",
        position: "relative",
        zIndex: 1,
        background: "rgba(255,255,255,0.03)",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
      }}>
        <div style={{ width: "100%", maxWidth: 360, animation: mounted ? "fadeUp 0.6s ease forwards" : "none" }}>

          {/* Mobile logo */}
          <div style={{ display: "none", alignItems: "center", gap: 12, marginBottom: 32 }} className="mobile-logo">
            <style>{`@media (max-width: 768px) { .mobile-logo { display: flex !important; } }`}</style>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, #6366f1, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, margin: 0 }}>Instituto Politécnico</p>
              <p style={{ fontSize: 17, fontWeight: 900, color: "white", margin: 0 }}>FaiCleid</p>
            </div>
          </div>

          {/* Form header */}
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: "white", margin: "0 0 8px", letterSpacing: -0.5 }}>Bem-vindo</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: 0 }}>Inicie sessão para continuar</p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="#ef4444"/>
                </svg>
              </div>
              <p style={{ fontSize: 13, color: "#fca5a5", margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>
                Email
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  style={{ paddingLeft: 42 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>
                Senha
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  className="form-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ paddingLeft: 42, paddingRight: 44 }}
                />
                <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin-slow 0.8s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  {loadingMessage || "A entrar..."}
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  Entrar
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>ou</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>

          {/* Signup link */}
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", margin: 0 }}>
              Não tem conta?{" "}
              <a href="/signup" style={{ color: "#818cf8", fontWeight: 700, textDecoration: "none" }}
                onMouseEnter={e => (e.target as HTMLElement).style.textDecoration = "underline"}
                onMouseLeave={e => (e.target as HTMLElement).style.textDecoration = "none"}>
                Criar conta
              </a>
            </p>
          </div>

          {/* Roles info */}
          <div style={{ marginTop: 32, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px" }}>Perfis de Acesso</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { role: "Admin", desc: "Acesso total ao sistema", color: "#f59e0b" },
                { role: "Director", desc: "Gere pedagogia e utilizadores", color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)" },
                { role: "Secretaria", desc: "Alunos, turmas e financeiro", color: "#10b981" },
                { role: "Professor", desc: "Notas e frequência", color: "#6366f1" },
              ].map(({ role, desc, color }) => (
                <div key={role} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                    <strong style={{ color: "rgba(255,255,255,0.75)" }}>{role}</strong> — {desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}