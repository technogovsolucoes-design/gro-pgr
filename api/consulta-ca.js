/**
 * Vercel Edge Function — consulta CA no site oficial do MTE (CAEPI)
 * GET /api/consulta-ca?ca=12345
 *
 * Edge Functions rodam na infraestrutura Cloudflare (Vercel Edge Network).
 * O formulário usa ASP.NET UpdatePanel — exige async postback (Delta format).
 */

export const config = { runtime: "edge" };

const CA_URL =
  "https://caepi.trabalho.gov.br/internet/consultacainternet.aspx";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// IDs extraídos do JavaScript do ScriptManager na página CAEPI
const SM_NAME       = "ctl00$ScriptManager1";           // UniqueID do ScriptManager
const PANEL_UNAME   = "ctl00$PlaceHolderConteudo$panel"; // UniqueID do UpdatePanel
const BTN_UNAME     = "ctl00$PlaceHolderConteudo$btnConsultar"; // Trigger

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const ca    = (searchParams.get("ca") || "").replace(/\D/g, "");
  const debug = searchParams.get("debug") === "1";

  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

  if (request.method === "OPTIONS") return new Response(null, { status: 200 });
  if (!ca) return json({ erro: "Informe o número do CA." }, 400);

  try {
    // ── 1. GET — obtém ViewState, EventValidation e cookies da sessão ──────
    const getResp = await fetch(CA_URL, {
      headers: {
        "User-Agent":      BROWSER_UA,
        Accept:            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Cache-Control":   "no-cache",
      },
      redirect: "follow",
    });

    const html = await getResp.text();

    if (isChallenge(html)) {
      return json({ erro: "Site MTE temporariamente inacessível.", link: CA_URL }, 502);
    }

    const vs  = field(html, "__VIEWSTATE");
    const vsg = field(html, "__VIEWSTATEGENERATOR");
    const ev  = field(html, "__EVENTVALIDATION");

    if (!vs) {
      return json({ erro: "Página CAEPI fora do formato esperado.", link: CA_URL }, 502);
    }

    const cookies    = collectCookies(getResp.headers);
    const selEquip   = firstOption(html, "cboEquipamento");
    const selFabric  = firstOption(html, "cboFabricante");
    const selTipo    = firstOption(html, "cboTipoProtecao");

    // ── 2. POST assíncrono (UpdatePanel Delta format) ──────────────────────
    // O ScriptManager exige que o POST seja async (X-MicrosoftAjax: Delta=true)
    // e o body inclua o campo SM_NAME apontando para o painel e o trigger.
    const body = new URLSearchParams({
      [SM_NAME]:                      `${PANEL_UNAME}|${BTN_UNAME}`,
      __EVENTTARGET:                  "",
      __EVENTARGUMENT:                "",
      __ASYNCPOST:                    "true",
      __VIEWSTATE:                    vs,
      __VIEWSTATEGENERATOR:           vsg,
      __EVENTVALIDATION:              ev,
      "ctl00$PlaceHolderConteudo$txtNumeroCA":    ca,
      "ctl00$PlaceHolderConteudo$cboEquipamento":  selEquip,
      "ctl00$PlaceHolderConteudo$cboFabricante":   selFabric,
      "ctl00$PlaceHolderConteudo$cboTipoProtecao": selTipo,
    });

    const postResp = await fetch(CA_URL, {
      method: "POST",
      headers: {
        "User-Agent":        BROWSER_UA,
        Accept:              "*/*",
        "Accept-Language":   "pt-BR,pt;q=0.9",
        "Content-Type":      "application/x-www-form-urlencoded; charset=UTF-8",
        "X-MicrosoftAjax":  "Delta=true",
        "X-Requested-With": "XMLHttpRequest",
        Referer:             CA_URL,
        ...(cookies ? { Cookie: cookies } : {}),
      },
      body: body.toString(),
      redirect: "follow",
    });

    const raw = await postResp.text();

    if (debug) {
      return new Response(
        `<!-- selEquip="${selEquip}" selFabric="${selFabric}" selTipo="${selTipo}" -->\n` +
        `<!-- cookies: ${cookies} -->\n` +
        raw,
        { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (isChallenge(raw)) {
      return json({ erro: "Site MTE inacessível via servidor.", link: CA_URL }, 502);
    }

    // Extrai o HTML do UpdatePanel da resposta Delta
    const panelHtml = parseDelta(raw) || raw;

    const result = parseResult(panelHtml, ca);

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

// ── Parse do formato Delta do ASP.NET UpdatePanel ────────────────────────────
// Formato: length|type|id|content|length|type|id|content|...
function parseDelta(text) {
  let pos = 0;
  let panelHtml = "";

  while (pos < text.length) {
    const p1 = text.indexOf("|", pos);
    if (p1 === -1) break;
    const lenStr = text.substring(pos, p1);
    const len = parseInt(lenStr, 10);
    pos = p1 + 1;

    const p2 = text.indexOf("|", pos);
    if (p2 === -1) break;
    const type = text.substring(pos, p2);
    pos = p2 + 1;

    const p3 = text.indexOf("|", pos);
    if (p3 === -1) break;
    const id = text.substring(pos, p3);
    pos = p3 + 1;

    // Conteúdo tem exatamente `len` caracteres
    const content = isNaN(len) ? "" : text.substring(pos, pos + len);
    pos += isNaN(len) ? 0 : len;
    if (text[pos] === "|") pos++;

    if (type === "updatePanel") {
      panelHtml += content;
    }
  }

  return panelHtml || null;
}

// ── Detecta Cloudflare challenge ─────────────────────────────────────────────
function isChallenge(html) {
  return (
    html.includes("Enable JavaScript") ||
    html.includes("cf-browser-verification") ||
    html.includes("Just a moment")
  );
}

// ── Extrai valor de campo hidden ─────────────────────────────────────────────
function field(html, name) {
  const m =
    html.match(new RegExp(`name="${name}"[^>]+value="([^"]*)"`, "i")) ||
    html.match(new RegExp(`id="${name}"[^>]+value="([^"]*)"`, "i"));
  return m ? m[1] : "";
}

// ── Coleta todos os Set-Cookie headers ───────────────────────────────────────
function collectCookies(headers) {
  const cookies = [];
  for (const [k, v] of headers.entries()) {
    if (k.toLowerCase() === "set-cookie") {
      const pair = v.split(";")[0].trim();
      if (pair) cookies.push(pair);
    }
  }
  return cookies.join("; ");
}

// ── Extrai o valor do primeiro <option> de um select ────────────────────────
function firstOption(html, ctrlName) {
  const re = new RegExp(
    `<select[^>]+(?:id|name)="[^"]*${ctrlName}[^"]*"[^>]*>[\\s\\S]*?<option[^>]*value="([^"]*)"`,
    "i"
  );
  const m = html.match(re);
  return m ? m[1] : "";
}

// ── Parse do HTML de resultado ───────────────────────────────────────────────
function parseResult(html, caQuery) {
  if (
    /nenhum.*(CA|certificado|resultado)/i.test(html) ||
    /CA.*n[ãa]o.*encontrado/i.test(html)
  ) {
    return null;
  }

  // Extrai valor de célula td após cabeçalho com label
  const afterTh = (label) => {
    const re = new RegExp(
      `${label}[^<]*<\\/(?:td|th)>\\s*<(?:td|th)[^>]*>([^<]{2,200})`,
      "i"
    );
    const m = html.match(re);
    return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
  };

  const afterColon = (label) => {
    const re = new RegExp(`${label}[^:]*:\\s*([^<\\n]{2,200})`, "i");
    const m = html.match(re);
    return m ? m[1].trim() : "";
  };

  const nome = afterTh("Descri[çc][ãa]o") ||
               afterTh("Equipamento") ||
               afterColon("Descri[çc][ãa]o do EPI") ||
               afterColon("Equipamento");

  const fabricante = afterTh("Fabricante") ||
                     afterTh("Empresa") ||
                     afterColon("Fabricante") ||
                     afterColon("Empresa");

  const validade = afterTh("Validade") ||
                   afterColon("Validade") ||
                   (html.match(/(\d{2}\/\d{2}\/\d{4})/) || [])[1] || "";

  const situacao = afterTh("Situa[çc][ãa]o") ||
                   afterColon("Situa[çc][ãa]o") || "";

  const natureza = afterTh("Natureza") ||
                   afterTh("Tipo de Prote[çc][ãa]o") ||
                   afterColon("Natureza") || "";

  const numCA = afterTh("N[ºo\\.] CA") ||
                afterTh("N[ºo\\.] do CA") ||
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
  if (/cabe[cç]a|capac|elmo/.test(n))                                  return "Proteção da Cabeça";
  if (/olho|face|facial|viseira|[oó]culo/.test(n))                     return "Proteção dos Olhos e Face";
  if (/audit|ouvido|ru[ií]do|abafador|protetor auricular/.test(n))     return "Proteção Auditiva";
  if (/respir|pulm[ãa]o|filtro|m[áa]sc[áa]ra|pe[çc]a facial/.test(n)) return "Proteção Respiratória";
  if (/superior|m[ãa]o|luva|bra[cç]o|manga/.test(n))                  return "Proteção dos Membros Superiores";
  if (/inferior|p[eé]|cal[cç]ado|bota|sapato|perna|botina/.test(n))   return "Proteção dos Membros Inferiores";
  if (/tronco|torso|colete|vest|avental|jaleco/.test(n))               return "Proteção do Tronco";
  if (/corpo.*inteiro|maca[cç][ãa]o/.test(n))                         return "Proteção do Corpo Inteiro";
  if (/queda|altura|talabarte|cintur[ãa]o/.test(n))                    return "Proteção contra Quedas";
  return "Outro";
}
