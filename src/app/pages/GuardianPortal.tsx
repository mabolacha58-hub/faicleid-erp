import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "../lib/auth";
import { portalAPI } from "../lib/api";
import { Calendar, DollarSign, TrendingUp, BookOpen, Users, Loader2 } from "lucide-react";

type StudentData = {
  student: any;
  className: string;
  grades: any[];
  attendance: any[];
  payments: any[];
};

const BIMESTRES = [1, 2, 3, 4];

export default function GuardianPortal() {
  const user = getCurrentUser();
  const [data, setData] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await portalAPI.get();
      setData(res.students);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getGradesBySubject = (student: StudentData, subjectId: string): (number | null)[] =>
    BIMESTRES.map(b => student.grades.find((g) => g.subjectId === subjectId && g.bimester === b)?.grade ?? null);

  const avgBySubject = (student: StudentData, subjectId: string): number | null => {
    const vals = getGradesBySubject(student, subjectId).filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const subjectsFor = (s: StudentData) => Array.from(new Set(s.grades.map(g => g.subjectId)));

  const attendRate = (s: StudentData): number | null => {
    if (!s.attendance.length) return null;
    return (s.attendance.filter(a => a.present).length / s.attendance.length) * 100;
  };

  const pendingTotal = (s: StudentData) => s.payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);

  const S = { fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif" };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, ...S }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 style={{ width: 32, height: 32, color: "#6366f1", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: "#4a5568", fontSize: 13 }}>A carregar portal...</p>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto", ...S }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: "0 0 12px" }}>Portal do Encarregado</h1>
        <p style={{ color: "#4a5568", fontSize: 13 }}>Nenhum aluno ligado à sua conta ainda. Contacte o Director/Administrador para associar alunos ao seu utilizador.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto", ...S }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Portal do Encarregado</h1>
        <p style={{ fontSize: 12, color: "#4a5568", margin: "4px 0 0" }}>Olá, {user?.name} — consulte notas, frequência e pagamentos</p>
      </div>

      {data.map((s) => {
        const subs = subjectsFor(s);
        const rate = attendRate(s);
        return (
          <div key={s.student.id} style={{ marginBottom: 28, background: "#0d1117", border: "1px solid #1a2035", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a2035", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Users style={{ width: 20, height: 20, color: "#818cf8" }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{s.student.name}</h2>
                  <p style={{ fontSize: 12, color: "#4a5568", margin: "2px 0 0" }}>Turma: {s.className} · Responsável: {s.student.guardian}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(99,102,241,0.08)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                  <TrendingUp style={{ width: 12, height: 12 }} /> {subs.length} Disciplina(s)
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)", padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                  <Calendar style={{ width: 12, height: 12 }} /> Frequência: {rate === null ? "N/A" : rate.toFixed(1) + "%"}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)", padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                  <DollarSign style={{ width: 12, height: 12 }} /> Pendente: {pendingTotal(s).toLocaleString("pt-MZ")} MT
                </span>
              </div>
            </div>

            {/* Notas */}
            {subs.length > 0 && (
              <div style={{ padding: "16px 20px" }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: "0 0 10px" }}>
                  <BookOpen style={{ width: 13, height: 13, marginRight: 6, verticalAlign: -1 }} /> Notas Bimestrais (0–20, mínimo 10)
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1a2035" }}>
                        <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1 }}>Disciplina</th>
                        {[1, 2, 3, 4].map(b => <th key={b} style={{ padding: "10px 14px", textAlign: "center", fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1 }}>{b}º</th>)}
                        <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1 }}>Média</th>
                        <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1 }}>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subs.map(sid => {
                        const gvals = getGradesBySubject(s, sid);
                        const avg = avgBySubject(s, sid);
                        const dispName = sid.substring(0, 12);
                        // but unlikely to have subjectName; use sid? better keep as id short — or just show "Disciplina"
                        return (
                          <tr key={sid} style={{ borderBottom: "1px solid #0f1520" }}>
                            <td style={{ padding: "12px 14px", fontSize: 13, color: "#e2e8f0" }}>{dispName}</td>
                            {gvals.map((g, i) => (
                              <td key={i} style={{ padding: "12px 14px", textAlign: "center", fontSize: 13 }}>
                                {g === null ? <span style={{ color: "#2d3748" }}>—</span> :
                                  <span style={{ color: g >= 10 ? "#10b981" : "#f87171", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600 }}>{g.toFixed(1)}</span>}
                              </td>
                            ))}
                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                              {avg === null ? <span style={{ color: "#2d3748" }}>—</span> :
                                <span style={{ background: avg >= 10 ? "rgba(16,185,129,0.1)" : "rgba(248,113,113,0.1)", color: avg >= 10 ? "#10b981" : "#f87171", border: `1px solid ${avg >= 10 ? "rgba(16,185,129,0.3)" : "rgba(248,113,113,0.3)"}`, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace" }}>{avg.toFixed(1)}</span>}
                            </td>
                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                              {avg === null ? <span style={{ color: "#2d3748", fontSize: 12 }}>—</span> :
                                <span style={{ fontSize: 12, color: avg >= 10 ? "#10b981" : "#f87171", fontWeight: 600 }}>{avg >= 10 ? "Aprovado" : "Reprovado"}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Frequencia resumo */}
            <div style={{ padding: "0 20px 16px" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: "0 0 10px" }}>
                <Calendar style={{ width: 13, height: 13, marginRight: 6, verticalAlign: -1 }} /> Resumo de Frequência
              </h3>
              {s.attendance.length === 0 ? <p style={{ color: "#4a5568", fontSize: 12 }}>Nenhuma frequência registada.</p> :
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
                  {[
                    { l: "Presenças", v: s.attendance.filter(a => a.present).length, c: "#10b981" },
                    { l: "Faltas", v: s.attendance.filter(a => !a.present).length, c: "#f87171" },
                    { l: "Taxa", v: rate!.toFixed(1) + "%", c: "#06b6d4" },
                    { l: "Total aulas", v: s.attendance.length, c: "#818cf8" },
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ background: "#111827", border: "1px solid #1a2035", borderRadius: 8, padding: "10px 14px" }}>
                      <p style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>{l}</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: c, margin: 0, fontFamily: "'IBM Plex Mono',monospace" }}>{v}</p>
                    </div>
                  ))}
                </div>}
            </div>

            {/* Pagamentos */}
            {s.payments.length > 0 && (
              <div style={{ padding: "0 20px 20px" }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: "0 0 10px" }}>
                  <DollarSign style={{ width: 13, height: 13, marginRight: 6, verticalAlign: -1 }} /> Pagamentos (MT)
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1a2035" }}>
                        <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1 }}>Referência</th>
                        <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1 }}>Vencimento</th>
                        <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1 }}>Valor</th>
                        <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1 }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.payments.map((p, idx) => (
                        <tr key={p.id || idx} style={{ borderBottom: "1px solid #0f1520" }}>
                          <td style={{ padding: "11px 14px", fontSize: 12, color: "#e2e8f0" }}>{p.month && p.year ? `${String(p.month).padStart(2,'0')}/${p.year}` : "—"}</td>
                          <td style={{ padding: "11px 14px", textAlign: "center", fontSize: 12, color: "#718096", fontFamily: "'IBM Plex Mono',monospace" }}>{p.dueDate ? new Date(p.dueDate).toLocaleDateString("pt-MZ") : "—"}</td>
                          <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, color: "#e2e8f0", fontFamily: "'IBM Plex Mono',monospace" }}>{(p.amount || 0).toLocaleString("pt-MZ")}</td>
                          <td style={{ padding: "11px 14px", textAlign: "center" }}>
                            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: p.status === 'paid' ? "rgba(16,185,129,0.1)" : "rgba(251,191,36,0.1)", color: p.status === 'paid' ? "#10b981" : "#fbbf24", border: `1px solid ${p.status === 'paid' ? "rgba(16,185,129,0.3)" : "rgba(251,191,36,0.3)"}` }}>
                              {p.status === 'paid' ? "Pago" : p.status === 'overdue' ? "Atrasado" : "Pendente"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}