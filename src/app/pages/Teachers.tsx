import { useState } from "react";
import { useUsers, useClasses, useSubjects } from "../hooks";
import { usersAPI } from "../lib/api";
import { getCurrentUser } from "../lib/auth";
import { Plus, GraduationCap, Edit2, Trash2, X, Search, Key, BookOpen, School, Eye, EyeOff, Copy, Check, RefreshCw } from "lucide-react";

type Professor = {
  id: string; name: string; email: string; role: string;
  accessCode?: string; assignedClasses?: string[]; assignedSubjects?: string[]; createdAt?: string;
};

export default function Teachers() {
  const user = getCurrentUser();
  const role = user?.role || "secretaria";
  const canManage = ["admin", "director"].includes(role);
  const canDelete = role === "admin";

  const { data: allUsers = [], isLoading: loading, refetch: refetchUsers } = useUsers();
  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjects();
  const professors = allUsers.filter((u) => u.role === "professor");
  const [showForm, setShowForm] = useState(false);
  const [editingProf, setEditingProf] = useState<Professor | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Professor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", password: "", assignedClasses: [] as string[], assignedSubjects: [] as string[] });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!canManage) return;
    if (!editingProf && !formData.password) { setFormError("A senha é obrigatória"); return; }
    if (!editingProf && formData.password) {
      const { validatePassword } = await import("../lib/passwordStrength.tsx");
      const s = validatePassword(formData.password);
      if (!s.valid) { setFormError("Senha fraca: " + s.errors.join(" · ")); return; }
    }
    setSaving(true);
    try {
      if (editingProf) {
        await usersAPI.update(editingProf.id, { name: formData.name, assignedClasses: formData.assignedClasses, assignedSubjects: formData.assignedSubjects });
      } else {
        const res = await usersAPI.create({ email: formData.email, password: formData.password, name: formData.name, role: "professor" });
        if (res.user?.id && (formData.assignedClasses.length > 0 || formData.assignedSubjects.length > 0)) {
          await usersAPI.update(res.user.id, { assignedClasses: formData.assignedClasses, assignedSubjects: formData.assignedSubjects });
        }
      }
      await refetchUsers(); resetForm();
    } catch (err) { setFormError(err instanceof Error ? err.message : "Erro ao guardar professor"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (prof: Professor) => {
    if (!canDelete) return;
    try { await usersAPI.delete(prof.id); await refetchUsers(); setDeleteConfirm(null); }
    catch (err) { alert(err instanceof Error ? err.message : "Erro ao apagar professor"); }
  };

  const handleEdit = (prof: Professor) => {
    setEditingProf(prof);
    setFormData({ name: prof.name, email: prof.email, password: "", assignedClasses: prof.assignedClasses || [], assignedSubjects: prof.assignedSubjects || [] });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", password: "", assignedClasses: [], assignedSubjects: [] });
    setEditingProf(null); setShowForm(false); setFormError(""); setShowPassword(false);
  };

  const toggleClass = (id: string) => setFormData(p => ({ ...p, assignedClasses: p.assignedClasses.includes(id) ? p.assignedClasses.filter(c => c !== id) : [...p.assignedClasses, id] }));
  const toggleSubject = (id: string) => setFormData(p => ({ ...p, assignedSubjects: p.assignedSubjects.includes(id) ? p.assignedSubjects.filter(s => s !== id) : [...p.assignedSubjects, id] }));
  const copyCode = (code: string) => { navigator.clipboard.writeText(code); setCopiedCode(code); setTimeout(() => setCopiedCode(null), 2000); };
  const getClassName = (id: string) => classes.find(c => c.id === id)?.name || id;
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || id;

  const filtered = professors.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.email?.toLowerCase().includes(searchTerm.toLowerCase()));

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "#111827", border: "1px solid #1a2035", borderRadius: 8, fontSize: 13, color: "#e2e8f0", outline: "none", fontFamily: "inherit" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "#4a5568", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid #1a2035", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "#4a5568", fontSize: 13, margin: 0 }}>A carregar professores...</p>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1300, margin: "0 auto", fontFamily: "'IBM Plex Sans','Segoe UI',system-ui,sans-serif" }}>
      <style>{`input:focus,select:focus{border-color:#6366f1!important;box-shadow:0 0 0 3px rgba(99,102,241,0.1)}`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Professores</h1>
            {!canManage && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}><Eye style={{ width: 11, height: 11 }} /> Modo visualização</span>}
          </div>
          <p style={{ fontSize: 12, color: "#4a5568", margin: "4px 0 0" }}>{professors.length} professor(es) registado(s)</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => refetchUsers()} style={{ display: "flex", alignItems: "center", gap: 6, background: "#111827", color: "#4a5568", border: "1px solid #1a2035", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Actualizar
          </button>
          {canManage && <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#6366f1", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus style={{ width: 14, height: 14 }} /> Novo Professor
          </button>}
        </div>
      </div>

      <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#4a5568" }} />
          <input type="text" placeholder="Pesquisar professor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inp, paddingLeft: 32 }} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "#0d1117", border: "1px solid #1a2035", borderRadius: 12, color: "#4a5568" }}>
          <GraduationCap style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Nenhum professor encontrado</p>
          {canManage && <p style={{ fontSize: 12, margin: "8px 0 0" }}>Clica em "Novo Professor" para começar</p>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {filtered.map(prof => (
            <div key={prof.id} style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 14, padding: "18px 20px", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#2d3748"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.3))", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <GraduationCap style={{ width: 22, height: 22, color: "#818cf8" }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{prof.name}</h3>
                    <p style={{ fontSize: 11, color: "#4a5568", margin: "2px 0 0", fontFamily: "'IBM Plex Mono',monospace" }}>{prof.email}</p>
                  </div>
                </div>
                {canManage && (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => handleEdit(prof)} style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", cursor: "pointer", background: "transparent", color: "#4a5568", transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#6366f1"; (e.currentTarget as HTMLElement).style.borderColor = "#6366f1"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                      <Edit2 style={{ width: 13, height: 13 }} />
                    </button>
                    {canDelete && <button onClick={() => setDeleteConfirm(prof)} style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", cursor: "pointer", background: "transparent", color: "#4a5568", transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.borderColor = "#f87171"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>}
                  </div>
                )}
              </div>

              {prof.accessCode && (
                <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Key style={{ width: 12, height: 12, color: "#818cf8" }} />
                    <span style={{ fontSize: 11, color: "#818cf8", fontWeight: 600 }}>Código:</span>
                    <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#c4b5fd" }}>{prof.accessCode}</span>
                  </div>
                  <button onClick={() => copyCode(prof.accessCode!)}
                    style={{ padding: "3px 8px", borderRadius: 6, border: "none", cursor: "pointer", background: copiedCode === prof.accessCode ? "rgba(16,185,129,0.15)" : "rgba(99,102,241,0.15)", color: copiedCode === prof.accessCode ? "#10b981" : "#818cf8", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                    {copiedCode === prof.accessCode ? <><Check style={{ width: 11, height: 11 }} />Copiado</> : <><Copy style={{ width: 11, height: 11 }} />Copiar</>}
                  </button>
                </div>
              )}

              {(prof.assignedClasses?.length || 0) > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 4 }}>
                    <School style={{ width: 10, height: 10 }} /> Turmas ({prof.assignedClasses!.length})
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {prof.assignedClasses!.map(id => (
                      <span key={id} style={{ fontSize: 11, background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{getClassName(id)}</span>
                    ))}
                  </div>
                </div>
              )}

              {(prof.assignedSubjects?.length || 0) > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 4 }}>
                    <BookOpen style={{ width: 10, height: 10 }} /> Disciplinas ({prof.assignedSubjects!.length})
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {prof.assignedSubjects!.map(id => (
                      <span key={id} style={{ fontSize: 11, background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{getSubjectName(id)}</span>
                    ))}
                  </div>
                </div>
              )}

              {(prof.assignedClasses?.length || 0) === 0 && (prof.assignedSubjects?.length || 0) === 0 && (
                <p style={{ fontSize: 12, color: "#2d3748", fontStyle: "italic" }}>Sem turmas ou disciplinas atribuídas</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Delete */}
      {deleteConfirm && canDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}>
          <div style={{ background: "#0d1117", borderRadius: 16, border: "1px solid #1a2035", padding: 28, maxWidth: 380, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Trash2 style={{ width: 20, height: 20, color: "#f87171" }} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", textAlign: "center", margin: "0 0 8px" }}>Apagar Professor?</h2>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#f87171", textAlign: "center", margin: "0 0 20px" }}>"{deleteConfirm.name}"</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, background: "#f87171", color: "white", border: "none", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Apagar</button>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, background: "#111827", color: "#718096", border: "1px solid #1a2035", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && canManage && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}>
          <div style={{ background: "#0d1117", borderRadius: 16, border: "1px solid #1a2035", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{editingProf ? "Editar Professor" : "Novo Professor"}</h2>
                  <p style={{ fontSize: 12, color: "#4a5568", margin: "4px 0 0" }}>{editingProf ? "Actualizar turmas e disciplinas" : "Criar conta de acesso ao sistema"}</p>
                </div>
                <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a5568" }}><X style={{ width: 18, height: 18 }} /></button>
              </div>

              {formError && <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f87171" }}>⚠ {formError}</div>}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Nome Completo</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Ex: João da Silva" style={inp} />
                </div>

                {!editingProf && <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={lbl}>Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required placeholder="professor@escola.mz" style={inp} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={lbl}>Senha de Acesso</label>
                    <div style={{ position: "relative" }}>
                      <input type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required minLength={8} placeholder="Mín. 8 caracteres, maiúscula, número e símbolo" style={{ ...inp, paddingRight: 42 }} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4a5568" }}>
                        {showPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                      </button>
                    </div>
                  </div>
                </>}

                <div style={{ marginBottom: 16 }}>
                  <label style={lbl}><School style={{ width: 11, height: 11, display: "inline", marginRight: 4 }} />Turmas Atribuídas ({formData.assignedClasses.length})</label>
                  {classes.length === 0 ? <p style={{ fontSize: 13, color: "#4a5568", fontStyle: "italic" }}>Nenhuma turma criada</p> : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 130, overflowY: "auto" }}>
                      {classes.map(cls => {
                        const sel = formData.assignedClasses.includes(cls.id!);
                        return <button key={cls.id} type="button" onClick={() => toggleClass(cls.id!)}
                          style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${sel ? "#6366f1" : "#1a2035"}`, background: sel ? "rgba(99,102,241,0.15)" : "transparent", color: sel ? "#818cf8" : "#718096", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          {sel ? "✓ " : ""}{cls.name}
                        </button>;
                      })}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={lbl}><BookOpen style={{ width: 11, height: 11, display: "inline", marginRight: 4 }} />Disciplinas Atribuídas ({formData.assignedSubjects.length})</label>
                  {subjects.length === 0 ? <p style={{ fontSize: 13, color: "#4a5568", fontStyle: "italic" }}>Nenhuma disciplina criada</p> : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 130, overflowY: "auto" }}>
                      {subjects.map(sub => {
                        const sel = formData.assignedSubjects.includes(sub.id!);
                        return <button key={sub.id} type="button" onClick={() => toggleSubject(sub.id!)}
                          style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${sel ? "#10b981" : "#1a2035"}`, background: sel ? "rgba(16,185,129,0.1)" : "transparent", color: sel ? "#10b981" : "#718096", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          {sel ? "✓ " : ""}{sub.emoji || "📚"} {sub.name}
                        </button>;
                      })}
                    </div>
                  )}
                </div>

                {!editingProf && <div style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#818cf8" }}>
                  🔑 Um código de acesso único será gerado automaticamente (ex: PROF-2025-001).
                </div>}

                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" disabled={saving} style={{ flex: 1, background: saving ? "#2d3748" : "#6366f1", color: "white", border: "none", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "A guardar..." : editingProf ? "Guardar Alterações" : "Criar Professor"}
                  </button>
                  <button type="button" onClick={resetForm} style={{ flex: 1, background: "#111827", color: "#718096", border: "1px solid #1a2035", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
