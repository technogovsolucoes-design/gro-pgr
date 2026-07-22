/**
 * Vercel serverless — consulta CA na base do MTE (CAEPI)
 * GET /api/consulta-ca?ca=12345
 *
 * Roda preferencialmente na região gru1 (São Paulo) para não ser bloqueado
 * por firewall geográfico do site de governo.
 */

export const config = { regions: ["gru1"] };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ca = (req.query.ca || "").replace(/\D/g, "");
  if (!ca) return res.status(400).json({ erro: "Informe o número do CA." });

  const BASE = "https://caepi.trabalho.gov.br/internet/consultacainternet.aspx";

  // Headers que imitam um navegador real — WAFs gov bloqueiam User-Agent suspeito
  const HEADERS_BROWSER = {
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control":   "no-cache",
    "Pragma":          "no-cache",
  };

  const debug = req.query.debug === "1";

  try {
    // ── 1. GET para capturar ViewState e cookies ──────────────────────────
    let initResp;
    try {
      initResp = await fetch(BASE, {
        headers: HEADERS_BROWSER,
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
      });
    } catch (fetchErr) {
      return res.status(502).json({
        erro: `Falha de rede ao acessar MTE: ${fetchErr.message}. O site pode estar indisponível ou bloquear requisições externas.`,
      });
    }

    // Lê o HTML independente do status (redirecionamentos gov podem retornar 302→200 etc.)
    const initHtml = await initResp.text();

    if (debug) {
      return res.json({
        _debug: true,
        status: initResp.status,
        url:    initResp.url,
        htmlLength: initHtml.length,
        htmlSnippet: initHtml.slice(0, 800),
        hasViewState: initHtml.includes("__VIEWSTATE"),
      });
    }

    // Diagnóstico: se o site retornar um status inesperado ou HTML sem ViewState
    if (initResp.status >= 500) {
      return res.status(502).json({
        erro: `Site MTE retornou erro HTTP ${initResp.status}. Tente mais tarde.`,
      });
    }

    // Extrai cookies da sessão — Node 18+ usa getSetCookie(), fallback para headers
    let cookieStr = "";
    try {
      const arr = typeof initResp.headers.getSetCookie === "function"
        ? initResp.headers.getSetCookie()
        : [];
      cookieStr = arr.length
        ? arr.map(c => c.split(";")[0]).join("; ")
        : (initResp.headers.get("set-cookie") || "").split(",")
            .map(c => c.split(";")[0].trim())
            .filter(Boolean)
            .join("; ");
    } catch { /* sem cookies — continua mesmo assim */ }

    // Extrai campos ocultos do ASP.NET WebForms
    const vs   = (initHtml.match(/id="__VIEWSTATE"\s+value="([^"]*)"/)  || [])[1] ?? "";
    const vsg  = (initHtml.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/) || [])[1] ?? "";
    const ev   = (initHtml.match(/id="__EVENTVALIDATION"\s+value="([^"]*)"/)    || [])[1] ?? "";

    // Se não encontrou ViewState, o HTML retornado não é a página correta
    if (!vs) {
      // Tenta encontrar mensagem de erro no HTML
      const msgErr = (initHtml.match(/<[^>]*(?:error|erro|indisponivel)[^>]*>([^<]+)</i) || [])[1];
      return res.status(502).json({
        erro: msgErr
          ? `Site MTE: ${msgErr.trim()}`
          : `Não foi possível ler o formulário do site MTE (status ${initResp.status}). O site pode ter mudado ou estar bloqueando requisições externas.`,
      });
    }

    // Detecta os nomes dos campos dinamicamente no HTML
    const caField  = detectField(initHtml, "txtNumeroCa")  || "ctl00$conteudo$txtNumeroCa";
    const btnField = detectField(initHtml, "btnPesquisar") || "ctl00$conteudo$btnPesquisar";

    // ── 2. POST com o número CA ───────────────────────────────────────────
    const body = new URLSearchParams({
      __EVENTTARGET:        "",
      __EVENTARGUMENT:      "",
      __VIEWSTATE:          vs,
      __VIEWSTATEGENERATOR: vsg,
      __EVENTVALIDATION:    ev,
      [caField]:            ca,
      [btnField]:           "Pesquisar",
    });

    let searchResp;
    try {
      searchResp = await fetch(BASE, {
        method:  "POST",
        headers: {
          ...HEADERS_BROWSER,
          "Content-Type": "application/x-www-form-urlencoded",
          "Referer":      BASE,
          ...(cookieStr ? { Cookie: cookieStr } : {}),
        },
        body:    body.toString(),
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
      });
    } catch (fetchErr) {
      return res.status(502).json({
        erro: `Falha na pesquisa MTE: ${fetchErr.message}.`,
      });
    }

    const html = await searchResp.text();

    // ── 3. Parse do resultado ─────────────────────────────────────────────
    const dados = parseCa(html, ca);

    if (!dados) {
      // Verifica se a página retornou mensagem de "não encontrado"
      const semResult = /nenhum|n[ãa]o.*encontrad|sem.*resultado/i.test(html);
      return res.status(404).json({
        erro: semResult
          ? `CA ${ca} não encontrado na base MTE (CAEPI).`
          : `CA ${ca} não encontrado. Verifique se o número está correto.`,
      });
    }

    return res.status(200).json(dados);
  } catch (err) {
    return res.status(502).json({
      erro: "Erro inesperado: " + err.message,
    });
  }
}

// Detecta o name do campo ASP.NET pelo id parcial
function detectField(html, partial) {
  const m = html.match(new RegExp(`name="(ctl00[^"]*${partial}[^"]*)"`, "i"))
         || html.match(new RegExp(`id="(ctl00[^"]*${partial}[^"]*)"`, "i"));
  if (!m) return null;
  // Converte id_ para name$ (ASP.NET converte _ em $ no name)
  return m[1].replace(/_{1}/g, "$");
}

// ── Parser da tabela de resultados ──────────────────────────────────────────
function parseCa(html, ca) {
  const celula = (td) =>
    td.replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#\d+;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // Estratégia 1: linhas com classe Grid* (ASP.NET GridView padrão)
  const byClass = [...html.matchAll(
    /<tr[^>]*class="(Grid(?:Row|AltRow)|gridRow)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
  )];

  if (byClass.length > 0) {
    for (const row of byClass) {
      const cells = [...row[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(m => celula(m[1]));
      if (cells.length >= 5) {
        const dto = montarDto(cells, ca);
        if (dto) return dto;
      }
    }
  }

  // Estratégia 2: qualquer <tr> cujo primeiro <td> seja o número CA
  const allRows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  for (const row of allRows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(m => celula(m[1]));
    if (cells.length >= 5 && cells[0].replace(/\D/g, "") === ca) {
      return montarDto(cells, ca);
    }
  }

  return null;
}

// Colunas esperadas: [Nº CA][Nome EPI][Empresa][CNPJ][Validade][Situação][Natureza/Tipo]
function montarDto(cells, caQuery) {
  const nome     = cells[1] || "";
  if (!nome) return null;

  return {
    ca:         cells[0]?.replace(/\D/g, "") || caQuery,
    nome:       toTitleCase(nome),
    fabricante: toTitleCase(cells[2] || ""),
    validadeCa: parseDateBR(cells[4] || ""),
    situacao:   (cells[5] || "").trim(),
    ativo:      /ativo|válido|valido/i.test(cells[5] || ""),
    tipo:       mapTipo(cells[6] || cells[cells.length - 1] || ""),
    descricao:  toTitleCase(nome),
    natureza:   toTitleCase(cells[6] || cells[cells.length - 1] || ""),
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
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
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
