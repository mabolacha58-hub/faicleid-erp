import { projectId, publicAnonKey } from './supabase';
import type { UserRole } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  assignedClasses?: string[];
  assignedSubjects?: string[];
  accessCode?: string;
}

// Sign in with Supabase
export async function signIn(email: string, password: string): Promise<{ user: AuthUser; accessToken: string }> {
  try {
    // Timeout de 10 segundos para evitar travamentos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`https://${projectId}.supabase.co/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': publicAnonKey,
      },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error_description: 'Login failed' }));
      throw new Error(error.error_description || 'Email ou senha incorrectos');
    }

    const data = await response.json();

    // Guardar refresh token para renovação automática
    if (data.refresh_token) {
      localStorage.setItem("refreshToken", data.refresh_token);
    }

    // Buscar perfil do usuário com timeout
    const profileController = new AbortController();
    const profileTimeoutId = setTimeout(() => profileController.abort(), 8000);

    const profileResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-513143ac/me`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.access_token}`,
      },
      signal: profileController.signal,
    });

    clearTimeout(profileTimeoutId);

    if (!profileResponse.ok) {
      throw new Error('Erro ao carregar perfil do utilizador');
    }

    const { user } = await profileResponse.json();
    if (!user) throw new Error('Perfil de utilizador não encontrado');

    return { user, accessToken: data.access_token };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tempo limite excedido. Verifique sua conexão com a internet.');
    }
    throw error;
  }
}

// Login otimizado com cache
export async function fastSignIn(email: string, password: string): Promise<{ user: AuthUser; accessToken: string }> {
  try {
    // Primeiro, tentar login rápido apenas com autenticação
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`https://${projectId}.supabase.co/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': publicAnonKey,
      },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error_description: 'Login failed' }));
      throw new Error(error.error_description || 'Email ou senha incorrectos');
    }

    const data = await response.json();

    // Guardar refresh token
    if (data.refresh_token) {
      localStorage.setItem("refreshToken", data.refresh_token);
    }

    // Buscar perfil em paralelo (não bloqueia o login)
    const profilePromise = fetch(`https://${projectId}.supabase.co/functions/v1/make-server-513143ac/me`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.access_token}`,
      },
    }).then(async (res) => {
      if (!res.ok) return null;
      const { user } = await res.json();
      return user;
    }).catch(() => null);

    // Aguardar perfil com timeout menor
    const profileTimeoutId = setTimeout(() => {}, 3000);
    const user = await Promise.race([
      profilePromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
    ]);
    clearTimeout(profileTimeoutId);

    // Se não conseguiu carregar perfil, usar dados básicos do token
    const authUser: AuthUser = user || {
      id: data.user?.id || 'unknown',
      email: email,
      name: data.user?.user_metadata?.name || email.split('@')[0],
      role: data.user?.user_metadata?.role || 'professor'
    };

    return { user: authUser, accessToken: data.access_token };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tempo limite excedido. Verifique sua conexão com a internet.');
    }
    throw error;
  }
}

export function signOut() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export function getCurrentUser(): AuthUser | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function storeAuth(user: AuthUser, accessToken: string) {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('accessToken', accessToken);
  // Cache do timestamp do login para otimização
  localStorage.setItem('lastLoginTime', Date.now().toString());
}

// Verificar se o perfil precisa ser atualizado (cache de 5 minutos)
export function shouldRefreshProfile(): boolean {
  const lastLoginTime = localStorage.getItem('lastLoginTime');
  if (!lastLoginTime) return true;

  const timeDiff = Date.now() - parseInt(lastLoginTime);
  return timeDiff > 5 * 60 * 1000; // 5 minutos
}

// Helpers de permissão usados no frontend
export const isAdmin = (user: AuthUser | null) => user?.role === 'admin';
export const isDirector = (user: AuthUser | null) => user?.role === 'director';
export const isPedagogico = (user: AuthUser | null) => user?.role === 'pedagogico';
export const isProfessor = (user: AuthUser | null) => user?.role === 'professor';
export const isSecretaria = (user: AuthUser | null) => user?.role === 'secretaria';

export const canManageFinancial = (user: AuthUser | null) => user?.role === 'admin';
export const canViewFinancial = (user: AuthUser | null) =>
  ['admin', 'director', 'secretaria'].includes(user?.role || '');

export const canManageUsers = (user: AuthUser | null) =>
  ['admin', 'director'].includes(user?.role || '');

export const canManagePedagogical = (user: AuthUser | null) =>
  ['admin', 'director'].includes(user?.role || '');

export const canViewPedagogical = (user: AuthUser | null) =>
  ['admin', 'director', 'pedagogico', 'professor'].includes(user?.role || '');

export const canManage = (role: string, module: string): boolean => {
  if (role === 'admin') return true;
  if (module === 'pessoal') return role === 'admin';
  if (module === 'financial') return role === 'admin';
  if (module === 'users') return ['admin', 'director'].includes(role);
  if (module === 'pedagogical') return ['admin', 'director'].includes(role);
  return false;
};

// Professor só pode editar notas da sua turma e disciplina
export const professorCanEditGrade = (
  user: AuthUser | null,
  classId: string,
  subjectId: string
): boolean => {
  if (user?.role !== 'professor') return false;
  const hasClass = user.assignedClasses?.includes(classId) ?? false;
  const hasSubject = user.assignedSubjects?.includes(subjectId) ?? false;
  return hasClass && hasSubject;
};

// Etiquetas dos papéis em português
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  director: 'Director',
  pedagogico: 'Pedagógico',
  professor: 'Professor',
  secretaria: 'Secretaria',
};

export const ROLE_COLORS: Record<UserRole, { bg: string; color: string; border: string }> = {
  admin:      { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  director:   { bg: '#ede9fe', color: '#7c3aed', border: '#c4b5fd' },
  pedagogico: { bg: '#ecfdf5', color: '#059669', border: '#6ee7b7' },
  professor:  { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  secretaria: { bg: '#fdf2f8', color: '#db2777', border: '#fbcfe8' },
};

export async function updateUserProfile(updates: Partial<AuthUser>): Promise<void> {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error('Sessão inválida. Inicie sessão novamente.');

  const updatedUser = { ...currentUser, ...updates };
  localStorage.setItem('user', JSON.stringify(updatedUser));
}

// Altera a senha do utilizador autenticado via Supabase Auth
export async function changePassword(newPassword: string): Promise<void> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('Sessão inválida. Inicie sessão novamente.');

  const response = await fetch(`https://${projectId}.supabase.co/auth/v1/user`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'apikey': publicAnonKey,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ password: newPassword }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.msg || error.error_description || error.message || 'Erro ao alterar a senha');
  }
}