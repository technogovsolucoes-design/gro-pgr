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
import { gerarLaudoIbutg } from "../services/laudoIbutg";

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

// ── Componente principal ──────────────────────────────────────────────────────
export default function IbutgPublico() {
  const [lat,      setLat]      = useState("");
  const [lon,      setLon]      = useState("");
  const [metab,    setMetab]    = useState(215);
  const [outdoor,  setOutdoor]  = useState(true);

  const [responsavel, setResponsavel] = useState({ nome: "", registro: "", empresa: "" });

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

            {/* Responsável técnico */}
            <div style={card({ border: "1px solid #bfdbfe", background: "#eff6ff" })}>
              <p style={{ fontSize: 10, color: "#1d4ed8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 10px" }}>
                🔏 Responsável Técnico (para o laudo)
              </p>
              {[
                { key: "nome",      label: "Nome completo",           ph: "Dr. João Silva" },
                { key: "registro",  label: "Registro (CRM / CREA / RRT)", ph: "CREA/SP 123456" },
                { key: "empresa",   label: "Empresa / Organização",   ph: "Empresa Ltda." },
              ].map(({ key, label: lbl, ph }) => (
                <div key={key} style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px", fontWeight: 500 }}>{lbl}</p>
                  <input
                    value={responsavel[key]}
                    onChange={e => setResponsavel(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={ph}
                    style={{ ...inputStyle, fontSize: 13 }}
                  />
                </div>
              ))}
            </div>

            {/* Botão laudo */}
            <button
              onClick={() => gerarLaudoIbutg({
                resultado, endereco, lat, lon, metab, atividadeLabel, outdoor,
                assinante: { ...responsavel, perfil: "Responsável Técnico" },
              })}
              style={{ width: "100%", padding: "14px", borderRadius: 12, border: `2px solid ${C.navyMid}`, background: "#eff6ff", color: C.navyMid, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>
              📄 Gerar Laudo Pericial (PDF)
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
