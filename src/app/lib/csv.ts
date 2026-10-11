// Utilitario de exportacao CSV (compativel com Excel pt-MZ).
// Delimitador ';' e BOM UTF-8 para acentos corretos no Excel.

export function toCSV(rows: Record<string, unknown>[], headers?: string[]): string {
  if (!rows.length) return "";
  const cols = headers ?? Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\r\n");
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[], headers?: string[]): void {
  const csv = toCSV(rows, headers);
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const hoje = () => new Date().toISOString().slice(0, 10);
