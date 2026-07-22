/**
 * Vercel serverless — consulta CA na base MTE via dados.gov.br (CKAN API)
 * GET /api/consulta-ca?ca=12345
 *
 * O site caepi.trabalho.gov.br é protegido por Cloudflare e não permite
 * scraping server-side. Alternativa: API aberta do portal dados.gov.br,
 * que publica a base CAEPI sem restrições de acesso.
 */

export const config = { regions: ["gru1"] };

// ── IDs conhecidos da base CAEPI no dados.gov.br ─────────────────────────────
// Conjunto: "Certificados de Aprovação de EPI (CA)"
// https://dados.gov.br/dados/conjuntos-dados/certificados-de-aprovacao-ca
const PACKAGE_ID  = "certificados-de-aprovacao-ca";
const CKAN_BASE   = "https://dados.gov.br/api/3/action";

const HEADERS = {
  "User-Agent": "NEXUS-SST/1.0 (gro-pgr.vercel.app)",
  "Accept": "application/json",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ca = (req.query.ca || "").replace(/\D/g, "");
  if (!ca) return res.status(400).json({ erro: "Informe o número do CA." });

  try {
    // ── 1. Descobre o resource_id do dataset CAEPI ──────────────────────────
    const resourceId = await getResourceId();
    if (!resourceId) {
      return res.status(502).json({
        erro: "Dataset CAEPI não localizado no dados.gov.br. Verifique manualmente em caepi.trabalho.gov.br.",
        link: "https://caepi.trabalho.gov.br/internet/consultacainternet.aspx",
      });
    }

    // ── 2. Busca o CA no datastore ──────────────────────────────────────────
    const dados = await buscarNoDatastore(resourceId, ca);
    if (!dados) {
      return res.status(404).json({
        erro: `CA ${ca} não encontrado na base MTE. Verifique o número ou consulte diretamente o site.`,
        link: "https://caepi.trabalho.gov.br/internet/consultacainternet.aspx",
      });
    }

    return res.status(200).json(dados);
  } catch (err) {
    return res.status(502).json({
      erro: "Falha ao consultar dados.gov.br: " + err.message,
      link: "https://caepi.trabalho.gov.br/internet/consultacainternet.aspx",
    });
  }
}

// ── Descobre o resource_id do datastore CAEPI no dados.gov.br ───────────────
async function getResourceId() {
  try {
    // Tenta pelo package_id conhecido
    const r = await fetch(`${CKAN_BASE}/package_show?id=${PACKAGE_ID}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10_000),
    });
    if (r.ok) {
      const d = await r.json();
      const resources = d.result?.resources || [];
      // Prefere resource com datastore ativo
      const ds = resources.find(x => x.datastore_active)
              || resources.find(x => /csv|json/i.test(x.format || ""));
      if (ds) return ds.id;
    }
  } catch { /* continua */ }

  // Fallback: busca pelo search
  try {
    const r = await fetch(
      `${CKAN_BASE}/package_search?q=certificado+aprovacao+epi+caepi&rows=5`,
      { headers: HEADERS, signal: AbortSignal.timeout(10_000) }
    );
    if (!r.ok) return null;
    const d = await r.json();
    for (const pkg of (d.result?.results || [])) {
      const ds = (pkg.resources || []).find(x => x.datastore_active)
              || (pkg.resources || []).find(x => /csv|json/i.test(x.format || ""));
      if (ds) return ds.id;
    }
  } catch { /* continua */ }

  return null;
}

// ── Consulta o datastore CKAN pelo número CA ─────────────────────────────────
async function buscarNoDatastore(resourceId, ca) {
  // Tenta filtro exato por possíveis nomes de campo
  const camposCA = ["numero_ca", "CA", "ca", "nca", "Nº CA", "numeroca", "NUM_CA", "N_CA"];

  for (const campo of camposCA) {
    try {
      const url = `${CKAN_BASE}/datastore_search?resource_id=${resourceId}&filters=${encodeURIComponent(JSON.stringify({ [campo]: ca }))}&limit=1`;
      const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10_000) });
      if (!r.ok) continue;
      const d = await r.json();
      const records = d.result?.records || [];
      if (records.length > 0) return montarDto(records[0], ca);
    } catch { continue; }
  }

  // Fallback: busca textual geral
  try {
    const url = `${CKAN_BASE}/datastore_search?resource_id=${resourceId}&q=${ca}&limit=10`;
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return null;
    const d = await r.json();
    const records = d.result?.records || [];
    // Procura o registro cujo campo de CA corresponde exatamente
    const exact = records.find(rec =>
      Object.values(rec).some(v => String(v).replace(/\D/g, "") === ca)
    );
    if (exact) return montarDto(exact, ca);
  } catch { /* falha silenciosa */ }

  return null;
}

// ── Monta o DTO normalizado a partir dos campos do dataset ───────────────────
function montarDto(rec, caQuery) {
  // Colunas podem variar — tenta nomes comuns
  const get = (...keys) => {
    for (const k of keys) {
      const found = Object.keys(rec).find(r => r.toLowerCase() === k.toLowerCase());
      if (found && rec[found]) return String(rec[found]).trim();
    }
    return "";
  };

  const nome      = get("nome_epi", "descricao_epi", "equipamento", "nome", "EPI", "produto");
  const fabricante= get("empresa", "fabricante", "razao_social", "empresa_fabricante", "EMPRESA");
  const validade  = get("data_validade", "validade", "vencimento", "validade_ca", "DATA_VALIDADE");
  const situacao  = get("situacao", "status", "situacao_ca", "STATUS");
  const natureza  = get("natureza", "tipo", "categoria", "tipo_epi", "NATUREZA", "descricao_natureza");
  const numCA     = get("numero_ca", "CA", "ca", "nca", "NUM_CA") || caQuery;

  if (!nome) return null;

  return {
    ca:         numCA.replace(/\D/g, "") || caQuery,
    nome:       toTitleCase(nome),
    fabricante: toTitleCase(fabricante),
    validadeCa: parseDateBR(validade),
    situacao:   situacao || "Ativo",
    ativo:      !situacao || /ativo|válido|valido/i.test(situacao),
    tipo:       mapTipo(natureza),
    descricao:  toTitleCase(nome),
    natureza:   toTitleCase(natureza),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function toTitleCase(str) {
  return str
    .toLowerCase()
    .replace(/\b([a-záéíóúàãõâêôçü])/gi, c => c.toUpperCase())
    .trim();
}

function parseDateBR(str) {
  if (!str) return "";
  // DD/MM/YYYY
  const a = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (a) return `${a[3]}-${a[2]}-${a[1]}`;
  // YYYY-MM-DD (já no formato)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return "";
}

function mapTipo(natureza) {
  const n = natureza.toLowerCase();
  if (/cabe[cç]a|capac|elmo/.test(n))                               return "Proteção da Cabeça";
  if (/olho|face|facial|viseira|[oó]culo/.test(n))                  return "Proteção dos Olhos e Face";
  if (/audit|ouvido|ru[ií]do|abafador|protetor auricular/.test(n))  return "Proteção Auditiva";
  if (/respir|pulm[ãa]o|filtro|m[áa]sc[áa]ra|pe[çc]a facial/.test(n)) return "Proteção Respiratória";
  if (/superior|m[ãa]o|luva|bra[cç]o|manga/.test(n))               return "Proteção dos Membros Superiores";
  if (/inferior|p[eé]|cal[cç]ado|bota|sapato|perna|botina/.test(n)) return "Proteção dos Membros Inferiores";
  if (/tronco|torso|colete|vest|avental|jaleco/.test(n))            return "Proteção do Tronco";
  if (/corpo.*inteiro|maca[cç][ãa]o/.test(n))                      return "Proteção do Corpo Inteiro";
  if (/queda|altura|talabarte|cintur[ãa]o/.test(n))                 return "Proteção contra Quedas";
  return "Outro";
}
