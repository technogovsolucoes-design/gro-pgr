/**
 * @typedef {Object} WeatherOverride
 * @property {number} ta   Temperatura do ar (°C)
 * @property {number} ur   Umidade relativa (%)
 * @property {number} v    Velocidade do vento (m/s)
 * @property {number} ghi  Irradiação horizontal global (W/m²)
 */

/**
 * @typedef {Object} HeatStressInput
 * @property {number}         latitude
 * @property {number}         longitude
 * @property {number}         taxaMetabolica      Metabolismo total em Watts
 * @property {boolean}        [outdoor]           true = ao ar livre (padrão)
 * @property {WeatherOverride} [weatherOverride]  Dados manuais — bypassa a API de clima
 */

/**
 * @typedef {Object} HeatStressDTO
 * @property {number}  ibutgValue             IBUTG calculado (°C)
 * @property {string}  ibutgTipo              "ao ar livre" | "ambiente interno"
 * @property {string}  categoria              Categoria metabólica NHO 06
 * @property {number}  limiteNHO06            Limite máximo IBUTG para a categoria (°C)
 * @property {boolean} excedeLimite
 * @property {string}  nivelRisco             "Aceitável" | "Atenção" | "Crítico" | "Proibido"
 * @property {{ trabMin:number, descMin:number, desc:string }} recomendacaoPausa
 * @property {boolean} requerRegistroESocial  S-2220 obrigatório se true
 * @property {{ ta:number, ur:number, v:number, ghi:number }} condicoes
 * @property {{ tbn:number, tg:number, tbs:number }} intermediarios
 * @property {string}  dataCalculo
 * @property {string}  fonte
 * @property {boolean} cacheado
 */

const API_URL     = "/api/heat-stress";
const TIMEOUT_MS  = 12000;

/**
 * Calcula IBUTG e avalia risco térmico via HeatStressService.
 *
 * @param {HeatStressInput} input
 * @returns {Promise<HeatStressDTO>}
 * @throws {Error} com mensagem legível em caso de falha
 */
export async function calcularEstresseTermico(input) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(input),
      signal:  ctrl.signal,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.erro ?? `Erro HTTP ${res.status}`);
    }

    return /** @type {HeatStressDTO} */ (data);
  } catch (err) {
    if (err.name === "AbortError")
      throw new Error("Timeout: o serviço de cálculo demorou mais de 12 s. Tente novamente.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Obtém endereço completo a partir de coordenadas (Nominatim / OpenStreetMap).
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ display: string, logradouro: string, municipio: string, uf: string, cep: string } | null>}
 */
export async function obterEndereco(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt-BR`,
      { headers: { "User-Agent": "NEXUS-SST/1.0" } }
    );
    if (!res.ok) return null;
    const d = await res.json();
    const a = d.address || {};
    const logradouro = [a.road, a.house_number].filter(Boolean).join(", ") || a.suburb || "";
    const municipio  = a.city || a.town || a.village || a.municipality || "";
    const uf         = a.state || "";
    const cep        = a.postcode || "";
    return { display: d.display_name || "", logradouro, municipio, uf, cep };
  } catch {
    return null;
  }
}

/**
 * Obtém coordenadas do dispositivo via Geolocation API.
 * @returns {Promise<{ latitude: number, longitude: number }>}
 */
export function obterLocalizacao() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalização não suportada neste navegador."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (err) => reject(new Error(`Geolocalização negada: ${err.message}`)),
      { timeout: 10000, maximumAge: 300000 }
    );
  });
}

/** Taxas metabólicas de referência — ISO 8996 / NHO 06 Tabela 1 */
export const ATIVIDADES_METABOLICAS = [
  { label: "Sentado em repouso",                      w: 116 },
  { label: "Trabalho manual leve (uma mão)",           w: 140 },
  { label: "Trabalho manual moderado (ambas as mãos)", w: 165 },
  { label: "Trabalho de braços e tronco — leve",       w: 215 },
  { label: "Trabalho de braços e tronco — moderado",   w: 265 },
  { label: "Trabalho pesado (pás, picaretas, etc.)",   w: 350 },
  { label: "Trabalho muito pesado (subir escadas)",    w: 440 },
  { label: "Trabalho extremamente pesado",             w: 550 },
];

/** Cores semáforo por nível de risco */
export const CORES_RISCO = {
  "Aceitável": { bg: "#dcfce7", text: "#15803d", border: "#86efac" },
  "Atenção":   { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
  "Crítico":   { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  "Proibido":  { bg: "#ede9fe", text: "#5b21b6", border: "#c4b5fd" },
};
