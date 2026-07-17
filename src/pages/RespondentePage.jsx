/**
 * Página pública de resposta ao questionário COPSOQ.
 * Sem autenticação. Lê de questionarios_publicos/{id}.
 */
import { useState, useEffect } from "react";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { NexusLogo } from "../assets/NexusLogo";
import { C } from "../constants";

const ESCALA = ["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca/Quase nunca"];

// ─── Seletor de colaborador com busca inline ──────────────────────────────
function ColaboradorSelector({ colaboradores, value, onChange, setorId }) {
  const [busca, setBusca] = useState("");
  const filtrados = colaboradores
    .filter((c) => !setorId || c.setorId === setorId)
    .filter((c) => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div>
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar colaborador..."
        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", marginBottom: 6, boxSizing: "border-box" }}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size={Math.min(filtrados.length + 1, 6)}
        style={{ width: "100%", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: "inherit", padding: "4px 0", boxSizing: "border-box" }}
      >
        <option value="">— Selecione seu nome —</option>
        {filtrados.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}{c.cargo ? ` — ${c.cargo}` : ""}
          </option>
        ))}
      </select>
      {filtrados.length === 0 && busca && (
        <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 0" }}>
          Nenhum resultado. Verifique se seu nome está cadastrado.
        </p>
      )}
    </div>
  );
}

function EscalaRadio({ item, idx, valor, onChange }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${valor ? "#bfdbfe" : C.border}`, borderRadius: 10, padding: "14px 18px", marginBottom: 12, transition: "border-color 0.15s" }}>
      <p style={{ fontWeight: 500, fontSize: 13, color: "#1e293b", margin: "0 0 12px", lineHeight: 1.5 }}>
        <span style={{ fontWeight: 700, color: C.navyMid, marginRight: 8 }}>{idx + 1}.</span>
        {item}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ESCALA.map(op => {
          const sel = valor === op;
          return (
            <label key={op} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "6px 12px", borderRadius: 20, border: `1px solid ${sel ? C.navyMid : C.border}`, background: sel ? C.navyMid : "#f8fafc", transition: "all 0.15s" }}>
              <input type="radio" name={`q${idx}`} value={op} checked={sel} onChange={() => onChange(idx, op)} style={{ display: "none" }} />
              <span style={{ fontSize: 12, fontWeight: sel ? 700 : 400, color: sel ? "#fff" : C.muted }}>{op}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function RespondentePage({ questionarioId }) {
  const [qConfig,         setQConfig]         = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [erro,            setErro]            = useState("");
  const [respostas,       setRespostas]       = useState({});
  // Identificação estruturada
  const [setorId,         setSetorId]         = useState("");
  const [colaboradorId,   setColaboradorId]   = useState("");
  const [nomeDigitado,    setNomeDigitado]     = useState(""); // fallback quando sem lista
  const [submetendo,      setSubmetendo]       = useState(false);
  const [enviado,         setEnviado]          = useState(false);
  const [progresso,       setProgresso]        = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, "questionarios_publicos", questionarioId));
        if (!snap.exists()) { setErro("Questionário não encontrado ou link inválido."); return; }
        const data = snap.data();
        if (data.status === "Fechado") { setErro("Este questionário está encerrado e não aceita mais respostas."); return; }
        if (data.prazo && new Date(data.prazo) < new Date()) {
          setErro("O prazo deste questionário expirou em " + new Date(data.prazo).toLocaleDateString("pt-BR") + ".");
          return;
        }
        setQConfig({ id: snap.id, ...data });
      } catch (e) {
        setErro("Erro ao carregar: " + e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [questionarioId]);

  // Atualiza barra de progresso
  useEffect(() => {
    if (!qConfig?.itens) return;
    setProgresso(Math.round((Object.keys(respostas).length / qConfig.itens.length) * 100));
  }, [respostas, qConfig]);

  function handleResposta(idx, valor) {
    setRespostas(prev => ({ ...prev, [idx]: valor }));
  }

  // Dados derivados do qConfig
  const setoresInfo      = qConfig?.setoresInfo      || [];
  const colaboradoresInfo = qConfig?.colaboradoresInfo || [];
  const temSetores       = setoresInfo.length > 0;
  const temColaboradores = colaboradoresInfo.length > 0;

  // Colaborador selecionado pelo dropdown
  const colaboradorSelecionado = colaboradoresInfo.find((c) => c.id === colaboradorId);
  // Nome final a persistir
  const nomeIdentificacao = colaboradorSelecionado?.nome || nomeDigitado.trim() || null;
  // Setor nome (do registro ou do dropdown)
  const setorNome = setoresInfo.find((s) => s.id === setorId)?.nome || null;

  // Resetar colaborador quando muda o setor
  function handleSetorChange(id) {
    setSetorId(id);
    setColaboradorId("");
  }

  async function submeter() {
    if (!qConfig) return;
    const total = qConfig.itens?.length || 0;
    const respondidas = Object.keys(respostas).length;

    if (respondidas === 0) { alert("Responda ao menos uma questão antes de enviar."); return; }
    if (respondidas < total) {
      if (!window.confirm(`Você respondeu ${respondidas} de ${total} questões.\n\nDeseja enviar mesmo assim?`)) return;
    }

    // Validação de identificação para questionários não-anônimos
    if (!qConfig.anonimato && !nomeIdentificacao) {
      alert("Informe seu nome para prosseguir."); return;
    }

    setSubmetendo(true);
    try {
      await addDoc(
        collection(db, "questionarios_publicos", questionarioId, "respostas"),
        {
          questionarioId,
          empresaId:       qConfig.empresaId || null,
          respostas,
          totalItens:      total,
          respondidas,
          anonimato:       qConfig.anonimato,
          // Identificação estruturada (vinculada ao cadastro)
          colaboradorId:   qConfig.anonimato ? null : (colaboradorId || null),
          colaboradorNome: qConfig.anonimato ? null : nomeIdentificacao,
          cargo:           qConfig.anonimato ? null : (colaboradorSelecionado?.cargo || null),
          setorId:         setorId || null,
          setorNome:       setorNome || null,
          // Campos legados (compatibilidade com RespostasPsico / ResultadosPsico)
          identificacao:   qConfig.anonimato ? null : nomeIdentificacao,
          setor:           setorNome || null,
          dataResposta:    serverTimestamp(),
          fonte:           "Link Público",
        }
      );
      setEnviado(true);
    } catch (e) {
      alert("Erro ao enviar resposta: " + e.message);
    } finally {
      setSubmetendo(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${C.navyMid}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: C.muted, fontSize: 13 }}>Carregando questionário…</p>
      </div>
    </div>
  );

  // ── Erro ─────────────────────────────────────────────────────────────────
  if (erro) return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "36px 40px", maxWidth: 440, textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}>
        <NexusLogo size={48} />
        <p style={{ fontSize: 20, fontWeight: 800, color: "#0d2a5e", margin: "16px 0 4px" }}>NEX<span style={{ color: "#38b249" }}>US</span></p>
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: 14, marginTop: 16 }}>
          <p style={{ color: "#991b1b", fontSize: 13, margin: 0 }}>{erro}</p>
        </div>
        <p style={{ fontSize: 11, color: C.muted, marginTop: 16 }}>Em caso de dúvidas, entre em contato com o responsável que enviou este link.</p>
      </div>
    </div>
  );

  // ── Confirmação de envio ─────────────────────────────────────────────────
  if (enviado) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0d2a5e 0%, #1652a1 50%, #0d3d20 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "48px 44px", maxWidth: 480, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <span style={{ fontSize: 32 }}>✓</span>
        </div>
        <p style={{ fontSize: 22, fontWeight: 800, color: "#0d2a5e", margin: "0 0 8px" }}>Resposta enviada!</p>
        <p style={{ fontSize: 14, color: C.muted, margin: "0 0 20px", lineHeight: 1.6 }}>
          Suas respostas foram registradas com segurança.
          {qConfig?.anonimato && " Este questionário é anônimo — nenhuma informação pessoal foi armazenada."}
        </p>
        <p style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>Obrigado pela sua participação! 🙏</p>
        <p style={{ fontSize: 11, color: C.muted, marginTop: 24 }}>
          NEXUS SST · Technogov Soluções
        </p>
      </div>
    </div>
  );

  const itens = qConfig?.itens || [];
  const respondidas = Object.keys(respostas).length;

  // ── Formulário ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", fontFamily: "system-ui,sans-serif", color: "#1e293b" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(90deg,#0d2a5e,#1652a1)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <NexusLogo size={32} />
        <div style={{ flex: 1 }}>
          <p style={{ color: "#fff", fontWeight: 800, fontSize: 15, margin: 0 }}>
            NEX<span style={{ color: "#38b249" }}>US</span>
            <span style={{ fontWeight: 400, fontSize: 11, color: "rgba(255,255,255,0.6)", marginLeft: 10 }}>Pesquisa Psicossocial</span>
          </p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, margin: 0 }}>Resposta confidencial — {qConfig?.nome}</p>
        </div>
        {/* Barra de progresso no header */}
        <div style={{ textAlign: "right" }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, margin: "0 0 4px" }}>{respondidas}/{itens.length} respondidas</p>
          <div style={{ width: 80, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2 }}>
            <div style={{ width: `${progresso}%`, height: "100%", background: "#38b249", borderRadius: 2, transition: "width 0.3s" }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 740, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* Card de apresentação */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", marginBottom: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0d2a5e", margin: "0 0 8px" }}>{qConfig?.nome}</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 12px", lineHeight: 1.6 }}>
            Este questionário faz parte do <strong>Programa de Gerenciamento de Riscos Psicossociais</strong> da sua empresa,
            em conformidade com a NR-01 (2022) e ISO 45003:2021.
          </p>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              { label: "Instrumento", val: qConfig?.tipo },
              { label: "Anonimato", val: qConfig?.anonimato ? "✓ Garantido" : "Identificado" },
              { label: "Questões", val: `${itens.length} itens` },
              ...(qConfig?.prazo ? [{ label: "Prazo", val: new Date(qConfig.prazo).toLocaleDateString("pt-BR") }] : []),
            ].map(({ label, val }) => (
              <div key={label}>
                <p style={{ fontSize: 10, color: C.muted, margin: 0, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#0d2a5e", margin: 0 }}>{val}</p>
              </div>
            ))}
          </div>
          {/* ── Setor ──────────────────────────────────────────────────── */}
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px", fontWeight: 500 }}>
              Setor{!qConfig?.anonimato ? " *" : " (opcional)"}
            </p>
            {temSetores ? (
              <select
                value={setorId}
                onChange={(e) => handleSetorChange(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", color: "#1e293b", background: "#fff" }}
              >
                <option value="">— Selecione seu setor —</option>
                {setoresInfo.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            ) : (
              <input
                value={setorId}
                onChange={(e) => setSetorId(e.target.value)}
                placeholder="Informe seu setor"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
              />
            )}
          </div>

          {/* ── Identificação (não-anônimo) ─────────────────────────────── */}
          {!qConfig?.anonimato && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px", fontWeight: 500 }}>Seu nome *</p>
              {temColaboradores ? (
                <ColaboradorSelector
                  colaboradores={colaboradoresInfo}
                  value={colaboradorId}
                  onChange={setColaboradorId}
                  setorId={setorId}
                />
              ) : (
                <input
                  value={nomeDigitado}
                  onChange={(e) => setNomeDigitado(e.target.value)}
                  placeholder="Seu nome completo"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
                />
              )}
              {colaboradorSelecionado?.cargo && (
                <p style={{ fontSize: 11, color: "#0d2a5e", margin: "4px 0 0", fontWeight: 600 }}>
                  Cargo: {colaboradorSelecionado.cargo}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Instruções */}
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: "#854d0e", margin: 0, lineHeight: 1.6 }}>
            <strong>Instruções:</strong> Para cada afirmação, selecione a opção que melhor descreve sua situação de trabalho.
            Não há respostas certas ou erradas — responda com sinceridade. Suas respostas {qConfig?.anonimato ? "são totalmente anônimas" : "são confidenciais"}.
          </p>
        </div>

        {/* Questões */}
        {itens.map((item, idx) => (
          <EscalaRadio
            key={idx}
            item={item}
            idx={idx}
            valor={respostas[idx]}
            onChange={handleResposta}
          />
        ))}

        {/* Botão de envio */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#0d2a5e", margin: 0 }}>
              {respondidas === itens.length ? "✓ Todas as questões respondidas!" : `${respondidas} de ${itens.length} questões respondidas`}
            </p>
            <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 0" }}>
              {respondidas < itens.length ? `Faltam ${itens.length - respondidas} questão(ões).` : "Pronto para enviar."}
            </p>
          </div>
          <button onClick={submeter} disabled={submetendo || respondidas === 0}
            style={{
              padding: "12px 28px", borderRadius: 10, border: "none", fontFamily: "inherit",
              background: (submetendo || respondidas === 0) ? C.border : "#1652a1",
              color: (submetendo || respondidas === 0) ? C.muted : "#fff",
              cursor: (submetendo || respondidas === 0) ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 700, boxShadow: respondidas > 0 ? "0 2px 8px rgba(22,82,161,0.3)" : "none",
            }}>
            {submetendo ? "Enviando…" : "Enviar Respostas →"}
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 24 }}>
          NEXUS SST · Technogov Soluções · Seus dados são protegidos conforme a LGPD
        </p>
      </div>
    </div>
  );
}
