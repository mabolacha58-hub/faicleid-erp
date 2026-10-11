import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  studentsAPI,
  teachersAPI,
  classesAPI,
  subjectsAPI,
  gradesAPI,
  attendanceAPI,
  paymentsAPI,
  funcionariosAPI,
  usersAPI,
} from '../lib/api';
import type {
  Student,
  Teacher,
  Class,
  Subject,
  Grade,
  Attendance,
  Payment,
  Funcionario,
} from '../../types/domain';

const STUDENTS_KEY = ['students'];
const TEACHERS_KEY = ['teachers'];
const CLASSES_KEY = ['classes'];
const SUBJECTS_KEY = ['subjects'];
const FUNCIONARIOS_KEY = ['funcionarios'];
const USERS_KEY = ['users'];
const PAYMENTS_KEY = ['payments'];

export function useStudents() {
  return useQuery({ queryKey: STUDENTS_KEY, queryFn: () => studentsAPI.getAll().then(r => r.students) });
}

export function useStudent(id: string) {
  return useQuery({ queryKey: [...STUDENTS_KEY, id], queryFn: () => studentsAPI.getById(id).then(r => r.student), enabled: !!id });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (student: Omit<Student, 'id' | 'createdAt'>) => studentsAPI.create(student),
    onSuccess: () => qc.invalidateQueries({ queryKey: STUDENTS_KEY }),
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Student> }) => studentsAPI.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: STUDENTS_KEY }),
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentsAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: STUDENTS_KEY }),
  });
}

export function useTeachers() {
  return useQuery({ queryKey: TEACHERS_KEY, queryFn: () => teachersAPI.getAll().then(r => r.teachers) });
}

export function useCreateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teacher: Omit<Teacher, 'id' | 'createdAt'>) => teachersAPI.create(teacher),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEACHERS_KEY }),
  });
}

export function useUpdateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Teacher> }) => teachersAPI.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEACHERS_KEY }),
  });
}

export function useDeleteTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teachersAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEACHERS_KEY }),
  });
}

export function useClasses() {
  return useQuery({ queryKey: CLASSES_KEY, queryFn: () => classesAPI.getAll().then(r => r.classes) });
}

export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (classData: Omit<Class, 'id' | 'createdAt'>) => classesAPI.create(classData),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLASSES_KEY }),
  });
}

export function useUpdateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Class> }) => classesAPI.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLASSES_KEY }),
  });
}

export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classesAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLASSES_KEY }),
  });
}

export function useSubjects() {
  return useQuery({ queryKey: SUBJECTS_KEY, queryFn: () => subjectsAPI.getAll().then(r => r.subjects) });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subject: Omit<Subject, 'id' | 'createdAt'>) => subjectsAPI.create(subject),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBJECTS_KEY }),
  });
}

export function useUpdateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Subject> }) => subjectsAPI.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBJECTS_KEY }),
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subjectsAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBJECTS_KEY }),
  });
}

export function useGrades() {
  return useQuery({ queryKey: ['grades'], queryFn: () => gradesAPI.getAll().then(r => r.grades) });
}

export function useGradesByStudent(studentId: string) {
  return useQuery({ queryKey: ['grades', 'student', studentId], queryFn: () => gradesAPI.getByStudent(studentId).then(r => r.grades), enabled: !!studentId });
}

export function useSaveGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grade: Grade) => gradesAPI.save(grade),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['grades'] });
      qc.invalidateQueries({ queryKey: ['grades', 'student', variables.studentId] });
    },
  });
}

export function useAttendanceByStudent(studentId: string) {
  return useQuery({ queryKey: ['attendance', 'student', studentId], queryFn: () => attendanceAPI.getByStudent(studentId).then(r => r.attendance), enabled: !!studentId });
}

export function useRecordAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attendance: Attendance) => attendanceAPI.record(attendance),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['attendance', 'student', variables.studentId] });
    },
  });
}

export function usePayments() {
  return useQuery({ queryKey: PAYMENTS_KEY, queryFn: () => paymentsAPI.getAll().then(r => r.payments) });
}

export function usePaymentsByStudent(studentId: string) {
  return useQuery({ queryKey: [...PAYMENTS_KEY, 'student', studentId], queryFn: () => paymentsAPI.getByStudent(studentId).then(r => r.payments), enabled: !!studentId });
}

export function usePaymentStats() {
  return useQuery({ queryKey: [...PAYMENTS_KEY, 'stats'], queryFn: () => paymentsAPI.getStats() });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) => paymentsAPI.create(payment),
    onSuccess: () => qc.invalidateQueries({ queryKey: PAYMENTS_KEY }),
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Payment> }) => paymentsAPI.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PAYMENTS_KEY }),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentsAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PAYMENTS_KEY }),
  });
}

export function useFuncionarios() {
  return useQuery({ queryKey: FUNCIONARIOS_KEY, queryFn: () => funcionariosAPI.getAll().then(r => r.funcionarios) });
}

export function useFuncionario(id: string) {
  return useQuery({ queryKey: [...FUNCIONARIOS_KEY, id], queryFn: () => funcionariosAPI.getById(id), enabled: !!id });
}

export function useCreateFuncionario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (funcionario: Omit<Funcionario, 'id' | 'createdAt'>) => funcionariosAPI.create(funcionario),
    onSuccess: () => qc.invalidateQueries({ queryKey: FUNCIONARIOS_KEY }),
  });
}

export function useUpdateFuncionario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Funcionario> }) => funcionariosAPI.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: FUNCIONARIOS_KEY }),
  });
}

export function useDeleteFuncionario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => funcionariosAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: FUNCIONARIOS_KEY }),
  });
}

export function usePagamentosPessoal() {
  return useQuery({ queryKey: ['pagamentos', 'pessoal'], queryFn: () => funcionariosAPI.getPagamentos().then(r => r.pagamentos) });
}

export function useProcessarPagamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pagamento: Parameters<typeof funcionariosAPI.processarPagamento>[0]) => funcionariosAPI.processarPagamento(pagamento),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pagamentos', 'pessoal'] }),
  });
}

export function useUsers() {
  return useQuery({ queryKey: USERS_KEY, queryFn: () => usersAPI.getAll().then(r => r.users) });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof usersAPI.create>[0]) => usersAPI.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof usersAPI.update>[1] }) => usersAPI.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}