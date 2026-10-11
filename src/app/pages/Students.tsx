import { useState } from "react";
import { useStudents, useClasses } from "../hooks";
import { studentsAPI } from "../lib/api";
import { getCurrentUser } from "../lib/auth";
import type { Student } from "../lib/supabase";
import { Plus, Search, Edit2, Trash2, Eye, X, Users, RefreshCw } from "lucide-react";

export default function Students() {
  const user = getCurrentUser();
  const role = user?.role || "secretaria";
  const canManage = ["admin", "director"].includes(role);
  const canDelete = role === "admin";

  const { data: students = [], isLoading: loading, refetch } = useStudents();
  const { data: classes = [] } = useClasses();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "", birthDate: "", classId: "", guardian: "", guardianPhone: "", address: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingStudent) {
        await studentsAPI.update(editingStudent.id, formData);
      } else {
        await studentsAPI.create(formData);
      }
      await refetch();
      resetForm();
    } catch { alert("Erro ao guardar aluno"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (student: Student) => {
    try {
      await studentsAPI.delete(student.id);
      await refetch();
      setDeleteConfirm(null);
    } catch { alert("Erro ao apagar aluno"); }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      birthDate: student.birthDate,
      classId: student.classId,
      guardian: student.guardian,
      guardianPhone: student.guardianPhone || "",
      address: student.address || "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ name: "", birthDate: "", classId: "", guardian: "", guardianPhone: "", address: "" });
    setEditingStudent(null);
    setShowForm(false);
  };

  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || "—";

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.guardian?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = selectedClass === "all" || s.classId === selectedClass;
    return matchSearch && matchClass;
  });

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px",
    background: "#111827", border: "1px solid #1a2035",
    borderRadius: 8, fontSize: 13, color: "#e2e8f0",
    outline: "none", fontFamily: "inherit",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 600,
    color: "#4a5568", marginBottom: 5,
    textTransform: "uppercase", letterSpacing: 0.8,
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, fontFamily: "'IBM Plex Sans', system-ui" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid #1a2035", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#4a5568", fontSize: 13, margin: 0 }}>A carregar alunos...</p>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1300, margin: "0 auto", fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`input:focus, select:focus, textarea:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }`}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Alunos</h1>
          <p style={{ fontSize: 12, color: "#4a5568", margin: "4px 0 0" }}>{students.length} alunos registados</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => refetch()} style={{ display: "flex", alignItems: "center", gap: 6, background: "#111827", color: "#4a5568", border: "1px solid #1a2035", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Actualizar
          </button>
          {canManage && (
            <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#6366f1", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Plus style={{ width: 14, height: 14 }} /> Novo Aluno
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 10, padding: "14px 18px", marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#4a5568" }} />
          <input type="text" placeholder="Pesquisar por nome ou responsável..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ ...inp, paddingLeft: 32 }} />
        </div>
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
          style={{ ...inp, width: "auto", minWidth: 180 }}>
          <option value="all">Todas as turmas</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span style={{ fontSize: 12, color: "#4a5568" }}>{filtered.length} resultado(s)</span>
      </div>

      {/* Tabela */}
      <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a2035" }}>
                {["Aluno", "Data Nasc.", "Turma", "Responsável", "Telefone", ""].map((h, i) => (
                  <th key={i} style={{ padding: "12px 16px", textAlign: i === 5 ? "right" : "left", fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: "center", color: "#4a5568" }}>
                    <Users style={{ width: 32, height: 32, margin: "0 auto 10px", opacity: 0.3 }} />
                    <p style={{ margin: 0 }}>Nenhum aluno encontrado</p>
                    {canManage && <p style={{ margin: "8px 0 0", fontSize: 12 }}>Clica em "Novo Aluno" para começar</p>}
                  </td>
                </tr>
              ) : filtered.map(student => (
                <tr key={student.id} style={{ borderBottom: "1px solid #0f1520", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#111827"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>

                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#818cf8", flexShrink: 0 }}>
                        {student.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{student.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "#718096" }}>
                    {student.birthDate ? new Date(student.birthDate).toLocaleDateString("pt-MZ") : "—"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                      {getClassName(student.classId)}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "#718096" }}>{student.guardian}</td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "#4a5568", fontFamily: "'IBM Plex Mono', monospace" }}>{student.guardianPhone || "—"}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                      <a href={`/report/${student.id}`} title="Ver Boletim"
                        style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", color: "#4a5568", display: "flex", alignItems: "center", textDecoration: "none", transition: "all 0.15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#818cf8"; (e.currentTarget as HTMLElement).style.borderColor = "#818cf8"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                        <Eye style={{ width: 13, height: 13 }} />
                      </a>
                      {canManage && (
                        <button onClick={() => handleEdit(student)} title="Editar"
                          style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", cursor: "pointer", background: "transparent", color: "#4a5568", transition: "all 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#6366f1"; (e.currentTarget as HTMLElement).style.borderColor = "#6366f1"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                          <Edit2 style={{ width: 13, height: 13 }} />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setDeleteConfirm(student)} title="Apagar"
                          style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", cursor: "pointer", background: "transparent", color: "#4a5568", transition: "all 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.borderColor = "#f87171"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid #1a2035" }}>
          <span style={{ fontSize: 11, color: "#4a5568" }}>{filtered.length} de {students.length} alunos</span>
        </div>
      </div>

      {/* Modal Delete */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}>
          <div style={{ background: "#0d1117", borderRadius: 16, border: "1px solid #1a2035", padding: 28, maxWidth: 380, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Trash2 style={{ width: 20, height: 20, color: "#f87171" }} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", textAlign: "center", margin: "0 0 8px" }}>Apagar Aluno?</h2>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#f87171", textAlign: "center", margin: "0 0 20px" }}>{deleteConfirm.name}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleDelete(deleteConfirm)}
                style={{ flex: 1, background: "#f87171", color: "white", border: "none", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Apagar</button>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, background: "#111827", color: "#718096", border: "1px solid #1a2035", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && canManage && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}>
          <div style={{ background: "#0d1117", borderRadius: 16, border: "1px solid #1a2035", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{editingStudent ? "Editar Aluno" : "Novo Aluno"}</h2>
                  <p style={{ fontSize: 12, color: "#4a5568", margin: "4px 0 0" }}>{editingStudent ? `A editar: ${editingStudent.name}` : "Preenche os dados do aluno"}</p>
                </div>
                <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a5568" }}>
                  <X style={{ width: 18, height: 18 }} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Nome Completo</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Nome do aluno" style={inp} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Data de Nascimento</label>
                    <input type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} required style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Turma</label>
                    <select value={formData.classId} onChange={e => setFormData({ ...formData, classId: e.target.value })} required style={inp}>
                      <option value="">Selecciona a turma</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Responsável</label>
                  <input type="text" value={formData.guardian} onChange={e => setFormData({ ...formData, guardian: e.target.value })} required placeholder="Nome do responsável" style={inp} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Telefone do Responsável</label>
                    <input type="tel" value={formData.guardianPhone} onChange={e => setFormData({ ...formData, guardianPhone: e.target.value })} placeholder="+258 84 000 0000" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Endereço</label>
                    <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Bairro, Cidade" style={inp} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                  <button type="submit" disabled={saving}
                    style={{ flex: 1, background: saving ? "#2d3748" : "#6366f1", color: "white", border: "none", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "A guardar..." : editingStudent ? "Actualizar" : "Cadastrar"}
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
