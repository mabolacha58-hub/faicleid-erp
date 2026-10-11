import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { studentsAPI, gradesAPI, attendanceAPI, subjectsAPI, classesAPI } from "../lib/api";
import { printBoletins } from "../lib/boletim";
import type { BoletimData, BoletimRow } from "../lib/boletim";
import type { Student, Grade, Attendance, Subject, Class } from "../lib/supabase";
import { FileText, ArrowLeft, TrendingUp, Calendar, Printer, Award, Loader2 } from "lucide-react";

const NOTA_MIN = 10;

export default function StudentReport() {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [studentClass, setStudentClass] = useState<Class | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStudentData = useCallback(async () => {
    try {
      const [studentRes, gradesRes, attendanceRes, subjectsRes, classesRes] = await Promise.all([
        studentsAPI.getById(studentId!),
        gradesAPI.getByStudent(studentId!),
        attendanceAPI.getByStudent(studentId!),
        subjectsAPI.getAll(),
        classesAPI.getAll(),
      ]);

      setStudent(studentRes.student);
      setGrades(gradesRes.grades);
      setAttendance(attendanceRes.attendance);
      setSubjects(subjectsRes.subjects);

      const cls = classesRes.classes.find((c) => c.id === studentRes.student.classId);
      setStudentClass(cls || null);
    } catch (error) {
      console.error("Error loading student data:", error);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) loadStudentData();
  }, [studentId, loadStudentData]);

  const getSubjectName = (subjectId: string) => subjects.find((s) => s.id === subjectId)?.name || "N/A";

  const getGradesBySubject = (subjectId: string): (number | null)[] =>
    [1, 2, 3, 4].map((bimester) => {
      const grade = grades.find((g) => g.subjectId === subjectId && g.bimester === bimester);
      return grade?.grade ?? null;
    });

  const calculateAverage = (subjectId: string): number | null => {
    const values = getGradesBySubject(subjectId).filter((g): g is number => g !== null);
    if (!values.length) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const calculateAttendanceRate = (): number | null => {
    if (!attendance.length) return null;
    return (attendance.filter((a) => a.present).length / attendance.length) * 100;
  };

  const uniqueSubjects = Array.from(new Set(grades.map((g) => g.subjectId)));

  const handlePrint = () => {
    if (!student) return;
    const rows: BoletimRow[] = uniqueSubjects.map((subjectId) => {
      const avg = calculateAverage(subjectId);
      return {
        subject: getSubjectName(subjectId),
        grades: getGradesBySubject(subjectId),
        average: avg,
        status: avg === null ? "—" : avg >= NOTA_MIN ? "Aprovado" : "Reprovado",
      };
    });
    const data: BoletimData = {
      student: {
        name: student.name,
        birthDate: student.birthDate,
        guardian: student.guardian,
        guardianPhone: student.guardianPhone,
      },
      className: studentClass?.name || "—",
      rows,
      attendance: {
        present: attendance.filter((a) => a.present).length,
        total: attendance.length,
        rate: calculateAttendanceRate(),
      },
      notaMin: NOTA_MIN,
    };
    printBoletins([data], `Boletim — ${student.name}`);
  };

  const S = { fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif" };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, ...S }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 style={{ width: 32, height: 32, color: "#6366f1", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: "#4a5568", fontSize: 13 }}>A carregar boletim...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "50vh", ...S, color: "#4a5568" }}>
        <FileText style={{ width: 40, height: 40, opacity: 0.3, marginBottom: 12 }} />
        <p style={{ fontSize: 16, fontWeight: 600, color: "#718096" }}>Aluno não encontrado</p>
        <a href="/students" style={{ color: "#818cf8", marginTop: 12, textDecoration: "none", fontSize: 13 }}>Voltar para Alunos</a>
      </div>
    );
  }

  const attendRate = calculateAttendanceRate();
  const card: React.CSSProperties = { background: "#0d1117", border: "1px solid #1a2035", borderRadius: 12, padding: "18px 20px" };
  const kpi: React.CSSProperties = { background: "#0d1117", border: "1px solid #1a2035", borderRadius: 10, padding: "16px 18px" };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto", ...S }}>
      <a href="/students" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#818cf8", textDecoration: "none", fontSize: 13, marginBottom: 16 }}>
        <ArrowLeft style={{ width: 15, height: 15 }} /> Voltar para Alunos
      </a>

      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FileText style={{ width: 24, height: 24, color: "#818cf8" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{student.name}</h1>
            <p style={{ fontSize: 12, color: "#4a5568", margin: "3px 0 0" }}>Boletim Escolar · {studentClass?.name || "Sem turma"}</p>
          </div>
        </div>
        <button onClick={handlePrint}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "#6366f1", color: "white", border: "none", padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Printer style={{ width: 15, height: 15 }} /> Imprimir / PDF
        </button>
      </div>

      {/* Info do aluno */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          {[
            { l: "Data de Nascimento", v: student.birthDate ? new Date(student.birthDate).toLocaleDateString("pt-MZ") : "—" },
            { l: "Responsável", v: student.guardian || "—" },
            { l: "Telefone", v: student.guardianPhone || "—" },
            { l: "Turma", v: studentClass?.name || "—" },
          ].map(({ l, v }) => (
            <div key={l}>
              <p style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, margin: "0 0 4px" }}>{l}</p>
              <p style={{ fontSize: 13, color: "#e2e8f0", margin: 0, fontWeight: 500 }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div style={kpi}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TrendingUp style={{ width: 20, height: 20, color: "#6366f1" }} />
            <div><p style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Disciplinas</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", margin: 0, fontFamily: "'IBM Plex Mono',monospace" }}>{uniqueSubjects.length}</p></div>
          </div>
        </div>
        <div style={kpi}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Calendar style={{ width: 20, height: 20, color: "#10b981" }} />
            <div><p style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Frequência</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", margin: 0, fontFamily: "'IBM Plex Mono',monospace" }}>{attendRate === null ? "N/A" : `${attendRate.toFixed(1)}%`}</p></div>
          </div>
        </div>
        <div style={kpi}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Award style={{ width: 20, height: 20, color: "#f472b6" }} />
            <div><p style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Total de Aulas</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", margin: 0, fontFamily: "'IBM Plex Mono',monospace" }}>{attendance.length}</p></div>
          </div>
        </div>
      </div>

      {/* Tabela de notas */}
      <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a2035" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Notas Bimestrais</h2>
          <p style={{ fontSize: 11, color: "#4a5568", margin: "3px 0 0" }}>Aprovação mínima: {NOTA_MIN} valores</p>
        </div>
        {uniqueSubjects.length === 0 ? (
          <p style={{ textAlign: "center", padding: 40, color: "#4a5568", fontSize: 13 }}>Nenhuma nota lançada ainda</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1a2035" }}>
                  {["Disciplina", "1º Bim", "2º Bim", "3º Bim", "4º Bim", "Média"].map((h, i) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: i === 0 ? "left" : "center", fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uniqueSubjects.map((subjectId) => {
                  const subjectGrades = getGradesBySubject(subjectId);
                  const avg = calculateAverage(subjectId);
                  return (
                    <tr key={subjectId} style={{ borderBottom: "1px solid #0f1520" }}>
                      <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{getSubjectName(subjectId)}</td>
                      {subjectGrades.map((g, idx) => (
                        <td key={idx} style={{ padding: "13px 16px", textAlign: "center", fontSize: 13 }}>
                          {g === null ? <span style={{ color: "#2d3748" }}>—</span>
                            : <span style={{ color: g >= NOTA_MIN ? "#10b981" : "#f87171", fontWeight: 600, fontFamily: "'IBM Plex Mono',monospace" }}>{g.toFixed(1)}</span>}
                        </td>
                      ))}
                      <td style={{ padding: "13px 16px", textAlign: "center" }}>
                        {avg === null ? <span style={{ color: "#2d3748" }}>—</span>
                          : <span style={{ background: avg >= NOTA_MIN ? "rgba(16,185,129,0.1)" : "rgba(248,113,113,0.1)", color: avg >= NOTA_MIN ? "#10b981" : "#f87171", border: `1px solid ${avg >= NOTA_MIN ? "rgba(16,185,129,0.3)" : "rgba(248,113,113,0.3)"}`, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace" }}>{avg.toFixed(1)}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Frequência */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", margin: "0 0 14px" }}>Resumo de Frequência</h2>
        {attendance.length === 0 ? (
          <p style={{ textAlign: "center", padding: 24, color: "#4a5568", fontSize: 13 }}>Nenhuma frequência registada</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {[
              { l: "Presenças", v: attendance.filter((a) => a.present).length, c: "#10b981" },
              { l: "Faltas", v: attendance.filter((a) => !a.present).length, c: "#f87171" },
              { l: "Taxa de Presença", v: `${attendRate!.toFixed(1)}%`, c: "#06b6d4" },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ background: "#111827", border: "1px solid #1a2035", borderRadius: 8, padding: 14 }}>
                <p style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 6px" }}>{l}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: c, margin: 0, fontFamily: "'IBM Plex Mono',monospace" }}>{v}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
