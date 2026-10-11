import { API_URL } from './supabase';
import type {
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
  ActivationResponse,
  LicenseResponse,
  SignUpData,
} from '../../types/domain';

const getAuthToken = (): string | null => localStorage.getItem('accessToken');

export async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, { 
    ...options, 
    headers,
    cache: 'no-store'
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));

    // Licença inválida/expirada (imposto pelo servidor) — encerra sessão e volta à activação
    if (response.status === 403 && error.error === 'license_invalid') {
      localStorage.removeItem('systemActivated');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/activate') {
        window.location.href = '/activate';
      }
      throw new Error('Licença inválida ou expirada.');
    }

    console.error(`API error on ${endpoint}:`, error);
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const authAPI = {
  signup: (data: SignUpData) =>
    apiCall<{ success: boolean; user: User }>('/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  me: () => apiCall<{ user: User }>('/me'),
};

export const activationAPI = {
  verify: (activationKey: string) =>
    apiCall<ActivationKeyResponse>('/activation-keys/verify', {
      method: 'POST',
      body: JSON.stringify({ activationKey }),
    }),
  activate: (activationKey: string) =>
    apiCall<ActivationResponse>('/activation-keys/activate', {
      method: 'POST',
      body: JSON.stringify({ activationKey }),
    }),
  getLicense: () => apiCall<LicenseResponse>('/license'),
  getKeys: () => apiCall<{ keys: any[] }>('/activation-keys'),
  createKey: (data: { type: 'trial' | 'annual'; school?: string }) =>
    apiCall<{ success: boolean; key: any }>('/activation-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteKey: (key: string) =>
    apiCall<{ success: boolean }>(`/activation-keys/${key}`, { method: 'DELETE' }),
};

export const studentsAPI = {
  getAll: () => apiCall<{ students: Student[] }>('/students'),
  getById: (id: string) => apiCall<{ student: Student }>(`/students/${id}`),
  create: (student: Omit<Student, 'id' | 'createdAt'>) =>
    apiCall<{ success: boolean; student: Student }>('/students', { method: 'POST', body: JSON.stringify(student) }),
  update: (id: string, student: Partial<Student>) =>
    apiCall<{ success: boolean; student: Student }>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(student) }),
  delete: (id: string) => apiCall<{ success: boolean }>(`/students/${id}`, { method: 'DELETE' }),
};

export const usersAPI = {
  getAll: () => apiCall<{ users: User[] }>('/users'),
  create: (data: SignUpData) =>
    apiCall<{ success: boolean; user: User }>('/signup', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Pick<User, 'name' | 'role' | 'assignedClasses' | 'assignedSubjects'>>) =>
    apiCall<{ success: boolean; user: User }>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiCall<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' }),
};

export const teachersAPI = {
  getAll: () => apiCall<{ teachers: Teacher[] }>('/teachers'),
  create: (teacher: Omit<Teacher, 'id' | 'createdAt'>) =>
    apiCall<{ success: boolean; teacher: Teacher }>('/teachers', { method: 'POST', body: JSON.stringify(teacher) }),
  update: (id: string, teacher: Partial<Teacher>) =>
    apiCall<{ success: boolean; teacher: Teacher }>(`/teachers/${id}`, { method: 'PUT', body: JSON.stringify(teacher) }),
  delete: (id: string) => apiCall<{ success: boolean }>(`/teachers/${id}`, { method: 'DELETE' }),
};

export const classesAPI = {
  getAll: () => apiCall<{ classes: Class[] }>('/classes'),
  create: (classData: Omit<Class, 'id' | 'createdAt'>) =>
    apiCall<{ success: boolean; class: Class }>('/classes', { method: 'POST', body: JSON.stringify(classData) }),
  update: (id: string, classData: Partial<Class>) =>
    apiCall<{ success: boolean; class: Class }>(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(classData) }),
  delete: (id: string) => apiCall<{ success: boolean }>(`/classes/${id}`, { method: 'DELETE' }),
};

export const subjectsAPI = {
  getAll: () => apiCall<{ subjects: Subject[] }>('/subjects'),
  create: (subject: Omit<Subject, 'id' | 'createdAt'>) =>
    apiCall<{ success: boolean; subject: Subject }>('/subjects', { method: 'POST', body: JSON.stringify(subject) }),
  update: (id: string, subject: Partial<Subject>) =>
    apiCall<{ success: boolean; subject: Subject }>(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(subject) }),
  delete: (id: string) => apiCall<{ success: boolean }>(`/subjects/${id}`, { method: 'DELETE' }),
};

export const gradesAPI = {
  getAll: () => apiCall<{ grades: Grade[] }>('/grades'),
  getByStudent: (studentId: string) => apiCall<{ grades: Grade[] }>(`/grades/student/${studentId}`),
  save: (grade: Grade) => apiCall<{ success: boolean; grade: Grade }>('/grades', { method: 'POST', body: JSON.stringify(grade) }),
  delete: (grade: Pick<Grade, 'studentId' | 'subjectId' | 'classId' | 'bimester'>) =>
    apiCall<{ success: boolean }>('/grades', { method: 'DELETE', body: JSON.stringify(grade) }),
};

export const attendanceAPI = {
  getByStudent: (studentId: string) => apiCall<{ attendance: Attendance[] }>(`/attendance/student/${studentId}`),
  record: (attendance: Attendance) => apiCall<{ success: boolean; attendance: Attendance }>('/attendance', { method: 'POST', body: JSON.stringify(attendance) }),
};

export const paymentsAPI = {
  getAll: () => apiCall<{ payments: Payment[] }>('/payments'),
  getByStudent: (studentId: string) => apiCall<{ payments: Payment[] }>(`/payments/student/${studentId}`),
  create: (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiCall<{ success: boolean; payment: Payment }>('/payments', { method: 'POST', body: JSON.stringify(payment) }),
  update: (id: string, payment: Partial<Payment>) =>
    apiCall<{ success: boolean; payment: Payment }>(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(payment) }),
  delete: (id: string) => apiCall<{ success: boolean }>(`/payments/${id}`, { method: 'DELETE' }),
  getStats: () => apiCall<PaymentStats>('/payments/stats'),
};

export const funcionariosAPI = {
  getAll: () => apiCall<{ funcionarios: Funcionario[] }>('/funcionarios'),
  getById: (id: string) => apiCall<{ funcionario: Funcionario }>(`/funcionarios/${id}`),
  create: (funcionario: Omit<Funcionario, 'id' | 'createdAt'>) =>
    apiCall<{ success: boolean; funcionario: Funcionario }>('/funcionarios', { method: 'POST', body: JSON.stringify(funcionario) }),
  update: (id: string, updates: Partial<Funcionario>) =>
    apiCall<{ success: boolean; funcionario: Funcionario }>(`/funcionarios/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  delete: (id: string) => apiCall<{ success: boolean }>(`/funcionarios/${id}`, { method: 'DELETE' }),

  getPagamentos: () => apiCall<{ pagamentos: PagamentoPessoal[] }>('/folha-pagamento'),

  processarPagamento: (pagamento: {
    funcionarioId: string;
    mes: number;
    ano: number;
    salarioBase: number;
    subsidios?: number;
    descontos?: number;
    valorPago: number;
    dataPagamento: string;
    observacoes?: string;
  }) => apiCall<{ success: boolean; pagamento: PagamentoPessoal }>('/folha-pagamento', {
    method: 'POST',
    body: JSON.stringify({ ...pagamento, subsidios: pagamento.subsidios ?? 0, descontos: pagamento.descontos ?? 0, status: 'pago' }),
  }),

  checkPagamentoExists: (funcionarioId: string, mes: number, ano: number) =>
    apiCall<{ exists: boolean }>(`/folha-pagamento/check?funcionario_id=${funcionarioId}&mes=${mes}&ano=${ano}`),

  getPagamentosByPeriodo: (mes: number, ano: number) =>
    apiCall<{ pagamentos: PagamentoPessoal[] }>(`/folha-pagamento/periodo?mes=${mes}&ano=${ano}`),
};