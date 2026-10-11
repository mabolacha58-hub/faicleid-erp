import { useState } from "react";
import { getCurrentUser } from "../lib/auth";
import { gradesAPI } from "../lib/api";
import { downloadCSV, hoje } from "../lib/csv";
import { useGrades, useStudents, useClasses, useSubjects } from "../hooks";
import type { Grade } from "../../types/domain";
import { Award, Plus, Search, Edit2, Trash2, X, Eye, RefreshCw, Download } from "lucide-react";

const BIMESTRES = [
  { id: 1, nome: "1º Bimestre" },
  { id: 2, nome: "2º Bimestre" },
  { id: 3, nome: "3º Bimestre" },
  { id: 4, nome: "4º Bimestre" },
];
const NOTA_MIN = 10;

type EnrichedGrade = Grade & {
  studentName?: string;
  subjectName?: string;
  className?: string;
};

export default function Grades() {
  const user = getCurrentUser();
  const role = user?.role || "secretaria";
  const isTeacher = role === "professor";
  const canManage = role === "professor";
  const canView = ["admin", "director", "pedagogico", "professor"].includes(role);

  const { data: grades = [], isLoading: loading, refetch } = useGrades();
  const { data: students = [] } = useStudents();
  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjects();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedBimester, setSelectedBimester] = useState(() => { const m = new Date().getMonth() + 1; return m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : 4; });
  const [showForm, setShowForm] = useState(false);
  const [editingGrade, setEditingGrade] = useState<EnrichedGrade | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<EnrichedGrade | null>(null);
  const [formData, setFormData] = useState({ studentId: "", subjectId: "", bimester: 1, grade: "" });

  const enriched: EnrichedGrade[] = grades.map(g => ({
    ...g,
    studentName: students.find(s => s.id === g.studentId)?.name,
    subjectName: subjects.find(s => s.id === g.subjectId)?.name,
    className: (() => { const st = students.find(s => s.id === g.studentId); return st ? classes.find(c => c.id === st.classId)?.name : undefined; })(),
  })).filter(g => {
    const ms = g.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || g.subjectName?.toLowerCase().includes(searchTerm.toLowerCase());
    const mc = selectedClass === "all" || g.classId === selectedClass;
    const msub = selectedSubject === "all" || g.subjectId === selectedSubject;
    return ms && mc && msub && g.bimester === selectedBimester;
  });

  const stats = { total: enriched.length, media: enriched.length > 0 ? (enriched.reduce((a, g) => a + (g.grade || 0), 0) / enriched.length).toFixed(1) : "0.0", aprovados: enriched.filter(g => (g.grade || 0) >= NOTA_MIN).length, reprovados: enriched.filter(g => (g.grade || 0) < NOTA_MIN && g.grade).length };

  const handleExport = () => {
    downloadCSV(`notas-${selectedBimester}bim-${hoje()}`, enriched.map(g => ({
      Aluno: g.studentName || "",
      Turma: g.className || "",
      Disciplina: g.subjectName || "",
      Bimestre: `${g.bimester}º`,
      Nota: g.grade ?? "",
      Situação: (g.grade || 0) >= NOTA_MIN ? "Aprovado" : "Reprovado",
    })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    try {
      const student = students.find(s => s.id === formData.studentId);
      if (!student) { alert("Selecciona um aluno válido"); return; }
      const payload = { studentId: formData.studentId, subjectId: formData.subjectId, classId: student.classId, bimester: formData.bimester as 1 | 2 | 3 | 4, grade: parseFloat(formData.grade) };
      if (editingGrade) await gradesAPI.save(payload);
      else await gradesAPI.save(payload);
      await refetch(); resetForm();
    } catch { alert("Erro ao guardar nota"); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || !canManage) return;
    try {
      await gradesAPI.delete({ studentId: deleteConfirm.studentId, subjectId: deleteConfirm.subjectId, classId: deleteConfirm.classId, bimester: deleteConfirm.bimester });
      await refetch(); setDeleteConfirm(null);
    } catch { alert("Erro ao apagar nota"); }
  };

  const resetForm = () => { setFormData({ studentId: "", subjectId: "", bimester: selectedBimester, grade: "" }); setEditingGrade(null); setShowForm(false); };

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#111827", border: "1px solid #1a2035", borderRadius: 8, fontSize: 13, color: "#e2e8f0", outline: "none", fontFamily: "inherit" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "#4a5568", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 };

  if (!canView) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", fontFamily: "'IBM Plex Sans',system-ui", color: "#4a5568" }}>
      <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>🔒</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: "#718096" }}>Acesso Restrito</p>
    </div>
  );

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid #1a2035", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "#4a5568", fontSize: 13, margin: 0 }}>A carregar notas...</p>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1300, margin: "0 auto", fontFamily: "'IBM Plex Sans','Segoe UI',system-ui,sans-serif" }}>
      <style>{`input:focus,select:focus,textarea:focus{border-color:#6366f1!important;box-shadow:0 0 0 3px rgba(99,102,241,0.1)}`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Gestão de Notas</h1>
            {isTeacher ? <span style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>Professor — Acesso Total</span>
              : <span style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Eye style={{ width: 11, height: 11 }} /> Só Visualização</span>}
          </div>
          <p style={{ fontSize: 12, color: "#4a5568", margin: "4px 0 0" }}>{enriched.length} notas no {selectedBimester}º Bimestre</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => refetch()} style={{ display: "flex", alignItems: "center", gap: 6, background: "#111827", color: "#4a5568", border: "1px solid #1a2035", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Actualizar
          </button>
          <button onClick={handleExport} disabled={!enriched.length} title="Exportar notas para CSV"
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#111827", color: enriched.length ? "#10b981" : "#4a5568", border: "1px solid #1a2035", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: enriched.length ? "pointer" : "not-allowed" }}>
            <Download style={{ width: 13, height: 13 }} /> Exportar CSV
          </button>
          {canManage && <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#6366f1", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus style={{ width: 14, height: 14 }} /> Lançar Nota
          </button>}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
        {[{ l: "Total Notas", v: stats.total, c: "#6366f1" }, { l: "Média Geral", v: stats.media, c: "#06b6d4" }, { l: "Aprovados ≥10", v: stats.aprovados, c: "#10b981" }, { l: "Reprovados <10", v: stats.reprovados, c: "#f87171" }].map(s => (
          <div key={s.l} style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 10, padding: "14px 16px" }}>
            <p style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px", fontWeight: 600 }}>{s.l}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: s.c, margin: 0, fontFamily: "'IBM Plex Mono',monospace" }}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 10, padding: "14px 18px", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#4a5568" }} />
          <input type="text" placeholder="Pesquisar aluno..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inp, paddingLeft: 32 }} />
        </div>
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ ...inp, width: "auto", minWidth: 150 }}>
          <option value="all">Todas as turmas</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} style={{ ...inp, width: "auto", minWidth: 150 }}>
          <option value="all">Todas as disciplinas</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={selectedBimester} onChange={e => setSelectedBimester(parseInt(e.target.value))} style={{ ...inp, width: "auto", minWidth: 140 }}>
          {BIMESTRES.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
        </select>
        <button onClick={() => { setSearchTerm(""); setSelectedClass("all"); setSelectedSubject("all"); }}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #1a2035", background: "transparent", color: "#4a5568", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Limpar
        </button>
      </div>

      {/* Tabela */}
      <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a2035" }}>
                {["Aluno", "Turma", "Disciplina", "Bimestre", "Nota", ""].map((h, i) => (
                  <th key={i} style={{ padding: "12px 16px", textAlign: i === 5 ? "right" : "left", fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enriched.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 48, textAlign: "center", color: "#4a5568" }}>
                  <Award style={{ width: 32, height: 32, margin: "0 auto 10px", opacity: 0.3 }} />
                  <p style={{ margin: 0 }}>Nenhuma nota encontrada</p>
                </td></tr>
              ) : enriched.map(grade => (
                <tr key={`${grade.studentId}-${grade.subjectId}-${grade.classId}-${grade.bimester}`} style={{ borderBottom: "1px solid #0f1520", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#111827"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                  <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{grade.studentName || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: 12, color: "#718096" }}>{grade.className || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: 12, color: "#718096" }}>{grade.subjectName || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: 12, color: "#718096" }}>{grade.bimester}º Bimestre</td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ background: (grade.grade || 0) >= NOTA_MIN ? "rgba(16,185,129,0.1)" : "rgba(248,113,113,0.1)", color: (grade.grade || 0) >= NOTA_MIN ? "#10b981" : "#f87171", border: `1px solid ${(grade.grade || 0) >= NOTA_MIN ? "rgba(16,185,129,0.3)" : "rgba(248,113,113,0.3)"}`, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace" }}>
                      {grade.grade?.toFixed(1) || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px", textAlign: "right" }}>
                    {canManage && (
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                        <button onClick={() => { setEditingGrade(grade); setFormData({ studentId: grade.studentId, subjectId: grade.subjectId, bimester: grade.bimester, grade: grade.grade?.toString() || "" }); setShowForm(true); }}
                          style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", cursor: "pointer", background: "transparent", color: "#4a5568", transition: "all 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#6366f1"; (e.currentTarget as HTMLElement).style.borderColor = "#6366f1"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                          <Edit2 style={{ width: 13, height: 13 }} />
                        </button>
                        <button onClick={() => setDeleteConfirm(grade)}
                          style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", cursor: "pointer", background: "transparent", color: "#4a5568", transition: "all 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.borderColor = "#f87171"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid #1a2035" }}>
          <span style={{ fontSize: 11, color: "#4a5568" }}>{enriched.length} notas · Aprovação mínima: {NOTA_MIN} valores</span>
        </div>
      </div>

      {/* Modal Delete */}
      {deleteConfirm && canManage && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}>
          <div style={{ background: "#0d1117", borderRadius: 16, border: "1px solid #1a2035", padding: 28, maxWidth: 380, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", textAlign: "center", margin: "0 0 8px" }}>Apagar Nota?</h2>
            <p style={{ fontSize: 13, color: "#718096", textAlign: "center", margin: "0 0 20px" }}>Nota de <strong style={{ color: "#f87171" }}>{deleteConfirm.studentName}</strong> em {deleteConfirm.subjectName} ({deleteConfirm.bimester}º Bimestre)</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleDelete}
                style={{ flex: 1, background: "#f87171", color: "white", border: "none", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Apagar</button>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, background: "#111827", color: "#718096", border: "1px solid #1a2035", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && canManage && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}>
          <div style={{ background: "#0d1117", borderRadius: 16, border: "1px solid #1a2035", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{editingGrade ? "Editar Nota" : "Lançar Nota"}</h2>
                <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a5568" }}><X style={{ width: 18, height: 18 }} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Aluno</label>
                  <select value={formData.studentId} onChange={e => setFormData({ ...formData, studentId: e.target.value })} required style={inp}>
                    <option value="">Selecciona um aluno</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} — {classes.find(c => c.id === s.classId)?.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Disciplina</label>
                  <select value={formData.subjectId} onChange={e => setFormData({ ...formData, subjectId: e.target.value })} required style={inp}>
                    <option value="">Selecciona uma disciplina</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Bimestre</label>
                    <select value={formData.bimester} onChange={e => setFormData({ ...formData, bimester: parseInt(e.target.value) })} required style={inp}>
                      {BIMESTRES.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Nota (0–20)</label>
                    <input type="number" value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} required min="0" max="20" step="0.1" placeholder="Ex: 14.5" style={inp} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" style={{ flex: 1, background: "#6366f1", color: "white", border: "none", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{editingGrade ? "Guardar Alterações" : "Lançar Nota"}</button>
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