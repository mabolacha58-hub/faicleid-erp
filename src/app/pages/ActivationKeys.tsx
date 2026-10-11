import { useEffect, useState } from "react";
import { Plus, Trash2, Copy, Check, X, Loader2, Key, AlertTriangle, Calendar, Shield } from "lucide-react";
import { activationAPI } from "../lib/api";

type ActivationKey = {
  key: string;
  type: 'trial' | 'annual';
  school: string;
  used: boolean;
  usedAt?: string;
  usedBy?: string;
  createdAt: string;
  createdBy: string;
};

type License = {
  status: string;
  school?: string;
  tipo?: string;
  expiresAt?: string;
  daysLeft: number;
  expired: boolean;
};

export default function ActivationKeys() {
  const [keys, setKeys] = useState<ActivationKey[]>([]);
  const [license, setLicense] = useState<License | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newKeyType, setNewKeyType] = useState<'trial' | 'annual'>('trial');
  const [newKeySchool, setNewKeySchool] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [keysRes, licenseRes] = await Promise.all([
        activationAPI.getKeys(),
        activationAPI.getLicense(),
      ]);
      setKeys(keysRes.keys || []);
      setLicense(licenseRes);
    } catch (err) {
      setError("Erro ao carregar chaves/licença");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateKey = async () => {
    setError("");
    setSuccess("");
    try {
      setCreating(true);
      const res = await activationAPI.createKey({ type: newKeyType, school: newKeySchool });
      setSuccess(`Chave ${newKeyType === 'trial' ? 'trial' : 'anual'} criada: ${res.key.key}`);
      setKeys(prev => [res.key, ...prev]);
      setShowModal(false);
      setNewKeySchool("");
    } catch (err: any) {
      setError(err.message || "Erro ao criar chave");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (key: string) => {
    if (!window.confirm(`Eliminar chave ${key}?`)) return;
    try {
      await activationAPI.deleteKey(key);
      setKeys(prev => prev.filter(k => k.key !== key));
      setSuccess("Chave eliminada");
    } catch (err: any) {
      setError(err.message || "Erro ao eliminar");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess("Chave copiada!");
    setTimeout(() => setSuccess(""), 2000);
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleString('pt-PT');

  const getStatusBadge = (key: ActivationKey) => {
    if (key.used) return <span style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>Utilizada</span>;
    return <span style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>Disponível</span>;
  };

  const getTypeBadge = (type: 'trial' | 'annual') => (
    <span style={{
      background: type === 'trial' ? "rgba(245,158,11,0.15)" : "rgba(99,102,241,0.15)",
      color: type === 'trial' ? "#f59e0b" : "#818cf8",
      border: `1px solid ${type === 'trial' ? "rgba(245,158,11,0.3)" : "rgba(99,102,241,0.3)"}`,
    }}>
      {type === 'trial' ? 'Trial (30 dias)' : 'Anual (1 ano)'}
    </span>
  );

  const getLicenseStatus = () => {
    if (!license) return <span style={{ color: "#4a5568" }}>Sem licença</span>;
    if (license.expired) return <span style={{ color: "#f87171" }}>Expirada</span>;
    if (license.status === 'expiring') return <span style={{ color: "#f87171" }}>Expirando ({license.daysLeft} dias)</span>;
    if (license.status === 'expiring_soon') return <span style={{ color: "#f59e0b" }}>Expira em breve ({license.daysLeft} dias)</span>;
    return <span style={{ color: "#10b981" }}>Ativa ({license.daysLeft} dias)</span>;
  };

  const cardStyle = {
    background: "#0d1117",
    border: "1px solid #1a2035",
    borderRadius: 12,
    padding: 20,
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    background: "#111827",
    border: "1px solid #1a2035",
    borderRadius: 8,
    fontSize: 13,
    color: "#e2e8f0",
    outline: "none",
  };

  const btnPrimary = {
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };

  const btnDanger = {
    background: "transparent",
    color: "#f87171",
    border: "1px solid #f87171",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
  };

  const btnGhost = {
    background: "transparent",
    color: "#718096",
    border: "1px solid #1a2035",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
  };

  return (
    <div style={{
      padding: 24,
      maxWidth: 900,
      margin: "0 auto",
      fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        select:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Key style={{ width: 20, height: 20, color: "#6366f1" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Gestão de Chaves</h1>
              <p style={{ fontSize: 12, color: "#4a5568", margin: 0 }}>Criar, listar e gerir chaves de activação do sistema</p>
            </div>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} style={btnPrimary}>
          <Plus style={{ width: 14, height: 14 }} /> Nova Chave
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle style={{ width: 15, height: 15, color: "#f87171" }} />
          <span style={{ fontSize: 13, color: "#f87171" }}>{error}</span>
        </div>
      )}
      {success && (
        <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Check style={{ width: 15, height: 15, color: "#10b981" }} />
          <span style={{ fontSize: 13, color: "#10b981" }}>{success}</span>
        </div>
      )}

      {/* License Card */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield style={{ width: 18, height: 18, color: "#10b981" }} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", margin: 0 }}>Licença Actual</h3>
            <p style={{ fontSize: 12, color: "#4a5568", margin: 0 }}>Estado da activação do sistema</p>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a2035", borderRadius: 8, padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: "#4a5568", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>Estado</p>
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{getLicenseStatus()}</p>
            </div>
            {license && license.school && (
              <div>
                <p style={{ fontSize: 11, color: "#4a5568", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>Escola</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", margin: 0 }}>{license.school}</p>
              </div>
            )}
            {license && license.tipo && (
              <div>
                <p style={{ fontSize: 11, color: "#4a5568", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>Tipo</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", margin: 0 }}>{license.tipo}</p>
              </div>
            )}
            {license && license.expiresAt && (
              <div>
                <p style={{ fontSize: 11, color: "#4a5568", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>Expira em</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar style={{ width: 14, height: 14, color: "#718096" }} />
                  {formatDate(license.expiresAt)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keys Table */}
      <div style={{ ...cardStyle }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", margin: 0 }}>Chaves de Activação ({keys.length})</h3>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, gap: 10 }}>
            <Loader2 style={{ width: 20, height: 20, color: "#6366f1", animation: "spin 1s linear infinite" }} />
            <span style={{ color: "#718096" }}>A carregar...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : keys.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#4a5568" }}>
            <Key style={{ width: 40, height: 40, color: "#2d3748", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, margin: 0 }}>Nenhuma chave criada</p>
            <p style={{ fontSize: 12, margin: "8px 0 0" }}>Clique em "Nova Chave" para criar a primeira</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1a2035" }}>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#4a5568", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Chave</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#4a5568", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Tipo</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#4a5568", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Escola</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#4a5568", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Estado</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#4a5568", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Criada em</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#4a5568", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Criada por</th>
                  <th style={{ textAlign: "right", padding: "10px 12px", color: "#4a5568", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k.key} style={{ borderBottom: "1px solid #0f1520", transition: "background 0.1s" }}>
                    <td style={{ padding: "12px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#e2e8f0", maxWidth: 280 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ background: "rgba(255,255,255,0.03)", padding: "4px 8px", borderRadius: 6, border: "1px solid #1a2035" }}>{k.key}</span>
                        <button onClick={() => handleCopy(k.key)} title="Copiar" style={{ ...btnGhost, padding: "4px 8px" }}>
                          <Copy style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>{getTypeBadge(k.type)}</td>
                    <td style={{ padding: "12px", color: k.school ? "#e2e8f0" : "#4a5568" }}>{k.school || "—"}</td>
                    <td style={{ padding: "12px" }}>{getStatusBadge(k)}</td>
                    <td style={{ padding: "12px", color: "#718096", whiteSpace: "nowrap" }}>{formatDate(k.createdAt)}</td>
                    <td style={{ padding: "12px", color: "#718096" }}>{k.createdBy}</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {!k.used && (
                          <button onClick={() => handleDeleteKey(k.key)} style={btnDanger} title="Eliminar">
                            <Trash2 style={{ width: 12, height: 12 }} />
                          </button>
                        )}
                        {k.used && (
                          <span style={{ fontSize: 11, color: "#4a5568", display: "flex", alignItems: "center", gap: 4 }}>
                            <X style={{ width: 10, height: 10 }} />
                            Usada em {formatDate(k.usedAt!)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nova Chave */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: "#0d1117", border: "1px solid #1a2035", borderRadius: 16,
            padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: "0 0 8px" }}>Nova Chave de Activação</h2>
            <p style={{ fontSize: 13, color: "#4a5568", margin: "0 0 24px" }}>Preenche os dados para gerar uma nova chave</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#4a5568", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Tipo de Chave</label>
              <select value={newKeyType} onChange={e => setNewKeyType(e.target.value as 'trial' | 'annual')} style={inputStyle}>
                <option value="trial">Trial — 30 dias (FCLEID-X-...)</option>
                <option value="annual">Anual — 1 ano (FCLEID-A-...)</option>
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#4a5568", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Nome da Escola (opcional)</label>
              <input type="text" value={newKeySchool} onChange={e => setNewKeySchool(e.target.value)} placeholder="Ex: Escola Secundária de Maputo" style={inputStyle} />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowModal(false)} style={{ ...btnGhost, padding: "10px 20px" }}>Cancelar</button>
              <button onClick={handleCreateKey} disabled={creating} style={{ ...btnPrimary, opacity: creating ? 0.7 : 1 }}>
                {creating ? (
                  <>
                    <Loader2 style={{ width: 14, height: 14, animation: "spin 0.7s linear infinite" }} />
                    A criar...
                  </>
                ) : (
                  <>
                    <Key style={{ width: 14, height: 14 }} />
                    Criar Chave
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}