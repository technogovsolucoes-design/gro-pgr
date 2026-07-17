/**
 * NEXIA — Assistente de IA para SST
 * Proxy para a API Claude (Anthropic).
 *
 * POST /api/nexia
 * Body: { messages: [{ role, content }] }
 * Requer env: ANTHROPIC_API_KEY
 */

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL         = "claude-3-5-haiku-20241022"; // rápido e econômico para chat
const MAX_TOKENS    = 1024;
const TIMEOUT_MS    = 30000;

const SYSTEM_PROMPT = `Você é a NEXIA, assistente de IA especializada em Saúde e Segurança do Trabalho (SST) do sistema NEXUS SST, desenvolvido pela Technogov Soluções.

Sua expertise cobre:
- Medicina do Trabalho: PCMSO, ASO, Audiometria, NR-7, Vacinação Ocupacional
- Segurança do Trabalho: PGR, GRO, LTCAT, NR-01, NR-09, NR-15, NR-17, NR-6, NR-5 (CIPA)
- Previdenciário: PPP, CAT (B91), FAP, NTEP, Decreto 3.048/99
- eSocial SST: S-2210, S-2220, S-2240, S-2245
- Fatores Psicossociais: COPSOQ II, ISO 45003:2021, NR-01 §1.4
- Estresse Térmico: IBUTG, NHO 06 Fundacentro, NR-15 Anexo 3
- Legislação: CLT, Portarias MTE, Súmulas do TST e STF relacionadas a SST

Diretrizes de resposta:
- Seja preciso e cite a base normativa (número da NR, portaria, norma) sempre que relevante
- Use linguagem técnica mas acessível para profissionais de SST (Médico do Trabalho, Engenheiro de Segurança, Técnico de Segurança)
- Para interpretação de exames, detalhe valores de referência e significado clínico
- Para dúvidas sobre prazos ou limites legais, cite a fonte exata
- Quando não souber algo com certeza, seja honesto e indique onde buscar a informação correta
- Responda em Português do Brasil
- Seja conciso mas completo — prefira listas e estrutura quando a resposta for longa`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ erro: "Método não permitido." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return res.status(503).json({ erro: "NEXIA não configurada. Adicione ANTHROPIC_API_KEY nas variáveis de ambiente do Vercel." });

  const { messages } = req.body ?? {};
  if (!messages || !Array.isArray(messages) || messages.length === 0)
    return res.status(400).json({ erro: "Campo 'messages' é obrigatório." });

  // Filtra apenas roles válidos, remove msgs vazias e trunca em 20
  const filtradas = messages
    .filter(m => ["user", "assistant"].includes(m.role) && typeof m.content === "string" && m.content.trim())
    .slice(-20);

  // Anthropic exige que a conversa comece com 'user' — descarta assistants iniciais
  const primeiroUser = filtradas.findIndex(m => m.role === "user");
  const mensagensValidas = primeiroUser > 0 ? filtradas.slice(primeiroUser) : filtradas;

  if (mensagensValidas.length === 0)
    return res.status(400).json({ erro: "Nenhuma mensagem válida." });

  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        system:     SYSTEM_PROMPT,
        messages:   mensagensValidas,
      }),
      signal: ctrl.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const detalhe = err?.error?.message || "";
      console.error("[NEXIA]", response.status, detalhe || err);
      if (response.status === 401) return res.status(401).json({ erro: "API key inválida. Verifique ANTHROPIC_API_KEY no Vercel." });
      if (response.status === 403) return res.status(403).json({ erro: "API key sem permissão para este modelo. Verifique o plano Anthropic." });
      if (response.status === 429) return res.status(429).json({ erro: "Muitas requisições. Aguarde alguns segundos." });
      if (response.status === 404) return res.status(404).json({ erro: `Modelo não encontrado: ${MODEL}` });
      return res.status(502).json({ erro: `Erro ${response.status} na API Anthropic${detalhe ? `: ${detalhe}` : ". Tente novamente."}` });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text ?? "";

    return res.status(200).json({
      content,
      model:         data.model,
      inputTokens:   data.usage?.input_tokens,
      outputTokens:  data.usage?.output_tokens,
    });

  } catch (err) {
    if (err.name === "AbortError")
      return res.status(504).json({ erro: "A NEXIA demorou para responder. Tente novamente." });
    console.error("[NEXIA]", err.message);
    return res.status(500).json({ erro: "Erro interno. Tente novamente." });
  } finally {
    clearTimeout(timer);
  }
};
