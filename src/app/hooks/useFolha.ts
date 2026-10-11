import { useMemo } from 'react';
import type { Funcionario } from '../../types/domain';

const DIAS_UTEIS = 22;
const INSS_TRABALHADOR = 0.03;
const INSS_ENTIDADE = 0.03;

export interface FolhaCalculation {
  bruto: number;
  descFaltas: number;
  inssWorker: number;
  inssEnt: number;
  totalDescontos: number;
  liquido: number;
  baseInss: number;
}

export interface FolhaState {
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

export function useFolhaCalculation(salarioBase: number, subsidios: number, faltas: number): FolhaCalculation {
  return useMemo(() => {
    const bruto = salarioBase + subsidios;
    const descFaltas = (salarioBase / DIAS_UTEIS) * faltas;
    const baseInss = salarioBase - descFaltas;
    const inssWorker = baseInss * INSS_TRABALHADOR;
    const inssEnt = baseInss * INSS_ENTIDADE;
    const totalDescontos = descFaltas + inssWorker;
    const liquido = bruto - totalDescontos;
    return { bruto, descFaltas, inssWorker, inssEnt, totalDescontos, liquido, baseInss };
  }, [salarioBase, subsidios, faltas]);
}

export function useFolhaForm(funcionarios: Funcionario[], selectedFuncionarioId: string | null) {
  const selectedFuncionario = useMemo(
    () => funcionarios.find(f => f.id === selectedFuncionarioId) || null,
    [funcionarios, selectedFuncionarioId]
  );

  const getInitialFolhaState = (funcionario?: Funcionario | null, mes?: number, ano?: number): FolhaState => {
    const now = new Date();
    return {
      funcionarioId: funcionario?.id || '',
      nome: funcionario?.nome || '',
      cargo: funcionario?.cargo || '',
      salarioBase: funcionario?.salario || 0,
      subsidios: 0,
      faltas: 0,
      banco: funcionario?.banco || '',
      contaBancaria: funcionario?.contaBancaria || '',
      nuit: funcionario?.nuit || '',
      dataPagamento: '',
      mes: mes ?? now.getMonth() + 1,
      ano: ano ?? now.getFullYear(),
      observacoes: '',
    };
  };

  return { selectedFuncionario, getInitialFolhaState };
}

export function useFolhaValidation() {
  const validate = (state: FolhaState): string | null => {
    if (!state.funcionarioId) return 'Selecione um funcionário';
    if (state.salarioBase <= 0) return 'Salário base deve ser maior que zero';
    if (state.faltas < 0) return 'Faltas não podem ser negativas';
    if (state.mes < 1 || state.mes > 12) return 'Mês inválido';
    if (state.ano < 2020 || state.ano > 2050) return 'Ano inválido';
    return null;
  };

  return { validate };
}