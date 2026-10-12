import { useState } from "react";
import { getCurrentUser, ROLE_LABELS, ROLE_COLORS } from "../lib/auth";
import {
  LayoutDashboard, Users, GraduationCap, School, BookOpen,
  DollarSign, TrendingUp, Calendar, ChevronRight, LogOut,
  Menu, Shield, Key
} from "lucide-react";
import { signOut } from "../lib/auth";
import { useNavigate, useLocation } from "react-router";
import { Briefcase } from "lucide-react";

const NAV = [
  { label: "Portal", icon: LayoutDashboard, href: "/portal", roles: ["encarregado"] },
  { label: "Utilizadores", icon: Users, href: "/users", roles: ["admin","director"] },
  { label: "Chaves Activação", icon: Key, href: "/activation-keys", roles: ["admin"] },
  { label: "Registo Actividade", icon: Shield, href: "/audit", roles: ["admin"] },
  { label: "Alunos", icon: Users, href: "/students", roles: ["admin","director","pedagogico","professor","secretaria"] },
  { label: "Professores", icon: GraduationCap, href: "/teachers", roles: ["admin","director","pedagogico"] },
  { label: "Turmas", icon: School, href: "/classes", roles: ["admin","director","pedagogico","professor","secretaria"] },
  { label: "Disciplinas", icon: BookOpen, href: "/subjects", roles: ["admin","director","pedagogico","professor","secretaria"] },
  { label: "Notas", icon: TrendingUp, href: "/grades", roles: ["admin","director","pedagogico","professor"] },
  { label: "Frequência", icon: Calendar, href: "/attendance", roles: ["admin","director","pedagogico","professor"] },
  { label: "Financeiro", icon: DollarSign, href: "/financial", roles: ["admin", "secretaria"] },
  { label: "Pessoal", icon: Briefcase, href: "/pessoal", roles: ["admin", "secretaria"] },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const role = (user?.role || "admin") as keyof typeof ROLE_LABELS;
  const badge = ROLE_COLORS[role] || ROLE_COLORS.admin;

  const visibleNav = NAV.filter(n => n.roles.includes(role));
  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + "/");

  const handleLogout = () => { signOut(); navigate("/"); };

  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: "#0b0f1a",
      fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
      color: "#e2e8f0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; }

        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2d3748; border-radius: 99px; }

        .nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 14px; border-radius: 8px;
          font-size: 13.5px; font-weight: 500;
          color: #718096; cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none; border: none; background: none; width: 100%;
          white-space: nowrap; overflow: hidden;
        }
        .nav-item:hover { color: #e2e8f0; background: rgba(255,255,255,0.05); }
        .nav-item.active {
          color: #e2e8f0; background: rgba(99,102,241,0.15);
          border-left: 2px solid #6366f1;
        }
        .nav-item.active .nav-icon { color: #818cf8; }

        .sidebar-tooltip {
          position: absolute; left: calc(100% + 12px); top: 50%;
          transform: translateY(-50%);
          background: #1e2535; color: #e2e8f0;
          padding: 5px 10px; border-radius: 6px;
          font-size: 12px; font-weight: 500; white-space: nowrap;
          pointer-events: none; opacity: 0;
          border: 1px solid #2d3748;
          transition: opacity 0.15s; z-index: 999;
        }
        .nav-item:hover .sidebar-tooltip { opacity: 1; }

        .main-content { flex: 1; overflow-x: hidden; transition: margin-left 0.25s ease; }

        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .mobile-overlay { display: flex !important; }
        }
      `}</style>

      {/* ── SIDEBAR DESKTOP ── */}
      <aside className="sidebar-desktop" style={{
        width: collapsed ? 60 : 220,
        minWidth: collapsed ? 60 : 220,
        background: "#0d1117",
        borderRight: "1px solid #1a2035",
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
        transition: "width 0.25s ease, min-width 0.25s ease",
        overflow: "hidden", zIndex: 40,
      }}>

        {/* Logo */}
        <div style={{ padding: "20px 14px 16px", borderBottom: "1px solid #1a2035", display: "flex", alignItems: "center", gap: 10, minHeight: 64 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <School style={{ width: 16, height: 16, color: "white" }} />
          </div>
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", margin: 0, letterSpacing: 0.5, whiteSpace: "nowrap" }}>FAICLEID</p>
              <p style={{ fontSize: 10, color: "#4a5568", margin: 0, whiteSpace: "nowrap" }}>Instituto Politécnico</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto", overflowX: "hidden" }}>
          {!collapsed && (
            <p style={{ fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1.2, padding: "6px 8px 8px", margin: 0 }}>Menu Principal</p>
          )}
          {visibleNav.map(item => (
            <div key={item.href} style={{ position: "relative", marginBottom: 2 }}>
              <a href={item.href} className={`nav-item ${isActive(item.href) ? "active" : ""}`}
                style={{ paddingLeft: collapsed ? 14 : 14, justifyContent: collapsed ? "center" : "flex-start" }}>
                <item.icon className="nav-icon" style={{ width: 16, height: 16, flexShrink: 0, color: isActive(item.href) ? "#818cf8" : "#4a5568" }} />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && isActive(item.href) && <ChevronRight style={{ width: 12, height: 12, marginLeft: "auto", color: "#6366f1" }} />}
                {collapsed && <span className="sidebar-tooltip">{item.label}</span>}
              </a>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: "10px 8px", borderTop: "1px solid #1a2035" }}>
          {/* User card */}
          {!collapsed && (
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 12px", marginBottom: 8, border: "1px solid #1a2035" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: badge.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: badge.color, flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user?.name?.split(" ")[0]} {user?.name?.split(" ").slice(-1)[0]}
                  </p>
                  <p style={{ fontSize: 10, color: "#4a5568", margin: 0 }}>{ROLE_LABELS[role]}</p>
                </div>
              </div>
            </div>
          )}

          {/* Collapse toggle */}
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: "#4a5568", fontSize: 12, fontWeight: 500, justifyContent: collapsed ? "center" : "flex-start" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#e2e8f0"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#4a5568"}>
            <Menu style={{ width: 15, height: 15, flexShrink: 0 }} />
            {!collapsed && <span>Recolher</span>}
          </button>

          {/* Logout */}
          <button onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: "#4a5568", fontSize: 12, fontWeight: 500, justifyContent: collapsed ? "center" : "flex-start" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fc8181"; (e.currentTarget as HTMLElement).style.background = "rgba(252,129,129,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.background = "none"; }}>
            <LogOut style={{ width: 15, height: 15, flexShrink: 0 }} />
            {!collapsed && <span>Terminar Sessão</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="main-content" style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>

        {/* Top bar */}
        <header style={{ height: 56, background: "#0d1117", borderBottom: "1px solid #1a2035", display: "flex", alignItems: "center", padding: "0 24px", gap: 16, position: "sticky", top: 0, zIndex: 30 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#4a5568" }}>Instituto Politécnico FaiCleid</span>
            <ChevronRight style={{ width: 12, height: 12, color: "#2d3748" }} />
            <span style={{ fontSize: 11, color: "#718096", fontWeight: 500 }}>
              {visibleNav.find(n => isActive(n.href))?.label || "Dashboard"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <Shield style={{ width: 11, height: 11 }} />
              {ROLE_LABELS[role]}
            </div>
            <a href="/profile" title="Meu Perfil" style={{ width: 30, height: 30, borderRadius: "50%", background: "#1a2035", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#818cf8", border: "1px solid #2d3748", textDecoration: "none", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#6366f1"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#2d3748"}>
              {initials}
            </a>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", background: "#0b0f1a" }}>
          {children}
        </main>
      </div>
    </div>
  );
}