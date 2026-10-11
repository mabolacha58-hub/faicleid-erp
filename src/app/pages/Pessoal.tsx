import { useState } from "react";
import {
  Users, Plus, X, FileText, Wallet, AlertTriangle,
  CheckCircle2, Clock, Printer, Search, Edit2, Trash2, Save,
  TrendingUp, Building2, UserCheck
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { funcionariosAPI } from "../lib/api";
import { getCurrentUser, canManage } from "../lib/auth";
import { CARGOS_PESSOAL, normalizarCargoPessoal, TIPOS_PESSOAL } from "../lib/pessoal";
import { useFuncionarios, usePagamentosPessoal } from "../hooks";
import type { Funcionario } from "../../types/domain";

// ─── Constantes ───────────────────────────────────────────────
const DIAS_UTEIS = 22;
const INSS_TRABALHADOR = 0.03;
const INSS_ENTIDADE = 0.03;

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

// ─── Utilitários ──────────────────────────────────────────────
function fmt(v: number) {
  return v.toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MT";
}

function apenasDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

function calcFolha(salarioBase: number, subsidios: number, faltas: number) {
  const bruto = salarioBase + subsidios;
  const descFaltas = (salarioBase / DIAS_UTEIS) * faltas;
  const baseInss = salarioBase - descFaltas;
  const inssWorker = baseInss * INSS_TRABALHADOR;
  const inssEnt = baseInss * INSS_ENTIDADE;
  const totalDescontos = descFaltas + inssWorker;
  const liquido = bruto - totalDescontos;
  return { bruto, descFaltas, inssWorker, inssEnt, totalDescontos, liquido, baseInss };
}

// ─── Tipos locais ─────────────────────────────────────────────
interface FolhaState {
  funcionarioId: string;
  nome: string;
  cargo: string;
  salarioBase: number;
  subsidios: number;
  faltas: number;
  banco?: string;
  contaBancaria?: string;
  nuit?: string;
  dataPagamento?: string;
  mes: number;
  ano: number;
  observacoes: string;
}

// ─── Design tokens ────────────────────────────────────────────
const t = {
  bg0:    "#080b11",
  bg1:    "#0d1117",
  bg2:    "#111827",
  bg3:    "#161d2b",
  border: "#1e2739",
  borderHover: "#2a3650",
  text1:  "#f0f4ff",
  text2:  "#8892a4",
  text3:  "#4a5568",
  accent: "#6366f1",
  accentHover: "#5254cc",
  accentMuted: "rgba(99,102,241,0.10)",
  accentBorder: "rgba(99,102,241,0.25)",
  green:  "#10b981",
  greenMuted: "rgba(16,185,129,0.10)",
  greenBorder: "rgba(16,185,129,0.25)",
  red:    "#f87171",
  redMuted: "rgba(248,113,113,0.08)",
  redBorder: "rgba(248,113,113,0.20)",
  amber:  "#f6ad55",
};

// ─── Componente principal ─────────────────────────────────────
export default function Pessoal() {
  const user = getCurrentUser();
  const isAdmin = canManage(user?.role || "secretaria", "pessoal");

const [tab, setTab] = useState<"funcionarios" | "folha" | "historico">("funcionarios");
  const { data: funcionarios = [], isLoading: loading, refetch: refetchFuncs } = useFuncionarios();
  const { data: pagamentos = [], refetch: refetchPags } = usePagamentosPessoal();
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [historicoSearch, setHistoricoSearch] = useState("");
  const [historicoMes, setHistoricoMes] = useState("");
  const [historicoAno, setHistoricoAno] = useState("");

  // Modal funcionário
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Funcionario | null>(null);
  const [formError, setFormError] = useState("");
  const [formFunc, setFormFunc] = useState<Partial<Funcionario>>({
    nome: "", cargo: "", tipo: "administrativo", salario: 0,
    dataContratacao: "", status: "ativo",
  });

  // Folha de salário
  const [folha, setFolha] = useState<FolhaState>({
    funcionarioId: "", nome: "", cargo: "", salarioBase: 0,
    subsidios: 0, faltas: 0, banco: "", contaBancaria: "", nuit: "",
    dataPagamento: "",
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    observacoes: "",
  });
  const [folhaGerada, setFolhaGerada] = useState(false);
  const [savingFolha, setSavingFolha] = useState(false);
  const [folhaError, setFolhaError] = useState("");

  const calc = calcFolha(folha.salarioBase, folha.subsidios, folha.faltas);

  const loadData = async () => {
    await Promise.all([refetchFuncs(), refetchPags()]);
  };

  const selecionarFuncionario = (f: Funcionario) => {
    setFolha(prev => ({
      ...prev,
      funcionarioId: f.id,
      nome: f.nome,
      cargo: f.cargo,
      salarioBase: f.salario,
      subsidios: 0,
      faltas: 0,
      banco: f.banco || "",
      contaBancaria: f.contaBancaria || "",
      nuit: f.nuit || "",
    }));
    setFolhaGerada(false);
    setFolhaError("");
    setTab("folha");
  };

  const guardarFolha = async () => {
    if (!folha.funcionarioId) { setFolhaError("Selecciona um funcionário"); return; }
    setSavingFolha(true);
    setFolhaError("");
    try {
      const existe = await funcionariosAPI.checkPagamentoExists(
        folha.funcionarioId, folha.mes, folha.ano
      );
      if (existe) {
        setFolhaError(`Já existe folha para ${MESES[folha.mes - 1]} ${folha.ano}`);
        setSavingFolha(false);
        return;
      }
      const paymentDate = new Date().toISOString().split("T")[0];
      await funcionariosAPI.processarPagamento({
        funcionarioId: folha.funcionarioId,
        mes: folha.mes,
        ano: folha.ano,
        salarioBase: folha.salarioBase,
        subsidios: folha.subsidios,
        descontos: calc.totalDescontos,
        valorPago: calc.liquido,
        dataPagamento: paymentDate,
        observacoes: `Faltas: ${folha.faltas} | INSS trabalhador: ${fmt(calc.inssWorker)} | ${folha.observacoes}`,
      });
      await loadData();
      setFolha(prev => ({ ...prev, dataPagamento: new Date(paymentDate).toLocaleDateString("pt-MZ") }));
      setFolhaGerada(true);
    } catch (e) {
      setFolhaError(e instanceof Error ? e.message : "Erro ao guardar folha");
    } finally {
      setSavingFolha(false);
    }
  };

  const guardarFuncionario = async () => {
    const nome = (formFunc.nome || "").trim();
    const cargo = normalizarCargoPessoal(formFunc.cargo || "");
    const salario = Number(formFunc.salario || 0);
    const dataContratacao = (formFunc.dataContratacao || "").trim();
    const nuit = apenasDigitos(formFunc.nuit || "");
    const banco = (formFunc.banco || "").trim();
    const contaBancaria = (formFunc.contaBancaria || "").trim();

    if (!nome) { setFormError("Informe o nome completo."); return; }
    if (!cargo) { setFormError("Informe o cargo."); return; }
    if (salario <= 0) { setFormError("O salário base deve ser maior que zero."); return; }
    if (!dataContratacao) { setFormError("Informe a data de contratação."); return; }
    if (nuit && nuit.length !== 9) { setFormError("O NUIT deve ter 9 dígitos."); return; }
    if (contaBancaria && contaBancaria.length < 6) { setFormError("A conta bancária parece incompleta."); return; }

    const payload = {
      ...formFunc,
      nome,
      cargo,
      salario,
      dataContratacao,
      nuit,
      banco,
      contaBancaria,
    };
    setFormError("");
    try {
      if (editando) {
        await funcionariosAPI.update(editando.id, payload);
      } else {
        await funcionariosAPI.create(payload as Omit<Funcionario, "id" | "createdAt">);
      }
      await loadData();
      setShowModal(false);
      setEditando(null);
      setFormError("");
      setFormFunc({ nome: "", cargo: "", tipo: "administrativo", salario: 0, dataContratacao: "", status: "ativo" });
} catch (e) {
      setFormError(e instanceof Error ? e.message : "Erro ao guardar");
    }
  };

  const abrirEditar = (f: Funcionario) => {
    setEditando(f);
    setFormError("");
    setFormFunc({ ...f });
    setShowModal(true);
  };

  const actualizarStatusFuncionario = async (f: Funcionario, status: "ativo" | "inativo") => {
    const acao = status === "ativo" ? "Reativar" : "Inativar";
    if (!confirm(`${acao} ${f.nome}? O histórico salarial será mantido.`)) return;
    await funcionariosAPI.update(f.id, { status });
    await loadData();
  };

  const funcionariosFiltrados = funcionarios.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = f.nome.toLowerCase().includes(q) || f.cargo.toLowerCase().includes(q);
    const matchTipo = filterTipo ? f.tipo === filterTipo : true;
    const matchStatus = filterStatus ? f.status === filterStatus : true;
    return matchSearch && matchTipo && matchStatus;
  });

  // Métricas resumo
  const ativos = funcionarios.filter(f => f.status === "ativo");
  const massaSalarial = ativos.reduce((s, f) => s + f.salario, 0);
  const inssEntidade = ativos.reduce((s, f) => s + f.salario * INSS_ENTIDADE, 0);
  const folhasEsteMes = pagamentos.filter(p => {
    const now = new Date();
    return p.mes === now.getMonth() + 1 && p.ano === now.getFullYear();
  }).length;

  const pagamentosFiltrados = pagamentos.filter(p => {
    const q = historicoSearch.toLowerCase().trim();
    const nome = (p.funcionarioNome || "").toLowerCase();
    const matchSearch = q ? nome.includes(q) : true;
    const matchMes = historicoMes ? p.mes === Number(historicoMes) : true;
    const matchAno = historicoAno ? p.ano === Number(historicoAno) : true;
    return matchSearch && matchMes && matchAno;
  });

  const resumoHistorico = pagamentosFiltrados.reduce((acc, p) => {
    acc.quantidade += 1;
    acc.bruto += p.salarioBase + p.subsidios;
    acc.descontos += p.descontos;
    acc.liquido += p.valorPago;
    return acc;
  }, { quantidade: 0, bruto: 0, descontos: 0, liquido: 0 });

  // ── Recibo impresso ──
  const imprimirFolha = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const ref = `${folha.nome.split(" ").map(p => p[0]).join("").toUpperCase().slice(0,3)}-${folha.ano}-${String(folha.mes).padStart(2,"0")}`;
    w.document.write(`<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<title>Recibo de Salário · ${folha.nome} · ${MESES[folha.mes-1]} ${folha.ano}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',sans-serif;background:#fff;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{max-width:740px;margin:0 auto;padding:40px 48px 48px}

  /* ── Header ── */
  .doc-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #e5e7eb}
  .doc-eyebrow{font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;margin-bottom:10px}
  .brand{font-size:17px;font-weight:600;color:#111;margin-bottom:5px}
  .brand-sub{font-size:12px;color:#6b7280;line-height:1.75}
  .doc-meta{text-align:right}
  .meta-row{margin-bottom:5px}
  .meta-label{font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;display:block;margin-bottom:1px}
  .meta-val{font-size:13px;font-weight:500;color:#111}
  .chip{display:inline-block;background:#d1fae5;color:#065f46;font-size:10px;font-weight:600;padding:3px 10px;border-radius:20px;letter-spacing:0.04em;margin-top:8px}
  .chip-pending{background:#fef9c3;color:#713f12}

  /* ── Sections ── */
  .section{margin-bottom:24px}
  .section-title{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;padding-bottom:8px;border-bottom:1px solid #f3f4f6;margin-bottom:14px}

  /* ── Employee info grid ── */
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .info-card{background:#f8fafc;border-radius:8px;padding:11px 14px;border:1px solid #f1f5f9}
  .info-label{font-size:10px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:#94a3b8;margin-bottom:4px}
  .info-val{font-size:13px;font-weight:500;color:#111;line-height:1.4}

  /* ── Tables ── */
  .pay-table{width:100%;border-collapse:collapse}
  .pay-table thead tr{border-bottom:1px solid #e5e7eb}
  .pay-table th{font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;padding:0 0 8px;text-align:left}
  .pay-table th.r,.pay-table td.r{text-align:right}
  .pay-table td{padding:9px 0;font-size:13px;color:#374151;border-bottom:1px solid #f8fafc}
  .pay-table tr:last-child td{border:none}
  .pay-table .subtotal td{font-weight:600;color:#111;padding-top:13px;border-top:1px solid #e5e7eb;border-bottom:none}
  .neg{color:#dc2626}

  /* ── Net bar ── */
  .net-bar{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
  .net-label{font-size:13px;font-weight:600;color:#166534}
  .net-val{font-size:22px;font-weight:600;color:#166534;font-family:'DM Mono',monospace;letter-spacing:-0.02em}

  /* ── INSS note ── */
  .inss-note{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:11px 16px;display:flex;justify-content:space-between;font-size:11px;color:#5b21b6;font-weight:500}

  /* ── Obs ── */
  .obs{background:#f8fafc;border:1px solid #f1f5f9;border-radius:8px;padding:12px 14px;font-size:12px;color:#475569;line-height:1.6}

  /* ── Signatures ── */
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:36px;padding-top:0}
  .sig-block{text-align:center}
  .sig-space{height:52px;border-bottom:1px solid #d1d5db;margin-bottom:9px}
  .sig-name{font-size:12px;font-weight:600;color:#374151;margin-bottom:2px}
  .sig-role{font-size:11px;color:#9ca3af}

  /* ── Footer ── */
  .doc-footer{display:flex;justify-content:space-between;align-items:center;margin-top:32px;padding-top:16px;border-top:1px solid #f3f4f6}
  .footer-txt{font-size:10px;color:#9ca3af;letter-spacing:0.03em}

  @media print{
    body{background:#fff}
    .page{padding:30px 36px 40px}
  }
</style>
</head>
<body>
<div class="page">

  <div class="doc-header">
    <div>
      <div class="doc-eyebrow">Recibo de Salário</div>
      <div class="brand">Instituto Politécnico FaiCleid, Lda.</div>
      <div class="brand-sub">
        Av. Central, Bairro da Subestação, Nampula<br>
        NUIT: 123456789 &nbsp;·&nbsp; (+258) 84 000 0000
      </div>
    </div>
    <div class="doc-meta">
      <div class="meta-row">
        <span class="meta-label">Período</span>
        <span class="meta-val">${MESES[folha.mes-1]} ${folha.ano}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Emissão</span>
        <span class="meta-val">${new Date().toLocaleDateString("pt-MZ")}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Data de pagamento</span>
        <span class="meta-val">${folha.dataPagamento || new Date().toLocaleDateString("pt-MZ")}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Referência</span>
        <span class="meta-val" style="font-family:'DM Mono',monospace;font-size:12px">${ref}</span>
      </div>
      <span class="${folhaGerada ? "chip" : "chip chip-pending"}">${folhaGerada ? "Processado" : "Preliminar"}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Identificação do funcionário</div>
    <div class="info-grid">
      <div class="info-card"><div class="info-label">Nome completo</div><div class="info-val">${folha.nome}</div></div>
      <div class="info-card"><div class="info-label">Cargo</div><div class="info-val">${folha.cargo}</div></div>
      <div class="info-card"><div class="info-label">NUIT</div><div class="info-val" style="font-family:'DM Mono',monospace;font-size:12px">${folha.nuit || "—"}</div></div>
      <div class="info-card"><div class="info-label">Banco / Conta</div><div class="info-val" style="font-family:'DM Mono',monospace;font-size:12px">${folha.banco || "—"} &nbsp;·&nbsp; ${folha.contaBancaria || "—"}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Remuneração</div>
    <table class="pay-table">
      <thead><tr><th>Descrição</th><th class="r">Valor</th></tr></thead>
      <tbody>
        <tr><td>Salário base</td><td class="r">${fmt(folha.salarioBase)}</td></tr>
        ${folha.subsidios > 0 ? `<tr><td>Subsídios</td><td class="r">${fmt(folha.subsidios)}</td></tr>` : ""}
        <tr class="subtotal"><td>Total bruto</td><td class="r">${fmt(calc.bruto)}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Descontos</div>
    <table class="pay-table">
      <thead><tr><th>Descrição</th><th class="r">Valor</th></tr></thead>
      <tbody>
        <tr>
          <td>Faltas injustificadas (${folha.faltas} dia${folha.faltas !== 1 ? "s" : ""} × ${fmt(folha.salarioBase / DIAS_UTEIS)}/dia)</td>
          <td class="r neg">- ${fmt(calc.descFaltas)}</td>
        </tr>
        <tr>
          <td>INSS — trabalhador (3% s/ salário base líquido de faltas)</td>
          <td class="r neg">- ${fmt(calc.inssWorker)}</td>
        </tr>
        <tr class="subtotal"><td>Total de descontos</td><td class="r neg">- ${fmt(calc.totalDescontos)}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="net-bar">
    <span class="net-label">Salário líquido a receber</span>
    <span class="net-val">${fmt(calc.liquido)}</span>
  </div>

  <div class="inss-note">
    <span>Contribuição da entidade — INSS 3%: <strong>${fmt(calc.inssEnt)}</strong></span>
    <span>Total declarado ao INSS: <strong>${fmt(calc.inssWorker + calc.inssEnt)}</strong></span>
  </div>

  ${folha.observacoes ? `
  <div class="section" style="margin-top:16px">
    <div class="section-title">Observações</div>
    <div class="obs">${folha.observacoes}</div>
  </div>` : ""}

  <div class="sig-grid">
    <div class="sig-block">
      <div class="sig-space"></div>
      <div class="sig-name">${folha.nome}</div>
      <div class="sig-role">Funcionário</div>
    </div>
    <div class="sig-block">
      <div class="sig-space"></div>
      <div class="sig-name">Direcção Geral</div>
      <div class="sig-role">Instituto Politécnico FaiCleid</div>
    </div>
  </div>

  <div class="doc-footer">
    <span class="footer-txt">Gerado por FaiCleid ERP &nbsp;·&nbsp; ${new Date().toLocaleString("pt-MZ")}</span>
    <span class="footer-txt">Ref. ${ref} &nbsp;·&nbsp; Página 1 de 1</span>
  </div>

</div>
<script>window.onload=()=>window.print();</script>
</body>
</html>`);
    w.document.close();
  };

  // ─── Estilos inline ───────────────────────────────────────
  const cs = {
    page: {
      padding: "28px 32px",
      maxWidth: 1120,
      margin: "0 auto",
      background: t.bg0,
      minHeight: "100vh",
    } as React.CSSProperties,

    card: {
      background: t.bg1,
      border: `1px solid ${t.border}`,
      borderRadius: 12,
      padding: "18px 22px",
      marginBottom: 14,
    } as React.CSSProperties,

    cardFlush: {
      background: t.bg1,
      border: `1px solid ${t.border}`,
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: 14,
    } as React.CSSProperties,

    input: {
      width: "100%",
      padding: "8px 12px",
      background: t.bg2,
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      color: t.text1,
      fontSize: 13,
      fontFamily: "inherit",
      outline: "none",
      height: 36,
    } as React.CSSProperties,

    label: {
      display: "block",
      fontSize: 11,
      fontWeight: 600,
      color: t.text3,
      marginBottom: 5,
      textTransform: "uppercase" as const,
      letterSpacing: "0.06em",
    },

    sectionTitle: {
      fontSize: 11,
      fontWeight: 600,
      color: t.text3,
      textTransform: "uppercase" as const,
      letterSpacing: "0.07em",
      marginBottom: 12,
    },

    divider: {
      height: 1,
      background: t.border,
      margin: "12px 0",
    } as React.CSSProperties,

    row: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "7px 0",
      borderBottom: `1px solid ${t.border}`,
      fontSize: 13,
    } as React.CSSProperties,

    btn: {
      padding: "7px 14px",
      borderRadius: 8,
      border: `1px solid ${t.border}`,
      background: "transparent",
      color: t.text2,
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "inherit",
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
    } as React.CSSProperties,

    btnPrimary: {
      padding: "8px 16px",
      borderRadius: 8,
      border: "none",
      background: t.accent,
      color: "#fff",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: "inherit",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
    } as React.CSSProperties,

    btnDanger: {
      padding: "6px 10px",
      borderRadius: 8,
      border: `1px solid ${t.border}`,
      background: "transparent",
      color: t.red,
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "inherit",
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
    } as React.CSSProperties,

    metric: {
      background: t.bg2,
      borderRadius: 10,
      padding: "14px 16px",
      border: `1px solid ${t.border}`,
      flex: 1,
    } as React.CSSProperties,
  };

  const Tab = ({ id, label, icon: Icon }: { id: typeof tab; label: string; icon: LucideIcon }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: "9px 18px",
        background: "none",
        border: "none",
        borderBottom: tab === id ? `2px solid ${t.accent}` : "2px solid transparent",
        color: tab === id ? t.text1 : t.text3,
        fontSize: 13,
        fontWeight: tab === id ? 600 : 400,
        cursor: "pointer",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: -1,
        transition: "color 0.15s",
      }}
    >
      <Icon style={{ width: 13, height: 13 }} />{label}
    </button>
  );

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", background: t.bg0 }}>
      <div style={{ width: 26, height: 26, border: `2px solid ${t.border}`, borderTopColor: t.accent, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={cs.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus { border-color: ${t.accent} !important; }
        .tr-hover:hover { background: rgba(255,255,255,0.025) !important; }
        .btn-hover:hover { background: ${t.bg2} !important; border-color: ${t.borderHover} !important; }
      `}</style>

      {/* ── Topo ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.text1, margin: 0, letterSpacing: "-0.02em" }}>
            Gestão de Pessoal
          </h1>
          <p style={{ fontSize: 13, color: t.text3, margin: "4px 0 0" }}>
            {funcionarios.length} funcionário{funcionarios.length !== 1 ? "s" : ""} registado{funcionarios.length !== 1 ? "s" : ""} · {ativos.length} activo{ativos.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin && (
          <button
            style={cs.btnPrimary}
            onClick={() => {
              setEditando(null);
              setFormError("");
              setFormFunc({ nome: "", cargo: "", tipo: "administrativo", salario: 0, dataContratacao: "", status: "ativo" });
              setShowModal(true);
            }}
          >
            <Plus style={{ width: 13, height: 13 }} /> Novo Funcionário
          </button>
        )}
      </div>

      {/* ── Métricas ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
        {[
          { label: "Funcionários activos", value: ativos.length.toString(), icon: UserCheck, color: t.text1 },
          { label: "Massa salarial", value: fmt(massaSalarial), icon: Wallet, color: t.accent },
          { label: "INSS entidade (3%)", value: fmt(inssEntidade), icon: Building2, color: t.text2 },
          { label: "Folhas este mês", value: `${folhasEsteMes} / ${ativos.length}`, icon: TrendingUp, color: folhasEsteMes === ativos.length ? t.green : t.amber },
        ].map(m => (
          <div key={m.label} style={cs.metric}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <m.icon style={{ width: 13, height: 13, color: t.text3 }} />
              <span style={{ fontSize: 11, color: t.text3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.label}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: m.color, fontFamily: "monospace", letterSpacing: "-0.01em" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: `1px solid ${t.border}`, marginBottom: 20 }}>
        <Tab id="funcionarios" label="Funcionários" icon={Users} />
        <Tab id="folha" label="Folha de Salário" icon={FileText} />
        <Tab id="historico" label="Histórico" icon={Clock} />
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB: FUNCIONÁRIOS
      ══════════════════════════════════════════════════════ */}
      {tab === "funcionarios" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: t.text3 }} />
              <input style={{ ...cs.input, paddingLeft: 32 }} placeholder="Pesquisar por nome ou cargo..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select style={{ ...cs.input, width: 160 }} value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
              <option value="">Todos os tipos</option>
              {Object.entries(TIPOS_PESSOAL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select style={{ ...cs.input, width: 150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos os estados</option>
              <option value="ativo">Activos</option>
              <option value="inativo">Inactivos</option>
            </select>
          </div>

          <div style={cs.cardFlush}>
            {funcionariosFiltrados.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: t.text3 }}>
                <Users style={{ width: 28, height: 28, margin: "0 auto 8px", opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: 13 }}>Nenhum funcionário encontrado</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                    {["Funcionário", "Tipo", "Salário base", "INSS (3%)", "Líquido est.", "Status", ""].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {funcionariosFiltrados.map(f => {
                    const c = calcFolha(f.salario, 0, 0);
                    const ativo = f.status === "ativo";
                    return (
                      <tr key={f.id} className="tr-hover" style={{ borderBottom: `1px solid ${t.border}`, opacity: ativo ? 1 : 0.45 }}>
                        <td style={{ padding: "13px 14px" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: t.text1 }}>{f.nome}</div>
                          <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{f.cargo}</div>
                        </td>
                        <td style={{ padding: "13px 14px" }}>
                          <span style={{
                            background: f.tipo === "professor" ? t.accentMuted : t.bg2,
                            color: f.tipo === "professor" ? "#818cf8" : t.text2,
                            borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600,
                          }}>
                            {TIPOS_PESSOAL[f.tipo] || f.tipo}
                          </span>
                        </td>
                        <td style={{ padding: "13px 14px", fontSize: 13, color: t.text1, fontFamily: "monospace" }}>{fmt(f.salario)}</td>
                        <td style={{ padding: "13px 14px", fontSize: 12, color: t.text2, fontFamily: "monospace" }}>- {fmt(c.inssWorker)}</td>
                        <td style={{ padding: "13px 14px", fontSize: 13, color: t.green, fontWeight: 600, fontFamily: "monospace" }}>{fmt(c.liquido)}</td>
                        <td style={{ padding: "13px 14px" }}>
                          <span style={{
                            background: ativo ? t.greenMuted : t.bg2,
                            color: ativo ? t.green : t.text3,
                            borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600,
                          }}>
                            {ativo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td style={{ padding: "13px 14px" }}>
                          <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                            <button className="btn-hover" style={{ ...cs.btn, fontSize: 11 }} onClick={() => selecionarFuncionario(f)}>
                              <FileText style={{ width: 12, height: 12 }} /> Folha
                            </button>
                            {isAdmin && <>
                              <button className="btn-hover" style={{ ...cs.btn, padding: "6px 8px" }} onClick={() => abrirEditar(f)}>
                                <Edit2 style={{ width: 12, height: 12 }} />
                              </button>
                              {ativo ? (
                                <button
                                  className="btn-hover"
                                  style={cs.btnDanger}
                                  onClick={() => actualizarStatusFuncionario(f, "inativo")}
                                  title="Inativar funcionário"
                                >
                                  <Trash2 style={{ width: 12, height: 12 }} />
                                </button>
                              ) : (
                                <button
                                  className="btn-hover"
                                  style={{
                                    ...cs.btn,
                                    padding: "6px 8px",
                                    color: t.green,
                                    border: `1px solid ${t.greenBorder}`,
                                    background: t.greenMuted,
                                  }}
                                  onClick={() => actualizarStatusFuncionario(f, "ativo")}
                                  title="Reativar funcionário"
                                >
                                  <UserCheck style={{ width: 12, height: 12 }} />
                                </button>
                              )}
                            </>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: FOLHA DE SALÁRIO
      ══════════════════════════════════════════════════════ */}
      {tab === "folha" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 14, alignItems: "start" }}>
          {/* ── Formulário ── */}
          <div>
            {/* Funcionário + período */}
            <div style={cs.card}>
              <p style={cs.sectionTitle}>Funcionário e período</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={cs.label}>Funcionário</label>
                  <select style={cs.input} value={folha.funcionarioId} onChange={e => {
                    const f = funcionarios.find(x => x.id === e.target.value);
                    if (f) setFolha(prev => ({
                      ...prev,
                      funcionarioId: f.id, nome: f.nome, cargo: f.cargo, salarioBase: f.salario,
                      banco: f.banco || "", contaBancaria: f.contaBancaria || "", nuit: f.nuit || "",
                    }));
                  }}>
                    <option value="">— Seleccionar —</option>
                    {funcionarios.filter(f => f.status === "ativo").map(f => (
                      <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={cs.label}>Período</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <select style={{ ...cs.input, flex: 2 }} value={folha.mes} onChange={e => setFolha(p => ({ ...p, mes: +e.target.value }))}>
                      {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <input type="number" style={{ ...cs.input, flex: 1 }} value={folha.ano} onChange={e => setFolha(p => ({ ...p, ano: +e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            {/* Remuneração */}
            <div style={cs.card}>
              <p style={cs.sectionTitle}>Remuneração</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={cs.label}>Salário base (MT)</label>
                  <input type="number" style={cs.input} value={folha.salarioBase} onChange={e => setFolha(p => ({ ...p, salarioBase: +e.target.value }))} min={0} />
                </div>
                <div>
                  <label style={cs.label}>Subsídios (MT)</label>
                  <input type="number" style={cs.input} value={folha.subsidios} onChange={e => setFolha(p => ({ ...p, subsidios: +e.target.value }))} min={0} />
                </div>
              </div>
            </div>

            {/* Faltas */}
            <div style={cs.card}>
              <p style={cs.sectionTitle}>Faltas injustificadas</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={cs.label}>Número de faltas</label>
                  <input type="number" style={cs.input} value={folha.faltas}
                    onChange={e => setFolha(p => ({ ...p, faltas: Math.max(0, Math.min(+e.target.value, DIAS_UTEIS)) }))}
                    min={0} max={DIAS_UTEIS} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#818cf8", width: "100%" }}>
                    <div style={{ marginBottom: 4, color: t.text3 }}>Valor por dia</div>
                    <strong>{fmt(folha.salarioBase / DIAS_UTEIS)}</strong>
                    <div style={{ marginTop: 5, color: t.red }}>Desconto total: <strong>- {fmt(calc.descFaltas)}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div style={cs.card}>
              <label style={cs.label}>Observações (opcional)</label>
              <textarea
                style={{ ...cs.input, height: 72, resize: "vertical" as const, paddingTop: 8 }}
                value={folha.observacoes}
                onChange={e => setFolha(p => ({ ...p, observacoes: e.target.value }))}
                placeholder="Notas adicionais..."
              />
            </div>
          </div>

          {/* ── Painel direito ── */}
          <div style={{ position: "sticky", top: 80 }}>
            <div style={cs.card}>
              <p style={cs.sectionTitle}>Resumo da folha</p>

              {/* Métricas rápidas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[
                  { label: "Bruto", value: fmt(calc.bruto), color: t.text1 },
                  { label: "Desc. faltas", value: "- " + fmt(calc.descFaltas), color: t.red },
                  { label: "INSS (3%)", value: "- " + fmt(calc.inssWorker), color: t.red },
                  { label: "Líquido", value: fmt(calc.liquido), color: t.green },
                ].map(m => (
                  <div key={m.label} style={{ background: t.bg2, borderRadius: 8, padding: "10px 12px", border: `1px solid ${t.border}` }}>
                    <div style={{ fontSize: 10, color: t.text3, marginBottom: 3, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{m.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: m.color, fontFamily: "monospace" }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Detalhe */}
              <div>
                {[
                  { label: "Salário base", value: fmt(folha.salarioBase), color: t.text2 },
                  { label: "Subsídios", value: fmt(folha.subsidios), color: t.text2 },
                  { label: "Total bruto", value: fmt(calc.bruto), color: t.text1, bold: true },
                  { label: `Faltas (${folha.faltas}d)`, value: "- " + fmt(calc.descFaltas), color: t.red },
                  { label: "INSS trabalhador (3%)", value: "- " + fmt(calc.inssWorker), color: t.red },
                ].map(r => (
                  <div key={r.label} style={{ ...cs.row, color: r.color, fontWeight: r.bold ? 600 : 400 }}>
                    <span>{r.label}</span><span style={{ fontFamily: "monospace" }}>{r.value}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 0", borderTop: `1px solid ${t.border}`, marginTop: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: t.text1 }}>Líquido a pagar</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: t.green, fontFamily: "monospace" }}>{fmt(calc.liquido)}</span>
                </div>
              </div>

              {/* INSS entidade */}
              <div style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}`, borderRadius: 8, padding: "10px 12px", margin: "14px 0", fontSize: 12, color: "#818cf8" }}>
                <div style={{ marginBottom: 3 }}>INSS entidade (3%): <strong>{fmt(calc.inssEnt)}</strong></div>
                <div style={{ color: t.text3, fontSize: 11 }}>Total declarado ao Estado: {fmt(calc.inssWorker + calc.inssEnt)}</div>
              </div>

              {/* Info funcionário */}
              <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: t.text3, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>Funcionário</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.text1 }}>{folha.nome || "—"}</div>
                    <div style={{ fontSize: 12, color: t.text3 }}>{folha.cargo || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: t.text3, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>Identificação</div>
                    <div style={{ fontSize: 12, color: t.text2 }}>NUIT: {folha.nuit || "—"}</div>
                    <div style={{ fontSize: 12, color: t.text2 }}>Banco: {folha.banco || "—"}</div>
                    <div style={{ fontSize: 12, color: t.text2 }}>Conta: {folha.contaBancaria || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Alertas */}
              {folhaError && (
                <div style={{ display: "flex", gap: 7, background: t.redMuted, border: `1px solid ${t.redBorder}`, borderRadius: 8, padding: "9px 12px", marginBottom: 10, fontSize: 12, color: t.red }}>
                  <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0, marginTop: 1 }} />{folhaError}
                </div>
              )}
              {folhaGerada && (
                <div style={{ display: "flex", gap: 7, background: t.greenMuted, border: `1px solid ${t.greenBorder}`, borderRadius: 8, padding: "9px 12px", marginBottom: 10, fontSize: 12, color: t.green }}>
                  <CheckCircle2 style={{ width: 13, height: 13, flexShrink: 0, marginTop: 1 }} />Folha guardada com sucesso!
                </div>
              )}

              {/* Botões */}
              <div style={{ display: "flex", gap: 8 }}>
                {!folhaGerada ? (
                  <button
                    style={{ ...cs.btnPrimary, flex: 1, justifyContent: "center", opacity: (!folha.funcionarioId || savingFolha) ? 0.5 : 1 }}
                    onClick={guardarFolha}
                    disabled={savingFolha || !folha.funcionarioId}
                  >
                    {savingFolha
                      ? <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      : <Save style={{ width: 13, height: 13 }} />
                    }
                    {savingFolha ? "A guardar..." : "Guardar folha"}
                  </button>
                ) : (
                  <button style={{ ...cs.btnPrimary, flex: 1, justifyContent: "center" }} onClick={imprimirFolha}>
                    <Printer style={{ width: 13, height: 13 }} /> Imprimir / PDF
                  </button>
                )}
                <button className="btn-hover" style={cs.btn} onClick={imprimirFolha} title="Pré-visualizar recibo">
                  <Printer style={{ width: 13, height: 13 }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: HISTÓRICO
      ══════════════════════════════════════════════════════ */}
      {tab === "historico" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: t.text3 }} />
              <input
                style={{ ...cs.input, paddingLeft: 32 }}
                placeholder="Pesquisar por funcionário..."
                value={historicoSearch}
                onChange={e => setHistoricoSearch(e.target.value)}
              />
            </div>
            <select style={{ ...cs.input, width: 160 }} value={historicoMes} onChange={e => setHistoricoMes(e.target.value)}>
              <option value="">Todos os meses</option>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <input
              type="number"
              style={{ ...cs.input, width: 130 }}
              placeholder="Ano"
              value={historicoAno}
              onChange={e => setHistoricoAno(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Folhas encontradas", value: resumoHistorico.quantidade.toString(), color: t.text1 },
              { label: "Total bruto", value: fmt(resumoHistorico.bruto), color: t.text1 },
              { label: "Total descontos", value: fmt(resumoHistorico.descontos), color: t.red },
              { label: "Total líquido", value: fmt(resumoHistorico.liquido), color: t.green },
            ].map(item => (
              <div key={item.label} style={cs.metric}>
                <div style={{ fontSize: 11, color: t.text3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: item.color, fontFamily: "monospace", letterSpacing: "-0.01em" }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div style={cs.cardFlush}>
          {pagamentosFiltrados.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: t.text3 }}>
              <Clock style={{ width: 28, height: 28, margin: "0 auto 8px", opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: 13 }}>
                {pagamentos.length === 0 ? "Nenhuma folha processada ainda" : "Nenhum registo encontrado para os filtros aplicados"}
              </p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                  {["Funcionário", "Período", "Bruto", "Descontos", "Líquido", "Status"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagamentosFiltrados.map(p => (
                  <tr key={p.id} className="tr-hover" style={{ borderBottom: `1px solid ${t.border}` }}>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: t.text1 }}>{p.funcionarioNome || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: t.text2 }}>{MESES[p.mes - 1]} {p.ano}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: t.text1, fontFamily: "monospace" }}>{fmt(p.salarioBase + p.subsidios)}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: t.red, fontFamily: "monospace" }}>- {fmt(p.descontos)}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: t.green, fontWeight: 600, fontFamily: "monospace" }}>{fmt(p.valorPago)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{
                        background: p.status === "pago" ? t.greenMuted : "rgba(246,173,85,0.1)",
                        color: p.status === "pago" ? t.green : t.amber,
                        borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600,
                      }}>
                        {p.status === "pago" ? "Pago" : "Pendente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL: FUNCIONÁRIO
      ══════════════════════════════════════════════════════ */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(2px)" }}>
          <div style={{ background: t.bg1, border: `1px solid ${t.border}`, borderRadius: 16, padding: "26px 30px", width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: t.text1, margin: 0 }}>
                {editando ? "Editar Funcionário" : "Novo Funcionário"}
              </h2>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", color: t.text3, display: "flex" }}
                onClick={() => setShowModal(false)}
              >
                <X style={{ width: 17, height: 17 }} />
              </button>
            </div>

            <div style={{ display: "grid", gap: 13 }}>
              {([
                { label: "Nome completo", key: "nome", type: "text", placeholder: "Ex: João Mahumane" },
                { label: "Cargo", key: "cargo", type: "text", placeholder: "Ex: Auxiliar administrativo" },
                { label: "Salário base (MT)", key: "salario", type: "number", placeholder: "0" },
                { label: "Data de contratação", key: "dataContratacao", type: "date", placeholder: "" },
                { label: "NUIT", key: "nuit", type: "text", placeholder: "Ex: 400123456789" },
                { label: "Banco", key: "banco", type: "text", placeholder: "Ex: BCI, Millennium, BIM" },
                { label: "Conta bancária", key: "contaBancaria", type: "text", placeholder: "Ex: 1234 5678 9012" },
              ] as { label: string; key: keyof Funcionario; type: string; placeholder: string }[]).map(field => (
                <div key={field.key}>
                  <label style={cs.label}>{field.label}</label>
                  <input
                    type={field.type}
                    style={cs.input}
                    placeholder={field.placeholder}
                    list={field.key === "cargo" ? "cargos-pessoal" : undefined}
value={(formFunc[field.key] as string) || ""}
                    onChange={e => setFormFunc(p => ({ ...p, [field.key]: (field.type === "number" ? +e.target.value : e.target.value) as never }))}
                  />
                  {field.key === "cargo" && (
                    <datalist id="cargos-pessoal">
                      {CARGOS_PESSOAL.map(cargo => <option key={cargo} value={cargo} />)}
                    </datalist>
                  )}
                  {field.key === "cargo" && (
                    <div style={{ fontSize: 11, color: t.text3, marginTop: 5 }}>
                      Escolhe um cargo sugerido ou escreve um novo cargo padronizado.
                    </div>
                  )}
                  {field.key === "nuit" && (
                    <div style={{ fontSize: 11, color: t.text3, marginTop: 5 }}>
                      Informe 9 dígitos do NUIT.
                    </div>
                  )}
                  {field.key === "contaBancaria" && (
                    <div style={{ fontSize: 11, color: t.text3, marginTop: 5 }}>
                      Informe uma conta bancária completa para evitar erros no pagamento.
                    </div>
                  )}
                </div>
              ))}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={cs.label}>Tipo</label>
                  <select style={cs.input} value={formFunc.tipo} onChange={e => setFormFunc(p => ({ ...p, tipo: e.target.value as Funcionario['tipo'] }))}>
                    {Object.entries(TIPOS_PESSOAL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={cs.label}>Status</label>
                  <select style={cs.input} value={formFunc.status} onChange={e => setFormFunc(p => ({ ...p, status: e.target.value as Funcionario['status'] }))}>
                    <option value="ativo">Activo</option>
                    <option value="inativo">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>

            {formError && (
              <div style={{ display: "flex", gap: 7, background: t.redMuted, border: `1px solid ${t.redBorder}`, borderRadius: 8, padding: "9px 12px", marginTop: 16, fontSize: 12, color: t.red }}>
                <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0, marginTop: 1 }} />{formError}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 22, justifyContent: "flex-end" }}>
              <button className="btn-hover" style={cs.btn} onClick={() => { setShowModal(false); setFormError(""); }}>Cancelar</button>
              <button style={cs.btnPrimary} onClick={guardarFuncionario}>
                <Save style={{ width: 13, height: 13 }} />
                {editando ? "Guardar alterações" : "Adicionar funcionário"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
