/**
 * Vercel serverless — consulta CA na base do MTE (CAEPI)
 * GET /api/consulta-ca?ca=12345
 *
 * Proxy necessário para contornar CORS do site governo.
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ca = (req.query.ca || "").replace(/\D/g, "");
  if (!ca) return res.status(400).json({ erro: "Informe o número do CA." });

  const BASE = "https://caepi.trabalho.gov.br/internet/consultacainternet.aspx";
  const UA   = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (compatible; NEXUS-SST/1.0)";

  try {
    // ── 1. GET para capturar ViewState e cookies de sessão ──────────────────
    const initResp = await fetch(BASE, {
      headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml" },
      redirect: "follow",
    });

    if (!initResp.ok) {
      return res.status(502).json({ erro: "Site MTE indisponível. Tente novamente." });
    }

    const initHtml = await initResp.text();
    const rawCookies = initResp.headers.raw?.()?.["set-cookie"] || [];
    const cookie = Array.isArray(rawCookies)
      ? rawCookies.map(c => c.split(";")[0]).join("; ")
      : (initResp.headers.get("set-cookie") || "").split(";")[0];

    const vsMatch   = initHtml.match(/id="__VIEWSTATE"\s+value="([^"]*)"/);
    const vsgMatch  = initHtml.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/);
    const evMatch   = initHtml.match(/id="__EVENTVALIDATION"\s+value="([^"]*)"/);

    // campo CA — tenta detectar o name real no HTML
    const caFieldMatch = initHtml.match(/id="(ctl00[^"]*txtNumeroCa)"/) ||
                         initHtml.match(/name="(ctl00[^"]*txtNumeroCa)"/);
    const btnFieldMatch = initHtml.match(/id="(ctl00[^"]*btnPesquisar)"/) ||
                          initHtml.match(/name="(ctl00[^"]*btnPesquisar)"/);

    const caField  = caFieldMatch  ? caFieldMatch[1].replace(/_/g, "$").replace(/\$+/g, "$") : "ctl00$conteudo$txtNumeroCa";
    const btnField = btnFieldMatch ? btnFieldMatch[1].replace(/_/g, "$").replace(/\$+/g, "$") : "ctl00$conteudo$btnPesquisar";

    // ── 2. POST com o número CA ─────────────────────────────────────────────
    const body = new URLSearchParams({
      "__EVENTTARGET":        "",
      "__EVENTARGUMENT":      "",
      "__VIEWSTATE":          vsMatch?.[1]  ?? "",
      "__VIEWSTATEGENERATOR": vsgMatch?.[1] ?? "",
      "__EVENTVALIDATION":    evMatch?.[1]  ?? "",
      [caField]:  ca,
      [btnField]: "Pesquisar",
    });

    const searchResp = await fetch(BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":   UA,
        "Referer":      BASE,
        "Cookie":       cookie,
        "Accept":       "text/html,application/xhtml+xml",
      },
      body: body.toString(),
      redirect: "follow",
    });

    const html = await searchResp.text();

    // ── 3. Parse do resultado ──────────────────────────────────────────────
    const dados = parseCa(html, ca);

    if (!dados) {
      return res.status(404).json({
        erro: `CA ${ca} não encontrado na base MTE (CAEPI). Verifique o número e tente novamente.`,
      });
    }

    return res.status(200).json(dados);
  } catch (err) {
    return res.status(502).json({
      erro: "Não foi possível conectar à base MTE. " + err.message,
    });
  }
}

// ── Extrai dados da tabela de resultados do CAEPI ───────────────────────────
function parseCa(html, ca) {
  // Remove tags internas para facilitar leitura de células
  const celula = (td) =>
    td.replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

  // Tenta encontrar rows da GridView (classes típicas do CAEPI)
  const rowPattern = /<tr[^>]*class="(Grid(?:Row|AltRow)|gridRow|listagem)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = [...html.matchAll(rowPattern)];

  // Fallback: qualquer <tr> que contenha o número CA como primeiro <td>
  if (rows.length === 0) {
    const allRows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    for (const row of allRows) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => celula(m[1]));
      if (cells.length >= 5 && cells[0].replace(/\D/g, "") === ca) {
        return montarDto(cells, ca);
      }
    }
    return null;
  }

  for (const row of rows) {
    const cells = [...row[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => celula(m[1]));
    if (cells.length < 5) continue;
    const dto = montarDto(cells, ca);
    if (dto) return dto;
  }
  return null;
}

// Colunas padrão CAEPI: [Nº CA][Nome EPI][Empresa][CNPJ][Validade][Situação][Natureza/Tipo]
function montarDto(cells, caQuery) {
  const numCA    = cells[0]?.replace(/\D/g, "") || caQuery;
  const nome     = cells[1] || "";
  const empresa  = cells[2] || "";
  const validade = cells[4] || "";
  const situacao = cells[5] || "";
  const natureza = cells[6] || cells[cells.length - 1] || "";

  if (!nome) return null;

  return {
    ca:          numCA,
    nome:        toTitleCase(nome),
    fabricante:  toTitleCase(empresa),
    validadeCa:  parseDateBR(validade),
    situacao:    situacao,
    ativo:       /ativo|válido|valido/i.test(situacao),
    tipo:        mapTipo(natureza),
    descricao:   toTitleCase(nome),
    natureza:    toTitleCase(natureza),
  };
}

function toTitleCase(str) {
  return str
    .toLowerCase()
    .replace(/\b([a-záéíóúàãõâêôçü])/gi, c => c.toUpperCase())
    .trim();
}

function parseDateBR(str) {
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// Mapeia "natureza" do MTE → EPI_TIPOS do sistema
function mapTipo(natureza) {
  const n = natureza.toLowerCase();
  if (/cabe[cç]a|capac|elmo/.test(n))                      return "Proteção da Cabeça";
  if (/olho|face|facial|viseira|[oó]culo/.test(n))         return "Proteção dos Olhos e Face";
  if (/audit|ouvido|ru[ií]do|abafador|protetor auricular/.test(n)) return "Proteção Auditiva";
  if (/respir|pulm[ão]o|filtro|m[áa]sc[áa]ra|peca facial/.test(n)) return "Proteção Respiratória";
  if (/superior|m[ãa]o|luva|bra[cç]o|manga/.test(n))      return "Proteção dos Membros Superiores";
  if (/inferior|p[eé]|cal[cç]ado|bota|sapato|perna|botina/.test(n)) return "Proteção dos Membros Inferiores";
  if (/tronco|torso|colete|vest|avental|jaleco/.test(n))   return "Proteção do Tronco";
  if (/corpo.*inteiro|macacão|m?acac/.test(n))             return "Proteção do Corpo Inteiro";
  if (/queda|altura|talabarte|cintur[ãa]o|cord/.test(n))   return "Proteção contra Quedas";
  return "Outro";
}
