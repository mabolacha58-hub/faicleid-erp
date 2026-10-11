import { useMemo, useState } from "react";
import { useClasses, useStudents } from "../hooks";
import { classesAPI } from "../lib/api";
import { getCurrentUser } from "../lib/auth";
import type { Class } from "../lib/supabase";
import { Plus, Search, Edit2, Trash2, X, Users, Calendar, School, Eye, RefreshCw } from "lucide-react";

const LEVELS = [
  { label: "Pré-Escolar",      color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)",  emoji: "🌱" },
  { label: "Ensino Primário",  color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)",  emoji: "📚" },
  { label: "Ensino Secundário",color: "#6366f1", bg: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.25)",  emoji: "🎓" },
];

const GRADES_BY_LEVEL: Record<string, string[]> = {
  "Pré-Escolar":       ["Berçário", "Infantil A", "Infantil B", "Infantil C"],
  "Ensino Primário":   ["1ª Classe", "2ª Classe", "3ª Classe", "4ª Classe", "5ª Classe", "6ª Classe"],
  "Ensino Secundário": ["7ª Classe", "8ª Classe", "9ª Classe", "10ª Classe", "11ª Classe", "12ª Classe"],
};

const TURMA_LETTERS = ["A", "B", "C", "D", "E"];

const getLevelInfo = (grade: string) => {
  if (!grade) return LEVELS[1];
  const g = grade.toLowerCase();
  if (g.includes("berçário") || g.includes("infantil") || g.includes("pré")) return LEVELS[0];
  const num = parseInt(grade);
  if (!isNaN(num)) return num <= 6 ? LEVELS[1] : LEVELS[2];
  return LEVELS[1];
};

const isExamClass = (grade: string) => ["6ª", "9ª", "12ª"].some(n => (grade || "").includes(n));

export default function Classes() {
  const user = getCurrentUser();
  const role = user?.role || "secretaria";
  const canManage = ["admin", "director"].includes(role);
  const canDelete = role === "admin";

  const { data: classes = [], isLoading: loading, refetch } = useClasses();
  const { data: students = [] } = useStudents();
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Class | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "", grade: "", level: "Ensino Primário",
    year: new Date().getFullYear(), letter: "A", capacity: 30,
  });

  const studentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => { if (s.classId) counts[s.classId] = (counts[s.classId] || 0) + 1; });
    return counts;
  }, [students]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name || `${formData.grade} - Turma ${formData.letter}`,
        grade: formData.grade, year: formData.year, capacity: formData.capacity,
      };
      if (editingClass) await classesAPI.update(editingClass.id!, payload);
      else await classesAPI.create(payload);
      await refetch(); resetForm();
    } catch { alert("Erro ao guardar turma"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (cls: Class) => {
    if (!canDelete) return;
    try { await classesAPI.delete(cls.id!); await refetch(); setDeleteConfirm(null); }
    catch { alert("Erro ao apagar turma"); }
  };

  const handleEdit = (cls: Class) => {
    if (!canManage) return;
    setEditingClass(cls);
    const lvl = getLevelInfo(cls.grade);
    setFormData({ name: cls.name, grade: cls.grade || "", level: lvl.label, year: cls.year, letter: "A", capacity: cls.capacity || 30 });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ name: "", grade: "", level: "Ensino Primário", year: new Date().getFullYear(), letter: "A", capacity: 30 });
    setEditingClass(null); setShowForm(false);
  };

  const filtered = classes.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.grade || "").toLowerCase().includes(searchTerm.toLowerCase());
    const lvl = getLevelInfo(c.grade);
    return matchSearch && (filterLevel === "all" || lvl.label === filterLevel);
  });

  const grouped = LEVELS.map(lvl => ({ ...lvl, classes: filtered.filter(c => getLevelInfo(c.grade).label === lvl.label) })).filter(g => g.classes.length > 0);
  const totalStudents = Object.values(studentCounts).reduce((a, b) => a + b, 0);

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "#111827", border: "1px solid #1a2035", borderRadius: 8, fontSize: 13, color: "#e2e8f0", outline: "none", fontFamily: "inherit" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "#4a5568", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, fontFamily: "'IBM Plex Sans', system-ui" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid #1a2035", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#4a5568", fontSize: 13, margin: 0 }}>A carregar turmas...</p>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1300, margin: "0 auto", fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`input:focus, select:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Turmas</h1>
            {!canManage && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                <Eye style={{ width: 11, height: 11 }} /> Modo visualização
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: "#4a5568", margin: "4px 0 0" }}>{classes.length} turmas · {totalStudents} alunos no total</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => refetch()} style={{ display: "flex", alignItems: "center", gap: 6, background: "#111827", color: "#4a5568", border: "1px solid #1a2035", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Actualizar
          </button>
          {canManage && (
            <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#6366f1", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Plus style={{ width: 14, height: 14 }} /> Nova Turma
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        {LEVELS.map(lvl => {
          const count = classes.filter(c => getLevelInfo(c.grade).label === lvl.label).length;
          return (
            <div key={lvl.label} onClick={() => setFilterLevel(filterLevel === lvl.label ? "all" : lvl.label)}
              style={{ background: filterLevel === lvl.label ? lvl.bg : "#0d1117", border: `1px solid ${filterLevel === lvl.label ? lvl.border : "#1a2035"}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", transition: "all 0.15s" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{lvl.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace" }}>{count}</div>
              <div style={{ fontSize: 10, color: "#4a5568", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{lvl.label.replace("Ensino ", "")}</div>
            </div>
          );
        })}
        <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 10, padding: "14px 16px" }}>
          <School style={{ width: 20, height: 20, color: "#4a5568", marginBottom: 6 }} />
          <div style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace" }}>{totalStudents}</div>
          <div style={{ fontSize: 10, color: "#4a5568", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Total Alunos</div>
        </div>
      </div>

      <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#4a5568" }} />
          <input type="text" placeholder="Pesquisar turma..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inp, paddingLeft: 32 }} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setFilterLevel("all")}
            style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${filterLevel === "all" ? "#6366f1" : "#1a2035"}`, background: filterLevel === "all" ? "rgba(99,102,241,0.1)" : "transparent", color: filterLevel === "all" ? "#818cf8" : "#4a5568" }}>
            Todos
          </button>
          {LEVELS.map(lvl => (
            <button key={lvl.label} onClick={() => setFilterLevel(filterLevel === lvl.label ? "all" : lvl.label)}
              style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${filterLevel === lvl.label ? lvl.border : "#1a2035"}`, background: filterLevel === lvl.label ? lvl.bg : "transparent", color: filterLevel === lvl.label ? lvl.color : "#4a5568" }}>
              {lvl.emoji} {lvl.label.replace("Ensino ", "")}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "#4a5568", background: "#0d1117", border: "1px solid #1a2035", borderRadius: 12 }}>
          <School style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Nenhuma turma encontrada</p>
          {canManage && <p style={{ fontSize: 12, margin: "8px 0 0" }}>Clica em "Nova Turma" para começar</p>}
        </div>
      ) : grouped.map(group => (
        <div key={group.label} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: group.bg, border: `1px solid ${group.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{group.emoji}</div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{group.label}</h2>
            <span style={{ fontSize: 11, color: group.color, fontWeight: 700, background: group.bg, border: `1px solid ${group.border}`, padding: "2px 10px", borderRadius: 20 }}>{group.classes.length} turma(s)</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 12 }}>
            {group.classes.map(cls => {
              const lvl = getLevelInfo(cls.grade);
              const studentCount = studentCounts[cls.id!] || 0;
              const capacity = cls.capacity || 30;
              const occupancy = Math.min(100, Math.round((studentCount / capacity) * 100));
              const examClass = isExamClass(cls.grade || cls.name || "");
              return (
                <div key={cls.id} style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 12, overflow: "hidden", transition: "border-color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#2d3748"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"}>
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${lvl.color}, ${lvl.color}60)` }} />
                  <div style={{ padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: lvl.bg, border: `1px solid ${lvl.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{lvl.emoji}</div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{cls.name}</h3>
                            {examClass && <span style={{ fontSize: 9, background: "rgba(251,191,36,0.15)", color: "#fbbf24", fontWeight: 700, padding: "1px 6px", borderRadius: 4, border: "1px solid rgba(251,191,36,0.3)" }}>EXAME</span>}
                          </div>
                          <p style={{ fontSize: 11, color: "#4a5568", margin: "2px 0 0" }}>{cls.grade || "—"}</p>
                        </div>
                      </div>
                      {canManage && (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => handleEdit(cls)} style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", cursor: "pointer", background: "transparent", color: "#4a5568", transition: "all 0.15s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#6366f1"; (e.currentTarget as HTMLElement).style.borderColor = "#6366f1"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                            <Edit2 style={{ width: 13, height: 13 }} />
                          </button>
                          {canDelete && (
                            <button onClick={() => setDeleteConfirm(cls)} style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", cursor: "pointer", background: "transparent", color: "#4a5568", transition: "all 0.15s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.borderColor = "#f87171"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                              <Trash2 style={{ width: 13, height: 13 }} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#718096" }}>
                        <Users style={{ width: 12, height: 12, color: lvl.color }} />
                        <span><strong style={{ color: "#e2e8f0" }}>{studentCount}</strong> / {capacity}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#718096" }}>
                        <Calendar style={{ width: 12, height: 12, color: lvl.color }} />
                        <span>{cls.year}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: "#4a5568" }}>Ocupação</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: occupancy >= 90 ? "#f87171" : occupancy >= 70 ? "#fbbf24" : lvl.color }}>{occupancy}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: "#1a2035", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 99, width: `${occupancy}%`, background: occupancy >= 90 ? "#f87171" : occupancy >= 70 ? "#fbbf24" : lvl.color, transition: "width 0.8s ease" }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {deleteConfirm && canDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}>
          <div style={{ background: "#0d1117", borderRadius: 16, border: "1px solid #1a2035", padding: 28, maxWidth: 380, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Trash2 style={{ width: 20, height: 20, color: "#f87171" }} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", textAlign: "center", margin: "0 0 8px" }}>Apagar Turma?</h2>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#f87171", textAlign: "center", margin: "0 0 16px" }}>"{deleteConfirm.name}"</p>
            {(studentCounts[deleteConfirm.id!] || 0) > 0 && (
              <div style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#fbbf24" }}>
                Esta turma tem <strong>{studentCounts[deleteConfirm.id!]}</strong> aluno(s) associado(s).
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, background: "#f87171", color: "white", border: "none", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Apagar</button>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, background: "#111827", color: "#718096", border: "1px solid #1a2035", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showForm && canManage && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}>
          <div style={{ background: "#0d1117", borderRadius: 16, border: "1px solid #1a2035", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{editingClass ? "Editar Turma" : "Nova Turma"}</h2>
                  <p style={{ fontSize: 12, color: "#4a5568", margin: "4px 0 0" }}>Preenche os dados da turma</p>
                </div>
                <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a5568" }}>
                  <X style={{ width: 18, height: 18 }} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={lbl}>Nível de Ensino</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {LEVELS.map(lvl => (
                      <button key={lvl.label} type="button" onClick={() => setFormData({ ...formData, level: lvl.label, grade: "" })}
                        style={{ padding: "10px 8px", borderRadius: 10, border: `1px solid ${formData.level === lvl.label ? lvl.border : "#1a2035"}`, background: formData.level === lvl.label ? lvl.bg : "transparent", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{lvl.emoji}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: formData.level === lvl.label ? lvl.color : "#4a5568", lineHeight: 1.3 }}>{lvl.label.replace("Ensino ", "")}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Classe</label>
                  <select value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} required style={inp}>
                    <option value="">Selecciona a classe</option>
                    {(GRADES_BY_LEVEL[formData.level] || []).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Turma</label>
                    <select value={formData.letter} onChange={e => setFormData({ ...formData, letter: e.target.value, name: formData.grade ? `${formData.grade} - Turma ${e.target.value}` : formData.name })} style={inp}>
                      {TURMA_LETTERS.map(l => <option key={l} value={l}>Turma {l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Nome da Turma</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder={formData.grade ? `${formData.grade} - Turma ${formData.letter}` : "Ex: 5ª Classe - Turma A"} style={inp} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={lbl}>Ano Lectivo</label>
                    <input type="number" value={formData.year} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })} min="2020" max="2035" required style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Capacidade</label>
                    <input type="number" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })} min="1" max="60" style={inp} />
                  </div>
                </div>
                {(formData.grade || formData.name) && (
                  <div style={{ background: "#111827", border: "1px dashed #2d3748", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", margin: "0 0 8px" }}>Pré-visualização</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{LEVELS.find(l => l.label === formData.level)?.emoji}</span>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{formData.name || `${formData.grade} - Turma ${formData.letter}`}</p>
                        <p style={{ fontSize: 11, color: "#4a5568", margin: "2px 0 0" }}>{formData.grade} · {formData.year} · Cap: {formData.capacity}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" disabled={saving}
                    style={{ flex: 1, background: saving ? "#2d3748" : "#6366f1", color: "white", border: "none", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "A guardar..." : editingClass ? "Guardar Alterações" : "Criar Turma"}
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