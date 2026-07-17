import { useState, useRef, useEffect } from "react";
import { Brain, Sparkles, Send, MessageSquare } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants";

const BOAS_VINDAS = {
  role: "assistant",
  content: "Olá! Sou a NEXIA, assistente de IA do sistema NEXUS SST. Posso ajudar com interpretação de exames, análise de riscos, discussão do PCMSO e muito mais. Como posso ajudar hoje?",
  ts: new Date(),
};

const SUGESTOES = [
  "Interpretar exame audiométrico",
  "Análise de risco por GHE",
  "Discussão do PCMSO",
  "Analisar questionário COPSOQ",
];

const HISTORICO_MOCK = [
  { id:1, titulo:"Análise de Risco Ergonômico", data:"14/07/2026" },
  { id:2, titulo:"Interpretação ASO — Setor Admin", data:"10/07/2026" },
  { id:3, titulo:"Dúvidas NR-01 Psicossocial", data:"05/07/2026" },
  { id:4, titulo:"Planejamento PCMSO 2026", data:"28/06/2026" },
];

const RESPOSTA_IA = "Esta funcionalidade está em integração com a API de IA. Em breve você poderá obter análises automáticas de exames, riscos e relatórios. [INTEGRAÇÃO EM DESENVOLVIMENTO]";

export default function AssistenteIA() {
  const { userProfile } = useApp();
  const [mensagens, setMensagens] = useState([BOAS_VINDAS]);
  const [input, setInput]         = useState("");
  const [enviando, setEnviando]   = useState(false);
  const [convAtiva, setConvAtiva] = useState(null);
  const msgEndRef = useRef(null);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [mensagens]);

  function enviar(texto) {
    const txt = (texto || input).trim();
    if (!txt) return;
    const msgUser = { role:"user", content:txt, ts:new Date() };
    setMensagens(p => [...p, msgUser]);
    setInput("");
    setEnviando(true);
    setTimeout(() => {
      setMensagens(p => [...p, { role:"assistant", content:RESPOSTA_IA, ts:new Date() }]);
      setEnviando(false);
    }, 900);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  function novaConversa() {
    setMensagens([BOAS_VINDAS]);
    setConvAtiva(null);
    setInput("");
  }

  return (
    <div style={{ display:"flex", height:"calc(100vh - 120px)", gap:0, background:C.white, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>

      {/* ── Sidebar ── */}
      <div style={{ width:240, background:C.navyMid, display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"16px 14px", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <Brain size={18} color="#fff"/>
            <p style={{ fontWeight:800, fontSize:13, color:"#fff", margin:0 }}>NEXIA</p>
          </div>
          <button onClick={novaConversa}
            style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.1)", color:"#fff", cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:"inherit" }}>
            + Nova Conversa
          </button>
        </div>

        <div style={{ padding:"12px 14px", flex:1, overflowY:"auto" }}>
          <p style={{ fontSize:10, color:"rgba(255,255,255,0.5)", margin:"0 0 8px", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>Histórico</p>
          {HISTORICO_MOCK.map(conv => (
            <button key={conv.id} onClick={() => setConvAtiva(conv.id)}
              style={{ width:"100%", textAlign:"left", padding:"8px 10px", borderRadius:8, border:"none", background: convAtiva === conv.id ? "rgba(255,255,255,0.2)" : "transparent", color:"#fff", cursor:"pointer", marginBottom:4, fontFamily:"inherit" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:6 }}>
                <MessageSquare size={12} style={{ marginTop:2, opacity:0.7, flexShrink:0 }}/>
                <div>
                  <p style={{ fontSize:11, fontWeight:600, margin:0, lineHeight:1.4 }}>{conv.titulo}</p>
                  <p style={{ fontSize:10, opacity:0.6, margin:0 }}>{conv.data}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ padding:"12px 14px", borderTop:"1px solid rgba(255,255,255,0.1)" }}>
          <p style={{ fontSize:10, color:"rgba(255,255,255,0.5)", margin:0 }}>
            {userProfile?.nome || "Usuário"}
          </p>
        </div>
      </div>

      {/* ── Área Principal ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>

        {/* Banner */}
        <div style={{ background:"#fef3c7", borderBottom:`1px solid #fde68a`, padding:"8px 16px", display:"flex", alignItems:"center", gap:8 }}>
          <Sparkles size={14} color={C.amber}/>
          <p style={{ fontSize:11, color:"#92400e", margin:0, fontWeight:600 }}>
            Módulo em implementação — Integração com IA em desenvolvimento
          </p>
        </div>

        {/* Mensagens */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 }}>
          {mensagens.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div key={i} style={{ display:"flex", justifyContent: isUser ? "flex-end" : "flex-start", alignItems:"flex-end", gap:10 }}>
                {!isUser && (
                  <div style={{ width:32, height:32, borderRadius:"50%", background:C.navyMid, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Brain size={16} color="#fff"/>
                  </div>
                )}
                <div style={{
                  maxWidth:"70%", padding:"12px 16px", borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isUser ? C.navyMid : C.bg,
                  color: isUser ? "#fff" : C.text,
                  fontSize:12, lineHeight:1.6,
                  boxShadow:"0 1px 4px rgba(0,0,0,0.08)",
                }}>
                  {msg.content}
                  <p style={{ fontSize:10, opacity:0.6, margin:"6px 0 0", textAlign:"right" }}>
                    {msg.ts instanceof Date ? msg.ts.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }) : ""}
                  </p>
                </div>
                {isUser && (
                  <div style={{ width:32, height:32, borderRadius:"50%", background:"#e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:13, fontWeight:700, color:C.navyMid }}>
                    {(userProfile?.nome || "U")[0].toUpperCase()}
                  </div>
                )}
              </div>
            );
          })}

          {enviando && (
            <div style={{ display:"flex", justifyContent:"flex-start", alignItems:"flex-end", gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:C.navyMid, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Brain size={16} color="#fff"/>
              </div>
              <div style={{ background:C.bg, borderRadius:"18px 18px 18px 4px", padding:"12px 16px", boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
                <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                  {[0,1,2].map(j => (
                    <div key={j} style={{ width:6, height:6, borderRadius:"50%", background:C.muted, animation:"pulse 1.2s infinite", animationDelay:`${j*0.3}s` }}/>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={msgEndRef}/>
        </div>

        {/* Sugestões rápidas */}
        {mensagens.length <= 1 && (
          <div style={{ padding:"0 24px 12px", display:"flex", gap:8, flexWrap:"wrap" }}>
            {SUGESTOES.map((s, i) => (
              <button key={i} onClick={() => enviar(s)}
                style={{ padding:"6px 12px", borderRadius:20, border:`1px solid ${C.border}`, background:C.white, fontSize:11, cursor:"pointer", color:C.navyMid, fontWeight:600, fontFamily:"inherit" }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.border}`, display:"flex", gap:10, alignItems:"flex-end" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Pergunte sobre SST, PCMSO, riscos, exames… (Enter para enviar)"
            rows={2}
            style={{ flex:1, padding:"10px 14px", borderRadius:10, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", resize:"none", outline:"none", lineHeight:1.5 }}
          />
          <button
            onClick={() => enviar()}
            disabled={!input.trim() || enviando}
            style={{ padding:"12px 16px", borderRadius:10, border:"none", background: (!input.trim() || enviando) ? C.border : C.navyMid, color: (!input.trim() || enviando) ? C.muted : "#fff", cursor: (!input.trim() || enviando) ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Send size={16}/>
          </button>
        </div>
      </div>
    </div>
  );
}
