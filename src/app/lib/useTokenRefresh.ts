import { useCallback, useEffect, useRef } from "react";
import { projectId, publicAnonKey } from "./supabase";
import { getCurrentUser, signOut } from "./auth";
import { useNavigate } from "react-router";

const REFRESH_INTERVAL_MS = 50 * 60 * 1000; // Renovar a cada 50 minutos (token dura 60 min)

export function useTokenRefresh() {
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshToken = useCallback(async () => {
    try {
      const refreshTokenStr = localStorage.getItem("refreshToken");
      if (!refreshTokenStr) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/auth/v1/token?grant_type=refresh_token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": publicAnonKey,
          },
          body: JSON.stringify({ refresh_token: refreshTokenStr }),
        }
      );

      if (!response.ok) {
        // Token inválido — fazer logout
        signOut();
        navigate("/", { replace: true });
        return;
      }

      const data = await response.json();
      localStorage.setItem("accessToken", data.access_token);
      if (data.refresh_token) {
        localStorage.setItem("refreshToken", data.refresh_token);
      }
    } catch (err) {
      console.error("Erro ao renovar token:", err);
    }
  }, [navigate]);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;

    // Renovar imediatamente ao carregar (caso o token esteja prestes a expirar)
    refreshToken();

    // Configurar renovação periódica
    timerRef.current = setInterval(refreshToken, REFRESH_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refreshToken]);
}