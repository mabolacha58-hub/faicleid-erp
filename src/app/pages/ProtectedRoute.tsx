import { useEffect, useState } from "react";
import { getCurrentUser } from "../lib/auth";
import { useNavigate, useLocation } from "react-router";

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = ["/", "/signup", "/test"];

// Rotas por papel
const ROLE_ROUTES: Record<string, string[]> = {
  admin:      ["/dashboard", "/users", "/audit", "/profile", "/students", "/teachers", "/classes", "/subjects", "/grades", "/attendance", "/financial", "/report"],
  director:   ["/dashboard", "/users", "/profile", "/students", "/teachers", "/classes", "/subjects", "/grades", "/attendance", "/report"],
  pedagogico: ["/dashboard", "/profile", "/students", "/classes", "/subjects", "/grades", "/attendance", "/report"],
  professor:  ["/dashboard", "/profile", "/students", "/grades", "/attendance", "/report"],
  secretaria: ["/dashboard", "/profile", "/students", "/classes", "/subjects", "/financial", "/report"],
};

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    const token = localStorage.getItem("accessToken");
    const isPublic = PUBLIC_ROUTES.includes(location.pathname);

    if (isPublic) { setChecking(false); return; }

    // Sem sessão → login
    if (!user || !token) {
      navigate("/", { replace: true, state: { from: location.pathname } });
      return;
    }

    // Verificar se o papel tem acesso à rota
    const allowedRoutes = ROLE_ROUTES[user.role] || [];
    const hasAccess = allowedRoutes.some(r => location.pathname.startsWith(r));

    if (!hasAccess) {
      navigate("/dashboard", { replace: true });
      return;
    }

    setChecking(false);
  }, [location.pathname, navigate]);

  if (checking && !PUBLIC_ROUTES.includes(location.pathname)) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#0b0f1a",
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 36, height: 36, border: "2px solid #1a2035",
            borderTopColor: "#6366f1", borderRadius: "50%",
            animation: "spin 0.7s linear infinite", margin: "0 auto 16px",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: "#4a5568", fontSize: 13 }}>A verificar sessão...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}