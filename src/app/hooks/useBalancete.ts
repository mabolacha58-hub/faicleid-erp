import { useMemo } from 'react';
import type { Payment, Student, Class } from '../../types/domain';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const ALL_CLASSES = [
  'Pré-escolar',
  '1ª Classe', '2ª Classe', '3ª Classe', '4ª Classe', '5ª Classe', '6ª Classe',
  '7ª Classe', '8ª Classe', '9ª Classe', '10ª Classe', '11ª Classe', '12ª Classe',
];

export function extractClassName(turmaName: string): string {
  if (!turmaName) return 'Outra';
  if (turmaName.toLowerCase().includes('pré') || turmaName.toLowerCase().includes('pre')) {
    return 'Pré-escolar';
  }
  const match = turmaName.match(/(\d+[ªº]?\s*Classe)/i);
  if (match) return match[1].trim();
  const numMatch = turmaName.match(/(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    if (num >= 1 && num <= 12) return `${num}ª Classe`;
  }
  return 'Outra';
}

export function getLevelFromClassName(className: string): 'pre' | 'primario' | 'secundario' {
  if (className === 'Pré-escolar') return 'pre';
  const match = className.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 6) return 'primario';
    if (num >= 7 && num <= 12) return 'secundario';
  }
  return 'primario';
}

export interface ClassRate {
  className: string;
  level: 'pre' | 'primario' | 'secundario';
  mensalidade: number;
  matricula: number;
  turmas: string[];
  totalAlunos: number;
}

export interface MonthRow {
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
}

export function useBalanceteCalculations(
  payments: Payment[],
  students: Student[],
  classes: Class[],
  classRates: ClassRate[],
  finePercent: number,
  _transportFee: number,
  year: number
) {
  const studentMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);
  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);
  const classRateMap = useMemo(() => new Map(classRates.map(r => [r.className, r])), [classRates]);

  const paymentsByMonth = useMemo(() => {
    const map = new Map<number, Payment[]>();
    for (const p of payments) {
      if (p.year === year) {
        if (!map.has(p.month)) map.set(p.month, []);
        map.get(p.month)!.push(p);
      }
    }
    return map;
  }, [payments, year]);

  const studentsByClassName = useMemo(() => {
    const map = new Map<string, Student[]>();
    for (const s of students) {
      const c = classMap.get(s.classId);
      if (!c) continue;
      const className = extractClassName(c.name);
      if (!map.has(className)) map.set(className, []);
      map.get(className)!.push(s);
    }
    return map;
  }, [students, classMap]);

  const rows = useMemo((): MonthRow[] => {
    let saldoAcumulado = 0;
    return MONTHS.map((label, i) => {
      const month = i + 1;
      const monthPayments = paymentsByMonth.get(month) || [];

      let detalhePrevistoMensalidade = 0;
      let detalhePrevistoMatricula = 0;

      for (const [className, rate] of classRateMap.entries()) {
        const alunos = studentsByClassName.get(className) || [];
        const totalAlunos = alunos.length;
        if (totalAlunos === 0) continue;
        detalhePrevistoMensalidade += totalAlunos * rate.mensalidade;
        if (month === 1) detalhePrevistoMatricula += totalAlunos * rate.matricula;
      }

      const totalPrevisto = detalhePrevistoMensalidade + detalhePrevistoMatricula;

      let cobradoMensalidade = 0, matriculas = 0, transporte = 0, multas = 0;
      let gravatas = 0, bolsos = 0, fichas = 0;

      for (const p of monthPayments) {
        const student = studentMap.get(p.studentId);
        const className = student ? extractClassName(classMap.get(student.classId)?.name || '') : 'Outra';
        const rate = classRateMap.get(className);
        const isMatricula = p.notes?.includes('matrícula') || (rate && p.amount === rate.matricula);
        const hasTransport = p.notes?.includes('transporte escolar');
        const monthsOverdue = p.status === 'overdue'
          ? Math.max(0, (new Date().getFullYear() - new Date(p.dueDate).getFullYear()) * 12 +
              (new Date().getMonth() - new Date(p.dueDate).getMonth()))
          : 0;
        const fine = monthsOverdue > 0 ? p.amount * (finePercent / 100) * monthsOverdue : 0;

        if (isMatricula) matriculas += p.amount;
        else if (hasTransport) transporte += p.amount;
        else if (fine > 0) multas += fine;
        else if (p.notes?.includes('gravata')) gravatas += p.amount;
        else if (p.notes?.includes('bolso')) bolsos += p.amount;
        else if (p.notes?.includes('ficha')) fichas += p.amount;
        else cobradoMensalidade += p.amount;
      }

      const totalOutros = matriculas + transporte + multas + gravatas + bolsos + fichas;
      const totalCobrado = cobradoMensalidade + totalOutros;
      const diferenca = totalCobrado - totalPrevisto;
      saldoAcumulado += diferenca;
      const pendente = totalPrevisto - cobradoMensalidade;

      return {
        month, label,
        totalPrevisto,
        detalhePrevistoMensalidade,
        detalhePrevistoMatricula,
        cobradoMensalidade,
        matriculas, transporte, multas, gravatas, bolsos, fichas,
        totalOutros, totalCobrado, diferenca, saldo: saldoAcumulado, pendente: Math.max(0, pendente),
      };
    });
  }, [paymentsByMonth, classRateMap, studentsByClassName, studentMap, classMap, finePercent]);

  const totals = useMemo(() => {
    const sum = (key: keyof MonthRow) => rows.reduce((a, r) => a + (r[key] as number), 0);
    return {
      totalPrevisto: sum('totalPrevisto'),
      totalCobrado: sum('totalCobrado'),
      totalDiferenca: sum('diferenca'),
      totalPendente: sum('pendente'),
    };
  }, [rows]);

  return { rows, totals, studentsByClassName, MONTHS, ALL_CLASSES };
}