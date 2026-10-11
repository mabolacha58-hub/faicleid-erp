import type {
  UserRole,
  User,
  Student,
  Teacher,
  Class,
  Subject,
  Grade,
  Attendance,
  Payment,
  Funcionario,
  PagamentoPessoal,
  PaymentStats,
  ActivationKeyResponse,
  LicenseResponse,
} from '../../types/domain';

const getEnv = (key: string, fallback?: string): string => {
  const value = import.meta.env[key];
  if (!value && !fallback) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ?? fallback!;
};

export const projectId = getEnv('VITE_SUPABASE_PROJECT_ID');
export const publicAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');
export const API_URL = getEnv('VITE_API_URL');

export type { UserRole, User, Student, Teacher, Class, Subject, Grade, Attendance, Payment, Funcionario, PagamentoPessoal, PaymentStats, ActivationKeyResponse, LicenseResponse };

export const PERMISSIONS = {
  financial: {
    manage: ['admin'] as UserRole[],
    view: ['admin', 'secretaria'] as UserRole[],
  },
  students: {
    manage: ['admin', 'director'] as UserRole[],
    view: ['admin', 'director', 'pedagogico', 'professor', 'secretaria'] as UserRole[],
  },
  classes: {
    manage: ['admin', 'director'] as UserRole[],
    view: ['admin', 'director', 'pedagogico', 'professor', 'secretaria'] as UserRole[],
  },
  subjects: {
    manage: ['admin', 'director'] as UserRole[],
    view: ['admin', 'director', 'pedagogico', 'professor', 'secretaria'] as UserRole[],
  },
  teachers: {
    manage: ['admin', 'director'] as UserRole[],
    view: ['admin', 'director', 'pedagogico'] as UserRole[],
  },
  grades: {
    manage: ['professor'] as UserRole[],
    view: ['admin', 'director', 'pedagogico', 'professor'] as UserRole[],
  },
  attendance: {
    manage: ['professor'] as UserRole[],
    view: ['admin', 'director', 'pedagogico', 'professor'] as UserRole[],
  },
  users: {
    manage: ['admin', 'director'] as UserRole[],
    view: ['admin', 'director'] as UserRole[],
  },
  pessoal: {
    manage: ['admin'] as UserRole[],
    view: ['admin', 'secretaria'] as UserRole[],
  },
} as const;

export const canManage = (role: UserRole, module: keyof typeof PERMISSIONS): boolean =>
  PERMISSIONS[module].manage.includes(role);

export const canView = (role: UserRole, module: keyof typeof PERMISSIONS): boolean =>
  PERMISSIONS[module].view.includes(role);