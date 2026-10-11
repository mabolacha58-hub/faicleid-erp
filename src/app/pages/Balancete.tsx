import { useCallback, useEffect, useState, useRef } from "react";
import { X, Printer, TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle2, Settings, ChevronDown, ChevronUp, HelpCircle, Save, Download } from "lucide-react";
import { usePayments, useStudents, useClasses } from "../hooks";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Lista completa de todas as classes da escola
const ALL_CLASSES = [
  "Pré-escolar",
  "1ª Classe", "2ª Classe", "3ª Classe", "4ª Classe", "5ª Classe", "6ª Classe",
  "7ª Classe", "8ª Classe", "9ª Classe", "10ª Classe", "11ª Classe", "12ª Classe"
];

// Extrair o nome da classe a partir do nome da turma
// Ex: "1ª Classe A" -> "1ª Classe", "2ª Classe B" -> "2ª Classe", "7ª Classe A" -> "7ª Classe"
const extractClassName = (turmaName: string): string => {
  if (!turmaName) return "Outra";
  
  // Verificar se é Pré-escolar
  if (turmaName.toLowerCase().includes("pré") || turmaName.toLowerCase().includes("pre")) {
    return "Pré-escolar";
  }
  
  // Padrão: número + ª + Classe (ex: "1ª Classe A", "7ª Classe B")
  const match = turmaName.match(/(\d+[ªº]?\s*Classe)/i);
  if (match) {
    return match[1].trim();
  }
  
  // Se não encontrar, tenta extrair apenas o número
  const numMatch = turmaName.match(/(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    if (num >= 1 && num <= 12) {
      return `${num}ª Classe`;
    }
  }
  
  return "Outra";
};

// Determinar o nível para agrupamento visual
const getLevelFromClassName = (className: string): "pre" | "primario" | "secundario" => {
  if (className === "Pré-escolar") return "pre";
  
  const match = className.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 6) return "primario";
    if (num >= 7 && num <= 12) return "secundario";
  }
  
  return "primario";
};

type ClassRate = {
  className: string;      // Ex: "1ª Classe", "2ª Classe", "7ª Classe"
  level: "pre" | "primario" | "secundario";
  mensalidade: number;
  matricula: number;
  turmas: string[];       // Lista de IDs das turmas que pertencem a esta classe
  totalAlunos: number;     // Total de alunos em todas as turmas desta classe
};

type MonthRow = {
  month: number;
  label: string;
  totalPrevisto: number;
  detalhePrevistoMensalidade: number;
  detalhePrevistoMatricula: number;
  cobradoMensalidade: number;
  matriculas: number;
  transporte: number;
  multas: number;
  gravatas: number;
  bolsos: number;
  fichas: number;
  totalOutros: number;
  totalCobrado: number;
  diferenca: number;
  saldo: number;
  pendente: number;
};

type BalanceteProps = {
  onClose: () => void;
  finePercent: number;
  transportFee: number;
};

export default function Balancete({ onClose, finePercent: _finePercent, transportFee }: BalanceteProps) {
  const detectDarkTheme = () => {
    if (typeof document === "undefined") return false;
    const root = document.documentElement;
    const body = document.body;
    const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const bodyBg = typeof window !== "undefined" ? window.getComputedStyle(body).backgroundColor : "";
    const isDarkBackground = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.test(bodyBg)
      ? (() => {
          const match = bodyBg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (!match) return false;
          const [, r, g, b] = match.map(Number);
          const luminance = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
          return luminance < 140;
        })()
      : false;

    return (
      root.classList.contains("dark") ||
      body.classList.contains("dark") ||
      root.getAttribute("data-theme") === "dark" ||
      body.getAttribute("data-theme") === "dark" ||
      prefersDark ||
      isDarkBackground
    );
  };

const printRef = useRef<HTMLDivElement>(null);
  const { data: payments = [], isLoading: loading} = usePayments();
  const { data: studentsArr = [] } = useStudents();
  const { data: classesData = [] } = useClasses();
  const [saving, setSaving] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<MonthRow[]>([]);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterResumo, setFilterResumo] = useState<"todos" | "positivos" | "negativos" | "pendentes">("todos");
  const [isDark, setIsDark] = useState(detectDarkTheme);
  
  // Dados das classes
  const [classRates, setClassRates] = useState<ClassRate[]>([]);
  const [tempClassRates, setTempClassRates] = useState<ClassRate[]>([]);
  const classRatesRef = useRef(classRates);
  classRatesRef.current = classRates;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;
    const syncTheme = () => setIsDark(detectDarkTheme());
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    observer.observe(body, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const savedRates = localStorage.getItem("classRates");
    if (savedRates) {
      try {
        setClassRates(JSON.parse(savedRates));
      } catch (e) {
        console.error("Erro ao carregar taxas salvas", e);
      }
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const students = studentsArr;

      // Mapa de turma -> nome da classe (ex: "1ª Classe A" -> "1ª Classe")
      const turmaToClassName: Record<string, string> = {};
      const turmasByClassName: Record<string, string[]> = {};
      
      classesData.forEach((c) => {
        const turmaId = c.id;
        const turmaName = c.name || c.grade || `Turma ${c.id}`;
        const className = extractClassName(turmaName);
        
        turmaToClassName[turmaId] = className;
        
        if (!turmasByClassName[className]) {
          turmasByClassName[className] = [];
        }
        turmasByClassName[className].push(turmaId);
      });

      // Contar alunos por TURMA
      const byTurma: Record<string, number> = {};
      students.forEach((s) => {
        const turmaId = s.classId;
        if (turmaId) {
          byTurma[turmaId] = (byTurma[turmaId] || 0) + 1;
        }
      });

      // Agrupar alunos por CLASSE (somando todas as turmas da mesma classe)
      const byClass: Record<string, number> = {};
      Object.entries(byTurma).forEach(([turmaId, count]) => {
        const className = turmaToClassName[turmaId] || "Outra";
        byClass[className] = (byClass[className] || 0) + count;
      });
      
      setTotalStudents(students.length);

      // Inicializar taxas para TODAS as classes (Pré-escolar a 12ª)
      // Primeiro, criar um mapa das classes que existem no sistema
      const existingClassNames = [...new Set(Object.values(turmaToClassName))];
      
      // Depois, garantir que todas as classes de 1ª a 12ª + Pré-escolar estejam presentes
      const allClassNames = ALL_CLASSES.filter(c => 
        c === "Pré-escolar" || existingClassNames.includes(c) || c.match(/\d+/)
      );
      
      let updatedClassRates: ClassRate[] = [];
      
      if (classRatesRef.current.length === 0) {
        // Primeira vez: criar taxas padrão para todas as classes
        updatedClassRates = allClassNames.map(className => {
          const level = getLevelFromClassName(className);
          let mensalidade = 3000;
          let matricula = 2000;
          
          if (level === "pre") {
            mensalidade = 2500;
            matricula = 1500;
          } else if (level === "secundario") {
            // Taxas progressivas para o secundário (7ª a 12ª)
            const match = className.match(/(\d+)/);
            if (match) {
              const num = parseInt(match[1]);
              // Quanto mais alta a classe, maior a mensalidade
              mensalidade = 3500 + (num - 7) * 250; // 7ª: 3500, 8ª: 3750, 9ª: 4000, etc.
              matricula = 2500 + (num - 7) * 200;   // 7ª: 2500, 8ª: 2700, 9ª: 2900, etc.
            } else {
              mensalidade = 4000;
              matricula = 3000;
            }
          } else if (level === "primario") {
            // Taxas progressivas para o primário (1ª a 6ª)
            const match = className.match(/(\d+)/);
            if (match) {
              const num = parseInt(match[1]);
              mensalidade = 2000 + (num - 1) * 150; // 1ª: 2000, 2ª: 2150, 3ª: 2300, etc.
              matricula = 1500 + (num - 1) * 100;   // 1ª: 1500, 2ª: 1600, 3ª: 1700, etc.
            } else {
              mensalidade = 2500;
              matricula = 1800;
            }
          }
          
          return {
            className,
            level,
            mensalidade,
            matricula,
            turmas: turmasByClassName[className] || [],
            totalAlunos: byClass[className] || 0
          };
        });
      } else {
        // Já existem taxas, apenas garantir que todas as classes estejam presentes
        updatedClassRates = [...classRatesRef.current];
        
        // Adicionar classes que não existiam
        allClassNames.forEach(className => {
          const exists = updatedClassRates.some(r => r.className === className);
          if (!exists) {
            const level = getLevelFromClassName(className);
            let mensalidade = 3000;
            let matricula = 2000;
            
            if (level === "pre") {
              mensalidade = 2500;
              matricula = 1500;
            } else if (level === "secundario") {
              const match = className.match(/(\d+)/);
              if (match) {
                const num = parseInt(match[1]);
                mensalidade = 3500 + (num - 7) * 250;
                matricula = 2500 + (num - 7) * 200;
              } else {
                mensalidade = 4000;
                matricula = 3000;
              }
            } else if (level === "primario") {
              const match = className.match(/(\d+)/);
              if (match) {
                const num = parseInt(match[1]);
                mensalidade = 2000 + (num - 1) * 150;
                matricula = 1500 + (num - 1) * 100;
              } else {
                mensalidade = 2500;
                matricula = 1800;
              }
            }
            
            updatedClassRates.push({
              className,
              level,
              mensalidade,
              matricula,
              turmas: turmasByClassName[className] || [],
              totalAlunos: byClass[className] || 0
            });
          } else {
            // Atualizar total de alunos e turmas para classes existentes
            const index = updatedClassRates.findIndex(r => r.className === className);
            if (index !== -1) {
              updatedClassRates[index] = {
                ...updatedClassRates[index],
                turmas: turmasByClassName[className] || [],
                totalAlunos: byClass[className] || 0
              };
            }
          }
        });
      }
      
      // Ordenar as classes: Pré-escolar, depois 1ª a 12ª
      updatedClassRates.sort((a, b) => {
        if (a.className === "Pré-escolar") return -1;
        if (b.className === "Pré-escolar") return 1;
        
        const numA = parseInt(a.className.match(/(\d+)/)?.[1] || "0");
        const numB = parseInt(b.className.match(/(\d+)/)?.[1] || "0");
        return numA - numB;
      });
      
      setClassRates(updatedClassRates);
      setTempClassRates(updatedClassRates);

      // Calcular previsto mensal (soma de alunos por CLASSE × taxa da classe)
      let previstoMensal = 0;
      let previstoMatriculas = 0;

      updatedClassRates.forEach(classRate => {
        const totalAlunosNaClasse = classRate.totalAlunos;
        previstoMensal += totalAlunosNaClasse * classRate.mensalidade;
        previstoMatriculas += totalAlunosNaClasse * classRate.matricula;
      });

      // Filtrar pagamentos do ano
      const yearPayments = payments.filter((p) => p.year === year);

      // Construir rows por mês
      const monthRows: MonthRow[] = MONTHS.map((label, idx) => {
        const month = idx + 1;
        const monthPayments = yearPayments.filter((p) => p.month === month);
        const paidPayments = monthPayments.filter((p) => p.status === "paid");

        // Inicializar contadores
        let cobradoMensalidade = 0;
        let transporte = 0;
        let matriculas = 0;
        let multas = 0;
        let gravatas = 0;
        let bolsos = 0;
        let fichas = 0;

        paidPayments.forEach((p) => {
          // Usar os campos específicos em vez de observações
          if (p.type === "matricula" || p.isMatricula) {
            matriculas += p.amount;
          } else if (p.hasTransport) {
            transporte += transportFee;
            cobradoMensalidade += Math.max(0, p.amount - transportFee);
          } else if (p.type === "multa" || p.isMulta) {
            multas += p.amount;
          } else if (p.type === "gravata") {
            gravatas += p.amount;
          } else if (p.type === "bolso") {
            bolsos += p.amount;
          } else if (p.type === "ficha") {
            fichas += p.amount;
          } else {
            // Mensalidade normal
            cobradoMensalidade += p.amount;
          }
        });

        // Pendentes do mês
        const pendente = monthPayments
          .filter((p) => p.status !== "paid")
          .reduce((acc: number, p) => acc + p.amount, 0);

        const detalhePrevistoMensalidade = previstoMensal;
        const detalhePrevistoMatricula = month === 1 ? previstoMatriculas : 0;
        const totalPrevisto = detalhePrevistoMensalidade + detalhePrevistoMatricula;
        const totalOutros = gravatas + bolsos + fichas;
        const totalCobrado = cobradoMensalidade + transporte + matriculas + multas + totalOutros;
        const diferenca = totalCobrado - totalPrevisto;
        const saldo = totalCobrado - detalhePrevistoMensalidade;

        return {
          month,
          label,
          totalPrevisto,
          detalhePrevistoMensalidade,
          detalhePrevistoMatricula,
          cobradoMensalidade,
          matriculas,
          transporte,
          multas,
          gravatas,
          bolsos,
          fichas,
          totalOutros,
          totalCobrado,
          diferenca,
          saldo,
          pendente
        };
      });

      setRows(monthRows);
    } catch (e) {
      console.error(e);
    }
  }, [year, transportFee, payments, studentsArr, classesData]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveClassRates = async () => {
    setSaving(true);
    try {
      localStorage.setItem("classRates", JSON.stringify(tempClassRates));
      setClassRates(tempClassRates);
      setShowSettings(false);
      await loadData();
    } catch (e) {
      console.error("Erro ao salvar taxas", e);
      alert("Erro ao salvar as taxas. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const totals = rows.reduce((acc, r) => ({
    totalPrevisto: acc.totalPrevisto + r.totalPrevisto,
    detalhePrevistoMensalidade: acc.detalhePrevistoMensalidade + r.detalhePrevistoMensalidade,
    detalhePrevistoMatricula: acc.detalhePrevistoMatricula + r.detalhePrevistoMatricula,
    cobradoMensalidade: acc.cobradoMensalidade + r.cobradoMensalidade,
    matriculas: acc.matriculas + r.matriculas,
    transporte: acc.transporte + r.transporte,
    multas: acc.multas + r.multas,
    gravatas: acc.gravatas + r.gravatas,
    bolsos: acc.bolsos + r.bolsos,
    fichas: acc.fichas + r.fichas,
    totalOutros: acc.totalOutros + r.totalOutros,
    totalCobrado: acc.totalCobrado + r.totalCobrado,
    diferenca: acc.diferenca + r.diferenca,
    saldo: acc.saldo + r.saldo,
    pendente: acc.pendente + r.pendente,
  }), {
    totalPrevisto: 0,
    detalhePrevistoMensalidade: 0,
    detalhePrevistoMatricula: 0,
    cobradoMensalidade: 0,
    matriculas: 0,
    transporte: 0,
    multas: 0,
    gravatas: 0,
    bolsos: 0,
    fichas: 0,
    totalOutros: 0,
    totalCobrado: 0,
    diferenca: 0,
    saldo: 0,
    pendente: 0
  });

  const filteredRows = rows.filter((row) => {
    const matchMonth = filterMonth ? row.month === Number(filterMonth) : true;
    const matchResumo =
      filterResumo === "todos" ? true :
      filterResumo === "positivos" ? row.diferenca > 0 :
      filterResumo === "negativos" ? row.diferenca < 0 :
      row.pendente > 0;

    return matchMonth && matchResumo;
  });

  const filteredTotals = filteredRows.reduce((acc, r) => ({
    totalPrevisto: acc.totalPrevisto + r.totalPrevisto,
    detalhePrevistoMensalidade: acc.detalhePrevistoMensalidade + r.detalhePrevistoMensalidade,
    detalhePrevistoMatricula: acc.detalhePrevistoMatricula + r.detalhePrevistoMatricula,
    cobradoMensalidade: acc.cobradoMensalidade + r.cobradoMensalidade,
    matriculas: acc.matriculas + r.matriculas,
    transporte: acc.transporte + r.transporte,
    multas: acc.multas + r.multas,
    gravatas: acc.gravatas + r.gravatas,
    bolsos: acc.bolsos + r.bolsos,
    fichas: acc.fichas + r.fichas,
    totalOutros: acc.totalOutros + r.totalOutros,
    totalCobrado: acc.totalCobrado + r.totalCobrado,
    diferenca: acc.diferenca + r.diferenca,
    saldo: acc.saldo + r.saldo,
    pendente: acc.pendente + r.pendente,
  }), {
    totalPrevisto: 0,
    detalhePrevistoMensalidade: 0,
    detalhePrevistoMatricula: 0,
    cobradoMensalidade: 0,
    matriculas: 0,
    transporte: 0,
    multas: 0,
    gravatas: 0,
    bolsos: 0,
    fichas: 0,
    totalOutros: 0,
    totalCobrado: 0,
    diferenca: 0,
    saldo: 0,
    pendente: 0
  });

  const filtroDescricao = [
    filterMonth ? MONTHS[Number(filterMonth) - 1] : "Todos os meses",
    filterResumo === "todos" ? "Todos os resultados" :
    filterResumo === "positivos" ? "Diferenca positiva" :
    filterResumo === "negativos" ? "Diferenca negativa" :
    "Com pendente"
  ].join(" · ");

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=1000,height=700");
    if (!win) { alert("Active os popups para imprimir"); return; }
    
    // Agrupar classes por nível para exibição
    const preClasses = classRates.filter(c => c.level === "pre");
    const primarioClasses = classRates.filter(c => c.level === "primario");
    const secundarioClasses = classRates.filter(c => c.level === "secundario");

    win.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Balancete ${year} — Instituto Politécnico FaiCleid</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:15mm 12mm}
        h1{font-size:16px;font-weight:900;color:#1e3a8a;margin-bottom:2px}
        .sub{font-size:10px;color:#64748b;margin-bottom:12px}
        .meta{display:flex;gap:24px;margin-bottom:16px;font-size:10px;color:#374151}
        .meta strong{display:block;font-size:12px;color:#111}
        table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:9px}
        th{background:#1e3a8a;color:white;padding:4px 6px;text-align:center;border:1px solid #1e3a8a}
        th.left{text-align:left}
        td{padding:4px 6px;border:1px solid #e2e8f0;text-align:right}
        td.left{text-align:left;font-weight:600}
        tr:nth-child(even){background:#f8fafc}
        tr.total{background:#1e3a8a!important;color:white;font-weight:900}
        tr.total td{border-color:#1e3a8a;color:white}
        .positivo{color:#059669;font-weight:700}
        .negativo{color:#dc2626;font-weight:700}
        .footer{font-size:9px;color:#94a3b8;text-align:center;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:8px}
        .sign-row{display:flex;justify-content:space-between;margin-top:32px}
        .sign-box{text-align:center;width:200px}
        .sign-line{border-bottom:1px solid #0f172a;margin-bottom:4px;height:28px}
        .sign-label{font-size:9px;color:#64748b}
        .rates-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:8px}
        .rate-category{padding:6px;background:#f8fafc;border-radius:4px}
        .class-list{max-height:200px;overflow-y:auto;font-size:9px}
      </style></head><body>
      <h1>INSTITUTO POLITÉCNICO FAICLEID, LDA</h1>
      <div class="sub">Pré-Escolar · 1ª à 12ª Classe · Maputo, Moçambique</div>
      <h2 style="font-size:13px;margin-bottom:8px;color:#374151">BALANCETE FINANCEIRO — ANO LECTIVO ${year}</h2>
      <div class="meta">
        <div><strong>${totalStudents}</strong>Total de Alunos</div>
        <div><strong>${preClasses.reduce((acc, c) => acc + c.totalAlunos, 0)}</strong>Pré-Escolar</div>
        <div><strong>${primarioClasses.reduce((acc, c) => acc + c.totalAlunos, 0)}</strong>1ª à 6ª Classe</div>
        <div><strong>${secundarioClasses.reduce((acc, c) => acc + c.totalAlunos, 0)}</strong>7ª à 12ª Classe</div>
        <div><strong>${new Date().toLocaleDateString("pt-MZ")}</strong>Data de Emissão</div>
      </div>
      
      <div style="margin-bottom:16px;background:#f8fafc;border:1px solid #e2e8f0;padding:10px;border-radius:4px">
        <strong style="font-size:11px">Taxas por Classe (Mensalidade / Matrícula):</strong>
        <div class="rates-grid">
          ${preClasses.length > 0 ? `
          <div class="rate-category">
            <strong style="color:#f59e0b">Pré-Escolar</strong><br/>
            <div class="class-list">
              ${preClasses.map(c => `${c.className}: ${c.mensalidade.toLocaleString("pt-MZ")} MT / ${c.matricula.toLocaleString("pt-MZ")} MT (${c.totalAlunos} alunos)`).join('<br/>')}
            </div>
          </div>` : ''}
          ${primarioClasses.length > 0 ? `
          <div class="rate-category">
            <strong style="color:#10b981">Ensino Primário (1ª à 6ª)</strong><br/>
            <div class="class-list">
              ${primarioClasses.map(c => `${c.className}: ${c.mensalidade.toLocaleString("pt-MZ")} MT / ${c.matricula.toLocaleString("pt-MZ")} MT (${c.totalAlunos} alunos)`).join('<br/>')}
            </div>
          </div>` : ''}
          ${secundarioClasses.length > 0 ? `
          <div class="rate-category">
            <strong style="color:#6366f1">Ensino Secundário (7ª à 12ª)</strong><br/>
            <div class="class-list">
              ${secundarioClasses.map(c => `${c.className}: ${c.mensalidade.toLocaleString("pt-MZ")} MT / ${c.matricula.toLocaleString("pt-MZ")} MT (${c.totalAlunos} alunos)`).join('<br/>')}
            </div>
          </div>` : ''}
        </div>
        <div style="margin-top:8px;font-size:10px">Transporte: ${transportFee.toLocaleString("pt-MZ")} MT/mês</div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="left" rowspan="2">Mês</th>
            <th colspan="3">PREVISTO</th>
            <th colspan="8">COBRADO</th>
            <th rowspan="2">Total P</th>
            <th rowspan="2">Total C</th>
            <th rowspan="2">Diferença</th>
            <th rowspan="2">Pendente</th>
          </tr>
          <tr>
            <th>Mensal.</th><th>Matríc.</th><th>Total</th>
            <th>Mensal.</th><th>Matríc.</th><th>Transp.</th><th>Multas</th>
            <th>Gravata</th><th>Bolso</th><th>Ficha</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${filteredRows.map(r => `
          <tr>
            <td class="left">${r.label}</td>
            <td>${r.detalhePrevistoMensalidade.toLocaleString("pt-MZ")}</td>
            <td>${r.detalhePrevistoMatricula > 0 ? r.detalhePrevistoMatricula.toLocaleString("pt-MZ") : "—"}</td>
            <td><strong>${r.totalPrevisto.toLocaleString("pt-MZ")}</strong></td>
            <td>${r.cobradoMensalidade.toLocaleString("pt-MZ")}</td>
            <td>${r.matriculas > 0 ? r.matriculas.toLocaleString("pt-MZ") : "—"}</td>
            <td>${r.transporte > 0 ? r.transporte.toLocaleString("pt-MZ") : "—"}</td>
            <td>${r.multas > 0 ? r.multas.toLocaleString("pt-MZ") : "—"}</td>
            <td>${r.gravatas > 0 ? r.gravatas.toLocaleString("pt-MZ") : "—"}</td>
            <td>${r.bolsos > 0 ? r.bolsos.toLocaleString("pt-MZ") : "—"}</td>
            <td>${r.fichas > 0 ? r.fichas.toLocaleString("pt-MZ") : "—"}</td>
            <td>${r.totalPrevisto.toLocaleString("pt-MZ")}</td>
            <td>${r.totalCobrado.toLocaleString("pt-MZ")}</td>
            <td class="${r.diferenca >= 0 ? "positivo" : "negativo"}">${r.diferenca >= 0 ? "+" : ""}${r.diferenca.toLocaleString("pt-MZ")}</td>
            <td style="color:#d97706">${r.pendente > 0 ? r.pendente.toLocaleString("pt-MZ") : "—"}</td>
          </tr>`).join("")}
          <tr class="total">
            <td class="left">${filteredRows.length === rows.length ? "TOTAL ANUAL" : "TOTAL FILTRADO"}</td>
            <td>${filteredTotals.detalhePrevistoMensalidade.toLocaleString("pt-MZ")}</td>
            <td>${filteredTotals.detalhePrevistoMatricula.toLocaleString("pt-MZ")}</td>
            <td><strong>${filteredTotals.totalPrevisto.toLocaleString("pt-MZ")}</strong></td>
            <td>${filteredTotals.cobradoMensalidade.toLocaleString("pt-MZ")}</td>
            <td>${filteredTotals.matriculas.toLocaleString("pt-MZ")}</td>
            <td>${filteredTotals.transporte.toLocaleString("pt-MZ")}</td>
            <td>${filteredTotals.multas.toLocaleString("pt-MZ")}</td>
            <td>${filteredTotals.gravatas.toLocaleString("pt-MZ")}</td>
            <td>${filteredTotals.bolsos.toLocaleString("pt-MZ")}</td>
            <td>${filteredTotals.fichas.toLocaleString("pt-MZ")}</td>
            <td>${filteredTotals.totalPrevisto.toLocaleString("pt-MZ")}</td>
            <td>${filteredTotals.totalCobrado.toLocaleString("pt-MZ")}</td>
            <td class="${filteredTotals.diferenca >= 0 ? "positivo" : "negativo"}">${filteredTotals.diferenca >= 0 ? "+" : ""}${filteredTotals.diferenca.toLocaleString("pt-MZ")}</td>
            <td>${filteredTotals.pendente.toLocaleString("pt-MZ")}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="sign-row">
        <div class="sign-box"><div class="sign-line"></div><div class="sign-label">Director(a) Financeiro</div></div>
        <div class="sign-box"><div class="sign-line"></div><div class="sign-label">Director(a) Geral</div></div>
        <div class="sign-box"><div class="sign-line"></div><div class="sign-label">Contabilista</div></div>
      </div>
      <div class="footer">Instituto Politécnico FaiCleid, LDA · Balancete gerado em ${new Date().toLocaleString("pt-MZ")} · Documento sujeito a verificação contabilística</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const handleExportCsv = () => {
    const lines = [
      ["Mes", "Previsto Mensalidade", "Previsto Matricula", "Total Previsto", "Cobrado Mensalidade", "Matriculas", "Transporte", "Multas", "Gravatas", "Bolsos", "Fichas", "Outros", "Total Cobrado", "Diferenca", "Pendente"].join(";"),
      ...filteredRows.map((row) => [
        row.label,
        row.detalhePrevistoMensalidade,
        row.detalhePrevistoMatricula,
        row.totalPrevisto,
        row.cobradoMensalidade,
        row.matriculas,
        row.transporte,
        row.multas,
        row.gravatas,
        row.bolsos,
        row.fichas,
        row.totalOutros,
        row.totalCobrado,
        row.diferenca,
        row.pendente,
      ].join(";")),
      [
        filteredRows.length === rows.length ? "TOTAL ANUAL" : "TOTAL FILTRADO",
        filteredTotals.detalhePrevistoMensalidade,
        filteredTotals.detalhePrevistoMatricula,
        filteredTotals.totalPrevisto,
        filteredTotals.cobradoMensalidade,
        filteredTotals.matriculas,
        filteredTotals.transporte,
        filteredTotals.multas,
        filteredTotals.gravatas,
        filteredTotals.bolsos,
        filteredTotals.fichas,
        filteredTotals.totalOutros,
        filteredTotals.totalCobrado,
        filteredTotals.diferenca,
        filteredTotals.pendente,
      ].join(";")
    ];

    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `balancete-${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

const fmt = (v: number) => v.toLocaleString("pt-MZ") + " MT";
  const diferencaColor = (v: number) => v >= 0 ? "#059669" : "#dc2626";
  const diferencaBg = (v: number) => v >= 0 ? "#ecfdf5" : "#fef2f2";

  // Agrupar classes por nível para exibição
  const preClasses = tempClassRates.filter(c => c.level === "pre");
  const primarioClasses = tempClassRates.filter(c => c.level === "primario");
  const secundarioClasses = tempClassRates.filter(c => c.level === "secundario");
  const palette = {
    pageBg: isDark ? "rgba(3,7,18,0.82)" : "rgba(0,0,0,0.5)",
    modalBg: isDark ? "#0b1220" : "white",
    panelBg: isDark ? "#111827" : "#f8fafc",
    cardBg: isDark ? "#0f172a" : "white",
    border: isDark ? "#233047" : "#e5e7eb",
    text: isDark ? "#e5eefc" : "#111827",
    subtext: isDark ? "#94a3b8" : "#6b7280",
    muted: isDark ? "#cbd5e1" : "#374151",
    tableAlt: isDark ? "#0f172a" : "#f9fafb",
    tableHover: isDark ? "#162033" : "#f0f9ff",
    currentMonth: isDark ? "#14213a" : "#eff6ff",
    inputBg: isDark ? "#0f172a" : "white",
    chipBg: isDark ? "#172554" : "#eff6ff",
    chipText: isDark ? "#93c5fd" : "#1d4ed8",
  };

  return (
    <div className={isDark ? "balancete-dark" : ""} style={{ position: "fixed", inset: 0, background: palette.pageBg, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", zIndex: 60, overflowY: "auto" }}>
      <style>{`
        .balancete-dark .balancete-surface { background: #0b1220 !important; border-color: #233047 !important; color: #e5eefc !important; }
        .balancete-dark .balancete-panel { background: #111827 !important; border-color: #233047 !important; color: #e5eefc !important; }
        .balancete-dark .balancete-card { background: #0f172a !important; border-color: #233047 !important; color: #e5eefc !important; }
        .balancete-dark select, .balancete-dark input { background: #0f172a !important; color: #e5eefc !important; border-color: #233047 !important; }
        .balancete-dark table tbody tr { color: #e5eefc !important; }
        .balancete-dark table tbody tr td { border-color: #233047 !important; }
      `}</style>
      <div className="balancete-surface" style={{ background: palette.modalBg, borderRadius: 20, boxShadow: "0 24px 64px rgba(0,0,0,0.25)", width: "100%", maxWidth: 1500, marginBottom: 24, position: "relative", zIndex: 60, border: `1px solid ${palette.border}` }}>

        {/* Header */}
        <div style={{ padding: "24px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#eff6ff", color: "#1d4ed8", borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>
              Relatorio Financeiro
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#111827", margin: 0 }}>📊 Balancete Financeiro</h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Instituto Politécnico FaiCleid, LDA · Ano Lectivo {year}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f3f4f6", borderRadius: 10, padding: "6px 12px" }}>
              <button onClick={() => setYear(y => y - 1)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 800, color: "#4f46e5", fontSize: 16 }}>‹</button>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#111827", minWidth: 48, textAlign: "center" }}>{year}</span>
              <button onClick={() => setYear(y => y + 1)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 800, color: "#4f46e5", fontSize: 16 }}>›</button>
            </div>
            
            <button onClick={() => setShowHelp(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #e5e7eb", background: "white", color: "#374151", padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <HelpCircle style={{ width: 15, height: 15 }} /> Ajuda
            </button>
            
            <button onClick={() => { setTempClassRates([...classRates]); setShowSettings(true); }}
              style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #e5e7eb", background: "white", color: "#374151", padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Settings style={{ width: 15, height: 15 }} /> Taxas
            </button>
            
            <button onClick={handlePrint}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#1e3a8a", color: "white", border: "none", padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <Printer style={{ width: 15, height: 15 }} /> Imprimir
            </button>
            <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", cursor: "pointer", borderRadius: 8, padding: 8 }}>
              <X style={{ width: 18, height: 18, color: "#6b7280" }} />
            </button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div style={{ padding: "20px 28px 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          {[
            { label: "Total Previsto (P)", value: totals.totalPrevisto, color: "#4f46e5", bg: "#eef2ff", icon: DollarSign },
            { label: "Total Cobrado (C)", value: totals.totalCobrado, color: "#059669", bg: "#ecfdf5", icon: CheckCircle2 },
            { label: "Diferença (C-P)", value: totals.diferenca, color: diferencaColor(totals.diferenca), bg: diferencaBg(totals.diferenca), icon: totals.diferenca >= 0 ? TrendingUp : TrendingDown },
            { label: "Pendente", value: totals.pendente, color: "#d97706", bg: "#fffbeb", icon: AlertTriangle },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="balancete-card" style={{ background: palette.cardBg, borderRadius: 14, padding: "16px 18px", border: `1px solid ${palette.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderTop: `3px solid ${color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: palette.subtext, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>{label}</p>
                  <p style={{ fontSize: 18, fontWeight: 900, color, margin: "6px 0 0" }}>{value >= 0 ? "" : "-"}{Math.abs(value).toLocaleString("pt-MZ")} MT</p>
                </div>
                <div style={{ background: isDark ? palette.panelBg : bg, borderRadius: 10, padding: 8 }}><Icon style={{ width: 18, height: 18, color }} /></div>
              </div>
            </div>
          ))}
        </div>

        {/* Info resumida de alunos */}
        <div style={{ padding: "14px 28px 0" }}>
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 16px", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Alunos por nível:</span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              <strong style={{ color: "#f59e0b" }}>{preClasses.reduce((acc, c) => acc + c.totalAlunos, 0)}</strong> Pré-Escolar
            </span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              <strong style={{ color: "#10b981" }}>{primarioClasses.reduce((acc, c) => acc + c.totalAlunos, 0)}</strong> 1ª à 6ª Classe
            </span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              <strong style={{ color: "#6366f1" }}>{secundarioClasses.reduce((acc, c) => acc + c.totalAlunos, 0)}</strong> 7ª à 12ª Classe
            </span>
            <span style={{ fontSize: 12, color: "#6b7280", marginLeft: "auto" }}>
              Total: <strong style={{ color: "#111827" }}>{totalStudents}</strong>
            </span>
          </div>
        </div>

        <div style={{ padding: "14px 28px 0" }}>
          <div className="balancete-panel" style={{ background: palette.panelBg, border: `1px solid ${palette.border}`, borderRadius: 14, padding: "14px 16px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: palette.muted, minWidth: 150 }}>Filtros do balancete</div>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              style={{ padding: "8px 12px", border: `1px solid ${palette.border}`, borderRadius: 10, fontSize: 13, color: palette.text, background: palette.inputBg, minWidth: 170 }}
            >
              <option value="">Todos os meses</option>
              {MONTHS.map((month, index) => (
                <option key={month} value={index + 1}>{month}</option>
              ))}
            </select>
            <select
              value={filterResumo}
              onChange={(e) => setFilterResumo(e.target.value as "todos" | "positivos" | "negativos" | "pendentes")}
              style={{ padding: "8px 12px", border: `1px solid ${palette.border}`, borderRadius: 10, fontSize: 13, color: palette.text, background: palette.inputBg, minWidth: 180 }}
            >
              <option value="todos">Todos os resultados</option>
              <option value="positivos">Diferenca positiva</option>
              <option value="negativos">Diferenca negativa</option>
              <option value="pendentes">Com pendente</option>
            </select>
            <button
              onClick={() => { setFilterMonth(""); setFilterResumo("todos"); }}
              style={{ border: "1px solid #e5e7eb", background: "white", color: "#374151", padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Limpar filtros
            </button>
            <button
              onClick={handleExportCsv}
              style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #e5e7eb", background: "white", color: "#374151", padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              <Download style={{ width: 15, height: 15 }} /> CSV
            </button>
            <button
              onClick={handlePrint}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#1e3a8a", color: "white", border: "none", padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              <Printer style={{ width: 15, height: 15 }} /> PDF / Imprimir
            </button>
            <div style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>{filtroDescricao}</div>
          </div>
        </div>

        {/* Tabela principal - continua igual */}
        <div style={{ padding: "20px 28px 28px", overflowX: "auto" }} ref={printRef}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 48, color: palette.subtext }}>A calcular balancete...</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#1e3a8a" }}>
                  <th style={{ padding: "8px 10px", textAlign: "left", color: "white", fontSize: 11, fontWeight: 700, borderRadius: "8px 0 0 0" }} rowSpan={2}>Mês</th>
                  <th colSpan={3} style={{ padding: "8px 10px", textAlign: "center", color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: 600, borderRight: "1px solid rgba(255,255,255,0.2)" }}>PREVISTO</th>
                  <th colSpan={8} style={{ padding: "8px 10px", textAlign: "center", color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: 600, borderRight: "1px solid rgba(255,255,255,0.2)" }}>COBRADO</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", color: "white", fontSize: 11, fontWeight: 700 }} colSpan={3}>RESUMO</th>
                </tr>
                <tr style={{ background: "#2d4a9a" }}>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: 600 }}>Mensal.</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: 600 }}>Matríc.</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "white", fontSize: 10, fontWeight: 700, borderRight: "1px solid rgba(255,255,255,0.2)" }}>Total</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: 600 }}>Mensal.</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: 600 }}>Matríc.</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: 600 }}>Transp.</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: 600 }}>Multas</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: 600 }}>Gravata</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: 600 }}>Bolso</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: 600 }}>Ficha</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "white", fontSize: 10, fontWeight: 700, borderRight: "1px solid rgba(255,255,255,0.2)" }}>Total</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "white", fontSize: 10, fontWeight: 700 }}>Total P</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "white", fontSize: 10, fontWeight: 700 }}>Diferença</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "white", fontSize: 10, fontWeight: 700, borderRadius: "0 8px 0 0" }}>Pendente</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => {
                  const isCurrentMonth = row.month === new Date().getMonth() + 1 && year === new Date().getFullYear();
                  
                  return (
                    <tr key={row.month}
                      style={{ background: isCurrentMonth ? palette.currentMonth : idx % 2 === 0 ? palette.cardBg : palette.tableAlt, borderBottom: `1px solid ${palette.border}`, cursor: "pointer" }}
                      onClick={() => setExpandedMonth(expandedMonth === row.month ? null : row.month)}
                      onMouseEnter={e => { if (!isCurrentMonth) (e.currentTarget as HTMLElement).style.background = palette.tableHover; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isCurrentMonth ? palette.currentMonth : idx % 2 === 0 ? palette.cardBg : palette.tableAlt; }}>
                      <td style={{ padding: "10px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {expandedMonth === row.month ? <ChevronUp style={{ width: 14, height: 14, color: "#9ca3af" }} /> : <ChevronDown style={{ width: 14, height: 14, color: "#9ca3af" }} />}
                          <span style={{ fontWeight: 700, color: isCurrentMonth ? "#1d4ed8" : "#111827" }}>
                            {row.label}
                            {isCurrentMonth && <span style={{ marginLeft: 6, fontSize: 9, background: palette.chipBg, color: palette.chipText, padding: "1px 6px", borderRadius: 6, fontWeight: 700 }}>Actual</span>}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "right", color: "#374151" }}>{fmt(row.detalhePrevistoMensalidade)}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", color: row.detalhePrevistoMatricula > 0 ? "#374151" : "#d1d5db" }}>
                        {row.detalhePrevistoMatricula > 0 ? fmt(row.detalhePrevistoMatricula) : "—"}
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, color: "#1e3a8a", borderRight: "1px solid #f3f4f6" }}>
                        {fmt(row.totalPrevisto)}
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600, color: "#059669" }}>{row.cobradoMensalidade > 0 ? fmt(row.cobradoMensalidade) : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600, color: "#7c3aed" }}>{row.matriculas > 0 ? fmt(row.matriculas) : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600, color: "#2563eb" }}>{row.transporte > 0 ? fmt(row.transporte) : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>{row.multas > 0 ? fmt(row.multas) : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600, color: "#f59e0b" }}>{row.gravatas > 0 ? fmt(row.gravatas) : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600, color: "#f97316" }}>{row.bolsos > 0 ? fmt(row.bolsos) : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600, color: "#ec4899" }}>{row.fichas > 0 ? fmt(row.fichas) : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, color: "#f97316", borderRight: "1px solid #f3f4f6" }}>{row.totalOutros > 0 ? fmt(row.totalOutros) : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, color: "#059669" }}>{fmt(row.totalCobrado)}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, color: "#1e3a8a" }}>{fmt(row.totalPrevisto)}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right" }}>
                        <span style={{ fontWeight: 800, color: diferencaColor(row.diferenca), background: diferencaBg(row.diferenca), padding: "3px 8px", borderRadius: 6, fontSize: 11 }}>
                          {row.diferenca >= 0 ? "+" : ""}{fmt(row.diferenca)}
                        </span>
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "right", color: row.pendente > 0 ? "#d97706" : "#d1d5db", fontWeight: row.pendente > 0 ? 700 : 400 }}>
                        {row.pendente > 0 ? fmt(row.pendente) : "—"}
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background: "#1e3a8a", fontWeight: 900 }}>
                  <td style={{ padding: "12px 10px", color: "white", fontWeight: 900, fontSize: 12 }}>{filteredRows.length === rows.length ? "TOTAL ANUAL" : "TOTAL FILTRADO"}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right", color: "rgba(255,255,255,0.9)", fontSize: 11 }}>{fmt(filteredTotals.detalhePrevistoMensalidade)}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right", color: "rgba(255,255,255,0.9)", fontSize: 11 }}>{fmt(filteredTotals.detalhePrevistoMatricula)}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right", color: "white", fontSize: 12, fontWeight: 900, borderRight: "1px solid rgba(255,255,255,0.2)" }}>{fmt(filteredTotals.totalPrevisto)}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right", color: "#6ee7b7", fontSize: 11 }}>{fmt(filteredTotals.cobradoMensalidade)}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right", color: "#c4b5fd", fontSize: 11 }}>{fmt(filteredTotals.matriculas)}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right", color: "#93c5fd", fontSize: 11 }}>{fmt(filteredTotals.transporte)}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right", color: "#fca5a5", fontSize: 11 }}>{fmt(filteredTotals.multas)}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right", color: "#fcd34d", fontSize: 11 }}>{fmt(filteredTotals.gravatas)}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right", color: "#fed7aa", fontSize: 11 }}>{fmt(filteredTotals.bolsos)}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right", color: "#fbcfe8", fontSize: 11, borderRight: "1px solid rgba(255,255,255,0.2)" }}>{fmt(filteredTotals.fichas)}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right", color: "white", fontSize: 12, fontWeight: 900 }}>{fmt(filteredTotals.totalCobrado)}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right", color: "white", fontSize: 12, fontWeight: 900 }}>{fmt(filteredTotals.totalPrevisto)}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right" }}>
                    <span style={{ fontWeight: 900, fontSize: 12, color: filteredTotals.diferenca >= 0 ? "#6ee7b7" : "#fca5a5" }}>
                      {filteredTotals.diferenca >= 0 ? "+" : ""}{fmt(filteredTotals.diferenca)}
                    </span>
                  </td>
                  <td style={{ padding: "12px 8px", textAlign: "right", color: "#fde68a", fontSize: 11, fontWeight: 800 }}>{fmt(filteredTotals.pendente)}</td>
                </tr>
              </tbody>
            </table>
          )}

          {/* Legenda */}
          <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, color: "#6b7280" }}>
            <span>📅 Vencimento: dia <strong>5</strong> de cada mês</span>
            <span>🟢 Diferença positiva = cobrado acima do previsto</span>
            <span>🔴 Diferença negativa = cobrado abaixo do previsto</span>
            <span>🟡 Pendente = valores não pagos no mês</span>
            <span style={{ marginLeft: "auto" }}>Clique numa linha para expandir detalhes</span>
          </div>
        </div>
      </div>

      {/* Modal de Ajuda */}
      {showHelp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 80 }}>
          <div className="balancete-surface" style={{ background: palette.modalBg, border: `1px solid ${palette.border}`, borderRadius: 20, padding: 32, maxWidth: 500, width: "100%", boxShadow: "0 30px 70px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#111827" }}>ℹ️ Sobre o Balancete</h3>
              <button onClick={() => setShowHelp(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X style={{ width: 20, height: 20, color: palette.subtext }} /></button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 14, color: palette.muted, marginBottom: 12 }}><strong>Campos do Balancete:</strong></p>
              <ul style={{ fontSize: 13, color: palette.muted, paddingLeft: 20 }}>
                <li><strong style={{ color: "#1e3a8a" }}>Previsto:</strong> Calculado com base no número de alunos por classe e nas taxas configuradas</li>
                <li><strong style={{ color: "#059669" }}>Cobrado:</strong> Valores dos pagamentos registados no sistema</li>
                <li><strong style={{ color: "#f97316" }}>Outros:</strong> Soma de Gravatas, Bolsos e Fichas</li>
                <li><strong style={{ color: "#d97706" }}>Pendente:</strong> Pagamentos não quitados do mês</li>
              </ul>
              <div style={{ marginTop: 16, background: "#eef2ff", padding: "12px 16px", borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: "#1e40af", margin: 0 }}>
                  <strong>Nota:</strong> As taxas são configuradas por CLASSE (ex: 1ª Classe, 2ª Classe) e aplicam-se a todas as turmas dessa classe (A, B, C...).
                </p>
              </div>
            </div>
            <button onClick={() => setShowHelp(false)} style={{ width: "100%", background: "#4f46e5", color: "white", border: "none", borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Entendido</button>
          </div>
        </div>
      )}

      {/* Settings Modal — taxas por CLASSE (Pré-escolar a 12ª) */}
      {showSettings && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 90, overflowY: "auto" }}>
          <div className="balancete-surface" style={{ background: palette.modalBg, border: `1px solid ${palette.border}`, borderRadius: 20, padding: 32, maxWidth: 900, width: "100%", boxShadow: "0 30px 70px rgba(0,0,0,0.3)", margin: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#111827" }}>⚙️ Configurar Taxas por Classe</h3>
              <button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X style={{ width: 20, height: 20, color: palette.subtext }} /></button>
            </div>
            
            <div style={{ marginBottom: 16, background: "#eef2ff", padding: "12px 16px", borderRadius: 8, fontSize: 13, color: "#1e40af" }}>
              <strong>ℹ️ Defina a mensalidade e matrícula para cada CLASSE.</strong> Os valores aplicam-se a todas as turmas da classe (A, B, C...).
            </div>
            
            {/* Pré-Escolar */}
            {preClasses.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: "#f59e0b", margin: "0 0 12px", borderBottom: "2px solid #f59e0b", paddingBottom: 4 }}>Pré-Escolar</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                  {preClasses.map((c) => (
                    <div key={c.className} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", margin: "0 0 8px" }}>{c.className}</p>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>
                        {c.totalAlunos} alunos · {c.turmas.length} turmas
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#4b5563", marginBottom: 4 }}>Mensalidade (MT)</label>
                          <input 
                            type="number" 
                            value={c.mensalidade}
                            onChange={e => {
                              const newValue = parseFloat(e.target.value) || 0;
                              setTempClassRates(prev => prev.map(item => 
                                item.className === c.className ? {...item, mensalidade: newValue} : item
                              ));
                            }}
                            style={{ width: "100%", padding: "8px 10px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "white" }}
                            min="0"
                            step="100"
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#4b5563", marginBottom: 4 }}>Matrícula (MT)</label>
                          <input 
                            type="number" 
                            value={c.matricula}
                            onChange={e => {
                              const newValue = parseFloat(e.target.value) || 0;
                              setTempClassRates(prev => prev.map(item => 
                                item.className === c.className ? {...item, matricula: newValue} : item
                              ));
                            }}
                            style={{ width: "100%", padding: "8px 10px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "white" }}
                            min="0"
                            step="100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Ensino Primário (1ª a 6ª) */}
            {primarioClasses.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: "#10b981", margin: "0 0 12px", borderBottom: "2px solid #10b981", paddingBottom: 4 }}>Ensino Primário (1ª à 6ª Classe)</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                  {primarioClasses.map((c) => (
                    <div key={c.className} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#10b981", margin: "0 0 8px" }}>{c.className}</p>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>
                        {c.totalAlunos} alunos · {c.turmas.length} turmas
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#4b5563", marginBottom: 4 }}>Mensalidade (MT)</label>
                          <input 
                            type="number" 
                            value={c.mensalidade}
                            onChange={e => {
                              const newValue = parseFloat(e.target.value) || 0;
                              setTempClassRates(prev => prev.map(item => 
                                item.className === c.className ? {...item, mensalidade: newValue} : item
                              ));
                            }}
                            style={{ width: "100%", padding: "8px 10px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "white" }}
                            min="0"
                            step="100"
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#4b5563", marginBottom: 4 }}>Matrícula (MT)</label>
                          <input 
                            type="number" 
                            value={c.matricula}
                            onChange={e => {
                              const newValue = parseFloat(e.target.value) || 0;
                              setTempClassRates(prev => prev.map(item => 
                                item.className === c.className ? {...item, matricula: newValue} : item
                              ));
                            }}
                            style={{ width: "100%", padding: "8px 10px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "white" }}
                            min="0"
                            step="100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Ensino Secundário (7ª a 12ª) */}
            {secundarioClasses.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: "#6366f1", margin: "0 0 12px", borderBottom: "2px solid #6366f1", paddingBottom: 4 }}>Ensino Secundário (7ª à 12ª Classe)</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                  {secundarioClasses.map((c) => (
                    <div key={c.className} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#6366f1", margin: "0 0 8px" }}>{c.className}</p>
                      <p style={{ fontSize: 12, color: "#0c0d0f", margin: "0 0 12px" }}>
                        {c.totalAlunos} alunos · {c.turmas.length} turmas
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#09090a", marginBottom: 4 }}>Mensalidade (MT)</label>
                          <input 
                            type="number" 
                            value={c.mensalidade}
                            onChange={e => {
                              const newValue = parseFloat(e.target.value) || 0;
                              setTempClassRates(prev => prev.map(item => 
                                item.className === c.className ? {...item, mensalidade: newValue} : item
                              ));
                            }}
                            style={{ width: "100%", padding: "8px 10px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "white" }}
                            min="0"
                            step="100"
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#4b5563", marginBottom: 4 }}>Matrícula (MT)</label>
                          <input 
                            type="number" 
                            value={c.matricula}
                            onChange={e => {
                              const newValue = parseFloat(e.target.value) || 0;
                              setTempClassRates(prev => prev.map(item => 
                                item.className === c.className ? {...item, matricula: newValue} : item
                              ));
                            }}
                            style={{ width: "100%", padding: "8px 10px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "white" }}
                            min="0"
                            step="100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <button 
                onClick={saveClassRates}
                disabled={saving}
                style={{ 
                  flex: 1, 
                  background: "#4f46e5", 
                  color: "white", 
                  border: "none", 
                  borderRadius: 12, 
                  padding: 14, 
                  fontSize: 15, 
                  fontWeight: 700, 
                  cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8
                }}>
                {saving ? "A guardar..." : <><Save style={{ width: 18, height: 18 }} /> Guardar Taxas</>}
              </button>
              <button 
                onClick={() => setShowSettings(false)}
                style={{ flex: 1, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
