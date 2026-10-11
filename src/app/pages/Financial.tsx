import { useState } from "react";
import { paymentsAPI } from "../lib/api";
import { getCurrentUser } from "../lib/auth";
import { downloadCSV, hoje } from "../lib/csv";
import { usePayments, useStudents, useClasses, usePaymentStats } from "../hooks";
import type { Payment } from "../../types/domain";
import {
  DollarSign, Plus, TrendingUp, Clock, CheckCircle2,
  Search, Bus, Settings, X, Edit2, Trash2, FileText, AlertTriangle,
  Eye, BarChart2, Download
} from "lucide-react";
import Balancete from "./Balancete";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const calcMonthsOverdue = (due: string) => {
  const d = new Date(due); const now = new Date();
  if (now <= d) return 0;
  return Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()));
};
const calcFine = (amount: number, months: number, pct: number) => months <= 0 ? 0 : amount * (pct / 100) * months;
const autoDueDate = (month: number, year: number) => `${year}-${String(month).padStart(2, "0")}-05`;
const genReceipt = (id: string) => `REC-${id.replace(/-/g, "").substring(0, 8).toUpperCase()}`;

const generatePDF = (payment: Payment, studentName: string, className: string, finePercent: number, transportFee: number) => {
  const monthsOverdue = payment.status === "overdue" ? calcMonthsOverdue(payment.dueDate) : 0;
  const fine = calcFine(payment.amount, monthsOverdue, finePercent);
  const hasTransport = payment.notes?.includes("transporte escolar");
  const baseAmount = hasTransport ? payment.amount - transportFee : payment.amount;
  const total = payment.amount + fine;
  const receiptNum = genReceipt(payment.id || "0000");
  const paidDate = payment.paidDate ? new Date(payment.paidDate).toLocaleDateString("pt-MZ") : new Date().toLocaleDateString("pt-MZ");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Recibo ${receiptNum}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:white;color:#111}
  .page{width:210mm;min-height:148mm;padding:12mm 14mm}
  .header{text-align:center;border-bottom:3px solid #1e3a8a;padding-bottom:10px;margin-bottom:12px}
  .school-name{font-size:18px;font-weight:900;color:#1e3a8a}.school-sub{font-size:10px;color:#64748b}
  .receipt-title{font-size:14px;font-weight:800;color:#1e3a8a;margin-top:8px;letter-spacing:2px;text-transform:uppercase}
  .copy-label{text-align:center;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:2px;margin-bottom:8px}
  .meta{display:flex;justify-content:space-between;margin-bottom:14px}
  .meta-box{background:#f1f5f9;border-radius:6px;padding:8px 12px;font-size:11px}
  .meta-box strong{display:block;font-size:13px;color:#1e3a8a}
  .status{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${payment.status==="paid"?"#d1fae5":"#fee2e2"};color:${payment.status==="paid"?"#065f46":"#991b1b"}}
  .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:6px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
  .info-item{border-left:3px solid #1e3a8a;padding:6px 10px;background:#f8fafc}
  .info-label{font-size:10px;color:#94a3b8;text-transform:uppercase}.info-value{font-size:13px;font-weight:700;color:#0f172a;margin-top:2px}
  table{width:100%;border-collapse:collapse;margin-bottom:14px}
  th{background:#1e3a8a;color:white;padding:8px 12px;font-size:11px;text-align:left}
  td{padding:7px 12px;font-size:12px;border-bottom:1px solid #e2e8f0}
  .total-row td{background:#f1f5f9;font-weight:800;font-size:14px;color:#1e3a8a}
  .fine-row td{color:#dc2626}
  .footer{display:flex;justify-content:space-between;margin-top:16px;padding-top:12px;border-top:1px dashed #cbd5e1}
  .sign-box{text-align:center}.sign-line{width:140px;border-bottom:1px solid #0f172a;margin:28px auto 4px}
  .sign-label{font-size:10px;color:#64748b}
  .stamp{width:90px;height:70px;border:1px dashed #94a3b8;border-radius:6px;display:flex;align-items:center;justify-content:center}
  .stamp-label{font-size:9px;color:#94a3b8;text-align:center}
  .watermark{text-align:center;margin-top:10px;font-size:10px;color:#cbd5e1}
  .divider{border:none;border-top:2px dashed #94a3b8;margin:4px 14mm}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
  <div class="page"><div class="copy-label">ORIGINAL</div>
  <div class="header"><div class="school-name">INSTITUTO POLITÉCNICO FAICLEID, LDA</div>
  <div class="school-sub">Pré-Escolar · Ensino Primário · Ensino Secundário · Maputo, Moçambique</div>
  <div class="receipt-title">Recibo de Pagamento de Mensalidade</div></div>
  <div class="meta"><div class="meta-box">Nº Recibo: <strong>${receiptNum}</strong></div>
  <div class="meta-box">Emissão: <strong>${new Date().toLocaleDateString("pt-MZ")}</strong></div>
  <div class="meta-box">Estado: <span class="status">${payment.status==="paid"?"✓ PAGO":"PENDENTE"}</span></div></div>
  <div class="section-title">Dados do Aluno</div>
  <div class="info-grid">
  <div class="info-item"><div class="info-label">Nome</div><div class="info-value">${studentName}</div></div>
  <div class="info-item"><div class="info-label">Turma</div><div class="info-value">${className}</div></div>
  <div class="info-item"><div class="info-label">Referência</div><div class="info-value">${MONTHS[payment.month-1]} de ${payment.year}</div></div>
  <div class="info-item"><div class="info-label">Pagamento</div><div class="info-value">${paidDate}</div></div>
  <div class="info-item"><div class="info-label">Método</div><div class="info-value">${payment.paymentMethod||"Não especificado"}</div></div>
  <div class="info-item"><div class="info-label">Vencimento</div><div class="info-value">${new Date(payment.dueDate).toLocaleDateString("pt-MZ")}</div></div>
  </div>
  <table><thead><tr><th>Descrição</th><th style="text-align:right">Valor (MT)</th></tr></thead><tbody>
  <tr><td>Mensalidade — ${MONTHS[payment.month-1]} ${payment.year}</td><td style="text-align:right;font-weight:700">${baseAmount.toLocaleString("pt-MZ")}</td></tr>
  ${hasTransport?`<tr><td>Taxa de Transporte Escolar</td><td style="text-align:right;font-weight:700">${transportFee.toLocaleString("pt-MZ")}</td></tr>`:""}
  ${fine>0?`<tr class="fine-row"><td>Multa por Atraso (${monthsOverdue} mês × ${finePercent}%)</td><td style="text-align:right;font-weight:700">+ ${fine.toLocaleString("pt-MZ")}</td></tr>`:""}
  <tr class="total-row"><td>TOTAL PAGO</td><td style="text-align:right">${total.toLocaleString("pt-MZ")} MT</td></tr>
  </tbody></table>
  <div class="footer">
  <div class="sign-box"><div class="sign-line"></div><div class="sign-label">Responsável pela Cobrança</div></div>
  <div class="sign-box"><div class="sign-line"></div><div class="sign-label">Director(a) / Gestor(a)</div></div>
  <div class="stamp"><div class="stamp-label">Carimbo<br>da Escola</div></div></div>
  <div class="watermark">Documento válido apenas com assinatura e carimbo</div></div>
  <hr class="divider">
  <div class="page" style="padding-top:8mm"><div class="copy-label">DUPLICADO (CÓPIA DO ENCARREGADO)</div>
  <div class="header"><div class="school-name">INSTITUTO POLITÉCNICO FAICLEID, LDA</div>
  <div class="school-sub">Pré-Escolar · Ensino Primário · Ensino Secundário · Maputo, Moçambique</div>
  <div class="receipt-title">Recibo de Pagamento de Mensalidade</div></div>
  <div class="meta"><div class="meta-box">Nº: <strong>${receiptNum}</strong></div>
  <div class="meta-box">Data: <strong>${new Date().toLocaleDateString("pt-MZ")}</strong></div>
  <div class="meta-box">Estado: <span class="status">${payment.status==="paid"?"✓ PAGO":"PENDENTE"}</span></div></div>
  <div class="info-grid">
  <div class="info-item"><div class="info-label">Aluno</div><div class="info-value">${studentName}</div></div>
  <div class="info-item"><div class="info-label">Turma</div><div class="info-value">${className}</div></div>
  <div class="info-item"><div class="info-label">Referência</div><div class="info-value">${MONTHS[payment.month-1]} de ${payment.year}</div></div>
  <div class="info-item"><div class="info-label">Método</div><div class="info-value">${payment.paymentMethod||"—"}</div></div>
  </div>
  <table><thead><tr><th>Descrição</th><th style="text-align:right">Valor (MT)</th></tr></thead><tbody>
  <tr><td>Mensalidade</td><td style="text-align:right;font-weight:700">${baseAmount.toLocaleString("pt-MZ")}</td></tr>
  ${hasTransport?`<tr><td>Transporte</td><td style="text-align:right;font-weight:700">${transportFee.toLocaleString("pt-MZ")}</td></tr>`:""}
  ${fine>0?`<tr class="fine-row"><td>Multa</td><td style="text-align:right;font-weight:700">+${fine.toLocaleString("pt-MZ")}</td></tr>`:""}
  <tr class="total-row"><td>TOTAL</td><td style="text-align:right">${total.toLocaleString("pt-MZ")} MT</td></tr>
  </tbody></table>
  <div class="footer">
  <div class="sign-box"><div class="sign-line"></div><div class="sign-label">Responsável</div></div>
  <div class="stamp"><div class="stamp-label">Carimbo<br>da Escola</div></div></div>
  <div class="watermark">Guarde este recibo como comprovativo de pagamento</div></div>
  </body></html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) { alert("Active os popups para gerar o recibo"); return; }
  win.document.write(html); win.document.close(); win.focus();
  setTimeout(() => win.print(), 500);
};

// ─── STATUS BADGE ────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    paid:    { label: "Pago",     color: "#10b981", bg: "rgba(16,185,129,0.1)" },
    overdue: { label: "Atrasado", color: "#f87171", bg: "rgba(248,113,113,0.1)" },
    pending: { label: "Pendente", color: "#fbbf24", bg: "rgba(251,191,36,0.1)"  },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, display: "inline-block" }} />
      {s.label}
    </span>
  );
};

export default function Financial() {
  const user = getCurrentUser();
  const role = user?.role || "secretaria";
  const canManage = role === "admin";
  // Financeiro — APENAS admin gere, secretaria só visualiza. Director e pedagógico SEM acesso.
  const canView = ["admin", "secretaria"].includes(role);

  const { data: payments = [], isLoading: loading, refetch: refetchPayments } = usePayments();
  const { data: students = [], refetch: refetchStudents } = useStudents();
  const { data: classes = [], refetch: refetchClasses } = useClasses();
  const { data: stats = { totalPending: 0, totalPaid: 0, totalOverdue: 0, monthlyRevenue: 0, alertDueSoon: 0, alertOverdue: 0 }, refetch: refetchStats } = usePaymentStats();
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBalancete, setShowBalancete] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all"|"pending"|"paid"|"overdue">("all");
  const [finePercent, setFinePercent] = useState(() => parseFloat(localStorage.getItem("finePercent") || "5"));
  const [transportFee, setTransportFee] = useState(() => parseFloat(localStorage.getItem("transportFee") || "500"));
  const [settingsFine, setSettingsFine] = useState(finePercent);
  const [settingsTransport, setSettingsTransport] = useState(transportFee);
  const [formData, setFormData] = useState({ studentId: "", month: new Date().getMonth() + 1, year: new Date().getFullYear(), amount: 1000, dueDate: autoDueDate(new Date().getMonth() + 1, new Date().getFullYear()), paidDate: "", status: "pending" as "pending"|"paid"|"overdue", paymentMethod: "", notes: "", hasTransport: false });

  const loadData = async () => {
    await Promise.all([refetchPayments(), refetchStudents(), refetchClasses(), refetchStats()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!canManage) return;
    try {
      const total = formData.amount + (formData.hasTransport ? transportFee : 0);
      const payload = { ...formData, amount: total, dueDate: autoDueDate(formData.month, formData.year), notes: formData.hasTransport ? `${formData.notes ? formData.notes + " | " : ""}Inclui transporte escolar (${transportFee.toLocaleString("pt-MZ")} MT)` : formData.notes };
      if (editingPayment) await paymentsAPI.update(editingPayment.id!, payload);
      else await paymentsAPI.create(payload);
      await loadData(); resetForm();
    } catch { alert("Erro ao guardar"); }
  };

  const handleMarkPaid = async (p: Payment) => {
    if (!canManage) return;
    try { await paymentsAPI.update(p.id!, { status: "paid", paidDate: new Date().toISOString().split("T")[0] }); await loadData(); }
    catch { alert("Erro"); }
  };

  const handleDelete = async (id: string) => {
    if (!canManage || !confirm("Excluir pagamento?")) return;
    try { await paymentsAPI.delete(id); await loadData(); } catch { alert("Erro"); }
  };

  const handleEdit = (p: Payment) => {
    if (!canManage) return;
    setEditingPayment(p);
    setFormData({ studentId: p.studentId, month: p.month, year: p.year, amount: p.amount, dueDate: p.dueDate, paidDate: p.paidDate || "", status: p.status, paymentMethod: p.paymentMethod || "", notes: p.notes || "", hasTransport: p.notes?.includes("transporte escolar") || false });
    setShowForm(true);
  };

  const resetForm = () => {
    const m = new Date().getMonth() + 1; const y = new Date().getFullYear();
    setFormData({ studentId: "", month: m, year: y, amount: 1000, dueDate: autoDueDate(m, y), paidDate: "", status: "pending", paymentMethod: "", notes: "", hasTransport: false });
    setEditingPayment(null); setShowForm(false);
  };

  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || "N/A";
  const getClassName = (sId: string) => { const s = students.find(x => x.id === sId); if (!s) return "N/A"; return classes.find(c => c.id === s.classId)?.name || "N/A"; };

  const filtered = payments.filter(p => {
    const name = getStudentName(p.studentId).toLowerCase();
    return name.includes(searchTerm.toLowerCase()) && (filterStatus === "all" || p.status === filterStatus);
  });

  const totalFines = filtered.filter(p => p.status === "overdue").reduce((acc, p) => acc + calcFine(p.amount, calcMonthsOverdue(p.dueDate), finePercent), 0);

  const handleExport = () => {
    downloadCSV(`financeiro-${hoje()}`, filtered.map(p => {
      const mo = p.status === "overdue" ? calcMonthsOverdue(p.dueDate) : 0;
      const fine = calcFine(p.amount, mo, finePercent);
      return {
        Aluno: getStudentName(p.studentId),
        Turma: getClassName(p.studentId),
        Referência: `${MONTHS[p.month - 1]}/${p.year}`,
        Vencimento: p.dueDate,
        "Mensalidade (MT)": p.amount,
        "Multa (MT)": fine,
        "Total (MT)": p.amount + fine,
        Estado: p.status === "paid" ? "Pago" : p.status === "overdue" ? "Atrasado" : "Pendente",
        "Método": p.paymentMethod || "",
        "Data Pagamento": p.paidDate || "",
      };
    }));
  };

  // Styles
  const S = { fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif" };
  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#111827", border: "1px solid #1a2035", borderRadius: 8, fontSize: 13, color: "#e2e8f0", outline: "none", fontFamily: "inherit" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "#4a5568", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 };

  if (!canView) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", fontFamily: "'IBM Plex Sans', system-ui, sans-serif", color: "#4a5568" }}>
      <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>🔒</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: "#718096" }}>Acesso Restrito</p>
    </div>
  );

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, ...S }}><span style={{ color: "#4a5568" }}>A carregar...</span></div>;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1300, margin: "0 auto", ...S }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Módulo Financeiro</h1>
          <p style={{ color: "#4a5568", marginTop: 4, fontSize: 12 }}>
            Vencimento dia <span style={{ color: "#6366f1", fontWeight: 700 }}>5</span> de cada mês
            &nbsp;·&nbsp; Multa: <span style={{ color: "#f87171", fontWeight: 600 }}>{finePercent}%/mês</span>
            &nbsp;·&nbsp; Transporte: <span style={{ color: "#6366f1", fontWeight: 600 }}>{transportFee.toLocaleString("pt-MZ")} MT</span>
          </p>
          {role !== "admin" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#818cf8", marginTop: 6 }}>
              <Eye style={{ width: 12, height: 12 }} /> Modo visualização
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowBalancete(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(99,102,241,0.08)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <BarChart2 style={{ width: 14, height: 14 }} /> Balancete
          </button>
          <button onClick={handleExport} disabled={!filtered.length} title="Exportar para CSV"
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#111827", color: filtered.length ? "#10b981" : "#4a5568", border: "1px solid #1a2035", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: filtered.length ? "pointer" : "not-allowed" }}>
            <Download style={{ width: 14, height: 14 }} /> Exportar
          </button>
          {canManage && <>
            <button onClick={() => { setSettingsFine(finePercent); setSettingsTransport(transportFee); setShowSettings(true); }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#111827", color: "#718096", border: "1px solid #1a2035", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Settings style={{ width: 14, height: 14 }} /> Configurações
            </button>
            <button onClick={() => setShowForm(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#6366f1", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Plus style={{ width: 14, height: 14 }} /> Nova Mensalidade
            </button>
          </>}
        </div>
      </div>

      {/* ── ALERTAS ── */}
      {stats.alertOverdue > 0 && (
        <div style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle style={{ width: 15, height: 15, color: "#f87171", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#f87171" }}><strong>{stats.alertOverdue}</strong> aluno(s) em atraso após o dia 5 — {stats.totalOverdue.toLocaleString("pt-MZ")} MT</span>
        </div>
      )}
      {stats.alertDueSoon > 0 && (
        <div style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <Clock style={{ width: 15, height: 15, color: "#fbbf24", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#fbbf24" }}><strong>{stats.alertDueSoon}</strong> mensalidade(s) a vencer nos próximos 3 dias</span>
        </div>
      )}

      {/* ── KPI CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Pago", value: stats.totalPaid, color: "#10b981", icon: CheckCircle2 },
          { label: "Pendente", value: stats.totalPending, color: "#fbbf24", icon: Clock },
          { label: "Em Atraso", value: stats.totalOverdue, color: "#f87171", icon: AlertTriangle },
          { label: "Multas", value: totalFines, color: "#f97316", icon: AlertTriangle },
          { label: "Receita Mensal", value: stats.monthlyRevenue, color: "#6366f1", icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 10, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.5 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>{label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0", margin: 0, fontFamily: "'IBM Plex Mono', monospace" }}>{value.toLocaleString("pt-MZ")}</p>
                <p style={{ fontSize: 10, color: "#4a5568", margin: "2px 0 0" }}>MT</p>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon style={{ width: 14, height: 14, color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── FILTROS ── */}
      <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 10, padding: "14px 18px", marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#4a5568" }} />
          <input type="text" placeholder="Pesquisar aluno..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ ...inp, paddingLeft: 32 }} />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["all","paid","pending","overdue"] as const).map(s => {
            const labels = { all: "Todos", paid: "Pagos", pending: "Pendentes", overdue: "Atrasados" };
            const colors = { all: "#6366f1", paid: "#10b981", pending: "#fbbf24", overdue: "#f87171" };
            const active = filterStatus === s;
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${active ? colors[s] + "50" : "#1a2035"}`, background: active ? `${colors[s]}15` : "transparent", color: active ? colors[s] : "#4a5568", transition: "all 0.15s" }}>
                {labels[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TABELA ── */}
      <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a2035" }}>
                {["Aluno", "Turma", "Referência", "Vencimento", "Mensalidade", "Multa", "Total", "Estado", ""].map((h, i) => (
                  <th key={i} style={{ padding: "12px 16px", textAlign: i >= 4 && i <= 6 ? "right" : i === 8 ? "right" : "left", fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap", background: "#0d1117" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 48, textAlign: "center", color: "#4a5568", fontSize: 14 }}>Nenhum pagamento encontrado</td></tr>
              ) : filtered.map((p, _idx) => {
                const mo = p.status === "overdue" ? calcMonthsOverdue(p.dueDate) : 0;
                const fine = calcFine(p.amount, mo, finePercent);
                const total = p.amount + fine;
                const hasTransport = p.notes?.includes("transporte escolar");
                const dueSoon = p.status !== "paid" && (() => { const d = Math.ceil((new Date(p.dueDate).getTime() - Date.now()) / 86400000); return d >= 0 && d <= 3; })();

                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #0f1520", background: dueSoon ? "rgba(251,191,36,0.03)" : undefined, transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#111827"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = dueSoon ? "rgba(251,191,36,0.03)" : ""}>
                    <td style={{ padding: "14px 16px" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", margin: 0 }}>{getStudentName(p.studentId)}</p>
                      {hasTransport && <span style={{ fontSize: 10, color: "#6366f1", display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}><Bus style={{ width: 10, height: 10 }} />Transporte</span>}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: "#718096" }}>{getClassName(p.studentId)}</td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: "#718096", whiteSpace: "nowrap" }}>{MONTHS[p.month-1]} / {p.year}</td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: dueSoon ? "#fbbf24" : "#718096", whiteSpace: "nowrap", fontWeight: dueSoon ? 600 : 400 }}>
                      {new Date(p.dueDate).toLocaleDateString("pt-MZ")}
                      {dueSoon && <span style={{ display: "block", fontSize: 10, color: "#fbbf24" }}>⚠ Vence em breve</span>}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}>{p.amount.toLocaleString("pt-MZ")} MT</td>
                    <td style={{ padding: "14px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {fine > 0 ? <span style={{ fontSize: 12, fontWeight: 600, color: "#f87171", fontFamily: "'IBM Plex Mono', monospace" }}>+{fine.toLocaleString("pt-MZ")} MT<br /><span style={{ fontSize: 10, opacity: 0.7 }}>({mo} mês)</span></span> : <span style={{ color: "#2d3748" }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}>{total.toLocaleString("pt-MZ")} MT</td>
                    <td style={{ padding: "14px 16px" }}><StatusBadge status={p.status} /></td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                        <button onClick={() => generatePDF(p, getStudentName(p.studentId), getClassName(p.studentId), finePercent, transportFee)} title="Recibo"
                          style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", cursor: "pointer", background: "transparent", color: "#4a5568", transition: "all 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#6366f1"; (e.currentTarget as HTMLElement).style.borderColor = "#6366f1"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                          <FileText style={{ width: 13, height: 13 }} />
                        </button>
                        {canManage && <>
                          {p.status !== "paid" && (
                            <button onClick={() => handleMarkPaid(p)} title="Marcar pago"
                              style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", cursor: "pointer", background: "transparent", color: "#4a5568", transition: "all 0.15s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#10b981"; (e.currentTarget as HTMLElement).style.borderColor = "#10b981"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                              <DollarSign style={{ width: 13, height: 13 }} />
                            </button>
                          )}
                          <button onClick={() => handleEdit(p)} title="Editar"
                            style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", cursor: "pointer", background: "transparent", color: "#4a5568", transition: "all 0.15s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#6366f1"; (e.currentTarget as HTMLElement).style.borderColor = "#6366f1"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                            <Edit2 style={{ width: 13, height: 13 }} />
                          </button>
                          <button onClick={() => handleDelete(p.id!)} title="Excluir"
                            style={{ padding: 6, borderRadius: 6, border: "1px solid #1a2035", cursor: "pointer", background: "transparent", color: "#4a5568", transition: "all 0.15s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.borderColor = "#f87171"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"; }}>
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        </>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid #1a2035", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#4a5568" }}>{filtered.length} registos</span>
          <span style={{ fontSize: 11, color: "#4a5568" }}>Total visível: <span style={{ color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{filtered.reduce((acc, p) => acc + p.amount, 0).toLocaleString("pt-MZ")} MT</span></span>
        </div>
      </div>

      {/* ── SETTINGS MODAL ── */}
      {showSettings && canManage && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}>
          <div style={{ background: "#0d1117", borderRadius: 16, border: "1px solid #1a2035", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", width: "100%", maxWidth: 380, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Configurações Financeiras</h2>
              <button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a5568" }}><X style={{ width: 18, height: 18 }} /></button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Multa por mês de atraso (%)</label>
              <input type="number" value={settingsFine} onChange={e => setSettingsFine(parseFloat(e.target.value))} min="0" max="100" step="0.5" style={inp} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Taxa de transporte (MT)</label>
              <input type="number" value={settingsTransport} onChange={e => setSettingsTransport(parseFloat(e.target.value))} min="0" step="50" style={inp} />
            </div>
            <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#818cf8", marginBottom: 20 }}>
              Vencimento fixo: todo dia <strong>5</strong> de cada mês
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setFinePercent(settingsFine); setTransportFee(settingsTransport); localStorage.setItem("finePercent", String(settingsFine)); localStorage.setItem("transportFee", String(settingsTransport)); setShowSettings(false); }}
                style={{ flex: 1, background: "#6366f1", color: "white", border: "none", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Guardar</button>
              <button onClick={() => setShowSettings(false)}
                style={{ flex: 1, background: "#111827", color: "#718096", border: "1px solid #1a2035", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FORM MODAL ── */}
      {showForm && canManage && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}>
          <div style={{ background: "#0d1117", borderRadius: 16, border: "1px solid #1a2035", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{editingPayment ? "Editar Pagamento" : "Nova Mensalidade"}</h2>
                <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a5568" }}><X style={{ width: 18, height: 18 }} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Aluno</label>
                  <select value={formData.studentId} onChange={e => setFormData({ ...formData, studentId: e.target.value })} required style={inp}>
                    <option value="">Selecione um aluno</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Mês</label>
                    <select value={formData.month} onChange={e => { const m = parseInt(e.target.value); setFormData({ ...formData, month: m, dueDate: autoDueDate(m, formData.year) }); }} style={inp}>
                      {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Ano</label>
                    <input type="number" value={formData.year} onChange={e => { const y = parseInt(e.target.value); setFormData({ ...formData, year: y, dueDate: autoDueDate(formData.month, y) }); }} min="2020" max="2035" style={inp} />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Valor da Mensalidade (MT)</label>
                  <input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })} required step="50" min="0" style={inp} />
                </div>
                {/* Transporte toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Bus style={{ width: 15, height: 15, color: "#6366f1" }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#818cf8", margin: 0 }}>Transporte Escolar</p>
                      <p style={{ fontSize: 11, color: "#4a5568", margin: 0 }}>+{transportFee.toLocaleString("pt-MZ")} MT</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFormData({ ...formData, hasTransport: !formData.hasTransport })}
                    style={{ width: 40, height: 22, borderRadius: 99, border: "none", cursor: "pointer", background: formData.hasTransport ? "#6366f1" : "#1a2035", position: "relative", transition: "background 0.2s" }}>
                    <span style={{ position: "absolute", top: 2, left: formData.hasTransport ? 20 : 2, width: 18, height: 18, background: "white", borderRadius: "50%", transition: "left 0.2s" }} />
                  </button>
                </div>
                {/* Resumo */}
                <div style={{ background: "#111827", border: "1px solid #1a2035", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#4a5568", marginBottom: 3 }}>
                    <span>Mensalidade</span><span style={{ fontFamily: "monospace" }}>{formData.amount.toLocaleString("pt-MZ")} MT</span>
                  </div>
                  {formData.hasTransport && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6366f1", marginBottom: 3 }}>
                    <span>Transporte</span><span style={{ fontFamily: "monospace" }}>+{transportFee.toLocaleString("pt-MZ")} MT</span>
                  </div>}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "#e2e8f0", borderTop: "1px solid #1a2035", paddingTop: 8, marginTop: 4 }}>
                    <span>Total</span><span style={{ fontFamily: "monospace" }}>{(formData.amount + (formData.hasTransport ? transportFee : 0)).toLocaleString("pt-MZ")} MT</span>
                  </div>
                  <p style={{ fontSize: 10, color: "#4a5568", margin: "5px 0 0" }}>Vencimento: 05/{String(formData.month).padStart(2,"0")}/{formData.year}</p>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Status</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as Payment['status'] })} style={inp}>
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                    <option value="overdue">Atrasado</option>
                  </select>
                </div>
                {formData.status === "paid" && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={lbl}>Data de Pagamento</label>
                    <input type="date" value={formData.paidDate} onChange={e => setFormData({ ...formData, paidDate: e.target.value })} style={inp} />
                  </div>
                )}
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Método de Pagamento</label>
                  <select value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })} style={inp}>
                    <option value="">Selecione</option>
                    {["Dinheiro","M-Pesa","E-Mola","Transferência Bancária","Depósito Bancário","Cheque"].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={lbl}>Observações</label>
                  <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2}
                    style={{ ...inp, resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" style={{ flex: 1, background: "#6366f1", color: "white", border: "none", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{editingPayment ? "Actualizar" : "Cadastrar"}</button>
                  <button type="button" onClick={resetForm} style={{ flex: 1, background: "#111827", color: "#718096", border: "1px solid #1a2035", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Balancete */}
      {showBalancete && <Balancete onClose={() => setShowBalancete(false)} finePercent={finePercent} transportFee={transportFee} />}
    </div>
  );
}