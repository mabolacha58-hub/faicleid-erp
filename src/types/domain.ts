export type UserRole = 'admin' | 'director' | 'pedagogico' | 'professor' | 'secretaria' | 'encarregado';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  assignedClasses?: string[];
  assignedSubjects?: string[];
  studentIds?: string[];
  accessCode?: string;
  createdAt?: string;
}

export interface Student {
  id: string;
  name: string;
  birthDate: string;
  classId: string;
  guardian: string;
  guardianPhone?: string;
  address?: string;
  createdAt?: string;
}

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  email: string;
  phone?: string;
  createdAt?: string;
}

export interface Class {
  id: string;
  name: string;
  grade: string;
  year: number;
  capacity?: number;
  createdAt?: string;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  createdAt?: string;
}

export interface Grade {
  studentId: string;
  subjectId: string;
  classId: string;
  bimester: 1 | 2 | 3 | 4;
  grade: number;
  teacherId?: string;
  updatedAt?: string;
}

export interface Attendance {
  studentId: string;
  classId: string;
  date: string;
  present: boolean;
  teacherId?: string;
  recordedAt?: string;
}

export interface Payment {
  id?: string;
  studentId: string;
  month: number;
  year: number;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue';
  paymentMethod?: string;
  notes?: string;
  type?: 'mensalidade' | 'matricula' | 'multa' | 'gravata' | 'bolso' | 'ficha';
  isMatricula?: boolean;
  isMulta?: boolean;
  hasTransport?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
  tipo: 'professor' | 'administrativo' | 'apoio';
  salario: number;
  dataContratacao: string;
  banco?: string;
  contaBancaria?: string;
  nuit?: string;
  status: 'ativo' | 'inativo';
  observacoes?: string;
  createdAt?: string;
}

export interface PagamentoPessoal {
  id: string;
  funcionarioId: string;
  funcionarioNome?: string;
  mes: number;
  ano: number;
  salarioBase: number;
  subsidios: number;
  descontos: number;
  valorPago: number;
  dataPagamento: string;
  status: 'pago' | 'pendente';
  observacoes?: string;
  createdAt?: string;
}

export interface PaymentStats {
  totalPending: number;
  totalPaid: number;
  totalOverdue: number;
  monthlyRevenue: number;
  alertDueSoon: number;
  alertOverdue: number;
}

export interface ActivationKeyResponse {
  valid: boolean;
  school?: string;
  error?: string;
}

export interface ActivationResponse {
  success: boolean;
  school?: string;
  error?: string;
}

export interface LicenseResponse {
  status: 'active' | 'expiring' | 'expiring_soon' | 'expired' | 'no_license';
  school?: string;
  tipo?: string;
  expiresAt?: string;
  daysLeft: number;
  expired: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  assignedClasses?: string[];
  assignedSubjects?: string[];
  accessCode?: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  activationKey?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}