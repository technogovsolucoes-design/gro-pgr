import { useState, useRef, useEffect } from "react";
import { Brain, Sparkles, Send, MessageSquare, AlertCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants";

const BOAS_VINDAS = {
  role: "assistant",
  content: "Olá! Sou a NEXIA, assistente de IA do sistema NEXUS SST.\n\nPosso ajudar com interpretação de exames, análise de riscos, dúvidas sobre NRs, PCMSO, PGR, eSocial SST, IBUTG, COPSOQ e muito mais.\n\nComo posso ajudar hoje?",
  ts: new Date(),
};

const SUGESTOES = [
  "Interpretar exame audiométrico",
  "Análise de risco por GHE",
  "Limites de IBUTG para trabalho pesado",
  "Quais eventos enviar no eSocial SST?",
  "Quando é obrigatório emitir CAT?",
  "COPSOQ II — como interpretar os resultados?",
];

const HISTORICO_MOCK = [
  { id: 1, titulo: "Análise de Risco Ergonômico", data: "14/07/2026" },
  { id: 2, titulo: "Interpretação ASO — Setor Admin", data: "10/07/2026" },
  { id: 3, titulo: "Dúvidas NR-01 Psicossocial", data: "05/07/2026" },
  { id: 4, titulo: "Planejamento PCMSO 2026", data: "28/06/2026" },
];

export default function AssistenteIA() {
  const { userProfile } = useApp();
  const [mensagens,  setMensagens]  = useState([BOAS_VINDAS]);
  const [input,      setInput]      = useState("");
  const [enviando,   setEnviando]   = useState(false);
  const [convAtiva,  setConvAtiva]  = useState(null);
  const [erroApi,    setErroApi]    = useState("");
  const msgEndRef = useRef(null);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function enviar(texto) {
    const txt = (texto || input).trim();
    if (!txt || enviando) return;

    const msgUser = { role: "user", content: txt, ts: new Date() };
    const historicoAtual = [...mensagens, msgUser];

    setMensagens(historicoAtual);
    setInput("");
    setEnviando(true);
    setErroApi("");

    try {
      // Prepara histórico para a API (sem o campo ts)
      const apiMessages = historicoAtual
        .filter(m => m.role !== undefined)
        .map(({ role, content }) => ({ role, content }));

      const res = await fetch("/api/nexia", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: apiMessages }),
      });

      // Tenta parsear JSON — se falhar (ex: HTML de erro do Vercel), trata como erro
      let data;
      try {
        data = await res.json();
      } catch {
        setErroApi(`Erro ${res.status}: a NEXIA retornou resposta inesperada. Verifique as variáveis de ambiente no Vercel (ANTHROPIC_API_KEY).`);
        setMensagens(prev => prev.filter(m => m !== msgUser));
        return;
      }

      if (!res.ok) {
        setErroApi(data.erro || `Erro ${res.status} ao conectar com a NEXIA.`);
        setMensagens(prev => prev.filter(m => m !== msgUser));
        return;
      }

      setMensagens(prev => [...prev, { role: "assistant", content: data.content, ts: new Date() }]);
    } catch (err) {
      setErroApi("Erro de conexão com a NEXIA: " + (err?.message || "tente novamente."));
    } finally {
      setEnviando(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  }

  function novaConversa() {
    setMensagens([BOAS_VINDAS]);
    setConvAtiva(null);
    setInput("");
    setErroApi("");
  }

  // Formata markdown simples: **bold**, listas com -
  function formatarResposta(texto) {
    return texto
      .split("\n")
      .map((linha, i) => {
        if (linha.startsWith("- ") || linha.startsWith("• ")) {
          return <p key={i} style={{ margin: "2px 0", paddingLeft: 12 }}>• {formatBold(linha.slice(2))}</p>;
        }
        if (linha.trim() === "") return <br key={i} />;
        return <p key={i} style={{ margin: "2px 0" }}>{formatBold(linha)}</p>;
      });
  }

  function formatBold(texto) {
    const partes = texto.split(/\*\*(.+?)\*\*/g);
    return partes.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p);
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", gap: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div style={{ width: 240, background: C.navyMid, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Brain size={18} color="#fff" />
            <p style={{ fontWeight: 800, fontSize: 13, color: "#fff", margin: 0 }}>NEXIA</p>
            <span style={{ fontSize: 9, background: "#38b249", color: "#fff", borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>IA</span>
          </div>
          <button onClick={novaConversa}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>
            + Nova Conversa
          </button>
        </div>

        <div style={{ padding: "12px 14px", flex: 1, overflowY: "auto" }}>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", margin: "0 0 8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Histórico</p>
          {HISTORICO_MOCK.map(conv => (
            <button key={conv.id} onClick={() => setConvAtiva(conv.id)}
              style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", background: convAtiva === conv.id ? "rgba(255,255,255,0.2)" : "transparent", color: "#fff", cursor: "pointer", marginBottom: 4, fontFamily: "inherit" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                <MessageSquare size={12} style={{ marginTop: 2, opacity: 0.7, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{conv.titulo}</p>
                  <p style={{ fontSize: 10, opacity: 0.6, margin: 0 }}>{conv.data}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0 }}>{userProfile?.nome || "Usuário"}</p>
        </div>
      </div>

      {/* ── Área Principal ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Erro de API */}
        {erroApi && (
          <div style={{ background: "#fee2e2", borderBottom: "1px solid #fca5a5", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={14} color="#dc2626" />
            <p style={{ fontSize: 11, color: "#991b1b", margin: 0, flex: 1 }}>{erroApi}</p>
            <button onClick={() => setErroApi("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b", fontSize: 16, padding: 0 }}>✕</button>
          </div>
        )}

        {/* Mensagens */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {mensagens.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 10 }}>
                {!isUser && (
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.navyMid, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Brain size={16} color="#fff" />
                  </div>
                )}
                <div style={{
                  maxWidth: "72%", padding: "12px 16px",
                  borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isUser ? C.navyMid : C.bg,
                  color: isUser ? "#fff" : C.text,
                  fontSize: 12, lineHeight: 1.7,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}>
                  {isUser
                    ? msg.content
                    : <div>{formatarResposta(msg.content)}</div>
                  }
                  <p style={{ fontSize: 10, opacity: 0.6, margin: "6px 0 0", textAlign: "right" }}>
                    {msg.ts instanceof Date ? msg.ts.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </p>
                </div>
                {isUser && (
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 700, color: C.navyMid }}>
                    {(userProfile?.nome || "U")[0].toUpperCase()}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing indicator */}
          {enviando && (
            <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-end", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.navyMid, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Brain size={16} color="#fff" />
              </div>
              <div style={{ background: C.bg, borderRadius: "18px 18px 18px 4px", padding: "12px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: C.muted, animation: `pulse 1.2s infinite ${j * 0.3}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={msgEndRef} />
        </div>

        {/* Sugestões rápidas */}
        {mensagens.length <= 1 && (
          <div style={{ padding: "0 24px 12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SUGESTOES.map((s, i) => (
              <button key={i} onClick={() => enviar(s)}
                style={{ padding: "5px 11px", borderRadius: 20, border: `1px solid ${C.border}`, background: C.white, fontSize: 11, cursor: "pointer", color: C.navyMid, fontWeight: 600, fontFamily: "inherit" }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Pergunte sobre SST, NRs, PCMSO, riscos, exames… (Enter para enviar, Shift+Enter para nova linha)"
            rows={2}
            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: "inherit", resize: "none", outline: "none", lineHeight: 1.5 }}
          />
          <button
            onClick={() => enviar()}
            disabled={!input.trim() || enviando}
            style={{ padding: "12px 16px", borderRadius: 10, border: "none", background: (!input.trim() || enviando) ? C.border : C.navyMid, color: (!input.trim() || enviando) ? C.muted : "#fff", cursor: (!input.trim() || enviando) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
