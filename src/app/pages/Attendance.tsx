import { useEffect, useState } from "react";
import { studentsAPI, classesAPI, attendanceAPI } from "../lib/api";
import { getCurrentUser } from "../lib/auth";
import type { Student, Class } from "../lib/supabase";
import { Calendar, Save, CheckCircle2, XCircle, Users } from "lucide-react";

export default function Attendance() {
  const user = getCurrentUser();
  const role = user?.role || "professor";
  const canManage = ["admin", "director", "professor"].includes(role);

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [sR, cR] = await Promise.all([studentsAPI.getAll(), classesAPI.getAll()]);
      setStudents(sR.students || []);
      setClasses(cR.classes || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedDate) { alert("Selecciona uma turma e data"); return; }
    setSaving(true);
    try {
      for (const student of classStudents) {
        if (attendance[student.id] !== undefined) {
          await attendanceAPI.record({ studentId: student.id, classId: selectedClass, date: selectedDate, present: attendance[student.id] });
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { alert("Erro ao registar frequência"); }
    finally { setSaving(false); }
  };

  const toggleAttendance = (id: string) => setAttendance(a => ({ ...a, [id]: !a[id] }));
  const markAll = (present: boolean) => {
    const r: Record<string, boolean> = {};
    classStudents.forEach(s => { r[s.id] = present; });
    setAttendance(r);
  };

  const classStudents = students.filter(s => s.classId === selectedClass);
  const presentCount = Object.values(attendance).filter(Boolean).length;
  const absentCount = classStudents.filter(s => attendance[s.id] === false).length;
  const unmarkedCount = classStudents.filter(s => attendance[s.id] === undefined).length;

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "#111827", border: "1px solid #1a2035", borderRadius: 8, fontSize: 13, color: "#e2e8f0", outline: "none", fontFamily: "inherit" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "#4a5568", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid #1a2035", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "#4a5568", fontSize: 13, margin: 0 }}>A carregar...</p>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto", fontFamily: "'IBM Plex Sans','Segoe UI',system-ui,sans-serif" }}>
      <style>{`input:focus,select:focus{border-color:#6366f1!important;box-shadow:0 0 0 3px rgba(99,102,241,0.1)}`}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Registo de Frequência</h1>
        <p style={{ fontSize: 12, color: "#4a5568", margin: "4px 0 0" }}>Marca presença ou falta dos alunos</p>
      </div>

      {/* Selecção de turma e data */}
      <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={lbl}>Turma</label>
            <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setAttendance({}); }} style={inp}>
              <option value="">Selecciona uma turma</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Data</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={inp} />
          </div>
        </div>
      </div>

      {!selectedClass ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "#0d1117", border: "1px solid #1a2035", borderRadius: 12, color: "#4a5568" }}>
          <Calendar style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Selecciona uma turma para registar a frequência</p>
        </div>
      ) : (
        <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 12, overflow: "hidden" }}>
          {/* Header da lista */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #1a2035", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{classes.find(c => c.id === selectedClass)?.name}</h2>
              <p style={{ fontSize: 12, color: "#4a5568", margin: "4px 0 0" }}>
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-MZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              {classStudents.length > 0 && (
                <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>✓ {presentCount} presentes</span>
                  <span style={{ fontSize: 12, color: "#f87171", fontWeight: 600 }}>✗ {absentCount} falta(s)</span>
                  {unmarkedCount > 0 && <span style={{ fontSize: 12, color: "#4a5568" }}>— {unmarkedCount} sem registo</span>}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {canManage && <>
                <button onClick={() => markAll(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  <CheckCircle2 style={{ width: 13, height: 13 }} /> Todos Presentes
                </button>
                <button onClick={() => markAll(false)} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  <XCircle style={{ width: 13, height: 13 }} /> Todos Faltaram
                </button>
                <button onClick={handleSave} disabled={saving}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: saved ? "rgba(16,185,129,0.15)" : "#6366f1", color: saved ? "#10b981" : "white", border: `1px solid ${saved ? "rgba(16,185,129,0.3)" : "transparent"}`, padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? <><div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> A guardar...</>
                    : saved ? <><CheckCircle2 style={{ width: 13, height: 13 }} /> Guardado!</>
                    : <><Save style={{ width: 13, height: 13 }} /> Guardar</>}
                </button>
              </>}
            </div>
          </div>

          {/* Lista de alunos */}
          {classStudents.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "#4a5568" }}>
              <Users style={{ width: 32, height: 32, margin: "0 auto 10px", opacity: 0.3 }} />
              <p style={{ margin: 0 }}>Nenhum aluno nesta turma</p>
            </div>
          ) : (
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              {classStudents.map((student, idx) => {
                const isPresent = attendance[student.id];
                const isAbsent = attendance[student.id] === false;

                return (
                  <div key={student.id} onClick={() => canManage && toggleAttendance(student.id)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 10, border: `1px solid ${isPresent ? "rgba(16,185,129,0.3)" : isAbsent ? "rgba(248,113,113,0.3)" : "#1a2035"}`, background: isPresent ? "rgba(16,185,129,0.05)" : isAbsent ? "rgba(248,113,113,0.05)" : "#111827", cursor: canManage ? "pointer" : "default", transition: "all 0.15s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: isPresent ? "rgba(16,185,129,0.2)" : isAbsent ? "rgba(248,113,113,0.2)" : "#1a2035", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isPresent ? <CheckCircle2 style={{ width: 14, height: 14, color: "#10b981" }} />
                          : isAbsent ? <XCircle style={{ width: 14, height: 14, color: "#f87171" }} />
                          : <span style={{ fontSize: 10, color: "#4a5568", fontWeight: 700 }}>{idx + 1}</span>}
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", margin: 0 }}>{student.name}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isPresent ? "#10b981" : isAbsent ? "#f87171" : "#4a5568", textTransform: "uppercase", letterSpacing: 0.8 }}>
                      {isPresent ? "PRESENTE" : isAbsent ? "FALTA" : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ padding: "10px 24px", borderTop: "1px solid #1a2035" }}>
            <span style={{ fontSize: 11, color: "#4a5568" }}>{classStudents.length} alunos · Clica para alternar presença/falta</span>
          </div>
        </div>
      )}
    </div>
  );
}
