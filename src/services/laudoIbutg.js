/**
 * Gerador do Laudo Pericial de Estresse Térmico (IBUTG) — HTML para impressão.
 * Compartilhado entre a tela pública (/ibutg) e o módulo interno (Segurança > Estresse Térmico),
 * para que o laudo tenha sempre o mesmo formato independente de onde foi gerado.
 */

/**
 * @param {Object} p
 * @param {Object} p.resultado        HeatStressDTO (ver heatStressClient.js)
 * @param {Object|null} p.endereco    { display, logradouro, municipio, uf, cep }
 * @param {number|string} p.lat
 * @param {number|string} p.lon
 * @param {number|string} p.metab
 * @param {string} p.atividadeLabel
 * @param {boolean} p.outdoor
 * @param {{ razao?:string, cnpj?:string, endereco?:string }|null} [p.empresa]
 * @param {{ nome?:string, cargo?:string }|null} [p.colaborador]
 * @param {{ nome?:string, cargo?:string, crea?:string }|null} [p.responsavel]
 */
export function gerarLaudoIBUTG({
  resultado, endereco, lat, lon, metab, atividadeLabel, outdoor,
  empresa = null, colaborador = null, responsavel = null,
}) {
  const data = new Date(resultado.dataCalculo).toLocaleString("pt-BR");
  const localStr = endereco
    ? `${endereco.logradouro || ""}${endereco.municipio ? ` — ${endereco.municipio}/${endereco.uf}` : ""}${endereco.cep ? ` — CEP ${endereco.cep}` : ""}`
    : `Coordenadas: ${lat}, ${lon}`;
  const endFull = endereco?.display || `Lat: ${lat}, Lon: ${lon}`;

  const coresMap = { Aceitável: "#16a34a", Atenção: "#ca8a04", Crítico: "#dc2626", Proibido: "#7c3aed" };
  const cor = coresMap[resultado.nivelRisco] || "#1e293b";

  const esocial = resultado.requerRegistroESocial
    ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:10px 14px;margin:12px 0">
        <strong style="color:#991b1b">⚠ Registro eSocial obrigatório:</strong>
        <span style="color:#991b1b"> Evento S-2220 (Monitoramento da Saúde) — limite excedido em ${(resultado.ibutgValue - resultado.limiteNHO06).toFixed(1)}°C. Conforme NR-09 §9.3.5.4.</span>
       </div>`
    : "";

  const formula = outdoor
    ? `IBUTG = 0,7 × Tbn + 0,2 × Tg + 0,1 × Tbs = 0,7 × ${resultado.intermediarios.tbn} + 0,2 × ${resultado.intermediarios.tg} + 0,1 × ${resultado.intermediarios.tbs} = <strong>${resultado.ibutgValue}°C</strong>`
    : `IBUTG = 0,7 × Tbn + 0,3 × Tg = 0,7 × ${resultado.intermediarios.tbn} + 0,3 × ${resultado.intermediarios.tg} = <strong>${resultado.ibutgValue}°C</strong>`;

  const linhaEmpresa = empresa?.razao
    ? `<tr><td style="width:35%;font-weight:600">Empresa avaliada</td><td>${empresa.razao}${empresa.cnpj ? ` — CNPJ ${empresa.cnpj}` : ""}</td></tr>
       ${empresa.endereco ? `<tr><td style="font-weight:600">Endereço da empresa</td><td>${empresa.endereco}</td></tr>` : ""}`
    : "";

  const linhaColaborador = colaborador?.nome
    ? `<tr><td style="width:35%;font-weight:600">Colaborador avaliado</td><td>${colaborador.nome}${colaborador.cargo ? ` — ${colaborador.cargo}` : ""}</td></tr>`
    : "";

  const identificacao = (linhaEmpresa || linhaColaborador)
    ? `<h2>1. Identificação</h2><table>${linhaEmpresa}${linhaColaborador}</table>`
    : "";

  const respNome = responsavel?.nome || "";
  const respCargo = responsavel?.cargo ? ` — ${responsavel.cargo}` : "";
  const respCrea = responsavel?.crea ? `CREA: ${responsavel.crea}` : "CREA:";

  const filename = `Laudo_IBUTG_${new Date().toISOString().slice(0,10)}.pdf`;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><title>Laudo IBUTG — NEXUS SST</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;padding:30px 36px;max-width:800px;margin:0 auto;line-height:1.6}
  h1{font-size:17px;color:#0d2a5e;margin-bottom:2px}
  h2{font-size:12px;color:#0d2a5e;margin:18px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;text-transform:uppercase;letter-spacing:0.5px}
  table{width:100%;border-collapse:collapse;margin-bottom:8px}
  th{background:#0d2a5e;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
  td{padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:11px}
  tr:nth-child(even) td{background:#f8fafc}
  .resultado{text-align:center;padding:18px;border-radius:8px;border:2px solid ${cor};background:${cor}18;margin:12px 0}
  .ibutg-val{font-size:40px;font-weight:800;color:${cor};line-height:1}
  .nivel{font-size:14px;font-weight:700;color:${cor};margin-top:4px}
  .noprint{}
  .footer{margin-top:24px;font-size:9.5px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:8px}
  .assinatura{margin-top:36px;display:flex;gap:60px}
  .assinatura div{border-top:1px solid #555;padding-top:4px;font-size:10px;min-width:160px}
  .sig-digital{border:2px solid #0d2a5e;border-radius:8px;padding:12px 16px;margin-top:20px;background:#eff6ff}
  @media print{.noprint{display:none !important}@page{size:A4;margin:14mm 18mm}}
</style></head><body>

<div class="noprint" style="background:#0d2a5e;padding:10px 16px;margin:-30px -36px 20px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
  <span style="color:#fff;font-weight:700;font-size:13px;flex:1">Laudo IBUTG — NEXUS SST</span>
  <button onclick="exportPDF()" style="background:#38b249;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700">⬇ Baixar PDF</button>
  <button onclick="window.print()" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);padding:8px 18px;border-radius:6px;cursor:pointer;font-size:12px">🖨 Imprimir</button>
  <button onclick="window.close()" style="background:none;color:rgba(255,255,255,0.5);border:none;cursor:pointer;font-size:18px;padding:0 4px">✕</button>
</div>

<h1>LAUDO DE AVALIAÇÃO DE ESTRESSE TÉRMICO — IBUTG</h1>
<p style="color:#64748b;font-size:10px;margin-bottom:14px">Sistema NEXUS SST · Technogov Soluções · NHO 06 Fundacentro · NR-15 Anexo 3</p>

${identificacao}

<h2>${identificacao ? "2" : "1"}. Identificação do Local</h2>
<table>
  <tr><td style="width:35%;font-weight:600">Local / Endereço</td><td>${localStr}</td></tr>
  <tr><td style="font-weight:600">Endereço completo</td><td>${endFull}</td></tr>
  <tr><td style="font-weight:600">Coordenadas geográficas</td><td>${lat}, ${lon}</td></tr>
  <tr><td style="font-weight:600">Data e hora da avaliação</td><td>${data}</td></tr>
  <tr><td style="font-weight:600">Ambiente</td><td>${outdoor ? "Ao ar livre (externo)" : "Ambiente interno (coberto)"}</td></tr>
</table>

<h2>${identificacao ? "3" : "2"}. Atividade Avaliada</h2>
<table>
  <tr><td style="width:35%;font-weight:600">Descrição da atividade</td><td>${atividadeLabel}</td></tr>
  <tr><td style="font-weight:600">Taxa metabólica</td><td>${metab} W (ISO 8996 / NHO 06 Tabela 1)</td></tr>
  <tr><td style="font-weight:600">Categoria metabólica</td><td>${resultado.categoria}</td></tr>
  <tr><td style="font-weight:600">Limite IBUTG — NHO 06</td><td>${resultado.limiteNHO06}°C (trabalho contínuo 60 min)</td></tr>
</table>

<h2>${identificacao ? "4" : "3"}. Condições Climáticas (Open-Meteo)</h2>
<table>
  <thead><tr><th>Parâmetro</th><th>Símbolo</th><th>Valor</th><th>Unidade</th></tr></thead>
  <tbody>
    <tr><td>Temperatura do ar (bulbo seco)</td><td>T<sub>bs</sub> / T<sub>a</sub></td><td>${resultado.condicoes.ta}</td><td>°C</td></tr>
    <tr><td>Umidade relativa do ar</td><td>UR</td><td>${resultado.condicoes.ur}</td><td>%</td></tr>
    <tr><td>Velocidade do vento</td><td>v</td><td>${resultado.condicoes.v}</td><td>m/s</td></tr>
    <tr><td>Irradiação horizontal global</td><td>GHI</td><td>${resultado.condicoes.ghi}</td><td>W/m²</td></tr>
    <tr><td>Fonte dos dados</td><td colspan="3">${resultado.fonte}${resultado.cacheado ? " (cache 1h)" : " (tempo real)"}</td></tr>
  </tbody>
</table>

<h2>${identificacao ? "5" : "4"}. Temperaturas Calculadas</h2>
<table>
  <thead><tr><th>Temperatura</th><th>Símbolo</th><th>Valor</th><th>Método</th></tr></thead>
  <tbody>
    <tr><td>Bulbo úmido natural</td><td>T<sub>bn</sub></td><td>${resultado.intermediarios.tbn}°C</td><td>Equação psicrométrica natural — Sprung (1888) / NHO 06 §4.2 — A = 7,99×10⁻⁴ kPa/Pa</td></tr>
    <tr><td>Globo negro estimado (Ø 150mm)</td><td>T<sub>g</sub></td><td>${resultado.intermediarios.tg}°C</td><td>Modelo Liljegren (2008) — balanço energético, Nu = 2 + 0,6·Re⁰˒⁵·Pr¹/³ — NHO 06 §5.2</td></tr>
    <tr><td>Bulbo seco</td><td>T<sub>bs</sub></td><td>${resultado.intermediarios.tbs}°C</td><td>Open-Meteo API</td></tr>
  </tbody>
</table>

<h2>${identificacao ? "6" : "5"}. Cálculo do IBUTG</h2>
<p style="margin-bottom:8px">${formula}</p>

<div class="resultado">
  <div class="ibutg-val">${resultado.ibutgValue}°C</div>
  <div style="font-size:12px;color:${cor};margin:4px 0">IBUTG — ${outdoor ? "Ao ar livre" : "Ambiente interno"}</div>
  <div class="nivel">${resultado.nivelRisco}</div>
  <div style="font-size:11px;color:#64748b;margin-top:4px">
    Limite NHO 06: ${resultado.limiteNHO06}°C · ${resultado.excedeLimite ? `Excedido em ${(resultado.ibutgValue - resultado.limiteNHO06).toFixed(1)}°C` : "Dentro do limite"}
  </div>
</div>

${esocial}

<h2>${identificacao ? "7" : "6"}. Regime de Trabalho Recomendado (NR-15 Quadro 2)</h2>
<table>
  <tr><td style="width:35%;font-weight:600">Regime</td><td>${resultado.recomendacaoPausa.desc}</td></tr>
  ${resultado.recomendacaoPausa.trabMin > 0 ? `
  <tr><td style="font-weight:600">Trabalho</td><td>${resultado.recomendacaoPausa.trabMin} min por hora</td></tr>
  <tr><td style="font-weight:600">Descanso</td><td>${resultado.recomendacaoPausa.descMin} min por hora</td></tr>` : ""}
</table>

<h2>${identificacao ? "8" : "7"}. Base Normativa</h2>
<p style="font-size:10.5px;line-height:1.8;color:#374151">
  NHO 06 — Fundacentro (2025): Avaliação da Exposição Ocupacional ao Calor<br>
  NR-15 Anexo 3 — Limites de Tolerância para Exposição ao Calor (MTE)<br>
  NR-09 §9.3.5.4 — Programa de Prevenção de Riscos Ambientais<br>
  ISO 8996:2004 — Ergonomics of the thermal environment — Metabolic rate determination<br>
  Liljegren, J.C. et al. (2008): Modeling the Wet Bulb Globe Temperature Using Standard Meteorological Measurements — J. Occup. Environ. Hyg. 5(10)
</p>

<div class="assinatura">
  <div>Responsável Técnico${respCargo}<br><br><br>Nome: ${respNome || "_______________________"}<br>${respCrea}<br>Data: ___/___/______</div>
  <div>Empresa Avaliada<br><br><br>Razão Social: ${empresa?.razao || "_______________________"}<br>CNPJ: ${empresa?.cnpj || ""}</div>
</div>

<div class="sig-digital">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
    <span style="font-size:18px">🔏</span>
    <strong style="color:#0d2a5e;font-size:10px;text-transform:uppercase;letter-spacing:0.5px">Assinatura Digital — NEXUS SST</strong>
  </div>
  <table style="margin:0">
    <tr><td style="width:30%;font-weight:600;color:#374151;border-bottom:1px solid #bfdbfe">Responsável</td><td style="border-bottom:1px solid #bfdbfe">${respNome || "___________________________"}</td></tr>
    ${responsavel?.crea ? `<tr><td style="font-weight:600;color:#374151;border-bottom:1px solid #bfdbfe">CREA</td><td style="border-bottom:1px solid #bfdbfe">${responsavel.crea}</td></tr>` : ""}
    ${empresa?.razao ? `<tr><td style="font-weight:600;color:#374151;border-bottom:1px solid #bfdbfe">Empresa</td><td style="border-bottom:1px solid #bfdbfe">${empresa.razao}</td></tr>` : ""}
    <tr><td style="font-weight:600;color:#374151;border-bottom:1px solid #bfdbfe">Sistema</td><td style="border-bottom:1px solid #bfdbfe">NEXUS SST · Technogov Soluções · gro-pgr.vercel.app</td></tr>
    <tr><td style="font-weight:600;color:#374151">Gerado em</td><td>${new Date().toLocaleString("pt-BR")}</td></tr>
  </table>
</div>

<div class="footer">
  NEXUS SST · Technogov Soluções · NHO 06 Fundacentro · NR-15 Anexo 3 · Modelo Liljegren (2008) · Open-Meteo API
</div>

<script>
function exportPDF() {
  if (typeof html2pdf === 'undefined') {
    alert('Biblioteca PDF não carregada. Use o botão Imprimir → Salvar como PDF.');
    return;
  }
  var bar = document.querySelector('.noprint');
  bar.style.display = 'none';
  html2pdf().set({
    margin: [14,18,14,18],
    filename: '${filename}',
    image: {type:'jpeg',quality:0.98},
    html2canvas: {scale:2,useCORS:true,logging:false},
    jsPDF: {unit:'mm',format:'a4',orientation:'portrait'}
  }).from(document.body).save().then(function(){bar.style.display='';}).catch(function(){bar.style.display='';});
}
</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Popup bloqueado. Permita popups para este site."); return; }
  w.document.write(html);
  w.document.close();
}
