/**
 * Vercel Edge Function — consulta CA no site oficial do MTE (CAEPI)
 * GET /api/consulta-ca?ca=12345
 *
 * Edge Functions rodam na infraestrutura Cloudflare (Vercel Edge Network),
 * o que permite acessar sites protegidos pelo Cloudflare sem o desafio JS.
 */

export const config = { runtime: "edge" };

const CA_URL =
  "https://caepi.trabalho.gov.br/internet/consultacainternet.aspx";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const ca = (searchParams.get("ca") || "").replace(/\D/g, "");
  const debug = searchParams.get("debug") === "1";

  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  if (request.method === "OPTIONS") return new Response(null, { status: 200 });
  if (!ca) return json({ erro: "Informe o número do CA." }, 400);

  try {
    // ── 1. GET — obtém ViewState, EventValidation e cookies da sessão ──────
    const getResp = await fetch(CA_URL, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    const html = await getResp.text();

    if (isCloudflareChallenge(html)) {
      return json({ erro: "Site MTE temporariamente inacessível.", link: CA_URL }, 502);
    }

    // Extrai campos hidden do WebForms
    const vs  = field(html, "__VIEWSTATE");
    const vsg = field(html, "__VIEWSTATEGENERATOR");
    const ev  = field(html, "__EVENTVALIDATION");

    if (!vs) {
      return json({ erro: "Página CAEPI fora do formato esperado.", link: CA_URL }, 502);
    }

    // Extrai os cookies de sessão do GET (inclui ASP.NET_SessionId)
    const cookieHeader = collectCookies(getResp.headers);

    // Extrai o primeiro valor válido de cada dropdown (valor "Selecione")
    const selEquip  = firstOptionValue(html, "cboEquipamento");
    const selFabric = firstOptionValue(html, "cboFabricante");
    const selTipo   = firstOptionValue(html, "cboTipoProtecao");

    // ── 2. POST — submete o formulário de busca ────────────────────────────
    const body = new URLSearchParams({
      __EVENTTARGET:    "",
      __EVENTARGUMENT:  "",
      __VIEWSTATE:      vs,
      __VIEWSTATEGENERATOR: vsg,
      __EVENTVALIDATION: ev,
      "ctl00$PlaceHolderConteudo$txtNumeroCA":    ca,
      "ctl00$PlaceHolderConteudo$cboEquipamento":  selEquip,
      "ctl00$PlaceHolderConteudo$cboFabricante":   selFabric,
      "ctl00$PlaceHolderConteudo$cboTipoProtecao": selTipo,
      "ctl00$PlaceHolderConteudo$btnConsultar":    "Consultar",
    });

    const postResp = await fetch(CA_URL, {
      method: "POST",
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: CA_URL,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: body.toString(),
      redirect: "follow",
    });

    const resultHtml = await postResp.text();

    if (debug) {
      return new Response(
        `<!-- GET selEquip=${selEquip} selFabric=${selFabric} selTipo=${selTipo} cookies="${cookieHeader}" -->\n` +
        resultHtml,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (isCloudflareChallenge(resultHtml)) {
      return json({ erro: "Site MTE inacessível via servidor.", link: CA_URL }, 502);
    }

    const result = parseResult(resultHtml, ca);

    if (!result) {
      return json(
        { erro: `CA ${ca} não encontrado. Verifique o número informado.`, link: CA_URL },
        404
      );
    }

    return json(result);
  } catch (err) {
    return json({ erro: "Erro ao consultar CAEPI: " + err.message, link: CA_URL }, 502);
  }
}

// ── Detecta Cloudflare challenge ─────────────────────────────────────────────
function isCloudflareChallenge(html) {
  return (
    html.includes("Enable JavaScript") ||
    html.includes("cf-browser-verification") ||
    html.includes("Just a moment")
  );
}

// ── Extrai valor de campo hidden por nome ────────────────────────────────────
function field(html, name) {
  const m = html.match(new RegExp(`name="${name}"[^>]+value="([^"]*)"`, "i")) ||
            html.match(new RegExp(`id="${name}"[^>]+value="([^"]*)"`, "i"));
  return m ? m[1] : "";
}

// ── Coleta todos os Set-Cookie do response headers ───────────────────────────
function collectCookies(headers) {
  const cookies = [];
  // Itera todos os headers para pegar múltiplos Set-Cookie
  for (const [k, v] of headers.entries()) {
    if (k.toLowerCase() === "set-cookie") {
      const pair = v.split(";")[0].trim();
      if (pair) cookies.push(pair);
    }
  }
  return cookies.join("; ");
}

// ── Extrai primeiro valor de option em um select por nome do controle ────────
function firstOptionValue(html, controlName) {
  // O id do select é PlaceHolderConteudo_<nome>, name é ctl00$PlaceHolderConteudo$<nome>
  const re = new RegExp(
    `<select[^>]+(?:id|name)="[^"]*${controlName}[^"]*"[^>]*>\\s*<option[^>]*value="([^"]*)"`,
    "i"
  );
  const m = html.match(re);
  return m ? m[1] : "";
}

// ── Faz o parse do HTML de resultado do CAEPI ───────────────────────────────
function parseResult(html, caQuery) {
  // Sem resultados
  if (
    /nenhum.*(CA|certificado|resultado)/i.test(html) ||
    /CA.*n[ãa]o.*encontrado/i.test(html)
  ) {
    return null;
  }

  // Estratégia: extrai células de tabelas <td> após cabeçalhos conhecidos
  const afterHeader = (label) => {
    const re = new RegExp(
      `${label}[^<]*<\/(?:td|th)>[^<]*<(?:td|th)[^>]*>\\s*([^<]{2,120})`,
      "i"
    );
    const m = html.match(re);
    return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
  };

  // Estratégia alternativa: pares "Label: Valor" em texto corrido
  const afterColon = (label) => {
    const re = new RegExp(`${label}[^:]*:\\s*([^<\n]{2,120})`, "i");
    const m = html.match(re);
    return m ? m[1].trim() : "";
  };

  const nome = afterHeader("Descri[çc][ãa]o") ||
               afterHeader("Equipamento") ||
               afterColon("Descri[çc][ãa]o do EPI") ||
               afterColon("Equipamento");

  const fabricante = afterHeader("Fabricante") ||
                     afterHeader("Empresa") ||
                     afterColon("Fabricante") ||
                     afterColon("Empresa");

  const validade = afterHeader("Validade") ||
                   afterColon("Validade") ||
                   (html.match(/(\d{2}\/\d{2}\/\d{4})/) || [])[1] || "";

  const situacao = afterHeader("Situa[çc][ãa]o") ||
                   afterColon("Situa[çc][ãa]o") || "";

  const natureza = afterHeader("Natureza") ||
                   afterHeader("Tipo de Prote[çc][ãa]o") ||
                   afterColon("Natureza") || "";

  const numCA = afterHeader("N[ºo\\.] CA") ||
                afterHeader("N[ºo\\.] do CA") ||
                afterColon("N[ºo\\.] CA") ||
                caQuery;

  if (!nome && !fabricante) return null;

  return {
    ca:         (numCA + "").replace(/\D/g, "") || caQuery,
    nome:       toTitleCase(nome),
    fabricante: toTitleCase(fabricante),
    validadeCa: parseDateBR(validade),
    situacao:   situacao || "Ativo",
    ativo:      !situacao || /ativo|v[áa]lido/i.test(situacao),
    tipo:       mapTipo(natureza || nome),
    descricao:  toTitleCase(nome),
    natureza:   toTitleCase(natureza),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function toTitleCase(str) {
  return (str || "")
    .toLowerCase()
    .replace(/\b([a-záéíóúàãõâêôçü])/gi, (c) => c.toUpperCase())
    .trim();
}

function parseDateBR(str) {
  if (!str) return "";
  const a = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (a) return `${a[3]}-${a[2]}-${a[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return "";
}

function mapTipo(n) {
  n = (n || "").toLowerCase();
  if (/cabe[cç]a|capac|elmo/.test(n))                                return "Proteção da Cabeça";
  if (/olho|face|facial|viseira|[oó]culo/.test(n))                   return "Proteção dos Olhos e Face";
  if (/audit|ouvido|ru[ií]do|abafador|protetor auricular/.test(n))   return "Proteção Auditiva";
  if (/respir|pulm[ãa]o|filtro|m[áa]sc[áa]ra|pe[çc]a facial/.test(n)) return "Proteção Respiratória";
  if (/superior|m[ãa]o|luva|bra[cç]o|manga/.test(n))                return "Proteção dos Membros Superiores";
  if (/inferior|p[eé]|cal[cç]ado|bota|sapato|perna|botina/.test(n)) return "Proteção dos Membros Inferiores";
  if (/tronco|torso|colete|vest|avental|jaleco/.test(n))             return "Proteção do Tronco";
  if (/corpo.*inteiro|maca[cç][ãa]o/.test(n))                       return "Proteção do Corpo Inteiro";
  if (/queda|altura|talabarte|cintur[ãa]o/.test(n))                  return "Proteção contra Quedas";
  return "Outro";
}
