import { Outlet, useLocation, useNavigate } from "react-router";
import { useCallback, useEffect, useState, useRef } from "react";
import { getCurrentUser } from "../lib/auth";
import { activationAPI } from "../lib/api";
import AppShell from "./AppShell";

const PUBLIC_ROUTES = ["/", "/signup", "/activate"];

export default function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const isPublic = PUBLIC_ROUTES.includes(location.pathname);
  const [ready, setReady] = useState(false);
  const checkedRef = useRef(false);

  const checkAndRedirect = useCallback(async () => {
    const user = getCurrentUser();
    const token = localStorage.getItem("accessToken");

    if (location.pathname === "/activate") {
      setReady(true);
      return;
    }

    // Se não há token e não é rota pública -> login
    if (!user || !token) {
      if (!isPublic) navigate("/", { replace: true });
      setReady(true);
      return;
    }

    // Se é rota pública mas tem token -> dashboard
    if (isPublic) {
      navigate("/dashboard", { replace: true });
      setReady(true);
      return;
    }

    // Tem token, tenta validar licença (não bloqueia se falhar)
    try {
      const license = await activationAPI.getLicense();
      if (license.status === "no_license" || license.expired) {
        localStorage.removeItem("systemActivated");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        navigate("/activate", { replace: true });
        setReady(true);
        return;
      }
      localStorage.setItem("systemActivated", "true");
    } catch (err) {
      console.warn("License check failed, allowing access with valid token:", err);
      // Se falhar a verificação mas tem token válido, permite acesso
      const activated = localStorage.getItem("systemActivated");
      if (!activated) {
        // Só bloqueia se NUNCA foi activado
        navigate("/activate", { replace: true });
        setReady(true);
        return;
      }
    }

    setReady(true);
  }, [isPublic, navigate, location.pathname]);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    checkAndRedirect();
  }, [checkAndRedirect]);

  if (!ready) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#0b0f1a",
      }}>
        <div style={{
          width: 32, height: 32,
          border: "2px solid #1a2035", borderTopColor: "#6366f1",
          borderRadius: "50%", animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isPublic) return <Outlet />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}