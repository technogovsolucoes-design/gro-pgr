/**
 * HeatStressService — Vercel Serverless Function
 * Modelo Liljegren (2008) + NHO 06 Fundacentro (2002/2025) + NR-15 Anexo 3
 *
 * POST /api/heat-stress
 * Body: { latitude, longitude, taxaMetabolica, outdoor? }
 */

// ──────────────────────────────────────────────────────────────────────────────
// Physics constants
// ──────────────────────────────────────────────────────────────────────────────
const SIGMA    = 5.67e-8; // Stefan-Boltzmann W/(m²·K⁴)
const D_GLOBE  = 0.15;   // m — Bowen black globe diameter (150 mm, NHO 06 §5.2)
const EPS_G    = 0.95;   // globe emissivity
const ALP_G    = 0.95;   // globe solar absorptivity
const A_NAT    = 7.99e-4;// kPa/Pa — natural (un-aspirated) psychrometer constant
const P_ATM    = 101.325;// kPa — standard atmosphere

const WEATHER_BASE  = "https://api.open-meteo.com/v1/forecast";
const CACHE_TTL_SEC = 3600; // 1 h

// ──────────────────────────────────────────────────────────────────────────────
// NHO 06 / NR-15 Anexo 3 — categorias metabólicas e limites IBUTG
// Ref: NHO 06 Fundacentro 2002 §7.1; NR-15 Quadros 1 e 2 (CLT)
// Conversão: 175 kcal/h ≈ 204 W; 350 kcal/h ≈ 407 W; 490 kcal/h ≈ 570 W
// ──────────────────────────────────────────────────────────────────────────────
const NHO06_CATEGORIAS = [
  { cat: "Leve",        maxW: 204,      ibutgLim: 30 },
  { cat: "Moderado",    maxW: 407,      ibutgLim: 28 },
  { cat: "Pesado",      maxW: 570,      ibutgLim: 26 },
  { cat: "Muito Pesado",maxW: Infinity, ibutgLim: 25 },
];

// ──────────────────────────────────────────────────────────────────────────────
// Air thermal properties at T (Kelvin) — valid 250–400 K
// ──────────────────────────────────────────────────────────────────────────────
function airProps(T_K) {
  const mu  = 1.458e-6 * Math.pow(T_K, 1.5) / (T_K + 110.4); // Pa·s (Sutherland)
  const rho = 353.44 / T_K;                                    // kg/m³ @ 101.325 kPa
  const nu  = mu / rho;                                         // m²/s kinematic visc.
  const ka  = 2.41e-2 * Math.pow(T_K / 273.15, 0.9);          // W/(m·K) thermal cond.
  const Pr  = 0.71;                                             // Prandtl number (air)
  return { nu, ka, Pr };
}

// Saturated vapor pressure — Buck (1981) equation, kPa
function esat(T_C) {
  return 0.61121 * Math.exp((18.678 - T_C / 234.5) * (T_C / (257.14 + T_C)));
}

// ──────────────────────────────────────────────────────────────────────────────
// Globe temperature — energy balance, Newton-Raphson (Liljegren 2008 §3)
//
// Energy balance on globe surface:
//   alpha_g * (GHI/4) + eps_g * sigma * Ta^4 = eps_g * sigma * Tg^4 + hc*(Tg-Ta)
//
// GHI/4: spherical geometry factor (cross-section / surface = 1/4).
// Ta^4 term: longwave from surroundings ≈ blackbody at air temp.
// hc: Ranz-Marshall convection coefficient for sphere.
// ──────────────────────────────────────────────────────────────────────────────
function calcGlobeTemp(Ta_C, v_ms, GHI) {
  const Ta_K = Ta_C + 273.15;
  const ap   = airProps(Ta_K);
  const Srad = ALP_G * GHI / 4;       // effective solar absorbed (W/m²)
  let Tg_K   = Ta_K + (GHI > 0 ? 6 : 0); // initial guess

  for (let i = 0; i < 60; i++) {
    const Re = (Math.max(v_ms, 0.02) * D_GLOBE) / ap.nu;
    const Nu = 2.0 + 0.6 * Math.pow(Re, 0.5) * Math.pow(ap.Pr, 1 / 3);
    const hc = (Nu * ap.ka) / D_GLOBE;

    const f  = Srad
             + EPS_G * SIGMA * Math.pow(Ta_K, 4)
             - EPS_G * SIGMA * Math.pow(Tg_K, 4)
             - hc * (Tg_K - Ta_K);
    const df = -4 * EPS_G * SIGMA * Math.pow(Tg_K, 3) - hc;

    const step = -f / df;
    Tg_K += step;
    if (Math.abs(step) < 5e-4) break;
  }

  return Tg_K - 273.15; // °C
}

// ──────────────────────────────────────────────────────────────────────────────
// Natural wet-bulb temperature — psychrometric equation, Newton-Raphson
//
// Psychrometric (un-aspirated): esat(Tbn) - A_nat * P * (Ta - Tbn) = ea
// A_nat = 7.99×10⁻⁴ kPa/Pa for natural ventilation (Sprung 1888, NHO 06 §4.2)
// ──────────────────────────────────────────────────────────────────────────────
function calcNaturalWetBulb(Ta_C, RH) {
  const ea = (RH / 100) * esat(Ta_C);
  let Tw   = Ta_C - 6; // initial guess

  for (let i = 0; i < 60; i++) {
    const f  = esat(Tw) - A_NAT * P_ATM * (Ta_C - Tw) - ea;
    const df = (esat(Tw + 0.01) - esat(Tw - 0.01)) / 0.02 + A_NAT * P_ATM;
    const step = -f / df;
    Tw += step;
    if (Math.abs(step) < 5e-4) break;
  }

  return Tw; // °C
}

// ──────────────────────────────────────────────────────────────────────────────
// IBUTG — NHO 06 §4.1 / NR-15 Anexo 3 §1
//   Ao ar livre: IBUTG = 0.7·Tbn + 0.2·Tg + 0.1·Tbs
//   Amb. interno: IBUTG = 0.7·Tbn + 0.3·Tg
// ──────────────────────────────────────────────────────────────────────────────
function calcIBUTG({ Ta, RH, v, GHI, outdoor }) {
  const Tg  = calcGlobeTemp(Ta, v, outdoor ? GHI : 0);
  const Tbn = calcNaturalWetBulb(Ta, RH);
  const Tbs = Ta;
  const ibutg = outdoor
    ? 0.7 * Tbn + 0.2 * Tg + 0.1 * Tbs
    : 0.7 * Tbn + 0.3 * Tg;
  return { ibutg, Tg, Tbn, Tbs };
}

// ──────────────────────────────────────────────────────────────────────────────
// NHO 06 risk assessment + work/rest schedule
// Schedule based on NR-15 Quadro 2 (IBUTG excedence steps of ~1.5°C)
// ──────────────────────────────────────────────────────────────────────────────
function avaliarNHO06(ibutg, metabolismoW) {
  const cat   = NHO06_CATEGORIAS.find(c => metabolismoW <= c.maxW) ?? NHO06_CATEGORIAS[3];
  const delta = ibutg - cat.ibutgLim;

  let recomendacaoPausa;
  if (delta <= 0) {
    recomendacaoPausa = { trabMin: 60, descMin: 0,  desc: "Trabalho contínuo permitido" };
  } else if (delta <= 1.5) {
    recomendacaoPausa = { trabMin: 45, descMin: 15, desc: "45 min trabalho / 15 min descanso" };
  } else if (delta <= 3.0) {
    recomendacaoPausa = { trabMin: 30, descMin: 30, desc: "30 min trabalho / 30 min descanso" };
  } else if (delta <= 5.0) {
    recomendacaoPausa = { trabMin: 15, descMin: 45, desc: "15 min trabalho / 45 min descanso" };
  } else {
    recomendacaoPausa = { trabMin: 0,  descMin: 60, desc: "TRABALHO SUSPENSO — afastar imediatamente" };
  }

  let nivelRisco;
  if (delta <= 0)   nivelRisco = "Aceitável";
  else if (delta <= 1.5) nivelRisco = "Atenção";
  else if (delta <= 3.0) nivelRisco = "Crítico";
  else               nivelRisco = "Proibido";

  return {
    categoria:             cat.cat,
    limiteNHO06:           cat.ibutgLim,
    excedeLimite:          delta > 0,
    nivelRisco,
    recomendacaoPausa,
    // S-2220 (monit. saúde) obrigatório quando IBUTG excede o limite — NR-09 + eSocial
    requerRegistroESocial: delta > 0,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Weather fetch — Open-Meteo (free, global, CORS permissivo para servidores)
// Timeout: 8 s
// ──────────────────────────────────────────────────────────────────────────────
async function fetchWeather(lat, lon) {
  const url = new URL(WEATHER_BASE);
  url.searchParams.set("latitude",      lat.toFixed(4));
  url.searchParams.set("longitude",     lon.toFixed(4));
  url.searchParams.set("hourly",        "temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone",      "auto");
  url.searchParams.set("wind_speed_unit", "ms");

  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch(url.toString(), { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = await res.json();

    // Use current UTC hour index
    const hour = new Date().getUTCHours();
    return {
      ta:  data.hourly.temperature_2m[hour]        ?? null,
      ur:  data.hourly.relative_humidity_2m[hour]  ?? null,
      v:   data.hourly.wind_speed_10m[hour]         ?? null,
      ghi: data.hourly.shortwave_radiation[hour]    ?? null,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Upstash Redis (HTTP REST, optional — graceful fallback when env vars ausentes)
// Ref: https://docs.upstash.com/redis/features/restapi
// ──────────────────────────────────────────────────────────────────────────────
async function cacheGet(key) {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;
  try {
    const res = await fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`,
      { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }, signal: AbortSignal.timeout(2000) }
    );
    const { result } = await res.json();
    return result ? JSON.parse(result) : null;
  } catch { return null; }
}

async function cacheSet(key, value) {
  if (!process.env.UPSTASH_REDIS_REST_URL) return;
  try {
    await fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}/ex/${CACHE_TTL_SEC}`,
      { method: "GET", headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }, signal: AbortSignal.timeout(2000) }
    );
  } catch { /* cache write failure is non-fatal */ }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main handler
// ──────────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ erro: "Método não permitido. Use POST." });

  const { latitude, longitude, taxaMetabolica, outdoor = true, weatherOverride } = req.body ?? {};

  if (latitude == null || longitude == null || taxaMetabolica == null)
    return res.status(400).json({
      erro: "Campos obrigatórios ausentes: latitude, longitude, taxaMetabolica",
    });

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  const M   = parseFloat(taxaMetabolica);

  if (isNaN(lat) || isNaN(lon) || isNaN(M))
    return res.status(400).json({ erro: "latitude, longitude e taxaMetabolica devem ser números." });

  try {
    // ── Step 1: Weather data (Redis cache → Open-Meteo) ──────────────────────
    const now   = new Date();
    const cKey  = `hs:${lat.toFixed(2)}:${lon.toFixed(2)}:${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDate()}${now.getUTCHours()}`;

    let weatherData = weatherOverride ?? null;
    let cacheado    = false;

    if (!weatherData) {
      weatherData = await cacheGet(cKey);
      cacheado    = !!weatherData;
    }

    if (!weatherData) {
      weatherData = await fetchWeather(lat, lon);
      await cacheSet(cKey, weatherData);
    }

    const { ta, ur, v, ghi } = weatherData;
    if (ta == null || ur == null || v == null || ghi == null)
      return res.status(502).json({ erro: "Dados climáticos incompletos retornados pela API." });

    // ── Step 2: Modelo Liljegren → IBUTG ─────────────────────────────────────
    const { ibutg, Tg, Tbn, Tbs } = calcIBUTG({ Ta: ta, RH: ur, v, GHI: ghi, outdoor: Boolean(outdoor) });

    // ── Step 3: NHO 06 assessment ─────────────────────────────────────────────
    const avaliacao = avaliarNHO06(ibutg, M);

    // ── Output DTO ────────────────────────────────────────────────────────────
    const dto = {
      ibutgValue:            Math.round(ibutg * 10) / 10,
      ibutgTipo:             outdoor ? "ao ar livre" : "ambiente interno",
      ...avaliacao,
      recomendacaoPausa:     avaliacao.recomendacaoPausa,
      requerRegistroESocial: avaliacao.requerRegistroESocial,
      inputs: { latitude: lat, longitude: lon, taxaMetabolica: M, outdoor },
      condicoes: {
        ta:  Math.round(ta  * 10) / 10,
        ur:  Math.round(ur  * 10) / 10,
        v:   Math.round(v   * 100) / 100,
        ghi: Math.round(ghi * 10) / 10,
      },
      intermediarios: {
        tbn: Math.round(Tbn * 10) / 10,
        tg:  Math.round(Tg  * 10) / 10,
        tbs: Math.round(Tbs * 10) / 10,
      },
      dataCalculo: now.toISOString(),
      fonte:       "Open-Meteo · Modelo Liljegren (2008) · NHO 06 Fundacentro · NR-15 Anexo 3",
      cacheado,
    };

    return res.status(200).json(dto);
  } catch (err) {
    if (err.name === "AbortError" || err.name === "TimeoutError")
      return res.status(504).json({ erro: "Timeout na API de clima. Verifique sua conexão e tente novamente." });

    console.error("[HeatStress]", err.message);
    return res.status(500).json({ erro: "Erro interno no cálculo.", detalhe: err.message });
  }
};
