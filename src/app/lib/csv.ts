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

// Parser de CSV tolerante: deteta o delimitador (; ou ,) e trata aspas/escapes.
export function parseCSV(text: string): string[][] {
  const content = text.replace(/^\ufeff/, "");
  const firstLine = content.split(/\r?\n/)[0] || "";
  const delim = firstLine.split(";").length >= firstLine.split(",").length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export const normKey = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

// Aceita AAAA-MM-DD, DD/MM/AAAA ou DD-MM-AAAA e devolve AAAA-MM-DD.
export function normDate(v: string): string {
  const s = (v || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${mo}-${d}`;
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
}
