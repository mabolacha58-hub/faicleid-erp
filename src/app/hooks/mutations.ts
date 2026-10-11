import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '../../types/domain';

export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error_description: 'Login failed' }));
        throw new Error(error.error_description || 'Email ou senha incorrectos');
      }

      const data = await response.json();

      if (data.refresh_token) {
        localStorage.setItem('refreshToken', data.refresh_token);
      }

      const profileResponse = await fetch(`${import.meta.env.VITE_API_URL}/me`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.access_token}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Erro ao carregar perfil do utilizador');
      }

      const { user } = await profileResponse.json();
      if (!user) throw new Error('Perfil de utilizador não encontrado');

      return { user, accessToken: data.access_token };
    },
    onSuccess: ({ user, accessToken }) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      qc.setQueryData(['auth', 'user'], user);
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      qc.clear();
    },
  });
}

export function useAuthUser() {
  return { data: (() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as AuthUser;
    } catch {
      return null;
    }
  })() };
}