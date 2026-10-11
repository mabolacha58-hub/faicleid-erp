import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { studentsAPI, gradesAPI, attendanceAPI, subjectsAPI, classesAPI } from "../lib/api";
import type { Student, Grade, Attendance, Subject, Class } from "../lib/supabase";
import { FileText, ArrowLeft, TrendingUp, Calendar } from "lucide-react";

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
    if (studentId) {
      loadStudentData();
    }
  }, [studentId, loadStudentData]);

  const getSubjectName = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId)?.name || "N/A";
  };

  const getGradesBySubject = (subjectId: string) => {
    return [1, 2, 3, 4].map((bimester) => {
      const grade = grades.find((g) => g.subjectId === subjectId && g.bimester === bimester);
      return grade?.grade ?? null;
    });
  };

  const calculateAverage = (subjectId: string) => {
    const subjectGrades = getGradesBySubject(subjectId).filter((g) => g !== null) as number[];
    if (subjectGrades.length === 0) return null;
    return (subjectGrades.reduce((a, b) => a + b, 0) / subjectGrades.length).toFixed(1);
  };

  const calculateAttendanceRate = () => {
    if (attendance.length === 0) return null;
    const present = attendance.filter((a) => a.present).length;
    return ((present / attendance.length) * 100).toFixed(1);
  };

  // Get unique subjects from grades
  const uniqueSubjects = Array.from(new Set(grades.map((g) => g.subjectId)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Carregando boletim...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600">Aluno não encontrado</p>
          <a href="/students" className="text-indigo-600 hover:text-indigo-700 mt-4 inline-block">
            Voltar para Alunos
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <a
          href="/students"
          className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Voltar para Alunos</span>
        </a>
      </div>

      {/* Student Info Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-indigo-100 p-3 rounded-full">
                <FileText className="h-8 w-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
                <p className="text-gray-600">Boletim Escolar</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Turma:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {studentClass?.name || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Data de Nascimento:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {new Date(student.birthDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Responsável:</span>
                <span className="ml-2 font-medium text-gray-900">{student.guardian}</span>
              </div>
              {student.guardianPhone && (
                <div>
                  <span className="text-gray-600">Telefone:</span>
                  <span className="ml-2 font-medium text-gray-900">{student.guardianPhone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Stats Cards */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 border border-blue-200">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-700 font-medium">Disciplinas</p>
              <p className="text-2xl font-bold text-blue-900">{uniqueSubjects.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border border-green-200">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-green-700 font-medium">Frequência</p>
              <p className="text-2xl font-bold text-green-900">
                {calculateAttendanceRate() ? `${calculateAttendanceRate()}%` : "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6 border border-purple-200">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-purple-700 font-medium">Total de Aulas</p>
              <p className="text-2xl font-bold text-purple-900">{attendance.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Notas Bimestrais</h2>
          
          {uniqueSubjects.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              Nenhuma nota lançada ainda
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Disciplina
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      1º Bim
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      2º Bim
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      3º Bim
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      4º Bim
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Média
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uniqueSubjects.map((subjectId) => {
                    const subjectGrades = getGradesBySubject(subjectId);
                    const average = calculateAverage(subjectId);
                    const averageNum = average ? parseFloat(average) : null;
                    const status = averageNum !== null && averageNum >= 6 ? "approved" : averageNum !== null ? "failed" : "pending";

                    return (
                      <tr key={subjectId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {getSubjectName(subjectId)}
                        </td>
                        {subjectGrades.map((grade, idx) => (
                          <td key={idx} className="px-6 py-4 whitespace-nowrap text-center text-sm">
                            {grade !== null ? (
                              <span className={`font-semibold ${grade >= 6 ? "text-green-600" : "text-red-600"}`}>
                                {grade.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {average !== null ? (
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                                status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {average}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Resumo de Frequência</h2>
        
        {attendance.length === 0 ? (
          <p className="text-center py-8 text-gray-500">
            Nenhuma frequência registrada
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700 font-medium">Presenças</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {attendance.filter((a) => a.present).length}
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 font-medium">Faltas</p>
              <p className="text-3xl font-bold text-red-900 mt-2">
                {attendance.filter((a) => !a.present).length}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700 font-medium">Taxa de Presença</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {calculateAttendanceRate()}%
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
