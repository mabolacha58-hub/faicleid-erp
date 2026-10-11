import { useEffect, useState } from "react";
import { usersAPI } from "../lib/api";
import { getCurrentUser, ROLE_LABELS, ROLE_COLORS } from "../lib/auth";
import type { UserRole } from "../lib/supabase";
import { validatePassword, PasswordStrengthBar } from "../lib/passwordStrength";
import {
  Plus, Edit2, Trash2, X, Search, Shield, Eye, EyeOff,
  Key, Copy, Check, Users, RefreshCw
} from "lucide-react";

type SystemUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accessCode?: string;
  assignedClasses?: string[];
  assignedSubjects?: string[];
  createdAt?: string;
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin:      "Gere financeiro, vê tudo",
  director:   "Gere utilizadores e pedagogia",
  pedagogico: "Visualiza dados pedagógicos",
  professor:  "Lança notas da sua turma",
  secretaria: "Visualiza financeiro",
};

const CREATABLE_ROLES: UserRole[] = ["director", "pedagogico", "professor", "secretaria"];

export default function UsersPage() {
  const user = getCurrentUser();
  const role = user?.role || "admin";

  const canManage = ["admin", "director"].includes(role);
  const canDelete = role === "admin";

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<SystemUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [showPassword, setShowPassword] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "secretaria" as UserRole,
  });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const res = await usersAPI.getAll();
      setUsers(res.users || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!canManage) return;

    if (!editingUser && formData.password) {
      const strength = validatePassword(formData.password);
      if (!strength.valid) {
        setFormError("Senha fraca: " + strength.errors.join(" · "));
        setSaving(false);
        return;
      }
    }
    if (!editingUser && !formData.password) {
      setFormError("A senha é obrigatória");
      setSaving(false);
      return;
    }

    // Director não pode criar admin ou outro director
    if (role === "director" && ["admin", "director"].includes(formData.role)) {
      setFormError("Não tem permissão para criar este tipo de utilizador");
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        await usersAPI.update(editingUser.id, { name: formData.name });
      } else {
        await usersAPI.create({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
        });
      }
      await loadUsers();
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao guardar utilizador");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: SystemUser) => {
    if (!canDelete) return;
    if (u.id === user?.id) { alert("Não pode apagar a sua própria conta"); return; }
    try {
      await usersAPI.delete(u.id);
      await loadUsers();
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao apagar utilizador");
    }
  };

  const handleEdit = (u: SystemUser) => {
    setEditingUser(u);
    setFormData({ name: u.name, email: u.email, password: "", role: u.role });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", password: "", role: "secretaria" });
    setEditingUser(null); setShowForm(false); setFormError(""); setShowPassword(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filtered = users.filter(u => {
    const matchSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  // Contagens por papel
  const counts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#111827", border: "1px solid #1a2035", borderRadius: 8, fontSize: 13, color: "#e2e8f0", outline: "none", fontFamily: "inherit" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "#4a5568", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, fontFamily: "'IBM Plex Sans', system-ui" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid #1a2035", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#4a5568", fontSize: 13 }}>A carregar utilizadores...</p>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto", fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Gestão de Utilizadores</h1>
          <p style={{ fontSize: 12, color: "#4a5568", margin: "4px 0 0" }}>
            {users.length} utilizadores registados no sistema
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadUsers}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#111827", color: "#4a5568", border: "1px solid #1a2035", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Actualizar
          </button>
          {canManage && (
            <button onClick={() => setShowForm(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#6366f1", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Plus style={{ width: 14, height: 14 }} /> Novo Utilizador
            </button>
          )}
        </div>
      </div>

      {/* Stats por papel */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
        {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => {
          const badge = ROLE_COLORS[r];
          const count = counts[r] || 0;
          return (
            <div key={r} onClick={() => setFilterRole(filterRole === r ? "all" : r)}
              style={{ background: filterRole === r ? "rgba(99,102,241,0.08)" : "#0d1117", border: `1px solid ${filterRole === r ? "rgba(99,102,241,0.3)" : "#1a2035"}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", transition: "all 0.15s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1 }}>{ROLE_LABELS[r]}</span>
                <div style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 20, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{r}</div>
              </div>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", margin: 0, fontFamily: "'IBM Plex Mono', monospace" }}>{count}</p>
              <p style={{ fontSize: 11, color: "#4a5568", margin: "4px 0 0" }}>{ROLE_DESCRIPTIONS[r]}</p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#4a5568" }} />
          <input type="text" placeholder="Pesquisar por nome ou email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ ...inp, paddingLeft: 32 }} />
        </div>
        {filterRole !== "all" && (
          <button onClick={() => setFilterRole("all")}
            style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            × Limpar filtro
          </button>
        )}
      </div>

      {/* Tabela */}
      <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1a2035" }}>
              {["Utilizador", "Email", "Papel", "Código / Info", "Data", ""].map((h, i) => (
                <th key={i} style={{ padding: "12px 16px", textAlign: i === 5 ? "right" : "left", fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: "center", color: "#4a5568" }}>
                <Users style={{ width: 32, height: 32, margin: "0 auto 10px", opacity: 0.3 }} />
                <p style={{ margin: 0 }}>Nenhum utilizador encontrado</p>
              </td></tr>
            ) : filtered.map((u, _idx) => {
              const badge = ROLE_COLORS[u.role] || ROLE_COLORS.admin;
              const isMe = u.id === user?.id;
              return (
                <tr key={u.id} style={{ borderBottom: "1px solid #0f1520", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#111827"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>

                  {/* Nome */}
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: badge.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: badge.color, border: `1px solid ${badge.border}`, flexShrink: 0 }}>
                        {u.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", margin: 0 }}>
                          {u.name}
                          {isMe && <span style={{ marginLeft: 6, fontSize: 10, background: "rgba(99,102,241,0.15)", color: "#818cf8", padding: "1px 6px", borderRadius: 4 }}>Você</span>}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "#718096", fontFamily: "'IBM Plex Mono', monospace" }}>{u.email}</td>

                  {/* Papel */}
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                      <Shield style={{ width: 10, height: 10 }} />
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>

                  {/* Código / Info */}
                  <td style={{ padding: "14px 16px" }}>
                    {u.accessCode ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Key style={{ width: 12, height: 12, color: "#818cf8" }} />
                        <span style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "#818cf8", fontWeight: 600 }}>{u.accessCode}</span>
                        <button onClick={() => copyCode(u.accessCode!)}
                          style={{ padding: "2px 6px", borderRadius: 4, border: "none", cursor: "pointer", background: copiedCode === u.accessCode ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.1)", color: copiedCode === u.accessCode ? "#10b981" : "#818cf8", fontSize: 10, display: "flex", alignItems: "center", gap: 3 }}>
                          {copiedCode === u.accessCode ? <><Check style={{ width: 10, height: 10 }} />Copiado</> : <><Copy style={{ width: 10, height: 10 }} />Copiar</>}
                        </button>
                      </div>
                    ) : u.role === "professor" ? (
                      <span style={{ fontSize: 11, color: "#4a5568", fontStyle: "italic" }}>Sem código</span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#2d3748" }}>—</span>
                    )}
                    {u.assignedClasses && u.assignedClasses.length > 0 && (
                      <p style={{ fontSize: 10, color: "#4a5568", margin: "3px 0 0" }}>
                        {u.assignedClasses.length} turma(s) · {u.assignedSubjects?.length || 0} disciplina(s)
                      </p>
                    )}
                  </td>

                  {/* Data */}
                  <td style={{ padding: "14px 16px", fontSize: 11, color: "#4a5568", whiteSpace: "nowrap" }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-MZ") : "—"}
                  </td>

                  {/* Acções */}
                  <td style={{ padding: "14px 16px" }}>
                    {canManage && !isMe && (
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                        <button onClick={() => handleEdit(u)} title="Editar"
                          style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", cursor: "pointer", background: "transparent", color: "#4a5568", transition: "all 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#6366f1"; (e.currentTarget as HTMLElement).style.borderColor = "#6366f1"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                          <Edit2 style={{ width: 13, height: 13 }} />
                        </button>
                        {canDelete && (
                          <button onClick={() => setDeleteConfirm(u)} title="Apagar"
                            style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", cursor: "pointer", background: "transparent", color: "#4a5568", transition: "all 0.15s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.borderColor = "#f87171"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: "10px 16px", borderTop: "1px solid #1a2035", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "#4a5568" }}>{filtered.length} de {users.length} utilizadores</span>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteConfirm && canDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}>
          <div style={{ background: "#0d1117", borderRadius: 16, border: "1px solid #1a2035", padding: 28, maxWidth: 380, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Trash2 style={{ width: 20, height: 20, color: "#f87171" }} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", textAlign: "center", margin: "0 0 8px" }}>Apagar Utilizador?</h2>
            <p style={{ fontSize: 13, color: "#718096", textAlign: "center", margin: "0 0 6px" }}>Esta acção remove o acesso de</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#f87171", textAlign: "center", margin: "0 0 24px" }}>{deleteConfirm.name}</p>
            <div style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#fbbf24" }}>
              ⚠ O utilizador perderá acesso imediatamente ao sistema.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleDelete(deleteConfirm)}
                style={{ flex: 1, background: "#f87171", color: "white", border: "none", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Sim, apagar</button>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, background: "#111827", color: "#718096", border: "1px solid #1a2035", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && canManage && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}>
          <div style={{ background: "#0d1117", borderRadius: 16, border: "1px solid #1a2035", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", width: "100%", maxWidth: 440 }}>
            <div style={{ padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                    {editingUser ? "Editar Utilizador" : "Novo Utilizador"}
                  </h2>
                  <p style={{ fontSize: 12, color: "#4a5568", margin: "4px 0 0" }}>
                    {editingUser ? `A editar: ${editingUser.name}` : "Criar nova conta de acesso"}
                  </p>
                </div>
                <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a5568" }}>
                  <X style={{ width: 18, height: 18 }} />
                </button>
              </div>

              {formError && (
                <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f87171" }}>
                  ⚠ {formError}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Nome Completo</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Ex: Maria da Silva" style={inp} />
                </div>

                {!editingUser && (<>
                  <div style={{ marginBottom: 14 }}>
                    <label style={lbl}>Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required placeholder="utilizador@escola.mz" style={inp} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={lbl}>Senha</label>
                    <div style={{ position: "relative" }}>
                      <input type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required minLength={8} placeholder="Mínimo 8 caracteres com maiúscula, número e símbolo" style={{ ...inp, paddingRight: 40 }} />
                      <PasswordStrengthBar password={formData.password} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4a5568" }}>
                        {showPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                      </button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={lbl}>Papel no Sistema</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {(role === "admin" ? CREATABLE_ROLES : CREATABLE_ROLES.filter(r => !["director"].includes(r))).map(r => {
                        const badge = ROLE_COLORS[r];
                        const selected = formData.role === r;
                        return (
                          <button key={r} type="button" onClick={() => setFormData({ ...formData, role: r })}
                            style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${selected ? badge.border : "#1a2035"}`, background: selected ? badge.bg + "20" : "transparent", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                              <span style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 20, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{r}</span>
                            </div>
                            <p style={{ fontSize: 11, color: selected ? "#e2e8f0" : "#4a5568", margin: 0 }}>{ROLE_DESCRIPTIONS[r]}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>)}

                {editingUser && (
                  <div style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#818cf8" }}>
                    ℹ Apenas o nome pode ser alterado. Para mudar senha ou papel, o utilizador deve contactar o administrador.
                  </div>
                )}

                {formData.role === "professor" && !editingUser && (
                  <div style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#818cf8" }}>
                    🔑 Um código de acesso será gerado automaticamente. Turmas e disciplinas são atribuídas na página de Professores.
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" disabled={saving}
                    style={{ flex: 1, background: saving ? "#2d3748" : "#6366f1", color: "white", border: "none", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "A guardar..." : editingUser ? "Guardar Alterações" : "Criar Conta"}
                  </button>
                  <button type="button" onClick={resetForm}
                    style={{ flex: 1, background: "#111827", color: "#718096", border: "1px solid #1a2035", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}