import { FREQ_VAL, SEV_VAL } from "./constants";

export const getRiskScore = (f, s) => ((FREQ_VAL[f] || 0) + 1) * ((SEV_VAL[s] || 0) + 1);

export const getRiskLabel = (score) => {
  if (score <= 3)  return { label:"Aceitável",    color:"#16a34a", bg:"#dcfce7" };
  if (score <= 6)  return { label:"Tolerável",    color:"#ca8a04", bg:"#fef9c3" };
  if (score <= 12) return { label:"Relevante",    color:"#d97706", bg:"#fed7aa" };
  if (score <= 16) return { label:"Crítico",      color:"#dc2626", bg:"#fee2e2" };
  return                  { label:"Catastrófico", color:"#991b1b", bg:"#fecaca" };
};

export const exportarRelatorio = (tipo, empresa, riscos, userName, userPerfil) => {
  const w = window.open("", "_blank");
  const rows = riscos.map(r => `
    <tr>
      <td>${r.fator}</td><td>${r.setor}</td><td>${r.cat}</td>
      <td>${r.freq}</td><td>${r.sev}</td>
      <td style="color:${r.color};font-weight:700">${r.label} (${r.score})</td>
      <td>${r.aet ? "✔ AET Obrigatória" : "PGR Comum"}</td>
      <td>${r.aet ? "Imediato" : r.score >= 7 ? "60 dias" : "90 dias"}</td>
    </tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>${tipo} — ${empresa?.razao || ""}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:30px}
    h1{color:#1e3a5f;font-size:18px;margin-bottom:4px} h2{color:#2d5382;font-size:14px;margin:20px 0 8px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#1e3a5f;color:#fff;padding:8px;text-align:left;font-size:11px}
    td{padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px}
    tr:nth-child(even) td{background:#f8fafc}
    .alerta{background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:10px 14px;margin:16px 0;font-size:11px;color:#991b1b}
    .info{background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px 14px;margin:16px 0;font-size:11px;color:#1e40af}
    @media print{.noprint{display:none}}
  </style></head><body>
  <button class="noprint" onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;margin-bottom:16px">Imprimir / Salvar PDF</button>
  <h1>GRO/PGR — ${tipo}</h1>
  <p style="color:#64748b;margin:0 0 4px">Gerado em: ${new Date().toLocaleDateString("pt-BR")} | Responsável: ${userName} (${userPerfil})</p>
  <div class="info"><strong>Nota Regulatória:</strong> Riscos psicossociais não geram aposentadoria especial (Anexo IV Dec. 3.048/99) e não devem ser enviados na Tabela 24 do eSocial (S-2240). São essenciais para contestação de NTEP.</div>
  <h2>Dados da Empresa</h2>
  <table><tr><th>Campo</th><th>Valor</th></tr>
    <tr><td>Razão Social</td><td>${empresa?.razao || "—"}</td></tr>
    <tr><td>CNPJ</td><td>${empresa?.cnpj || "—"}</td></tr>
    <tr><td>CNAE</td><td>${empresa?.cnae || "—"}</td></tr>
    <tr><td>Endereço</td><td>${empresa?.endereco || "—"}</td></tr>
    <tr><td>Responsável Técnico</td><td>${empresa?.responsavel || "—"}</td></tr>
    <tr><td>Grau de Risco</td><td>GR ${empresa?.grauRisco || "—"}</td></tr>
    <tr><td>Data da Avaliação</td><td>${empresa?.dataAvaliacao || "—"}</td></tr>
  </table>
  <h2>Riscos Identificados — Plano de Ação</h2>
  ${riscos.length === 0
    ? `<p style="color:#dc2626">Nenhum risco registrado. Preencha o checklist antes de exportar.</p>`
    : `<table><thead><tr><th>Fator de Risco</th><th>Setor</th><th>Categoria</th><th>Frequência</th><th>Severidade</th><th>Classificação</th><th>Recomendação</th><th>Prazo</th></tr></thead><tbody>${rows}</tbody></table>`
  }
  ${tipo.includes("NTEP") ? `<div class="alerta"><strong>Subsídios para Defesa NTEP:</strong> Os riscos classificados como Crítico ou Catastrófico configuram exposição habitual documentada, podendo ser utilizados como contra-prova em processos de nexo técnico epidemiológico previdenciário (NTEP) perante o INSS, conforme IN INSS 77/2015 e Resolução CNPS 1.316/2010.</div>` : ""}
  <h2>Base Normativa</h2>
  <p>NR-01 (2022) | NR-17 | ISO 45003:2021 | eSocial S-2220 | Dec. 3.048/99 | IN INSS 77/2015 | Lei 14.457/2022 (CIPA+A)</p>
  </body></html>`;
  w.document.write(html);
  w.document.close();
};
