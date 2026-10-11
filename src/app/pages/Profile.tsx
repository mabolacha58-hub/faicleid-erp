import { useState } from "react";
import { getCurrentUser, ROLE_LABELS, ROLE_COLORS, changePassword } from "../lib/auth";
import { usersAPI } from "../lib/api";
import { validatePassword, PasswordStrengthBar } from "../lib/passwordStrength";
import type { AuthUser } from "../../types/domain";
import {
  Mail, Shield, Save, Key,
  Eye, EyeOff, CheckCircle2, AlertTriangle, Calendar,
  Lock, Edit2, X
} from "lucide-react";

type ProfileUser = AuthUser & { phone?: string; address?: string; bio?: string; createdAt?: string };

export default function Profile() {
  const user = getCurrentUser() as ProfileUser | null;
  const role = (user?.role || "admin") as keyof typeof ROLE_LABELS;
  const badge = ROLE_COLORS[role] || ROLE_COLORS.admin;
  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  const [editMode, setEditMode] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
    bio: user?.bio || "",
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      await usersAPI.update(user.id, { name: formData.name });
      // Actualizar localStorage
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, name: formData.name }));
      showMsg("success", "Perfil actualizado com sucesso!");
      setEditMode(false);
    } catch {
      showMsg("error", "Erro ao actualizar perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMsg("error", "As senhas não coincidem.");
      return;
    }
    const strength = validatePassword(passwordData.newPassword);
    if (!strength.valid) {
      showMsg("error", "Senha fraca: " + strength.errors.join(", "));
      return;
    }
    setSaving(true);
    try {
      await changePassword(passwordData.newPassword);
      showMsg("success", "Senha alterada com sucesso!");
      setPasswordData({ newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    } catch (err) {
      showMsg("error", err instanceof Error ? err.message : "Erro ao alterar senha. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    background: "#111827", border: "1px solid #1a2035",
    borderRadius: 8, fontSize: 13, color: "#e2e8f0",
    outline: "none", fontFamily: "inherit",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 600,
    color: "#4a5568", marginBottom: 5,
    textTransform: "uppercase", letterSpacing: 0.8,
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto", fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif" }}>

      <style>{`input:focus, select:focus, textarea:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Meu Perfil</h1>
        <p style={{ fontSize: 12, color: "#4a5568", margin: "4px 0 0" }}>Gere as suas informações pessoais e segurança</p>
      </div>

      {/* Mensagem */}
      {message && (
        <div style={{ background: message.type === "success" ? "rgba(16,185,129,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${message.type === "success" ? "rgba(16,185,129,0.2)" : "rgba(248,113,113,0.2)"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          {message.type === "success"
            ? <CheckCircle2 style={{ width: 15, height: 15, color: "#10b981", flexShrink: 0 }} />
            : <AlertTriangle style={{ width: 15, height: 15, color: "#f87171", flexShrink: 0 }} />}
          <p style={{ fontSize: 13, color: message.type === "success" ? "#10b981" : "#f87171", margin: 0 }}>{message.text}</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>

        {/* ── COLUNA ESQUERDA — Avatar + Info ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Card Avatar */}
          <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 14, padding: "28px 24px", textAlign: "center" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: `linear-gradient(135deg, ${badge.bg}, ${badge.color}30)`, border: `2px solid ${badge.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: badge.color, margin: "0 auto 16px" }}>
              {initials}
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", margin: "0 0 6px" }}>{user?.name}</h2>
            <p style={{ fontSize: 12, color: "#4a5568", margin: "0 0 12px", fontFamily: "'IBM Plex Mono', monospace" }}>{user?.email}</p>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>
              <Shield style={{ width: 11, height: 11 }} />
              {ROLE_LABELS[role]}
            </span>

            {/* Info extra para professor */}
            {role === "professor" && user?.accessCode && (
              <div style={{ marginTop: 16, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px", fontWeight: 600 }}>Código de Acesso</p>
                <p style={{ fontSize: 14, fontFamily: "'IBM Plex Mono', monospace", color: "#818cf8", fontWeight: 600, margin: 0 }}>{user.accessCode}</p>
              </div>
            )}
          </div>

          {/* Info rápida */}
          <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 14, padding: "20px 24px" }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 14px" }}>Informações</p>
            {[
              { icon: Mail,     label: "Email",   value: user?.email },
              { icon: Calendar, label: "Membro desde", value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-MZ") : "—" },
              { icon: Shield,   label: "Papel",   value: ROLE_LABELS[role] },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon style={{ width: 13, height: 13, color: "#4a5568" }} />
                </div>
                <div>
                  <p style={{ fontSize: 10, color: "#4a5568", margin: 0, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</p>
                  <p style={{ fontSize: 12, color: "#e2e8f0", margin: 0, fontWeight: 500, wordBreak: "break-all" }}>{value || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── COLUNA DIREITA — Formulários ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Informações pessoais */}
          <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 14, padding: "24px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Informações Pessoais</h3>
                <p style={{ fontSize: 11, color: "#4a5568", margin: "3px 0 0" }}>Actualiza o teu nome e dados de contacto</p>
              </div>
              {!editMode ? (
                <button onClick={() => setEditMode(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  <Edit2 style={{ width: 12, height: 12 }} /> Editar
                </button>
              ) : (
                <button onClick={() => setEditMode(false)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: "#4a5568", border: "1px solid #1a2035", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  <X style={{ width: 12, height: 12 }} /> Cancelar
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProfile}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Nome Completo</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    disabled={!editMode} required
                    style={{ ...inp, background: editMode ? "#111827" : "#0b0f1a", color: editMode ? "#e2e8f0" : "#4a5568" }} />
                </div>
                <div>
                  <label style={lbl}>Email</label>
                  <input type="email" value={user?.email || ""} disabled
                    style={{ ...inp, background: "#0b0f1a", color: "#4a5568" }} />
                </div>
                <div>
                  <label style={lbl}>Telefone</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!editMode} placeholder="+258 84 000 0000"
                    style={{ ...inp, background: editMode ? "#111827" : "#0b0f1a", color: editMode ? "#e2e8f0" : "#4a5568" }} />
                </div>
                <div>
                  <label style={lbl}>Endereço</label>
                  <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                    disabled={!editMode} placeholder="Bairro, Cidade"
                    style={{ ...inp, background: editMode ? "#111827" : "#0b0f1a", color: editMode ? "#e2e8f0" : "#4a5568" }} />
                </div>
              </div>

              {["admin", "director", "professor"].includes(role) && (
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Biografia</label>
                  <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })}
                    disabled={!editMode} rows={3} placeholder="Breve descrição profissional..."
                    style={{ ...inp, resize: "vertical", background: editMode ? "#111827" : "#0b0f1a", color: editMode ? "#e2e8f0" : "#4a5568" }} />
                </div>
              )}

              {editMode && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" disabled={saving}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: saving ? "#2d3748" : "#6366f1", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                    <Save style={{ width: 14, height: 14 }} />
                    {saving ? "A guardar..." : "Guardar Alterações"}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Alterar Senha */}
          <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 14, padding: "24px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showPasswordForm ? 20 : 0 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Segurança</h3>
                <p style={{ fontSize: 11, color: "#4a5568", margin: "3px 0 0" }}>Altera a tua senha de acesso</p>
              </div>
              <button onClick={() => setShowPasswordForm(!showPasswordForm)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: showPasswordForm ? "transparent" : "rgba(99,102,241,0.1)", color: showPasswordForm ? "#4a5568" : "#818cf8", border: `1px solid ${showPasswordForm ? "#1a2035" : "rgba(99,102,241,0.2)"}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {showPasswordForm ? <><X style={{ width: 12, height: 12 }} /> Cancelar</> : <><Key style={{ width: 12, height: 12 }} /> Alterar Senha</>}
              </button>
            </div>

            {showPasswordForm && (
              <form onSubmit={handleChangePassword}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Nova Senha</label>
                    <div style={{ position: "relative" }}>
                      <Lock style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#4a5568" }} />
                      <input type={showNew ? "text" : "password"} value={passwordData.newPassword}
                        onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        required minLength={8} placeholder="Nova senha"
                        style={{ ...inp, paddingLeft: 38, paddingRight: 40 }} />
                      <button type="button" onClick={() => setShowNew(!showNew)}
                        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4a5568" }}>
                        {showNew ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                      </button>
                    </div>
                    <PasswordStrengthBar password={passwordData.newPassword} />
                  </div>
                  <div>
                    <label style={lbl}>Confirmar Senha</label>
                    <div style={{ position: "relative" }}>
                      <Lock style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#4a5568" }} />
                      <input type={showConfirm ? "text" : "password"} value={passwordData.confirmPassword}
                        onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        required placeholder="Confirmar senha"
                        style={{ ...inp, paddingLeft: 38, paddingRight: 40, borderColor: passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword ? "#f87171" : "#1a2035" }} />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4a5568" }}>
                        {showConfirm ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                      </button>
                    </div>
                    {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                      <p style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>As senhas não coincidem</p>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" disabled={saving}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: saving ? "#2d3748" : "#6366f1", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                    <Key style={{ width: 14, height: 14 }} />
                    {saving ? "A alterar..." : "Alterar Senha"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Info da conta — só leitura */}
          <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 14, padding: "20px 28px" }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 14px" }}>Informações da Conta</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "ID da Conta", value: user?.id?.slice(0, 8) + "...", mono: true },
                { label: "Papel", value: ROLE_LABELS[role] },
                { label: "Estado", value: "Activo", color: "#10b981" },
                { label: "Criado em", value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-MZ") : "—" },
              ].map(({ label, value, mono, color }) => (
                <div key={label} style={{ background: "#111827", borderRadius: 8, padding: "10px 14px" }}>
                  <p style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 3px", fontWeight: 600 }}>{label}</p>
                  <p style={{ fontSize: 13, color: color || "#e2e8f0", margin: 0, fontFamily: mono ? "'IBM Plex Mono', monospace" : "inherit", fontWeight: 500 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}