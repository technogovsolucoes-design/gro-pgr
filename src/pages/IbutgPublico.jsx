/**
 * Página pública mobile de cálculo IBUTG — /ibutg
 * Sem autenticação. Layout otimizado para celular + geração de laudo pericial.
 */
import { useState } from "react";
import { NexusLogo } from "../assets/NexusLogo";
import {
  calcularEstresseTermico,
  obterLocalizacao,
  obterEndereco,
  ATIVIDADES_METABOLICAS,
  CORES_RISCO,
} from "../services/heatStressClient";

const C = {
  navy:    "#0d2a5e",
  navyMid: "#1652a1",
  green:   "#16a34a",
  red:     "#dc2626",
  muted:   "#64748b",
  border:  "#e2e8f0",
  bg:      "#f8fafc",
  white:   "#ffffff",
};

// ── Utilitários de estilo inline ─────────────────────────────────────────────
const card = (extra = {}) => ({
  background: C.white,
  borderRadius: 12,
  padding: "16px",
  boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
  marginBottom: 12,
  ...extra,
});

const label = { fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 0.4 };
const inputStyle = { width: "100%", padding: "11px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 15, fontFamily: "inherit", boxSizing: "border-box", color: "#1e293b" };

// ── Gerar laudo HTML para impressão ─────────────────────────────────────────
function gerarLaudo(resultado, endereco, lat, lon, metab, atividadeLabel, outdoor) {
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

  const html = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><title>Laudo IBUTG — NEXUS SST</title>
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
  .noprint{display:none}
  .footer{margin-top:24px;font-size:9.5px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:8px}
  .assinatura{margin-top:36px;display:flex;gap:60px}
  .assinatura div{border-top:1px solid #555;padding-top:4px;font-size:10px;min-width:160px}
  @media print{.noprint{display:none}}
</style></head><body>

<button class="noprint" onclick="window.print()" style="background:#0d2a5e;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;margin-bottom:20px;font-size:12px">Imprimir / Salvar PDF</button>

<h1>LAUDO DE AVALIAÇÃO DE ESTRESSE TÉRMICO — IBUTG</h1>
<p style="color:#64748b;font-size:10px;margin-bottom:14px">Sistema NEXUS SST · Technogov Soluções · NHO 06 Fundacentro · NR-15 Anexo 3</p>

<h2>1. Identificação do Local</h2>
<table>
  <tr><td style="width:35%;font-weight:600">Local / Endereço</td><td>${localStr}</td></tr>
  <tr><td style="font-weight:600">Endereço completo</td><td>${endFull}</td></tr>
  <tr><td style="font-weight:600">Coordenadas geográficas</td><td>${lat}, ${lon}</td></tr>
  <tr><td style="font-weight:600">Data e hora da avaliação</td><td>${data}</td></tr>
  <tr><td style="font-weight:600">Ambiente</td><td>${outdoor ? "Ao ar livre (externo)" : "Ambiente interno (coberto)"}</td></tr>
</table>

<h2>2. Atividade Avaliada</h2>
<table>
  <tr><td style="width:35%;font-weight:600">Descrição da atividade</td><td>${atividadeLabel}</td></tr>
  <tr><td style="font-weight:600">Taxa metabólica</td><td>${metab} W (ISO 8996 / NHO 06 Tabela 1)</td></tr>
  <tr><td style="font-weight:600">Categoria metabólica</td><td>${resultado.categoria}</td></tr>
  <tr><td style="font-weight:600">Limite IBUTG — NHO 06</td><td>${resultado.limiteNHO06}°C (trabalho contínuo 60 min)</td></tr>
</table>

<h2>3. Condições Climáticas (Open-Meteo)</h2>
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

<h2>4. Temperaturas Calculadas</h2>
<table>
  <thead><tr><th>Temperatura</th><th>Símbolo</th><th>Valor</th><th>Método</th></tr></thead>
  <tbody>
    <tr><td>Bulbo úmido natural</td><td>T<sub>bn</sub></td><td>${resultado.intermediarios.tbn}°C</td><td>Equação psicrométrica natural — Sprung (1888) / NHO 06 §4.2 — A = 7,99×10⁻⁴ kPa/Pa</td></tr>
    <tr><td>Globo negro estimado (Ø 150mm)</td><td>T<sub>g</sub></td><td>${resultado.intermediarios.tg}°C</td><td>Modelo Liljegren (2008) — balanço energético, Nu = 2 + 0,6·Re⁰˒⁵·Pr¹/³ — NHO 06 §5.2</td></tr>
    <tr><td>Bulbo seco</td><td>T<sub>bs</sub></td><td>${resultado.intermediarios.tbs}°C</td><td>Open-Meteo API</td></tr>
  </tbody>
</table>

<h2>5. Cálculo do IBUTG</h2>
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

<h2>6. Regime de Trabalho Recomendado (NR-15 Quadro 2)</h2>
<table>
  <tr><td style="width:35%;font-weight:600">Regime</td><td>${resultado.recomendacaoPausa.desc}</td></tr>
  ${resultado.recomendacaoPausa.trabMin > 0 ? `
  <tr><td style="font-weight:600">Trabalho</td><td>${resultado.recomendacaoPausa.trabMin} min por hora</td></tr>
  <tr><td style="font-weight:600">Descanso</td><td>${resultado.recomendacaoPausa.descMin} min por hora</td></tr>` : ""}
</table>

<h2>7. Base Normativa</h2>
<p style="font-size:10.5px;line-height:1.8;color:#374151">
  NHO 06 — Fundacentro (2025): Avaliação da Exposição Ocupacional ao Calor<br>
  NR-15 Anexo 3 — Limites de Tolerância para Exposição ao Calor (MTE)<br>
  NR-09 §9.3.5.4 — Programa de Prevenção de Riscos Ambientais<br>
  ISO 8996:2004 — Ergonomics of the thermal environment — Metabolic rate determination<br>
  Liljegren, J.C. et al. (2008): Modeling the Wet Bulb Globe Temperature Using Standard Meteorological Measurements — J. Occup. Environ. Hyg. 5(10)
</p>

<div class="assinatura">
  <div>Responsável Técnico<br><br><br>Nome / CRM ou CREA:<br>Data: ___/___/______</div>
  <div>Empresa Avaliada<br><br><br>Razão Social:<br>CNPJ:</div>
</div>

<div class="footer">
  Laudo gerado automaticamente pelo sistema NEXUS SST (Technogov Soluções) · ${new Date().toLocaleString("pt-BR")} ·
  Dados climáticos: Open-Meteo (free, global coverage) · Cálculo: Modelo Liljegren (2008) / NHO 06 Fundacentro
</div>
</body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function IbutgPublico() {
  const [lat,      setLat]      = useState("");
  const [lon,      setLon]      = useState("");
  const [metab,    setMetab]    = useState(215);
  const [outdoor,  setOutdoor]  = useState(true);

  const [resultado,  setResultado]  = useState(null);
  const [endereco,   setEndereco]   = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [geoLoad,    setGeoLoad]    = useState(false);
  const [erro,       setErro]       = useState("");

  const atividadeLabel = ATIVIDADES_METABOLICAS.find(a => a.w === +metab)?.label || `Personalizado — ${metab} W`;
  const coresRes = resultado ? (CORES_RISCO[resultado.nivelRisco] ?? CORES_RISCO["Aceitável"]) : null;

  async function usarGPS() {
    setGeoLoad(true);
    setErro("");
    try {
      const { latitude, longitude } = await obterLocalizacao();
      setLat(latitude.toFixed(6));
      setLon(longitude.toFixed(6));
      obterEndereco(latitude, longitude).then(setEndereco);
    } catch (e) {
      setErro(e.message);
    } finally {
      setGeoLoad(false);
    }
  }

  async function calcular() {
    if (!lat || !lon) { setErro("Use o GPS ou informe as coordenadas."); return; }
    setErro("");
    setCarregando(true);
    try {
      const dto = await calcularEstresseTermico({
        latitude:       parseFloat(lat),
        longitude:      parseFloat(lon),
        taxaMetabolica: parseFloat(metab),
        outdoor,
      });
      setResultado(dto);
      if (!endereco) obterEndereco(parseFloat(lat), parseFloat(lon)).then(setEndereco);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f0f9ff", fontFamily: "system-ui,sans-serif", color: "#1e293b" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(90deg,#0d2a5e,#1652a1)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <NexusLogo size={28} />
        <div>
          <p style={{ color: "#fff", fontWeight: 800, fontSize: 14, margin: 0 }}>
            NEX<span style={{ color: "#38b249" }}>US</span>
            <span style={{ fontWeight: 400, fontSize: 10, color: "rgba(255,255,255,0.6)", marginLeft: 8 }}>Estresse Térmico</span>
          </p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, margin: 0 }}>IBUTG · NHO 06 Fundacentro · NR-15</p>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 14px 60px" }}>

        {/* Card GPS */}
        <div style={card()}>
          <span style={label}>📍 Localização</span>
          <button onClick={usarGPS} disabled={geoLoad}
            style={{ width: "100%", padding: "14px 12px", borderRadius: 10, border: `2px solid ${C.navyMid}`, background: "#eff6ff", color: C.navyMid, cursor: geoLoad ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
            {geoLoad ? "⏳ Obtendo GPS…" : "📡 Usar localização atual (GPS)"}
          </button>

          {endereco && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
              <p style={{ fontSize: 12, color: "#15803d", fontWeight: 600, margin: "0 0 2px" }}>
                {endereco.logradouro || endereco.display.split(",")[0]}
                {endereco.municipio ? ` — ${endereco.municipio}/${endereco.uf}` : ""}
              </p>
              {endereco.cep && <p style={{ fontSize: 11, color: "#166534", margin: 0 }}>CEP {endereco.cep}</p>}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Latitude", val: lat, set: setLat, ph: "-23.5505" },
              { label: "Longitude", val: lon, set: setLon, ph: "-46.6333" },
            ].map(({ label: lbl, val, set, ph }) => (
              <div key={lbl}>
                <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px", fontWeight: 500 }}>{lbl}</p>
                <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                  style={{ ...inputStyle, fontSize: 13 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Card Atividade */}
        <div style={card()}>
          <span style={label}>⚙️ Atividade e Ambiente</span>
          <p style={{ fontSize: 11, color: C.muted, margin: "0 0 6px", fontWeight: 500 }}>Tipo de atividade (ISO 8996 / NHO 06)</p>
          <select value={metab} onChange={e => setMetab(e.target.value)}
            style={{ ...inputStyle, marginBottom: 12 }}>
            {ATIVIDADES_METABOLICAS.map(a => (
              <option key={a.w} value={a.w}>{a.label} ({a.w} W)</option>
            ))}
          </select>

          <p style={{ fontSize: 11, color: C.muted, margin: "0 0 6px", fontWeight: 500 }}>Tipo de ambiente</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[["☀️ Ao ar livre", true], ["🏭 Ambiente interno", false]].map(([lbl, val]) => (
              <button key={String(val)} onClick={() => setOutdoor(val)}
                style={{ padding: "12px 8px", borderRadius: 8, border: `2px solid ${outdoor === val ? C.navyMid : C.border}`, background: outdoor === val ? C.navyMid : C.white, color: outdoor === val ? "#fff" : C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: C.red }}>
            {erro}
          </div>
        )}

        {/* Botão calcular */}
        <button onClick={calcular} disabled={carregando || !lat || !lon}
          style={{ width: "100%", padding: "16px", borderRadius: 12, border: "none", background: (carregando || !lat || !lon) ? C.border : C.navyMid, color: (carregando || !lat || !lon) ? C.muted : "#fff", fontSize: 16, fontWeight: 700, cursor: (carregando || !lat || !lon) ? "not-allowed" : "pointer", fontFamily: "inherit", marginBottom: 16, boxShadow: lat && lon ? "0 4px 12px rgba(22,82,161,0.3)" : "none" }}>
          {carregando ? "⏳ Calculando IBUTG…" : "🌡️ Calcular IBUTG"}
        </button>

        {/* Resultado */}
        {resultado && coresRes && (
          <>
            {/* IBUTG principal */}
            <div style={{ ...card({ borderTop: `4px solid ${coresRes.border}`, textAlign: "center", padding: "20px 16px" }) }}>
              <div style={{ width: 120, height: 120, borderRadius: "50%", margin: "0 auto 12px", background: coresRes.bg, border: `4px solid ${coresRes.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontSize: 36, fontWeight: 800, color: coresRes.text, margin: 0, lineHeight: 1 }}>{resultado.ibutgValue}</p>
                <p style={{ fontSize: 11, color: coresRes.text, margin: "2px 0 0", fontWeight: 600 }}>°C IBUTG</p>
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: coresRes.text, margin: "0 0 4px" }}>{resultado.nivelRisco}</p>
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                Limite NHO 06: <strong style={{ color: C.navy }}>{resultado.limiteNHO06}°C</strong>
                {resultado.excedeLimite && <span style={{ color: C.red }}> · Excedido em {(resultado.ibutgValue - resultado.limiteNHO06).toFixed(1)}°C</span>}
              </p>
            </div>

            {/* Local */}
            <div style={card({ background: "#f8fafc" })}>
              <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, margin: "0 0 6px" }}>📍 Local da Avaliação</p>
              {endereco ? (
                <>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.navy, margin: "0 0 2px" }}>
                    {endereco.logradouro || endereco.display.split(",")[0]}
                    {endereco.municipio ? ` — ${endereco.municipio}/${endereco.uf}` : ""}
                    {endereco.cep ? ` — CEP ${endereco.cep}` : ""}
                  </p>
                  <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px" }}>{endereco.display}</p>
                </>
              ) : (
                <p style={{ fontSize: 12, color: C.muted, margin: "0 0 4px", fontStyle: "italic" }}>Endereço não obtido — use o GPS</p>
              )}
              <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                {lat}, {lon} · {new Date(resultado.dataCalculo).toLocaleString("pt-BR")}
              </p>
            </div>

            {/* Pausa */}
            <div style={card({ background: resultado.excedeLimite ? "#fefce8" : "#f0fdf4", border: `1px solid ${resultado.excedeLimite ? "#fde047" : "#86efac"}` })}>
              <p style={{ fontSize: 11, fontWeight: 700, color: resultado.excedeLimite ? "#854d0e" : "#15803d", margin: "0 0 4px" }}>
                ⏱ Regime de trabalho — NR-15 Quadro 2
              </p>
              <p style={{ fontSize: 13, color: "#1e293b", margin: 0 }}>{resultado.recomendacaoPausa.desc}</p>
              {resultado.recomendacaoPausa.trabMin > 0 && (
                <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Trabalho: <strong style={{ color: C.navy }}>{resultado.recomendacaoPausa.trabMin} min</strong></span>
                  <span style={{ fontSize: 12, color: C.muted }}>Descanso: <strong style={{ color: C.navy }}>{resultado.recomendacaoPausa.descMin} min</strong></span>
                </div>
              )}
            </div>

            {/* eSocial */}
            {resultado.requerRegistroESocial && (
              <div style={card({ background: "#fef2f2", border: "1px solid #fca5a5" })}>
                <p style={{ fontSize: 12, color: "#991b1b", margin: 0 }}>
                  <strong>⚠ Registro eSocial obrigatório:</strong> S-2220 — limite excedido em {(resultado.ibutgValue - resultado.limiteNHO06).toFixed(1)}°C (NR-09 §9.3.5.4)
                </p>
              </div>
            )}

            {/* Condições climáticas */}
            <div style={card()}>
              <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, margin: "0 0 10px" }}>🌤 Condições Climáticas</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Temp. Ar (Tbs)", val: resultado.condicoes.ta, unit: "°C" },
                  { label: "Umidade",         val: resultado.condicoes.ur,  unit: "%" },
                  { label: "Vento",           val: resultado.condicoes.v,   unit: "m/s" },
                  { label: "GHI",             val: resultado.condicoes.ghi, unit: "W/m²" },
                  { label: "Tbn (bulbo úmido)", val: resultado.intermediarios.tbn, unit: "°C" },
                  { label: "Tg (globo negro)",  val: resultado.intermediarios.tg,  unit: "°C" },
                ].map(({ label: lbl, val, unit }) => (
                  <div key={lbl} style={{ background: C.bg, borderRadius: 8, padding: "8px 10px" }}>
                    <p style={{ fontSize: 10, color: C.muted, margin: "0 0 2px", fontWeight: 500 }}>{lbl}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: C.navy, margin: 0 }}>
                      {val} <span style={{ fontSize: 10, fontWeight: 400, color: C.muted }}>{unit}</span>
                    </p>
                  </div>
                ))}
              </div>
              {resultado.cacheado && <p style={{ fontSize: 10, color: C.muted, margin: "8px 0 0" }}>Dados do cache Open-Meteo (atualização por hora)</p>}
            </div>

            {/* Botão laudo */}
            <button
              onClick={() => gerarLaudo(resultado, endereco, lat, lon, metab, atividadeLabel, outdoor)}
              style={{ width: "100%", padding: "14px", borderRadius: 12, border: `2px solid ${C.navyMid}`, background: "#eff6ff", color: C.navyMid, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>
              📄 Gerar Laudo Pericial
            </button>
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 10, color: C.muted, marginTop: 24, lineHeight: 1.6 }}>
          NEXUS SST · Technogov Soluções<br />
          NHO 06 Fundacentro · NR-15 Anexo 3 · Modelo Liljegren (2008)<br />
          Dados climáticos: Open-Meteo API
        </p>
      </div>
    </div>
  );
}
