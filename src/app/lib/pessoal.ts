export const TIPOS_PESSOAL: Record<string, string> = {
  professor: "Professor",
  administrativo: "Administrativo",
  apoio: "Apoio",
};

export const CARGOS_PESSOAL = [
  "Direitor Adjunto Pedagogico",
  "Director Geral",
  "Director Pedagogico",
  "Professor",
  "Secretario",
  "Auxiliar administrativo",
  "Auxiliar de limpeza",
  "Guarda",
].sort((a, b) => a.localeCompare(b, "pt"));

export function normalizarCargoPessoal(cargo: string) {
  return cargo.trim().replace(/\s+/g, " ");
}
