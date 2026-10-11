// Gerador de boletim oficial (A4) para impressao / guardar como PDF.
// Reutilizavel para 1 aluno ou turma inteira (com quebra de pagina).

export type BoletimRow = {
  subject: string;
  grades: (number | null)[]; // 4 bimestres
  average: number | null;
  status: "Aprovado" | "Reprovado" | "—";
};

export type BoletimData = {
  student: { name: string; birthDate?: string; guardian?: string; guardianPhone?: string };
  className: string;
  rows: BoletimRow[];
  attendance: { present: number; total: number; rate: number | null };
  year?: number;
  notaMin?: number;
};

const SCHOOL = "INSTITUTO POLITÉCNICO FAICLEID, LDA";
const SCHOOL_SUB = "Pré-Escolar · Ensino Primário · Ensino Secundário · Nampula, Moçambique";

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const fmtDate = (d?: string) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("pt-MZ");
};

const style = `<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111}
.page{width:210mm;min-height:297mm;padding:16mm 16mm;margin:0 auto}
.header{text-align:center;border-bottom:3px solid #1e3a8a;padding-bottom:10px;margin-bottom:14px}
.school-name{font-size:18px;font-weight:900;color:#1e3a8a;letter-spacing:.5px}
.school-sub{font-size:10px;color:#64748b;margin-top:2px}
.doc-title{font-size:15px;font-weight:800;color:#1e3a8a;margin-top:10px;letter-spacing:3px;text-transform:uppercase}
.doc-year{font-size:11px;color:#64748b;margin-top:3px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
.info-item{border-left:3px solid #1e3a8a;padding:6px 10px;background:#f8fafc}
.info-label{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px}
.info-value{font-size:12px;font-weight:700;color:#0f172a;margin-top:1px}
table{width:100%;border-collapse:collapse;margin-bottom:14px}
th{background:#1e3a8a;color:#fff;padding:8px 8px;font-size:10px;text-align:center;text-transform:uppercase;letter-spacing:.5px}
th.subject{text-align:left}
td{padding:7px 8px;font-size:12px;border-bottom:1px solid #e2e8f0;text-align:center}
td.subject{text-align:left;font-weight:600;color:#0f172a}
.pass{color:#047857;font-weight:700}.fail{color:#b91c1c;font-weight:700}.na{color:#94a3b8}
.badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700}
.badge.pass{background:#d1fae5;color:#065f46}.badge.fail{background:#fee2e2;color:#991b1b}.badge.na{background:#f1f5f9;color:#64748b}
.summary{display:flex;gap:10px;margin-bottom:16px}
.sum-box{flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px}
.sum-label{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px}
.sum-value{font-size:18px;font-weight:800;color:#1e3a8a;margin-top:3px}
.footer{display:flex;justify-content:space-between;margin-top:24px;padding-top:14px}
.sign{text-align:center}.sign-line{width:170px;border-bottom:1px solid #0f172a;margin:34px auto 4px}
.sign-label{font-size:10px;color:#64748b}
.watermark{text-align:center;margin-top:12px;font-size:9px;color:#cbd5e1}
.obs{background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 12px;font-size:10px;color:#92400e;margin-bottom:14px}
.page-break{page-break-after:always;break-after:page}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{margin:0}}
</style>`;

function pageHTML(d: BoletimData): string {
  const notaMin = d.notaMin ?? 10;
  const year = d.year ?? new Date().getFullYear();
  const body = d.rows.length
    ? d.rows
        .map(
          (r) => `<tr>
        <td class="subject">${esc(r.subject)}</td>
        ${r.grades
          .map((g) =>
            g === null
              ? `<td class="na">—</td>`
              : `<td class="${g >= notaMin ? "pass" : "fail"}">${g.toFixed(1)}</td>`
          )
          .join("")}
        <td>${r.average === null ? `<span class="na">—</span>` : `<strong>${r.average.toFixed(1)}</strong>`}</td>
        <td><span class="badge ${r.status === "Aprovado" ? "pass" : r.status === "Reprovado" ? "fail" : "na"}">${r.status}</span></td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="7" style="color:#94a3b8;padding:20px">Nenhuma nota lancada</td></tr>`;

  return `<div class="page">
  <div class="header">
    <div class="school-name">${esc(SCHOOL)}</div>
    <div class="school-sub">${esc(SCHOOL_SUB)}</div>
    <div class="doc-title">Boletim de Notas</div>
    <div class="doc-year">Ano Lectivo ${year}</div>
  </div>
  <div class="info-grid">
    <div class="info-item"><div class="info-label">Aluno</div><div class="info-value">${esc(d.student.name)}</div></div>
    <div class="info-item"><div class="info-label">Turma</div><div class="info-value">${esc(d.className)}</div></div>
    <div class="info-item"><div class="info-label">Data de Nascimento</div><div class="info-value">${fmtDate(d.student.birthDate)}</div></div>
    <div class="info-item"><div class="info-label">Responsavel</div><div class="info-value">${esc(d.student.guardian || "—")}${d.student.guardianPhone ? " · " + esc(d.student.guardianPhone) : ""}</div></div>
  </div>
  <table>
    <thead><tr>
      <th class="subject">Disciplina</th><th>1º Bim</th><th>2º Bim</th><th>3º Bim</th><th>4º Bim</th><th>Media</th><th>Situacao</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>
  <div class="summary">
    <div class="sum-box"><div class="sum-label">Frequencia</div><div class="sum-value">${d.attendance.rate === null ? "N/A" : d.attendance.rate.toFixed(1) + "%"}</div></div>
    <div class="sum-box"><div class="sum-label">Presencas</div><div class="sum-value">${d.attendance.present}</div></div>
    <div class="sum-box"><div class="sum-label">Total de Aulas</div><div class="sum-value">${d.attendance.total}</div></div>
    <div class="sum-box"><div class="sum-label">Escala / Minimo</div><div class="sum-value">0–20 / ${notaMin}</div></div>
  </div>
  <div class="obs">Aprovacao minima: ${notaMin} valores. Frequencia minima exigida: 75%.</div>
  <div class="footer">
    <div class="sign"><div class="sign-line"></div><div class="sign-label">Director(a) Pedagogico(a)</div></div>
    <div class="sign"><div class="sign-line"></div><div class="sign-label">Director(a) Geral / Coordenacao</div></div>
  </div>
  <div class="watermark">Documento gerado electronicamente · ${new Date().toLocaleString("pt-MZ")}</div>
</div>`;
}

export function printBoletins(list: BoletimData[], windowTitle = "Boletim"): void {
  if (!list.length) {
    alert("Sem dados para imprimir");
    return;
  }
  const pages = list.map(pageHTML).join('<div class="page-break"></div>');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(windowTitle)}</title>${style}</head><body>${pages}</body></html>`;
  const win = window.open("", "_blank", "width=920,height=760");
  if (!win) {
    alert("Active os popups para gerar o boletim");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}
