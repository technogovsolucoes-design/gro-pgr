/**
 * Vercel Edge Function — consulta CA no site oficial do MTE (CAEPI)
 * GET /api/consulta-ca?ca=12345
 *
 * Fluxo: GET → POST busca (async UpdatePanel) → POST detalhar (async) → parse
 */

export const config = { runtime: "edge" };

const CA_URL =
  "https://caepi.trabalho.gov.br/internet/consultacainternet.aspx";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// IDs fixos extraídos do ScriptManager da página CAEPI
const SM        = "ctl00$ScriptManager1";
const PANEL     = "ctl00$PlaceHolderConteudo$panel";
const BTN_CONS  = "ctl00$PlaceHolderConteudo$btnConsultar";

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const ca    = (searchParams.get("ca") || "").replace(/\D/g, "");
  const debug = searchParams.get("debug") === "1";
  const step  = parseInt(searchParams.get("step") || "0", 10); // 1 ou 2 para debug

  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

  if (request.method === "OPTIONS") return new Response(null, { status: 200 });
  if (!ca) return json({ erro: "Informe o número do CA." }, 400);

  try {
    // ── 1. GET — ViewState inicial e cookies de sessão ─────────────────────
    const getResp = await fetch(CA_URL, {
      headers: baseHeaders(),
      redirect: "follow",
    });
    const initHtml = await getResp.text();

    if (isChallenge(initHtml)) {
      return json({ erro: "Site MTE temporariamente inacessível.", link: CA_URL }, 502);
    }

    const h0 = extractHidden(initHtml);
    if (!h0.vs) return json({ erro: "Página CAEPI fora do formato esperado.", link: CA_URL }, 502);

    const cookies    = collectCookies(getResp.headers);
    const selEquip   = firstOption(initHtml, "cboEquipamento");
    const selFabric  = firstOption(initHtml, "cboFabricante");
    const selTipo    = firstOption(initHtml, "cboTipoProtecao");

    // ── 2. POST busca — async UpdatePanel ─────────────────────────────────
    const body1 = buildBody({
      sm: `${PANEL}|${BTN_CONS}`,
      hidden: h0,
      extra: {
        "ctl00$PlaceHolderConteudo$txtNumeroCA":    ca,
        "ctl00$PlaceHolderConteudo$cboEquipamento":  selEquip,
        "ctl00$PlaceHolderConteudo$cboFabricante":   selFabric,
        "ctl00$PlaceHolderConteudo$cboTipoProtecao": selTipo,
        "ctl00$PlaceHolderConteudo$btnConsultar":    "Consultar",
      },
    });

    const post1Resp = await fetch(CA_URL, {
      method: "POST",
      headers: asyncHeaders(cookies),
      body: body1,
      redirect: "follow",
    });
    const raw1 = await post1Resp.text();

    if (debug && (step === 0 || step === 1)) {
      return new Response(raw1, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (isChallenge(raw1)) return json({ erro: "Site MTE inacessível via servidor.", link: CA_URL }, 502);

    const delta1   = parseDelta(raw1);
    const listHtml = delta1.panels["PlaceHolderConteudo_panel"] || "";

    // Sem resultados na lista
    if (!listHtml || /nenhum|n[ãa]o.*encontrado/i.test(listHtml)) {
      return json({ erro: `CA ${ca} não encontrado. Verifique o número informado.`, link: CA_URL }, 404);
    }

    // Extrai a empresa da lista de resultados
    const listFabricante = extractSpan(listHtml, "lblNomeLaboratorio_0");

    // Extrai o nome do botão Detalhar da primeira linha (ctl02 = primeira linha de dados)
    const btnDetalhar = extractBtnDetalhar(listHtml);
    if (!btnDetalhar) {
      // Se não há botão de detalhe, tenta extrair o que tem diretamente da lista
      return json(buildFromList(listHtml, ca, listFabricante));
    }

    // VIEWSTATE atualizado após a busca
    const h1 = Object.keys(delta1.hidden).length ? delta1.hidden : h0;

    // ── 3. POST detalhar — clica no botão de detalhamento ─────────────────
    // ImageButton usa __EVENTTARGET com o UniqueID do botão
    const btnUnique = `ctl00$PlaceHolderConteudo$${btnDetalhar}`;
    const body2 = buildBody({
      sm: `${PANEL}|${btnUnique}`,
      hidden: h1,
      extra: {
        __EVENTTARGET:  btnUnique,
        "ctl00$PlaceHolderConteudo$txtNumeroCA":    ca,
        "ctl00$PlaceHolderConteudo$cboEquipamento":  selEquip,
        "ctl00$PlaceHolderConteudo$cboFabricante":   selFabric,
        "ctl00$PlaceHolderConteudo$cboTipoProtecao": selTipo,
        // Image button: coordenadas (0,0)
        [`${btnUnique}.x`]: "0",
        [`${btnUnique}.y`]: "0",
      },
    });

    const post2Resp = await fetch(CA_URL, {
      method: "POST",
      headers: asyncHeaders(cookies),
      body: body2,
      redirect: "follow",
    });
    const raw2 = await post2Resp.text();

    if (debug && step === 2) {
      return new Response(raw2, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (isChallenge(raw2)) return json({ erro: "Site MTE inacessível via servidor.", link: CA_URL }, 502);

    const delta2      = parseDelta(raw2);
    const detailHtml  = delta2.panels["PlaceHolderConteudo_panel"] || raw2;

    const result = parseDetail(detailHtml, ca, listFabricante);
    if (!result) {
      return json({ erro: `CA ${ca} não encontrado. Verifique o número informado.`, link: CA_URL }, 404);
    }

    return json(result);

  } catch (err) {
    return json({ erro: "Erro ao consultar CAEPI: " + err.message, link: CA_URL }, 502);
  }
}

// ── Monta body URLSearchParams ────────────────────────────────────────────────
function buildBody({ sm, hidden, extra = {} }) {
  const params = new URLSearchParams({
    [SM]:             sm,
    __EVENTTARGET:    "",
    __EVENTARGUMENT:  "",
    __ASYNCPOST:      "true",
    __VIEWSTATE:      hidden.vs  || "",
    __VIEWSTATEGENERATOR: hidden.vsg || "",
    __EVENTVALIDATION:    hidden.ev  || "",
    ...extra,
  });
  return params.toString();
}

// ── Headers base ─────────────────────────────────────────────────────────────
function baseHeaders() {
  return {
    "User-Agent":      UA,
    Accept:            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "Cache-Control":   "no-cache",
  };
}

// ── Headers async UpdatePanel ─────────────────────────────────────────────────
function asyncHeaders(cookies) {
  return {
    "User-Agent":        UA,
    Accept:              "*/*",
    "Accept-Language":   "pt-BR,pt;q=0.9",
    "Content-Type":      "application/x-www-form-urlencoded; charset=UTF-8",
    "X-MicrosoftAjax":  "Delta=true",
    "X-Requested-With": "XMLHttpRequest",
    Referer:             CA_URL,
    ...(cookies ? { Cookie: cookies } : {}),
  };
}

// ── Parse completo do formato Delta ──────────────────────────────────────────
function parseDelta(text) {
  const panels = {};
  const hidden = {};
  let pos = 0;

  while (pos < text.length) {
    const p1 = text.indexOf("|", pos);
    if (p1 === -1) break;
    const len = parseInt(text.substring(pos, p1), 10);
    pos = p1 + 1;

    const p2 = text.indexOf("|", pos);
    if (p2 === -1) break;
    const type = text.substring(pos, p2);
    pos = p2 + 1;

    const p3 = text.indexOf("|", pos);
    if (p3 === -1) break;
    const id = text.substring(pos, p3);
    pos = p3 + 1;

    const content = isNaN(len) ? "" : text.substring(pos, pos + len);
    pos += isNaN(len) ? 0 : len;
    if (text[pos] === "|") pos++;

    if (type === "updatePanel") panels[id] = content;
    if (type === "hiddenField" && id && content) hidden[id] = content;
  }

  return { panels, hidden };
}

// ── Extrai campos __VIEWSTATE/__VIEWSTATEGENERATOR/__EVENTVALIDATION do HTML ─
function extractHidden(html) {
  return {
    vs:  fieldVal(html, "__VIEWSTATE"),
    vsg: fieldVal(html, "__VIEWSTATEGENERATOR"),
    ev:  fieldVal(html, "__EVENTVALIDATION"),
  };
}

function fieldVal(html, name) {
  const m =
    html.match(new RegExp(`name="${name}"[^>]+value="([^"]*)"`, "i")) ||
    html.match(new RegExp(`id="${name}"[^>]+value="([^"]*)"`, "i"));
  return m ? m[1] : "";
}

// ── Extrai valor de span por id parcial ──────────────────────────────────────
function extractSpan(html, idSuffix) {
  const re = new RegExp(`id="[^"]*${idSuffix}[^"]*">([^<]+)<`, "i");
  const m = html.match(re);
  return m ? m[1].trim() : "";
}

// ── Extrai nome do botão Detalhar da primeira linha ──────────────────────────
function extractBtnDetalhar(html) {
  // <input type="image" name="ctl00$PlaceHolderConteudo$grdListaResultado$ctl02$btnDetalhar" ...
  const m = html.match(/name="ctl00\$PlaceHolderConteudo\$([^"]*btnDetalhar[^"]*)"/i);
  return m ? m[1] : null;
}

// ── Parse da página de detalhe do CA ─────────────────────────────────────────
function parseDetail(html, caQuery, listFabricante) {
  // Sem resultado
  if (/nenhum|n[ãa]o.*encontrado/i.test(html) && !html.includes("Validade")) return null;

  const cell = (label) => {
    const re = new RegExp(
      `${label}[^<]*<\\/(?:td|th|span|div)>[^<]*<(?:td|th|span|div)[^>]*>([^<]{2,200})`,
      "i"
    );
    const m = html.match(re);
    return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
  };

  const colon = (label) => {
    const re = new RegExp(`${label}[^:]*:\\s*([^<\\n]{2,200})`, "i");
    const m = html.match(re);
    return m ? m[1].trim() : "";
  };

  const spanById = (id) => extractSpan(html, id);

  // Tenta por spans com IDs conhecidos, depois por label → next cell, depois por label:value
  const nome = spanById("lblDescricaoEPI") ||
               spanById("lblEquipamento") ||
               cell("Descri[çc][ãa]o") || cell("Equipamento") ||
               colon("Descri[çc][ãa]o") || colon("Equipamento");

  const fabricante = spanById("lblFabricante") ||
                     spanById("lblEmpresa") ||
                     spanById("lblNomeLaboratorio") ||
                     cell("Fabricante") || cell("Empresa") ||
                     colon("Fabricante") || listFabricante || "";

  const validade = spanById("lblValidade") ||
                   spanById("lblValidadeCa") ||
                   cell("Validade") || colon("Validade") ||
                   (html.match(/(\d{2}\/\d{2}\/\d{4})/) || [])[1] || "";

  const situacao = spanById("lblSituacao") ||
                   spanById("lblSituacaoCa") ||
                   cell("Situa[çc][ãa]o") || colon("Situa[çc][ãa]o") || "";

  const natureza = spanById("lblNatureza") ||
                   spanById("lblTipoProtecao") ||
                   cell("Natureza") || cell("Tipo de Prote[çc][ãa]o") ||
                   colon("Natureza") || "";

  const numCA = spanById("lblNrCA") ||
                cell("N[ºo\\.] do CA") || cell("N[ºo\\.] CA") ||
                colon("N[ºo\\.] CA") || caQuery;

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

// ── Extrai dados básicos da lista de resultados (sem clicar em detalhar) ─────
function buildFromList(html, caQuery, fabricante) {
  return {
    ca:         caQuery,
    nome:       "",
    fabricante: toTitleCase(fabricante),
    validadeCa: "",
    situacao:   "Ativo",
    ativo:      true,
    tipo:       "Outro",
    descricao:  "",
    natureza:   "",
  };
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

// ── Extrai primeiro valor de <option> de um select por nome do controle ──────
function firstOption(html, ctrlName) {
  const re = new RegExp(
    `<select[^>]+(?:id|name)="[^"]*${ctrlName}[^"]*"[^>]*>[\\s\\S]*?<option[^>]*value="([^"]*)"`,
    "i"
  );
  const m = html.match(re);
  return m ? m[1] : "";
}

// ── Detecta Cloudflare challenge ─────────────────────────────────────────────
function isChallenge(html) {
  return (
    html.includes("Enable JavaScript") ||
    html.includes("cf-browser-verification") ||
    html.includes("Just a moment")
  );
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
