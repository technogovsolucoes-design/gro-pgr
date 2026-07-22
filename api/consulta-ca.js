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

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const ca = (searchParams.get("ca") || "").replace(/\D/g, "");

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
    // ── 1. GET da página para extrair VIEWSTATE e cookies ──────────────────
    const getResp = await fetch(CA_URL, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });

    const html = await getResp.text();

    // Detecta Cloudflare challenge
    if (
      html.includes("Enable JavaScript") ||
      html.includes("cf-browser-verification") ||
      html.includes("Just a moment")
    ) {
      return json(
        {
          erro: "Site MTE temporariamente inacessível. Consulte diretamente.",
          link: CA_URL,
        },
        502
      );
    }

    // Extrai campos ocultos obrigatórios do ASP.NET WebForms
    const vs = extract(html, /__VIEWSTATE[^>]+value="([^"]+)"/);
    const vsg = extract(html, /__VIEWSTATEGENERATOR[^>]+value="([^"]+)"/);
    const ev = extract(html, /__EVENTVALIDATION[^>]+value="([^"]+)"/);

    if (!vs) {
      return json(
        {
          erro: "Página CAEPI fora do formato esperado.",
          link: CA_URL,
        },
        502
      );
    }

    // Cookies do GET (necessários para manter a sessão ASP.NET)
    const cookies = getResp.headers.get("set-cookie") || "";
    const cookieHeader = parseCookies(cookies);

    // ── 2. POST do formulário de busca ─────────────────────────────────────
    const body = new URLSearchParams({
      __EVENTTARGET: "",
      __EVENTARGUMENT: "",
      __VIEWSTATE: vs,
      __VIEWSTATEGENERATOR: vsg || "",
      __EVENTVALIDATION: ev || "",
      "ctl00$PlaceHolderConteudo$txtNumeroCA": ca,
      "ctl00$PlaceHolderConteudo$cboFabricante": "0",
      "ctl00$PlaceHolderConteudo$cboTipoProtecao": "0",
      "ctl00$PlaceHolderConteudo$btnConsultar": "Consultar",
    });

    const postResp = await fetch(CA_URL, {
      method: "POST",
      headers: {
        ...BROWSER_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: CA_URL,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: body.toString(),
      redirect: "follow",
    });

    const resultHtml = await postResp.text();

    // Cloudflare bloqueou o POST
    if (
      resultHtml.includes("Enable JavaScript") ||
      resultHtml.includes("Just a moment")
    ) {
      return json({ erro: "Site MTE inacessível via servidor.", link: CA_URL }, 502);
    }

    const result = parseResult(resultHtml, ca);

    if (!result) {
      return json(
        {
          erro: `CA ${ca} não encontrado. Verifique o número informado.`,
          link: CA_URL,
        },
        404
      );
    }

    return json(result);
  } catch (err) {
    return json({ erro: "Erro ao consultar CAEPI: " + err.message, link: CA_URL }, 502);
  }
}

// ── Extrai o primeiro grupo capturado de uma regex ───────────────────────────
function extract(html, re) {
  const m = html.match(re);
  return m ? m[1] : "";
}

// ── Transforma set-cookie em header Cookie simples ───────────────────────────
function parseCookies(setCookieHeader) {
  if (!setCookieHeader) return "";
  return setCookieHeader
    .split(/,(?=[^ ]+=[^;]+)/)
    .map((c) => c.split(";")[0].trim())
    .join("; ");
}

// ── Faz o parse do HTML de resultado do CAEPI ───────────────────────────────
function parseResult(html, caQuery) {
  // Indicadores de "nenhum resultado"
  if (
    /nenhum.*(CA|certificado|resultado)/i.test(html) ||
    /CA.*n[aã]o.*encontrado/i.test(html) ||
    (html.includes("Consultar") && !html.includes("Fabricante") && !html.includes("Validade"))
  ) {
    return null;
  }

  // Tenta extrair dados de tabela HTML ou definição de texto
  const get = (...patterns) => {
    for (const re of patterns) {
      const m = html.match(re);
      if (m && m[1] && m[1].trim()) return m[1].replace(/<[^>]+>/g, "").trim();
    }
    return "";
  };

  // Estratégia 1: células de tabela com cabeçalhos conhecidos
  const nome = get(
    /(?:Descri[çc][ãa]o do EPI|Equipamento)[^<]*<\/[^>]+>\s*<[^>]+>([^<]{3,})/i,
    /<td[^>]*>([A-ZÁÉÍÓÚÀÃÕÂÊÔÇÜ][A-Za-záéíóúàãõâêôçü\s,.\-/]{5,80})<\/td>/
  );

  const fabricante = get(
    /(?:Fabricante|Empresa)[^<]*<\/[^>]+>\s*<[^>]+>([^<]{3,})/i,
    /Fabricante:\s*<[^>]*>([^<]{3,})/i
  );

  const validade = get(
    /(?:Validade|V[áa]lido at[ée])[^<]*<\/[^>]+>\s*<[^>]+>([^<]{5,20})/i,
    /Validade[^:]*:\s*<[^>]*>([0-9\/\-]{5,15})/i,
    /(\d{2}\/\d{2}\/\d{4})/
  );

  const situacao = get(
    /(?:Situa[çc][ãa]o)[^<]*<\/[^>]+>\s*<[^>]+>([^<]{2,30})/i,
    /Situa[çc][ãa]o[^:]*:\s*<[^>]*>([^<]{2,30})/i
  );

  const natureza = get(
    /(?:Natureza|Tipo de Prote[çc][ãa]o)[^<]*<\/[^>]+>\s*<[^>]+>([^<]{3,80})/i,
    /Natureza[^:]*:\s*<[^>]*>([^<]{3,80})/i
  );

  const numCA = get(
    /(?:N[ºo\.]\s*CA|CA\s*N[ºo\.])[^<]*<\/[^>]+>\s*<[^>]+>([^<]{1,20})/i,
    /CA[^<]{0,5}(\d{4,6})/i
  ) || caQuery;

  // Se não encontrou nome, retorna null (não há resultado)
  if (!nome && !fabricante) return null;

  return {
    ca: numCA.replace(/\D/g, "") || caQuery,
    nome: toTitleCase(nome || ""),
    fabricante: toTitleCase(fabricante || ""),
    validadeCa: parseDateBR(validade),
    situacao: situacao || "Ativo",
    ativo: !situacao || /ativo|v[áa]lido/i.test(situacao),
    tipo: mapTipo(natureza || nome || ""),
    descricao: toTitleCase(nome || ""),
    natureza: toTitleCase(natureza || ""),
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
  if (/cabe[cç]a|capac|elmo/.test(n)) return "Proteção da Cabeça";
  if (/olho|face|facial|viseira|[oó]culo/.test(n)) return "Proteção dos Olhos e Face";
  if (/audit|ouvido|ru[ií]do|abafador|protetor auricular/.test(n)) return "Proteção Auditiva";
  if (/respir|pulm[ãa]o|filtro|m[áa]sc[áa]ra|pe[çc]a facial/.test(n)) return "Proteção Respiratória";
  if (/superior|m[ãa]o|luva|bra[cç]o|manga/.test(n)) return "Proteção dos Membros Superiores";
  if (/inferior|p[eé]|cal[cç]ado|bota|sapato|perna|botina/.test(n)) return "Proteção dos Membros Inferiores";
  if (/tronco|torso|colete|vest|avental|jaleco/.test(n)) return "Proteção do Tronco";
  if (/corpo.*inteiro|maca[cç][ãa]o/.test(n)) return "Proteção do Corpo Inteiro";
  if (/queda|altura|talabarte|cintur[ãa]o/.test(n)) return "Proteção contra Quedas";
  return "Outro";
}
