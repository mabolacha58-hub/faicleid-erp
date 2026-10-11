import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "../lib/auth";
import { Shield, Search, RefreshCw, LogIn, Plus, Edit2, Trash2, Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type LogEntry = {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: "LOGIN" | "CREATE" | "UPDATE" | "DELETE" | "VIEW";
  module: string;
  details: string;
  targetId?: string;
  timestamp: string;
};

const ACTION_CONFIG: Record<string, { color: string; bg: string; icon: LucideIcon; label: string }> = {
  LOGIN:  { color: "#6366f1", bg: "rgba(99,102,241,0.1)",  icon: LogIn,   label: "Login" },
  CREATE: { color: "#10b981", bg: "rgba(16,185,129,0.1)",  icon: Plus,    label: "Criação" },
  UPDATE: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  icon: Edit2,   label: "Edição" },
  DELETE: { color: "#f87171", bg: "rgba(248,113,113,0.1)", icon: Trash2,  label: "Eliminação" },
  VIEW:   { color: "#818cf8", bg: "rgba(129,140,248,0.1)", icon: Eye,     label: "Consulta" },
};

const MODULE_LABELS: Record<string, string> = {
  auth: "Autenticação", students: "Alunos", teachers: "Professores",
  classes: "Turmas", subjects: "Disciplinas", grades: "Notas",
  attendance: "Frequência", payments: "Pagamentos", users: "Utilizadores",
  funcionarios: "Funcionários", "folha-pagamento": "Folha Pagamento",
};

type AuditFilters = { module?: string; action?: string; limit?: string };

const getAuthToken = () => localStorage.getItem("accessToken");

async function fetchAuditLogs(filters: AuditFilters) {
  const params = new URLSearchParams();
  if (filters.module) params.set("module", filters.module);
  if (filters.action) params.set("action", filters.action);
  if (filters.limit)  params.set("limit", filters.limit);

  const { API_URL, publicAnonKey } = await import("../lib/supabase");
  const token = getAuthToken();
  const res = await fetch(`${API_URL}/audit?${params}`, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : `Bearer ${publicAnonKey}`,
    },
  });
  if (!res.ok) throw new Error("Erro ao carregar logs");
  return res.json();
}

export default function AuditLog() {
  const user = getCurrentUser();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterModule, setFilterModule] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs({ action: filterAction, module: filterModule, limit: "200" });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterAction, filterModule]);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter(l =>
    l.userName?.toLowerCase().includes(search.toLowerCase()) ||
    l.details?.toLowerCase().includes(search.toLowerCase()) ||
    l.module?.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString("pt-MZ")} ${d.toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
  };

  if (user?.role !== "admin") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", fontFamily: "'IBM Plex Sans', system-ui" }}>
        <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>🔒</div>
        <p style={{ fontSize: 16, fontWeight: 600, color: "#718096" }}>Acesso Restrito — Apenas Administrador</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1300, margin: "0 auto", fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield style={{ width: 18, height: 18, color: "#6366f1" }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Registo de Actividade</h1>
          </div>
          <p style={{ fontSize: 12, color: "#4a5568", margin: 0 }}>
            {total} eventos registados · Últimos 1000 registos
          </p>
        </div>
        <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, background: "#111827", color: "#718096", border: "1px solid #1a2035", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <RefreshCw style={{ width: 13, height: 13 }} /> Actualizar
        </button>
      </div>

      {/* Stats por acção */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 24 }}>
        {Object.entries(ACTION_CONFIG).map(([action, cfg]) => {
          const count = logs.filter(l => l.action === action).length;
          const Icon = cfg.icon;
          return (
            <div key={action} onClick={() => setFilterAction(filterAction === action ? "" : action)}
              style={{ background: filterAction === action ? cfg.bg : "#0d1117", border: `1px solid ${filterAction === action ? cfg.color + "40" : "#1a2035"}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", transition: "all 0.15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Icon style={{ width: 13, height: 13, color: cfg.color }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1 }}>{cfg.label}</span>
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color: cfg.color, margin: 0, fontFamily: "monospace" }}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 10, padding: "14px 18px", marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#4a5568" }} />
          <input type="text" placeholder="Pesquisar por utilizador ou detalhe..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 32px", background: "#111827", border: "1px solid #1a2035", borderRadius: 8, fontSize: 13, color: "#e2e8f0", outline: "none", fontFamily: "inherit" }} />
        </div>
        <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
          style={{ padding: "8px 12px", background: "#111827", border: "1px solid #1a2035", borderRadius: 8, fontSize: 13, color: "#e2e8f0", outline: "none" }}>
          <option value="">Todos os módulos</option>
          {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(filterAction || filterModule || search) && (
          <button onClick={() => { setFilterAction(""); setFilterModule(""); setSearch(""); }}
            style={{ padding: "8px 12px", background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            × Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#4a5568" }}>
            <div style={{ width: 28, height: 28, border: "2px solid #1a2035", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ margin: 0, fontSize: 13 }}>A carregar registos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#4a5568" }}>
            <Shield style={{ width: 32, height: 32, margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ margin: 0 }}>Nenhum registo encontrado</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1a2035" }}>
                  {["Data/Hora", "Utilizador", "Papel", "Acção", "Módulo", "Detalhe"].map((h, i) => (
                    <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, _idx) => {
                  const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.VIEW;
                  const Icon = cfg.icon;
                  return (
                    <tr key={log.id} style={{ borderBottom: "1px solid #0f1520", transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#111827"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>

                      {/* Timestamp */}
                      <td style={{ padding: "12px 16px", fontSize: 11, color: "#4a5568", whiteSpace: "nowrap", fontFamily: "'IBM Plex Mono', monospace" }}>
                        {formatTime(log.timestamp)}
                      </td>

                      {/* Utilizador */}
                      <td style={{ padding: "12px 16px" }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", margin: 0 }}>{log.userName || "—"}</p>
                      </td>

                      {/* Papel */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#718096", background: "#1a2035", padding: "2px 8px", borderRadius: 20 }}>
                          {log.userRole}
                        </span>
                      </td>

                      {/* Acção */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30`, padding: "3px 10px", borderRadius: 20 }}>
                          <Icon style={{ width: 11, height: 11 }} />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Módulo */}
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#718096" }}>
                        {MODULE_LABELS[log.module] || log.module}
                      </td>

                      {/* Detalhe */}
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#718096", maxWidth: 400 }}>
                        <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {log.details}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: "10px 16px", borderTop: "1px solid #1a2035", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "#4a5568" }}>A mostrar {filtered.length} de {total} registos</span>
          <span style={{ fontSize: 11, color: "#4a5568" }}>Últimos 1000 eventos guardados</span>
        </div>
      </div>
    </div>
  );
}