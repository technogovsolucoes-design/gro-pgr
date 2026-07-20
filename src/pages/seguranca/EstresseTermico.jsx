import { useState } from "react";
import {
  Thermometer, Wind, Droplets, Sun, MapPin, Loader,
  AlertTriangle, CheckCircle, XCircle, Clock, Info,
  RefreshCw, ChevronDown, FileText,
} from "lucide-react";
import { C } from "../../constants";
import { Btn, Card, SectionTitle } from "../../components/ui";
import {
  calcularEstresseTermico,
  obterLocalizacao,
  obterEndereco,
  ATIVIDADES_METABOLICAS,
  CORES_RISCO,
} from "../../services/heatStressClient";
import { gerarLaudoIbutg } from "../../services/laudoIbutg";
import { useApp } from "../../context/AppContext";

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function MedidaCard({ icon, label, valor, unidade, cor = C.navyMid }) {
  return (
    <div style={{ background: C.bg, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${cor}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 10, color: C.muted, margin: "0 0 1px", fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: 0 }}>
          {valor} <span style={{ fontSize: 10, fontWeight: 400, color: C.muted }}>{unidade}</span>
        </p>
      </div>
    </div>
  );
}

function GaugeIBUTG({ valor, limite, nivelRisco }) {
  const cores = CORES_RISCO[nivelRisco] ?? CORES_RISCO["Aceitável"];
  const pct   = Math.min(100, Math.max(0, ((valor - 10) / (55 - 10)) * 100));

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 140, height: 140, borderRadius: "50%", margin: "0 auto",
        background: `conic-gradient(${cores.border} ${pct}%, ${C.bg} ${pct}%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 0 8px ${cores.bg}, 0 0 0 10px ${cores.border}`,
        position: "relative",
      }}>
        <div style={{ width: 110, height: 110, borderRadius: "50%", background: cores.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: 32, fontWeight: 800, color: cores.text, margin: 0, lineHeight: 1 }}>{valor}</p>
          <p style={{ fontSize: 11, color: cores.text, margin: "2px 0 0", fontWeight: 600 }}>°C IBUTG</p>
        </div>
      </div>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>
        Limite NHO 06: <strong style={{ color: C.navy }}>{limite}°C</strong>
      </p>
    </div>
  );
}

function NivelRiscoChip({ nivelRisco }) {
  const cores = CORES_RISCO[nivelRisco] ?? CORES_RISCO["Aceitável"];
  const icons = {
    "Aceitável": <CheckCircle size={14} />,
    "Atenção":   <AlertTriangle size={14} />,
    "Crítico":   <AlertTriangle size={14} />,
    "Proibido":  <XCircle size={14} />,
  };
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "8px 16px", borderRadius: 20,
      background: cores.bg, color: cores.text,
      border: `1px solid ${cores.border}`, fontWeight: 700, fontSize: 13,
    }}>
      {icons[nivelRisco]}
      {nivelRisco}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────
export default function EstresseTermico() {
  const { userProfile } = useApp();

  // ── Inputs ──
  const [lat,      setLat]      = useState("");
  const [lon,      setLon]      = useState("");
  const [metab,    setMetab]    = useState(215);
  const [outdoor,  setOutdoor]  = useState(true);
  const [manual,   setManual]   = useState(false);
  const [manualW,  setManualW]  = useState({ ta: "", ur: "", v: "", ghi: "" });

  // ── State ──
  const [resultado,  setResultado]  = useState(null);
  const [endereco,   setEndereco]   = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [geoLoad,    setGeoLoad]    = useState(false);
  const [erro,       setErro]       = useState("");
  const [showTecnico, setShowTecnico] = useState(false);

  // ── Geolocation ──
  async function usarLocalizacao() {
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

  // ── Calculate ──
  async function calcular() {
    if (!lat || !lon)  { setErro("Informe latitude e longitude."); return; }
    if (!metab)        { setErro("Informe a taxa metabólica."); return; }
    setErro("");
    setCarregando(true);

    try {
      const input = {
        latitude:       parseFloat(lat),
        longitude:      parseFloat(lon),
        taxaMetabolica: parseFloat(metab),
        outdoor,
        ...(manual && {
          weatherOverride: {
            ta:  parseFloat(manualW.ta),
            ur:  parseFloat(manualW.ur),
            v:   parseFloat(manualW.v),
            ghi: parseFloat(manualW.ghi),
          },
        }),
      };

      const dto = await calcularEstresseTermico(input);
      setResultado(dto);
      if (!endereco && lat && lon) obterEndereco(parseFloat(lat), parseFloat(lon)).then(setEndereco);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  const coresRes = resultado ? (CORES_RISCO[resultado.nivelRisco] ?? CORES_RISCO["Aceitável"]) : null;
  const atividadeLabel = ATIVIDADES_METABOLICAS.find(a => a.w === +metab)?.label || `Personalizado — ${metab} W`;

  return (
    <div>
      {/* ── Cabeçalho regulatório ─────────────────────────────────────────── */}
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 8, alignItems: "flex-start" }}>
        <Info size={13} color="#1d4ed8" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 11, color: "#1e40af", margin: 0 }}>
          <strong>Base normativa:</strong> NHO 06 Fundacentro (2025) · NR-15 Anexo 3 · NR-09 · Modelo Liljegren (2008) ·
          Dados climáticos: Open-Meteo API (GHI, T<sub>a</sub>, UR, <em>v</em>)
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "start" }}>

        {/* ── Painel de inputs ──────────────────────────────────────────────── */}
        <div>
          <Card>
            <SectionTitle><MapPin size={14} /> Localização</SectionTitle>

            <button onClick={usarLocalizacao} disabled={geoLoad}
              style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.navyMid}`, background: "#eff6ff", color: C.navyMid, cursor: geoLoad ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", marginBottom: 10 }}>
              {geoLoad ? <Loader size={12} /> : <MapPin size={12} />}
              {geoLoad ? "Obtendo localização…" : "Usar localização atual (GPS)"}
            </button>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {[
                { label: "Latitude *", val: lat, set: setLat, ph: "-23.5505" },
                { label: "Longitude *", val: lon, set: setLon, ph: "-46.6333" },
              ].map(({ label, val, set, ph }) => (
                <div key={label}>
                  <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px", fontWeight: 500 }}>{label}</p>
                  <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>

            <SectionTitle style={{ marginTop: 12 }}><Thermometer size={14} /> Atividade / Metabolismo</SectionTitle>

            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px", fontWeight: 500 }}>Tipo de atividade (ISO 8996 / NHO 06)</p>
              <select value={metab} onChange={e => setMetab(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: "inherit", color: C.text, background: C.white }}>
                {ATIVIDADES_METABOLICAS.map(a => (
                  <option key={a.w} value={a.w}>{a.label} — {a.w} W</option>
                ))}
                <option value="">Personalizado…</option>
              </select>
            </div>

            {(metab === "" || !ATIVIDADES_METABOLICAS.some(a => a.w === +metab)) && (
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px", fontWeight: 500 }}>Taxa metabólica (W) *</p>
                <input type="number" min="50" max="800" value={metab} onChange={e => setMetab(e.target.value)} placeholder="ex: 300"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
            )}

            {/* Ambiente */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[["Ao ar livre", true], ["Ambiente interno", false]].map(([lbl, val]) => (
                <button key={String(val)} onClick={() => setOutdoor(val)}
                  style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: `1px solid ${outdoor === val ? C.navyMid : C.border}`, background: outdoor === val ? C.navyMid : C.white, color: outdoor === val ? "#fff" : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {lbl}
                </button>
              ))}
            </div>

            {/* Dados manuais (override) */}
            <button onClick={() => setManual(p => !p)}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 11, fontFamily: "inherit", marginBottom: manual ? 8 : 4 }}>
              <ChevronDown size={12} style={{ transform: manual ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              {manual ? "Ocultar" : "Inserir dados climáticos manualmente"}
            </button>

            {manual && (
              <div style={{ background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 10, color: C.muted, margin: "0 0 8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Override da API de clima</p>
                {[
                  { key: "ta",  label: "T_a — Temperatura do ar (°C)", ph: "32" },
                  { key: "ur",  label: "UR — Umidade relativa (%)",    ph: "75" },
                  { key: "v",   label: "v — Velocidade do vento (m/s)", ph: "1.5" },
                  { key: "ghi", label: "GHI — Irradiação Global (W/m²)", ph: "650" },
                ].map(({ key, label, ph }) => (
                  <div key={key} style={{ marginBottom: 6 }}>
                    <p style={{ fontSize: 10, color: C.muted, margin: "0 0 3px", fontWeight: 500 }}>{label}</p>
                    <input type="number" value={manualW[key]} onChange={e => setManualW(p => ({ ...p, [key]: e.target.value }))} placeholder={ph}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
            )}

            {erro && (
              <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 6, padding: "8px 12px", fontSize: 11, color: C.red, marginTop: 8 }}>
                {erro}
              </div>
            )}

            <Btn onClick={calcular} color={C.navyMid} disabled={carregando}
              icon={carregando ? <Loader size={13} /> : <Thermometer size={13} />}
              style={{ marginTop: 10 }}>
              {carregando ? "Calculando IBUTG…" : "Calcular IBUTG"}
            </Btn>
          </Card>

          {/* Legenda NHO 06 */}
          <Card style={{ marginTop: 12 }}>
            <SectionTitle><Info size={14} /> Limites NHO 06 / NR-15</SectionTitle>
            {[
              { cat: "Leve",         mw: "≤ 204 W",   lim: "30°C" },
              { cat: "Moderado",     mw: "≤ 407 W",   lim: "28°C" },
              { cat: "Pesado",       mw: "≤ 570 W",   lim: "26°C" },
              { cat: "Muito Pesado", mw: "> 570 W",   lim: "25°C" },
            ].map(({ cat, mw, lim }) => (
              <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.bg}`, fontSize: 11 }}>
                <span style={{ color: C.navy, fontWeight: 500 }}>{cat} <span style={{ color: C.muted, fontWeight: 400 }}>({mw})</span></span>
                <span style={{ fontWeight: 700, color: C.navyMid }}>IBUTG ≤ {lim}</span>
              </div>
            ))}
            <p style={{ fontSize: 9.5, color: C.muted, margin: "8px 0 0", lineHeight: 1.5 }}>
              Trabalho contínuo (60 min). Excedido o limite, aplicar regime de pausas conforme NR-15 Quadro 2.
              Registro eSocial S-2220 obrigatório quando limite excedido (NR-09 §9.3.5.4).
            </p>
          </Card>
        </div>

        {/* ── Painel de resultados ──────────────────────────────────────────── */}
        <div>
          {!resultado && !carregando && (
            <div style={{ background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
              <Thermometer size={40} color={C.border} style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, color: C.muted, margin: "0 0 4px", fontWeight: 600 }}>Aguardando cálculo</p>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Preencha os dados ao lado e clique em Calcular IBUTG</p>
            </div>
          )}

          {carregando && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
              <Loader size={32} color={C.navyMid} style={{ marginBottom: 12, animation: "spin 1s linear infinite" }} />
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Buscando dados climáticos e calculando IBUTG…</p>
            </div>
          )}

          {resultado && !carregando && (
            <div>
              {/* ── Resultado principal ── */}
              <Card style={{ borderTop: `4px solid ${coresRes.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
                  <GaugeIBUTG valor={resultado.ibutgValue} limite={resultado.limiteNHO06} nivelRisco={resultado.nivelRisco} />

                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 11, color: C.muted, margin: "0 0 6px", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>Nível de Risco</p>
                      <NivelRiscoChip nivelRisco={resultado.nivelRisco} />
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px", fontWeight: 500 }}>Categoria metabólica</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.navy, margin: 0 }}>{resultado.categoria}</p>
                    </div>

                    <div style={{ marginBottom: 4 }}>
                      <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px", fontWeight: 500 }}>Ambiente avaliado</p>
                      <p style={{ fontSize: 12, color: C.text, margin: 0, textTransform: "capitalize" }}>{resultado.ibutgTipo}</p>
                    </div>
                  </div>
                </div>

                {/* Pausa recomendada */}
                <div style={{ background: resultado.excedeLimite ? "#fef9c3" : "#f0fdf4", border: `1px solid ${resultado.excedeLimite ? "#fde047" : "#86efac"}`, borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <Clock size={14} color={resultado.excedeLimite ? "#854d0e" : "#15803d"} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: resultado.excedeLimite ? "#854d0e" : "#15803d", margin: "0 0 2px" }}>
                      Regime de trabalho recomendado (NR-15 Quadro 2)
                    </p>
                    <p style={{ fontSize: 12, color: C.text, margin: 0 }}>{resultado.recomendacaoPausa.desc}</p>
                    {resultado.recomendacaoPausa.trabMin > 0 && (
                      <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: C.muted }}>
                          Trabalho: <strong style={{ color: C.navy }}>{resultado.recomendacaoPausa.trabMin} min</strong>
                        </span>
                        <span style={{ fontSize: 11, color: C.muted }}>
                          Descanso: <strong style={{ color: C.navy }}>{resultado.recomendacaoPausa.descMin} min</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* eSocial alert */}
                {resultado.requerRegistroESocial && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
                    <AlertTriangle size={14} color={C.red} style={{ flexShrink: 0 }} />
                    <p style={{ fontSize: 11, color: "#991b1b", margin: 0 }}>
                      <strong>Registro eSocial obrigatório:</strong> S-2220 (Monitoramento da Saúde) —
                      limite NHO 06 excedido em {(resultado.ibutgValue - resultado.limiteNHO06).toFixed(1)}°C.
                      Conforme NR-09 §9.3.5.4 e Portaria MTE.
                    </p>
                  </div>
                )}
              </Card>

              {/* ── Local da avaliação (para laudo) ── */}
              <Card style={{ marginTop: 12, background: "#f8fafc" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <MapPin size={14} color={C.navyMid} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, color: C.muted, margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Local da Avaliação</p>
                    {endereco ? (
                      <>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.navy, margin: "0 0 2px" }}>
                          {endereco.logradouro || endereco.display.split(",")[0]}
                          {endereco.municipio ? ` — ${endereco.municipio}/${endereco.uf}` : ""}
                          {endereco.cep ? ` — CEP ${endereco.cep}` : ""}
                        </p>
                        <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{endereco.display}</p>
                      </>
                    ) : (
                      <p style={{ fontSize: 12, color: C.muted, margin: 0, fontStyle: "italic" }}>Use o botão GPS para obter o endereço automaticamente</p>
                    )}
                    <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 0" }}>
                      Coordenadas: {lat}, {lon} · Avaliado em: {new Date(resultado.dataCalculo).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </Card>

              {/* ── Condições climáticas ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <Card>
                  <SectionTitle><Sun size={14} /> Condições Climáticas</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <MedidaCard icon={<Thermometer size={14} color="#dc2626" />} label="Temp. Ar (Tbs)" valor={resultado.condicoes.ta} unidade="°C" cor="#dc2626" />
                    <MedidaCard icon={<Droplets size={14} color="#0891b2" />}    label="Umid. Relativa" valor={resultado.condicoes.ur}  unidade="%"   cor="#0891b2" />
                    <MedidaCard icon={<Wind size={14} color="#0ea5e9" />}         label="Vento"          valor={resultado.condicoes.v}   unidade="m/s" cor="#0ea5e9" />
                    <MedidaCard icon={<Sun size={14} color="#f59e0b" />}          label="GHI"            valor={resultado.condicoes.ghi} unidade="W/m²" cor="#f59e0b" />
                  </div>
                  {resultado.cacheado && (
                    <p style={{ fontSize: 10, color: C.muted, margin: "8px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                      <RefreshCw size={10} /> Dados do cache (Open-Meteo, atualizado por hora)
                    </p>
                  )}
                </Card>

                <Card>
                  <SectionTitle><Thermometer size={14} /> Temperaturas Intermediárias</SectionTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <MedidaCard icon={<Droplets size={14} color="#0891b2" />} label="Tbn — Bulbo úmido natural" valor={resultado.intermediarios.tbn} unidade="°C" cor="#0891b2" />
                    <MedidaCard icon={<Sun size={14} color="#f59e0b" />}      label="Tg — Globo negro (estimado)" valor={resultado.intermediarios.tg}  unidade="°C" cor="#f59e0b" />
                    <MedidaCard icon={<Thermometer size={14} color="#dc2626" />} label="Tbs — Bulbo seco" valor={resultado.intermediarios.tbs} unidade="°C" cor="#dc2626" />
                  </div>
                  <p style={{ fontSize: 9.5, color: C.muted, margin: "10px 0 0", lineHeight: 1.5 }}>
                    Tg estimado via modelo Liljegren (2008). Tbn via equação psicrométrica natural (A=7.99×10⁻⁴ kPa/Pa).
                  </p>
                </Card>
              </div>

              {/* ── Detalhes técnicos (colapsável) ── */}
              <Card style={{ marginTop: 12 }}>
                <button onClick={() => setShowTecnico(p => !p)}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: C.navyMid, fontSize: 12, fontWeight: 600, fontFamily: "inherit", padding: 0 }}>
                  <ChevronDown size={14} style={{ transform: showTecnico ? "rotate(180deg)" : "none", transition: "0.2s" }} />
                  Detalhes técnicos do cálculo
                </button>

                {showTecnico && (
                  <div style={{ marginTop: 12, fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
                    <p style={{ margin: "0 0 6px" }}>
                      <strong style={{ color: C.navy }}>IBUTG ({resultado.ibutgTipo}):</strong>{" "}
                      {resultado.ibutgTipo === "ao ar livre"
                        ? `0.7 × ${resultado.intermediarios.tbn} + 0.2 × ${resultado.intermediarios.tg} + 0.1 × ${resultado.intermediarios.tbs} = ${resultado.ibutgValue}°C`
                        : `0.7 × ${resultado.intermediarios.tbn} + 0.3 × ${resultado.intermediarios.tg} = ${resultado.ibutgValue}°C`
                      }
                    </p>
                    <p style={{ margin: "0 0 6px" }}>
                      <strong style={{ color: C.navy }}>Modelo Liljegren:</strong>{" "}
                      Balanço energético no globo negro (Ranz-Marshall Nu = 2 + 0.6·Re⁰·⁵·Pr¹/³). GHI absorvido: {(0.95 * resultado.condicoes.ghi / 4).toFixed(1)} W/m².
                    </p>
                    <p style={{ margin: "0 0 6px" }}>
                      <strong style={{ color: C.navy }}>Fonte dos dados:</strong> {resultado.fonte}
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong style={{ color: C.navy }}>Calculado em:</strong>{" "}
                      {new Date(resultado.dataCalculo).toLocaleString("pt-BR")}
                      {resultado.cacheado ? " (cache Redis)" : " (tempo real)"}
                    </p>
                  </div>
                )}
              </Card>

              {/* ── Gerar Laudo Pericial ── */}
              <button
                onClick={() => gerarLaudoIbutg({
                  resultado, endereco, lat, lon, metab, atividadeLabel, outdoor,
                  assinante: {
                    nome:      userProfile?.nome      || "",
                    registro:  userProfile?.registro  || userProfile?.crea || userProfile?.crm || "",
                    perfil:    userProfile?.perfil    || "Responsável Técnico",
                    empresa:   "",
                  },
                })}
                style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "10px 16px", borderRadius: 8, border: `1px solid ${C.navyMid}`, background: "#eff6ff", color: C.navyMid, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                <FileText size={13} /> Gerar Laudo Pericial (PDF)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
