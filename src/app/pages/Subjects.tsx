import { useEffect, useState } from "react";
import { subjectsAPI } from "../lib/api";
import { getCurrentUser } from "../lib/auth";
import type { Subject } from "../lib/supabase";
import { Plus, Search, Edit2, Trash2, X, BookOpen, CheckCircle2, Grid, List, RefreshCw } from "lucide-react";

type CatalogDisciplina = { name: string; emoji: string; nivel?: string; color?: string; bg?: string; border?: string };
type CatalogLevel = { nivel: string; emoji: string; color: string; bg: string; border: string; disciplinas: CatalogDisciplina[] };
type EnrichedSubject = Subject & { nivel?: string; color?: string; bg?: string; border?: string; emoji: string };

const CURRICULUM: CatalogLevel[] = [
  {
    nivel: "Pré-Escolar", emoji: "🧸", color: "#fbbf24",
    bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)",
    disciplinas: [
      { name: "Linguagem e Comunicação", emoji: "🗣️" },
      { name: "Matemática Inicial", emoji: "🔢" },
      { name: "Expressão Plástica", emoji: "🎨" },
      { name: "Expressão Musical", emoji: "🎵" },
      { name: "Educação Física", emoji: "⚽" },
      { name: "Conhecimento do Mundo", emoji: "🌍" },
      { name: "Formação Pessoal e Social", emoji: "🤝" },
    ],
  },
  {
    nivel: "Ensino Primário (1ª – 6ª Classe)", emoji: "📚", color: "#10b981",
    bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)",
    disciplinas: [
      { name: "Português", emoji: "📖" },
      { name: "Matemática", emoji: "🔢" },
      { name: "Ciências Naturais", emoji: "🔬" },
      { name: "Ciências Sociais", emoji: "🌍" },
      { name: "Educação Física", emoji: "⚽" },
      { name: "Educação Musical", emoji: "🎵" },
      { name: "Educação Visual e Tecnológica", emoji: "🎨" },
      { name: "Inglês", emoji: "🇬🇧" },
      { name: "Francês", emoji: "🇫🇷" },
      { name: "Educação Moral e Cívica", emoji: "🤝" },
    ],
  },
  {
    nivel: "Ensino Secundário (7ª – 12ª Classe)", emoji: "🎓", color: "#6366f1",
    bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.25)",
    disciplinas: [
      { name: "Português", emoji: "📖" },
      { name: "Inglês", emoji: "🇬🇧" },
      { name: "Matemática", emoji: "🔢" },
      { name: "Física", emoji: "⚡" },
      { name: "Química", emoji: "🧪" },
      { name: "Biologia", emoji: "🧬" },
      { name: "História", emoji: "📜" },
      { name: "Geografia", emoji: "🗺️" },
      { name: "Filosofia", emoji: "🤔" },
      { name: "Educação Física", emoji: "⚽" },
      { name: "Francês", emoji: "🇫🇷" },
      { name: "Informática", emoji: "💻" },
      { name: "Economia", emoji: "📊" },
      { name: "Contabilidade", emoji: "🧾" },
      { name: "Direito", emoji: "⚖️" },
      { name: "Educação Visual", emoji: "🎨" },
      { name: "Sociologia", emoji: "👥" },
      { name: "Psicologia", emoji: "🧠" },
    ],
  },
];

const EMOJIS = ["📚","📖","🔢","🔬","🧪","🧬","🌍","🗺️","📜","⚡","💻","🎨","🎵","⚽","🤔","🇬🇧","🇫🇷","📊","🧾","⚖️","🤝","👥","🧠"];

export default function Subjects() {
  const user = getCurrentUser();
  const role = user?.role || "secretaria";
  const canManage = ["admin", "director"].includes(role);
  const canDelete = role === "admin";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNivel, setSelectedNivel] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showForm, setShowForm] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Subject | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", emoji: "📚" });
  const [catalogSearch, setCatalogSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => { loadSubjects(); }, []);

  const loadSubjects = async () => {
    try {
      const res = await subjectsAPI.getAll();
      setSubjects(res.subjects || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    try {
      if (editingSubject) await subjectsAPI.update(editingSubject.id!, formData);
      else await subjectsAPI.create(formData);
      await loadSubjects(); resetForm();
    } catch { alert("Erro ao guardar disciplina"); }
  };

  const handleDelete = async (subject: Subject) => {
    if (!canDelete) return;
    try { await subjectsAPI.delete(subject.id!); await loadSubjects(); setDeleteConfirm(null); }
    catch { alert("Erro ao apagar disciplina"); }
  };

  const handleEdit = (subject: Subject) => {
    if (!canManage) return;
    setEditingSubject(subject);
    setFormData({ name: subject.name, description: subject.description || "", emoji: subject.emoji || "📚" });
    setShowForm(true);
  };

  const handleAddFromCatalog = async (disciplina: CatalogDisciplina) => {
    if (subjects.some(s => s.name.toLowerCase() === disciplina.name.toLowerCase())) return;
    setAdding(disciplina.name);
    try {
      await subjectsAPI.create({ name: disciplina.name, description: `Disciplina de ${disciplina.nivel || ""}`, emoji: disciplina.emoji });
      await loadSubjects();
    } catch { alert("Erro ao adicionar disciplina"); }
    finally { setAdding(null); }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", emoji: "📚" });
    setEditingSubject(null); setShowForm(false);
  };

  const enriched: EnrichedSubject[] = subjects.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => {
    const cat = CURRICULUM.flatMap(c => c.disciplinas.map(d => ({ ...d, nivel: c.nivel, color: c.color, bg: c.bg, border: c.border }))).find(d => d.name.toLowerCase() === s.name.toLowerCase());
    return { ...s, ...cat, emoji: s.emoji || cat?.emoji || "📚" };
  }).filter(s => selectedNivel === "all" || s.nivel === selectedNivel);

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#111827", border: "1px solid #1a2035", borderRadius: 8, fontSize: 13, color: "#e2e8f0", outline: "none", fontFamily: "inherit" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "#4a5568", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid #1a2035", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "#4a5568", fontSize: 13, margin: 0 }}>A carregar disciplinas...</p>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1300, margin: "0 auto", fontFamily: "'IBM Plex Sans','Segoe UI',system-ui,sans-serif" }}>
      <style>{`input:focus,select:focus,textarea:focus{border-color:#6366f1!important;box-shadow:0 0 0 3px rgba(99,102,241,0.1)}`}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Disciplinas</h1>
          <p style={{ fontSize: 12, color: "#4a5568", margin: "4px 0 0" }}>{subjects.length} disciplinas registadas</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadSubjects} style={{ display: "flex", alignItems: "center", gap: 6, background: "#111827", color: "#4a5568", border: "1px solid #1a2035", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Actualizar
          </button>
          {canManage && <>
            <button onClick={() => setShowCatalog(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#111827", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <BookOpen style={{ width: 14, height: 14 }} /> Catálogo
            </button>
            <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#6366f1", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Plus style={{ width: 14, height: 14 }} /> Nova Disciplina
            </button>
          </>}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
        {CURRICULUM.map(c => {
          const count = subjects.filter(s => c.disciplinas.some(d => d.name.toLowerCase() === s.name.toLowerCase())).length;
          return (
            <div key={c.nivel} onClick={() => setSelectedNivel(selectedNivel === c.nivel ? "all" : c.nivel)}
              style={{ background: selectedNivel === c.nivel ? c.bg : "#0d1117", border: `1px solid ${selectedNivel === c.nivel ? c.border : "#1a2035"}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", transition: "all 0.15s" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{c.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", fontFamily: "'IBM Plex Mono',monospace" }}>{count}</div>
              <div style={{ fontSize: 10, color: "#4a5568", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{c.nivel.split(" (")[0].replace("Ensino ","")}</div>
            </div>
          );
        })}
        <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 10, padding: "14px 16px" }}>
          <BookOpen style={{ width: 20, height: 20, color: "#4a5568", marginBottom: 6 }} />
          <div style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", fontFamily: "'IBM Plex Mono',monospace" }}>{subjects.length}</div>
          <div style={{ fontSize: 10, color: "#4a5568", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Total</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#4a5568" }} />
          <input type="text" placeholder="Pesquisar disciplina..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inp, paddingLeft: 32 }} />
        </div>
        <select value={selectedNivel} onChange={e => setSelectedNivel(e.target.value)} style={{ ...inp, width: "auto", minWidth: 180 }}>
          <option value="all">Todos os níveis</option>
          {CURRICULUM.map(c => <option key={c.nivel} value={c.nivel}>{c.emoji} {c.nivel.split(" (")[0]}</option>)}
        </select>
        <button onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #1a2035", background: "transparent", color: "#4a5568", cursor: "pointer" }}>
          {viewMode === "grid" ? <List style={{ width: 15, height: 15 }} /> : <Grid style={{ width: 15, height: 15 }} />}
        </button>
      </div>

      {/* Grid */}
      {enriched.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "#0d1117", border: "1px solid #1a2035", borderRadius: 12, color: "#4a5568" }}>
          <BookOpen style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Nenhuma disciplina encontrada</p>
          {canManage && <p style={{ fontSize: 12, margin: "8px 0 0" }}>Usa o Catálogo para adicionar disciplinas rapidamente</p>}
        </div>
      ) : (
        <div style={{ display: viewMode === "grid" ? "grid" : "flex", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", flexDirection: "column", gap: 10 }}>
          {enriched.map((s: EnrichedSubject) => (
            <div key={s.id} style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 12, overflow: "hidden", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#2d3748"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"}>
              <div style={{ height: 3, background: `linear-gradient(90deg, ${s.color || "#6366f1"}, ${(s.color || "#6366f1")}60)` }} />
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: s.bg || "rgba(99,102,241,0.1)", border: `1px solid ${s.border || "rgba(99,102,241,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.emoji}</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", margin: 0 }}>{s.name}</p>
                    {s.nivel && <span style={{ fontSize: 10, background: s.bg || "rgba(99,102,241,0.1)", color: s.color || "#818cf8", border: `1px solid ${s.border || "rgba(99,102,241,0.25)"}`, borderRadius: 20, padding: "1px 8px", fontWeight: 600 }}>{s.nivel.split(" (")[0]}</span>}
                  </div>
                </div>
                {canManage && (
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => handleEdit(s)} style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", cursor: "pointer", background: "transparent", color: "#4a5568", transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#6366f1"; (e.currentTarget as HTMLElement).style.borderColor = "#6366f1"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                      <Edit2 style={{ width: 13, height: 13 }} />
                    </button>
                    {canDelete && (
                      <button onClick={() => setDeleteConfirm(s)} style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", cursor: "pointer", background: "transparent", color: "#4a5568", transition: "all 0.15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.borderColor = "#f87171"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    )}
                  </div>
                )}
              </div>
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
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", textAlign: "center", margin: "0 0 8px" }}>Apagar Disciplina?</h2>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#f87171", textAlign: "center", margin: "0 0 20px" }}>"{deleteConfirm.name}"</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, background: "#f87171", color: "white", border: "none", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Apagar</button>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, background: "#111827", color: "#718096", border: "1px solid #1a2035", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Catálogo */}
      {showCatalog && canManage && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}>
          <div style={{ background: "#0d1117", borderRadius: 16, border: "1px solid #1a2035", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", width: "100%", maxWidth: 800, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #1a2035" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Catálogo do Currículo Nacional</h2>
                  <p style={{ fontSize: 12, color: "#4a5568", margin: "4px 0 0" }}>Selecciona disciplinas para adicionar ao sistema</p>
                </div>
                <button onClick={() => setShowCatalog(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a5568" }}><X style={{ width: 18, height: 18 }} /></button>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#4a5568" }} />
                  <input type="text" placeholder="Pesquisar no catálogo..." value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} style={{ ...inp, paddingLeft: 32 }} />
                </div>
                <select value={selectedNivel} onChange={e => setSelectedNivel(e.target.value)} style={{ ...inp, width: "auto", minWidth: 160 }}>
                  <option value="all">Todos os níveis</option>
                  {CURRICULUM.map(c => <option key={c.nivel} value={c.nivel}>{c.emoji} {c.nivel.split(" (")[0]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
              {CURRICULUM.filter(c => selectedNivel === "all" || c.nivel === selectedNivel).map(group => {
                const filtered = group.disciplinas.filter(d => d.name.toLowerCase().includes(catalogSearch.toLowerCase()));
                if (filtered.length === 0) return null;
                return (
                  <div key={group.nivel} style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 18 }}>{group.emoji}</span>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{group.nivel}</h3>
                      <span style={{ fontSize: 11, background: group.bg, color: group.color, border: `1px solid ${group.border}`, borderRadius: 20, padding: "1px 8px", fontWeight: 600 }}>
                        {filtered.filter(d => subjects.some(s => s.name.toLowerCase() === d.name.toLowerCase())).length}/{filtered.length}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 8 }}>
                      {filtered.map(d => {
                        const added = subjects.some(s => s.name.toLowerCase() === d.name.toLowerCase());
                        const isAdding = adding === d.name;
                        return (
                          <button key={d.name} onClick={() => !added && handleAddFromCatalog({ ...d, ...group })} disabled={added || !!isAdding}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, border: `1px solid ${added ? "rgba(16,185,129,0.3)" : "#1a2035"}`, background: added ? "rgba(16,185,129,0.08)" : "transparent", cursor: added ? "default" : "pointer", textAlign: "left", transition: "all 0.15s" }}
                            onMouseEnter={e => { if (!added) (e.currentTarget as HTMLElement).style.borderColor = group.border; }}
                            onMouseLeave={e => { if (!added) (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                            <span style={{ fontSize: 18 }}>{d.emoji}</span>
                            <span style={{ flex: 1, fontSize: 12, color: added ? "#10b981" : "#718096" }}>{d.name}</span>
                            {added && <CheckCircle2 style={{ width: 14, height: 14, color: "#10b981", flexShrink: 0 }} />}
                            {isAdding && <div style={{ width: 14, height: 14, border: "2px solid #1a2035", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "14px 28px", borderTop: "1px solid #1a2035", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#4a5568" }}>{subjects.length} de {CURRICULUM.flatMap(c => c.disciplinas).length} disciplinas adicionadas</span>
              <button onClick={() => setShowCatalog(false)} style={{ background: "#6366f1", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Concluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && canManage && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}>
          <div style={{ background: "#0d1117", borderRadius: 16, border: "1px solid #1a2035", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", width: "100%", maxWidth: 440, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{editingSubject ? "Editar Disciplina" : "Nova Disciplina"}</h2>
              <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a5568" }}><X style={{ width: 18, height: 18 }} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Ícone</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {EMOJIS.map(emoji => (
                    <button key={emoji} type="button" onClick={() => setFormData({ ...formData, emoji })}
                      style={{ width: 38, height: 38, borderRadius: 8, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${formData.emoji === emoji ? "#6366f1" : "#1a2035"}`, background: formData.emoji === emoji ? "rgba(99,102,241,0.15)" : "transparent", cursor: "pointer" }}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Nome da Disciplina</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Ex: Matemática" style={inp} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Descrição (opcional)</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} style={{ ...inp, resize: "vertical" }} placeholder="Breve descrição..." />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" style={{ flex: 1, background: "#6366f1", color: "white", border: "none", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{editingSubject ? "Guardar" : "Criar"}</button>
                <button type="button" onClick={resetForm} style={{ flex: 1, background: "#111827", color: "#718096", border: "1px solid #1a2035", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
