/**
 * Gerador de Laudo Pericial IBUTG — NEXUS SST
 * Usado por EstresseTermico.jsx (desktop) e IbutgPublico.jsx (mobile).
 *
 * @param {object} p
 * @param {object} p.resultado      DTO do cálculo IBUTG
 * @param {object|null} p.endereco  { display, logradouro, municipio, uf, cep }
 * @param {string} p.lat
 * @param {string} p.lon
 * @param {number|string} p.metab
 * @param {string} p.atividadeLabel
 * @param {boolean} p.outdoor
 * @param {object} p.assinante      { nome, registro, perfil, empresa }
 */
export function gerarLaudoIbutg({ resultado, endereco, lat, lon, metab, atividadeLabel, outdoor, assinante }) {
  const dataAvaliacao = new Date(resultado.dataCalculo).toLocaleString("pt-BR");
  const dataGeracao   = new Date().toLocaleString("pt-BR");
  const filename      = `Laudo_IBUTG_${new Date().toISOString().slice(0, 10)}.pdf`;

  const localStr = endereco
    ? [
        endereco.logradouro || "",
        endereco.municipio  ? `${endereco.municipio}/${endereco.uf}` : "",
        endereco.cep        ? `CEP ${endereco.cep}` : "",
      ].filter(Boolean).join(" — ")
    : `Lat: ${lat}, Lon: ${lon}`;
  const endFull = endereco?.display || `Lat: ${lat}, Lon: ${lon}`;

  const coresMap = { Aceitável: "#16a34a", Atenção: "#ca8a04", Crítico: "#dc2626", Proibido: "#7c3aed" };
  const cor = coresMap[resultado.nivelRisco] || "#1e293b";

  const formula = outdoor
    ? `IBUTG = 0,7 × T<sub>bn</sub> + 0,2 × T<sub>g</sub> + 0,1 × T<sub>bs</sub>
       = 0,7 × ${resultado.intermediarios.tbn} + 0,2 × ${resultado.intermediarios.tg} + 0,1 × ${resultado.intermediarios.tbs}
       = <strong>${resultado.ibutgValue}°C</strong>`
    : `IBUTG = 0,7 × T<sub>bn</sub> + 0,3 × T<sub>g</sub>
       = 0,7 × ${resultado.intermediarios.tbn} + 0,3 × ${resultado.intermediarios.tg}
       = <strong>${resultado.ibutgValue}°C</strong>`;

  const esocial = resultado.requerRegistroESocial
    ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:10px 14px;margin:12px 0">
        <strong style="color:#991b1b">⚠ Registro eSocial obrigatório:</strong>
        <span style="color:#991b1b"> Evento S-2220 — limite excedido em
        ${(resultado.ibutgValue - resultado.limiteNHO06).toFixed(1)}°C. NR-09 §9.3.5.4.</span>
       </div>`
    : `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:10px 14px;margin:12px 0">
        <span style="color:#15803d">✔ Dentro do limite NHO 06 — registro eSocial não obrigatório para este resultado.</span>
       </div>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Laudo IBUTG — NEXUS SST</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; padding: 24px 32px; line-height: 1.6; }
  #laudo-content { max-width: 760px; margin: 0 auto; }
  h1 { font-size: 16px; color: #0d2a5e; margin-bottom: 2px; }
  h2 { font-size: 11px; color: #0d2a5e; margin: 16px 0 6px; border-bottom: 1px solid #e2e8f0;
       padding-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  th { background: #0d2a5e; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10.5px; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  .resultado-box {
    text-align: center; padding: 16px; border-radius: 8px;
    border: 2px solid ${cor}; background: ${cor}18; margin: 10px 0;
  }
  .ibutg-val { font-size: 38px; font-weight: 800; color: ${cor}; line-height: 1; }
  .nivel { font-size: 14px; font-weight: 700; color: ${cor}; margin-top: 4px; }
  .assinatura-digital {
    border: 2px solid #0d2a5e; border-radius: 8px; padding: 12px 16px;
    margin: 20px 0 8px; background: #eff6ff;
  }
  .noprint { }
  @media print {
    .noprint { display: none !important; }
    body { padding: 0; }
    @page { size: A4; margin: 14mm 18mm; }
    h2 { page-break-after: avoid; }
  }
</style>
</head>
<body>

<!-- Barra de ações (não impressa) -->
<div class="noprint" style="background:#0d2a5e;padding:10px 16px;margin:-24px -32px 20px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
  <span style="color:#fff;font-weight:700;font-size:13px;flex:1">Laudo IBUTG — NEXUS SST</span>
  <button onclick="exportPDF()" style="background:#38b249;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700">
    ⬇ Baixar PDF
  </button>
  <button onclick="window.print()" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);padding:8px 18px;border-radius:6px;cursor:pointer;font-size:12px">
    🖨 Imprimir
  </button>
  <button onclick="window.close()" style="background:none;color:rgba(255,255,255,0.5);border:none;cursor:pointer;font-size:18px;padding:0 4px">✕</button>
</div>

<div id="laudo-content">

  <!-- Cabeçalho -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #0d2a5e">
    <div>
      <h1>LAUDO DE AVALIAÇÃO DE ESTRESSE TÉRMICO</h1>
      <p style="color:#64748b;font-size:10px;margin-top:2px">Índice de Bulbo Úmido e Termômetro de Globo (IBUTG)</p>
    </div>
    <div style="text-align:right;font-size:10px;color:#64748b">
      <p style="font-weight:700;color:#0d2a5e">NEXUS SST</p>
      <p>Technogov Soluções</p>
      <p>gro-pgr.vercel.app</p>
    </div>
  </div>

  <h2>1. Identificação do Local</h2>
  <table>
    <tr><td style="width:32%;font-weight:600">Local / Endereço</td><td>${localStr || "—"}</td></tr>
    <tr><td style="font-weight:600">Endereço completo</td><td>${endFull}</td></tr>
    <tr><td style="font-weight:600">Coordenadas geográficas</td><td>${lat}, ${lon}</td></tr>
    <tr><td style="font-weight:600">Data e hora da avaliação</td><td>${dataAvaliacao}</td></tr>
    <tr><td style="font-weight:600">Tipo de ambiente</td><td>${outdoor ? "Ao ar livre (ambiente externo)" : "Ambiente interno (coberto)"}</td></tr>
  </table>

  <h2>2. Atividade Avaliada</h2>
  <table>
    <tr><td style="width:32%;font-weight:600">Descrição</td><td>${atividadeLabel}</td></tr>
    <tr><td style="font-weight:600">Taxa metabólica</td><td>${metab} W (ISO 8996 / NHO 06 Tabela 1)</td></tr>
    <tr><td style="font-weight:600">Categoria metabólica</td><td>${resultado.categoria}</td></tr>
    <tr><td style="font-weight:600">Limite IBUTG — NHO 06</td><td>${resultado.limiteNHO06}°C (trabalho contínuo, 60 min)</td></tr>
  </table>

  <h2>3. Condições Climáticas</h2>
  <table>
    <thead><tr><th>Parâmetro</th><th>Símbolo</th><th>Valor</th><th>Unidade</th></tr></thead>
    <tbody>
      <tr><td>Temperatura do ar (bulbo seco)</td><td>T<sub>bs</sub></td><td>${resultado.condicoes.ta}</td><td>°C</td></tr>
      <tr><td>Umidade relativa do ar</td><td>UR</td><td>${resultado.condicoes.ur}</td><td>%</td></tr>
      <tr><td>Velocidade do vento</td><td>v</td><td>${resultado.condicoes.v}</td><td>m/s</td></tr>
      <tr><td>Irradiação horizontal global</td><td>GHI</td><td>${resultado.condicoes.ghi}</td><td>W/m²</td></tr>
      <tr><td>Fonte</td><td colspan="3">${resultado.fonte}${resultado.cacheado ? " (cache 1h)" : " (tempo real)"}</td></tr>
    </tbody>
  </table>

  <h2>4. Temperaturas Calculadas</h2>
  <table>
    <thead><tr><th>Temperatura</th><th>Símbolo</th><th>Valor</th><th>Metodologia</th></tr></thead>
    <tbody>
      <tr>
        <td>Bulbo úmido natural</td><td>T<sub>bn</sub></td><td>${resultado.intermediarios.tbn}°C</td>
        <td>Eq. psicrométrica natural — Sprung (1888) / NHO 06 §4.2 — A = 7,99×10⁻⁴ kPa/Pa</td>
      </tr>
      <tr>
        <td>Globo negro estimado (Ø 150mm)</td><td>T<sub>g</sub></td><td>${resultado.intermediarios.tg}°C</td>
        <td>Modelo Liljegren (2008) — balanço energético iterativo, Nu = 2 + 0,6·Re⁰˒⁵·Pr¹/³ — NHO 06 §5.2</td>
      </tr>
      <tr>
        <td>Bulbo seco</td><td>T<sub>bs</sub></td><td>${resultado.intermediarios.tbs}°C</td>
        <td>Open-Meteo API</td>
      </tr>
    </tbody>
  </table>

  <h2>5. Cálculo do IBUTG</h2>
  <p style="margin-bottom:10px;font-size:11px">${formula}</p>

  <div class="resultado-box">
    <div class="ibutg-val">${resultado.ibutgValue}°C</div>
    <div style="font-size:11px;color:${cor};margin:3px 0">IBUTG — ${outdoor ? "Ao ar livre" : "Ambiente interno"}</div>
    <div class="nivel">${resultado.nivelRisco}</div>
    <div style="font-size:10px;color:#64748b;margin-top:4px">
      Limite NHO 06: ${resultado.limiteNHO06}°C ·
      ${resultado.excedeLimite
        ? `<span style="color:${cor}">Excedido em ${(resultado.ibutgValue - resultado.limiteNHO06).toFixed(1)}°C</span>`
        : `<span style="color:#16a34a">Dentro do limite</span>`}
    </div>
  </div>

  ${esocial}

  <h2>6. Regime de Trabalho Recomendado (NR-15 Quadro 2)</h2>
  <table>
    <tr><td style="width:32%;font-weight:600">Regime</td><td>${resultado.recomendacaoPausa.desc}</td></tr>
    ${resultado.recomendacaoPausa.trabMin > 0 ? `
    <tr><td style="font-weight:600">Trabalho</td><td>${resultado.recomendacaoPausa.trabMin} min por hora</td></tr>
    <tr><td style="font-weight:600">Descanso</td><td>${resultado.recomendacaoPausa.descMin} min por hora</td></tr>` : ""}
  </table>

  <h2>7. Base Normativa</h2>
  <p style="font-size:10.5px;line-height:1.9;color:#374151">
    NHO 06 — Fundacentro (2025): Avaliação da Exposição Ocupacional ao Calor<br>
    NR-15 Anexo 3 — Limites de Tolerância para Exposição ao Calor (MTE)<br>
    NR-09 §9.3.5.4 — Programa de Prevenção de Riscos Ambientais<br>
    ISO 8996:2004 — Ergonomics of the thermal environment — Metabolic rate determination<br>
    Liljegren, J.C. et al. (2008): Modeling the Wet Bulb Globe Temperature Using Standard Meteorological Measurements —
    J. Occup. Environ. Hyg. 5(10):645-655
  </p>

  <!-- Assinatura Digital -->
  <div class="assinatura-digital">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <span style="font-size:20px">🔏</span>
      <span style="font-weight:700;color:#0d2a5e;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">
        Assinatura Digital — NEXUS SST
      </span>
    </div>
    <table style="margin:0">
      <tr><td style="width:28%;font-weight:600;color:#374151;border-bottom:1px solid #bfdbfe">Responsável Técnico</td>
          <td style="border-bottom:1px solid #bfdbfe">${assinante.nome || "___________________________"}</td></tr>
      <tr><td style="font-weight:600;color:#374151;border-bottom:1px solid #bfdbfe">Registro (CRM/CREA/RRT)</td>
          <td style="border-bottom:1px solid #bfdbfe">${assinante.registro || "___________________________"}</td></tr>
      <tr><td style="font-weight:600;color:#374151;border-bottom:1px solid #bfdbfe">Perfil / Função</td>
          <td style="border-bottom:1px solid #bfdbfe">${assinante.perfil || "___________________________"}</td></tr>
      <tr><td style="font-weight:600;color:#374151;border-bottom:1px solid #bfdbfe">Empresa</td>
          <td style="border-bottom:1px solid #bfdbfe">${assinante.empresa || "___________________________"}</td></tr>
      <tr><td style="font-weight:600;color:#374151;border-bottom:1px solid #bfdbfe">Sistema</td>
          <td style="border-bottom:1px solid #bfdbfe">NEXUS SST · Technogov Soluções · gro-pgr.vercel.app</td></tr>
      <tr><td style="font-weight:600;color:#374151">Gerado em</td>
          <td>${dataGeracao}</td></tr>
    </table>
  </div>

  <!-- Rodapé -->
  <div style="margin-top:10px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;display:flex;justify-content:space-between">
    <span>NEXUS SST · Technogov Soluções · NHO 06 Fundacentro · NR-15 Anexo 3 · Modelo Liljegren (2008)</span>
    <span>${dataGeracao}</span>
  </div>

</div><!-- /laudo-content -->

<script>
function exportPDF() {
  if (typeof html2pdf === 'undefined') {
    alert('Biblioteca PDF não carregada. Verifique sua conexão e tente novamente, ou use o botão Imprimir.');
    return;
  }
  const btns = document.querySelector('.noprint');
  btns.style.display = 'none';
  html2pdf()
    .set({
      margin:     [14, 18, 14, 18],
      filename:   '${filename}',
      image:      { type: 'jpeg', quality: 0.98 },
      html2canvas:{ scale: 2, useCORS: true, logging: false },
      jsPDF:      { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(document.getElementById('laudo-content'))
    .save()
    .then(() => { btns.style.display = ''; })
    .catch(() => { btns.style.display = ''; alert('Erro ao gerar PDF. Tente o botão Imprimir → Salvar como PDF.'); });
}
</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Popup bloqueado. Permita popups para este site."); return; }
  w.document.write(html);
  w.document.close();
}
