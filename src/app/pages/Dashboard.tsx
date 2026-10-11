import { useCallback, useEffect, useState } from "react";
import { getCurrentUser, ROLE_LABELS, ROLE_COLORS } from "../lib/auth";
import { studentsAPI, teachersAPI, classesAPI, subjectsAPI, paymentsAPI, activationAPI } from "../lib/api";
import {
  Users, BookOpen, School, GraduationCap, TrendingUp,
  DollarSign, CheckCircle2, AlertTriangle, Clock,
  Calendar, Activity, ChevronRight, Shield, Percent, Gauge
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PaymentStats, Teacher } from "../../types/domain";
const DAYS_PT = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// ── Relógio ──────────────────────────────────────────────
function DashClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  const secDeg = now.getSeconds() * 6;
  const minDeg = now.getMinutes() * 6 + now.getSeconds() * 0.1;
  const hrDeg = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5;
 
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      {/* Relógio analógico */}
      <div style={{ width: 72, height: 72, borderRadius: "50%", border: "2px solid #1a2035", position: "relative", background: "#0d1117", flexShrink: 0 }}>
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{ position: "absolute", width: i % 3 === 0 ? 2 : 1, height: i % 3 === 0 ? 6 : 4, background: i % 3 === 0 ? "#4a5568" : "#2d3748", top: "50%", left: "50%", transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${i * 30}deg) translateY(-33px)` }} />
        ))}
        <div style={{ position: "absolute", width: 2, height: 20, background: "#e2e8f0", borderRadius: 2, bottom: "50%", left: "50%", transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${hrDeg}deg)` }} />
        <div style={{ position: "absolute", width: 1.5, height: 26, background: "#818cf8", borderRadius: 2, bottom: "50%", left: "50%", transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${minDeg}deg)` }} />
        <div style={{ position: "absolute", width: 1, height: 28, background: "#f87171", borderRadius: 1, bottom: "50%", left: "50%", transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${secDeg}deg)`, transition: "transform 0.1s linear" }} />
        <div style={{ position: "absolute", width: 5, height: 5, background: "#6366f1", borderRadius: "50%", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
      </div>
      {/* Digital */}
      <div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 32, fontWeight: 600, color: "#e2e8f0", lineHeight: 1, letterSpacing: 1 }}>
          {pad(now.getHours())}<span style={{ opacity: now.getSeconds() % 2 === 0 ? 1 : 0.2 }}>:</span>{pad(now.getMinutes())}<span style={{ fontSize: 20, opacity: 0.4 }}>:{pad(now.getSeconds())}</span>
        </div>
        <div style={{ fontSize: 11, color: "#4a5568", marginTop: 5 }}>
          {DAYS_PT[now.getDay()]}, {now.getDate()} de {MONTHS_PT[now.getMonth()]} de {now.getFullYear()}
        </div>
        <div style={{ fontSize: 10, color: "#2d3748", marginTop: 2 }}>GMT+2 · Nampula, Moçambique</div>
      </div>
    </div>
  );
}
// ── KPI Card ─────────────────────────────────────────────
type KPIProps = { icon: LucideIcon; label: string; value: number; sub?: string; color: string; loading?: boolean };

function KPI({ icon: Icon, label, value, sub, color, loading }: KPIProps) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (loading || !value) { setV(0); return; }
    let n = 0; const step = Math.ceil(value / 40);
    const t = setInterval(() => { n = Math.min(n + step, value); setV(n); if (n >= value) clearInterval(t); }, 20);
    return () => clearInterval(t);
  }, [value, loading]);

  return (
    <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 12, padding: "18px 20px", position: "relative", overflow: "hidden", transition: "border-color 0.2s", cursor: "default" }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#2d3748"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#1a2035"}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.7 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 10px" }}>{label}</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0", margin: 0, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>
            {loading ? "—" : v.toLocaleString("pt-MZ")}
          </p>
          {sub && <p style={{ fontSize: 10, color: "#4a5568", margin: "5px 0 0" }}>{sub}</p>}
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${color}30` }}>
          <Icon style={{ width: 16, height: 16, color }} />
        </div>
      </div>
    </div>
  );
}

// ── Barra de progresso ───────────────────────────────────
function FinBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: "#718096" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: "'IBM Plex Mono', monospace" }}>
          {pct}% · {value.toLocaleString("pt-MZ")} MT
        </span>
      </div>
      <div style={{ height: 4, background: "#1a2035", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

// ── Acção rápida ─────────────────────────────────────────
function QuickAction({ label, href, icon: Icon, color }: { label: string; href: string; icon: LucideIcon; color: string }) {
  return (
    <a href={href} style={{ display: "flex", alignItems: "center", gap: 10, background: "#0d1117", border: "1px solid #1a2035", borderRadius: 10, padding: "12px 14px", textDecoration: "none", transition: "all 0.15s", color: "#718096" }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = color + "50"; el.style.color = "#e2e8f0"; el.style.background = "#111827"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "#1a2035"; el.style.color = "#718096"; el.style.background = "#0d1117"; }}>
      <div style={{ width: 30, height: 30, borderRadius: 7, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${color}25`, flexShrink: 0 }}>
        <Icon style={{ width: 14, height: 14, color }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
      <ChevronRight style={{ width: 12, height: 12, marginLeft: "auto", opacity: 0.3 }} />
    </a>
  );
}

// ── Dashboard principal ───────────────────────────────────
export default function Dashboard() {
  const user = getCurrentUser();
  const role = (user?.role || "admin") as keyof typeof ROLE_LABELS;
  const badge = ROLE_COLORS[role] || ROLE_COLORS.admin;

  // Permissões
  const isAdmin      = role === "admin";
  const isDirector   = role === "director";
  const isPedagogico = role === "pedagogico";
  const isProfessor  = role === "professor";
  const isSecretaria = role === "secretaria";

  const canManage       = isAdmin || isDirector;
  const canSeePedagogy  = isAdmin || isDirector || isPedagogico || isProfessor;

  // FINANCEIRO — APENAS ADMIN
  const canSeeFinancial = isAdmin;

  const canFetchTeachers = isAdmin || isDirector || isPedagogico;

  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, subjects: 0 });
  const [fin, setFin]     = useState({ totalPaid: 0, totalPending: 0, totalOverdue: 0, monthlyRevenue: 0, alertDueSoon: 0, alertOverdue: 0 });
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [license, setLicense] = useState<{ status: string; daysLeft: number; expired: boolean; school?: string; tipo?: string; expiresAt?: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const EMPTY_STATS: PaymentStats = { totalPaid: 0, totalPending: 0, totalOverdue: 0, monthlyRevenue: 0, alertDueSoon: 0, alertOverdue: 0 };
      const [baseRes, teachersRes, finRes] = await Promise.allSettled([
        Promise.all([studentsAPI.getAll(), classesAPI.getAll(), subjectsAPI.getAll()]),
        canFetchTeachers ? teachersAPI.getAll() : Promise.resolve({ teachers: [] as Teacher[] }),
        canSeeFinancial ? paymentsAPI.getStats() : Promise.resolve(EMPTY_STATS),
      ]);

      if (baseRes.status === "fulfilled") {
        const [sR, cR, subR] = baseRes.value;
        setStats({
          students: sR.students.length,
          classes: cR.classes.length,
          subjects: subR.subjects.length,
          teachers: teachersRes.status === "fulfilled" ? teachersRes.value.teachers.length : 0,
        });
      }
      if (canSeeFinancial && finRes.status === "fulfilled") setFin(finRes.value);
    } finally {
      setLoading(false);
    }
  }, [canFetchTeachers, canSeeFinancial]);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite");
    load();
    // Verificar licença
    activationAPI.getLicense().then(setLicense).catch(() => {});
  }, [load]);

  const totalFin = fin.totalPaid + fin.totalPending + fin.totalOverdue || 1;
  const collectionRate = Math.round((fin.totalPaid / totalFin) * 100);
  const overdueRate = Math.round((fin.totalOverdue / totalFin) * 100);
  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1300, margin: "0 auto", fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ── CABEÇALHO ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 28, alignItems: "flex-start" }}>

        {/* Saudação + alertas */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: badge.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: badge.color, border: `1px solid ${badge.border}` }}>
              {initials}
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                {greeting}, {user?.name?.split(" ")[0]}
              </h1>
              <p style={{ fontSize: 12, color: "#4a5568", margin: 0, marginTop: 2 }}>
                {ROLE_LABELS[role]} · Instituto Politécnico FaiCleid, LDA
              </p>
            </div>
          </div>

          {/* Alertas financeiros — só admin */}
          {canSeeFinancial && fin.alertOverdue > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#f87171", marginTop: 4 }}>
              <AlertTriangle style={{ width: 13, height: 13 }} />
              <strong>{fin.alertOverdue}</strong> mensalidade(s) em atraso — {fin.totalOverdue.toLocaleString("pt-MZ")} MT
            </div>
          )}
          {canSeeFinancial && fin.alertDueSoon > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#fbbf24", marginTop: 4, marginLeft: 6 }}>
              <Clock style={{ width: 13, height: 13 }} />
              <strong>{fin.alertDueSoon}</strong> a vencer nos próximos 3 dias
            </div>
          )}

          {/* Info professor */}
          {isProfessor && user?.accessCode && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "8px 14px", marginTop: 8, fontSize: 12, color: "#818cf8" }}>
              <span>Código: <strong style={{ fontFamily: "monospace" }}>{user.accessCode}</strong></span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{user.assignedClasses?.length || 0} turma(s)</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{user.assignedSubjects?.length || 0} disciplina(s)</span>
            </div>
          )}
        </div>

        {/* Relógio */}
        <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 14, padding: "20px 24px" }}>
          <DashClock />
        </div>
      </div>

      {/* ── BANNER DE LICENÇA ── */}
      {license && license.status === 'expired' && (
        <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(248,113,113,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle style={{ width: 18, height: 18, color: "#f87171" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#f87171", margin: 0 }}>⚠️ Licença Expirada</p>
            <p style={{ fontSize: 12, color: "#718096", margin: "3px 0 0" }}>
              A sua licença expirou. O sistema continua a funcionar mas não é possível criar novas contas. Contacte o developer MM.dev para renovar.
            </p>
          </div>
          <a href="https://wa.me/258840000000" target="_blank" rel="noreferrer"
            style={{ background: "#f87171", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap" }}>
            Renovar Agora
          </a>
        </div>
      )}

      {license && license.status === 'expiring_soon' && (
        <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(251,191,36,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Clock style={{ width: 18, height: 18, color: "#fbbf24" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24", margin: 0 }}>⏰ Licença a Expirar em {license.daysLeft} dia(s)</p>
            <p style={{ fontSize: 12, color: "#718096", margin: "3px 0 0" }}>
              Renove antes de {new Date(license.expiresAt!).toLocaleDateString("pt-MZ")} para não interromper o serviço.
            </p>
          </div>
          <a href="https://wa.me/258846880525" target="_blank" rel="noreferrer"
            style={{ background: "#fbbf24", color: "#0b0f1a", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap" }}>
            Renovar
          </a>
        </div>
      )}

      {license && license.status === 'expiring' && (
        <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: "12px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <Shield style={{ width: 15, height: 15, color: "#818cf8", flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: "#818cf8", margin: 0 }}>
            Licença válida por mais <strong>{license.daysLeft} dias</strong> — expira em {new Date(license.expiresAt!).toLocaleDateString("pt-MZ")}
          </p>
        </div>
      )}

      {/* ── KPIs ACADÉMICOS — todos vêem ── */}
      <p style={{ fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 12px" }}>
        Dados Académicos
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 28 }}>
        <KPI icon={Users} label="Alunos" value={stats.students} color="#6366f1" loading={loading}
          sub={`${Math.round((stats.students / 500) * 100)}% da capacidade`} />
        {(isAdmin || isDirector || isPedagogico) && (
          <KPI icon={GraduationCap} label="Professores" value={stats.teachers} color="#8b5cf6" loading={loading} />
        )}
        <KPI icon={School} label="Turmas" value={stats.classes} color="#06b6d4" loading={loading} />
        <KPI icon={BookOpen} label="Disciplinas" value={stats.subjects} color="#10b981" loading={loading} />
      </div>

      {/* Barra de ocupação */}
      <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 10, padding: "14px 20px", marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: "#4a5568", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Ocupação do sistema</span>
          <span style={{ fontSize: 11, color: "#6366f1", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
            {stats.students} / 500 alunos
          </span>
        </div>
        <div style={{ height: 5, background: "#1a2035", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min((stats.students / 500) * 100, 100)}%`, background: "linear-gradient(90deg, #6366f1, #8b5cf6)", borderRadius: 99, transition: "width 1.2s ease" }} />
        </div>
        <p style={{ fontSize: 10, color: "#2d3748", margin: "6px 0 0" }}>Capacidade máxima: 500 alunos</p>
      </div>

      {/* ── FINANCEIRO — APENAS ADMIN ── */}
      {canSeeFinancial && (
        <>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 12px" }}>
            Resumo Financeiro · Vencimento dia <span style={{ color: "#6366f1" }}>5</span>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 20 }}>
            <KPI icon={CheckCircle2} label="Total Pago"     value={fin.totalPaid}       color="#10b981" loading={loading} sub="MT" />
            <KPI icon={Clock}        label="Pendente"       value={fin.totalPending}     color="#fbbf24" loading={loading} sub="MT" />
            <KPI icon={AlertTriangle} label="Em Atraso"     value={fin.totalOverdue}     color="#f87171" loading={loading} sub="MT" />
            <KPI icon={TrendingUp}   label="Receita Mensal" value={fin.monthlyRevenue}   color="#6366f1" loading={loading} sub="MT" />
            <KPI icon={Percent}      label="Taxa de Cobrança" value={collectionRate}     color="#06b6d4" loading={loading} sub="% do valor total" />
            <KPI icon={Gauge}        label="Inadimplência"  value={overdueRate}          color="#f472b6" loading={loading} sub="% do valor total" />
          </div>

          <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <Activity style={{ width: 14, height: 14, color: "#6366f1" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>Distribuição Financeira</span>
              <span style={{ fontSize: 11, color: "#4a5568", marginLeft: "auto" }}>
                Total: {(fin.totalPaid + fin.totalPending + fin.totalOverdue).toLocaleString("pt-MZ")} MT
              </span>
            </div>
            <FinBar label="Pago"      value={fin.totalPaid}     total={totalFin} color="#10b981" />
            <FinBar label="Pendente"  value={fin.totalPending}  total={totalFin} color="#fbbf24" />
            <FinBar label="Em Atraso" value={fin.totalOverdue}  total={totalFin} color="#f87171" />
          </div>
        </>
      )}

      {/* ── ACÇÕES RÁPIDAS — filtradas por papel ── */}
      <p style={{ fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 12px" }}>
        Acesso Rápido
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 32 }}>
        {canManage && <>
          <QuickAction label="Gerir Alunos"    href="/students"  icon={Users}         color="#6366f1" />
          <QuickAction label="Professores"     href="/teachers"  icon={GraduationCap} color="#8b5cf6" />
          <QuickAction label="Turmas"          href="/classes"   icon={School}        color="#06b6d4" />
          <QuickAction label="Disciplinas"     href="/subjects"  icon={BookOpen}      color="#10b981" />
          <QuickAction label="Utilizadores"    href="/users"     icon={Shield}        color="#f97316" />
        </>}
        {isAdmin && (
          <QuickAction label="Financeiro" href="/financial" icon={DollarSign} color="#fbbf24" />
        )}
        {canSeePedagogy && <>
          <QuickAction label={isProfessor ? "Lançar Notas" : "Notas"} href="/grades"     icon={TrendingUp} color="#6366f1" />
          <QuickAction label="Frequência"  href="/attendance" icon={Calendar}   color="#f472b6" />
        </>}
        {(isPedagogico || isSecretaria) && <>
          <QuickAction label="Alunos"  href="/students" icon={Users}   color="#6366f1" />
          <QuickAction label="Turmas"  href="/classes"  icon={School}  color="#06b6d4" />
        </>}
      </div>

      {/* ── RODAPÉ ── */}
      <div style={{ borderTop: "1px solid #1a2035", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 11, color: "#2d3748" }}>© 2026 Instituto Politécnico FaiCleid, LDA · Nampula, Moçambique</span>
        <div style={{ display: "flex", gap: 20 }}>
          {[{ v: stats.students, l: "Alunos" }, { v: stats.teachers, l: "Professores" }, { v: stats.classes, l: "Turmas" }].map(({ v, l }) => (
            <div key={l} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#4a5568", margin: 0, fontFamily: "'IBM Plex Mono', monospace" }}>{v}</p>
              <p style={{ fontSize: 10, color: "#2d3748", margin: 0, textTransform: "uppercase", letterSpacing: 0.8 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}