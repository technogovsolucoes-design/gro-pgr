import { useState, useEffect, useMemo } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, setDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";
import { COPSOQ_CURTA, COPSOQ_MEDIA, COPSOQ_LONGA, buildDimensoesConfig, buildItensFlat } from "../../data/copsoq";

// ─── Versões disponíveis ──────────────────────────────────────────────────
const VERSOES = [COPSOQ_CURTA, COPSOQ_MEDIA, COPSOQ_LONGA];

const CANAIS = ["Email", "SMS", "WhatsApp", "Link Direto"];

const tabStyle = (active) => ({
  padding: "8px 20px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  background: active ? C.navyMid : "transparent",
  color: active ? C.white : C.gray,
  transition: "all 0.15s",
  fontFamily: "inherit",
});

const labelStyle = {
  fontSize: 11,
  color: C.muted,
  fontWeight: 500,
  marginBottom: 4,
  display: "block",
};

const selectStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: `1px solid ${C.border}`,
  fontSize: 12,
  fontFamily: "inherit",
  color: C.text,
  background: C.white,
  boxSizing: "border-box",
};

// Badge de nível de risco NR-01
function RiscoBadge({ nivel }) {
  const cfg = {
    verde:    { cor: "#16a34a", bg: "#dcfce7", label: "0–33 Verde" },
    amarelo:  { cor: "#d97706", bg: "#fef3c7", label: "34–66 Amarelo" },
    vermelho: { cor: "#dc2626", bg: "#fee2e2", label: "67–100 Vermelho" },
  };
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
      {Object.values(cfg).map((c) => (
        <span key={c.label} style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: c.bg, color: c.cor, border: `1px solid ${c.cor}44` }}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────
export default function QuestionarioCOPSOQ() {
  const { empresaAtiva, setores, funcionarios } = useApp();
  const [tab, setTab] = useState("lista");
  const [questionarios, setQuestionarios] = useState([]);
  const [respostas, setRespostas] = useState([]);

  // Formulário
  const [nome, setNome] = useState("");
  const [versaoId, setVersaoId] = useState("curta");
  const [setoresSelecionados, setSetoresSelecionados] = useState([]);
  const [todosSetores, setTodosSetores] = useState(true);
  const [anonimato, setAnonimato] = useState(true);
  const [prazo, setPrazo] = useState("");
  const [canais, setCanais] = useState({ "Link Direto": true });
  const [salvando, setSalvando] = useState(false);
  const [linkGerado, setLinkGerado] = useState(null);
  const [previewAberto, setPreviewAberto] = useState(false);

  const empresaId = empresaAtiva?.id;
  const versaoSelecionada = VERSOES.find((v) => v.id === versaoId) || COPSOQ_CURTA;

  // ─── Listeners ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!empresaId) return;
    const q = query(
      collection(db, "empresas", empresaId, "questionarios_config"),
      orderBy("criacao", "desc")
    );
    return onSnapshot(q, (snap) =>
      setQuestionarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId) return;
    const q = query(
      collection(db, "empresas", empresaId, "questionarios_respostas"),
      orderBy("dataResposta", "desc")
    );
    return onSnapshot(q, (snap) =>
      setRespostas(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [empresaId]);

  const respostasPorQ = useMemo(() => {
    const map = {};
    respostas.forEach((r) => {
      map[r.questionarioId] = (map[r.questionarioId] || 0) + 1;
    });
    return map;
  }, [respostas]);

  // ─── Criar questionário ─────────────────────────────────────────────────
  const handleCriar = async () => {
    if (!nome.trim()) { alert("Informe o nome do questionário."); return; }
    if (!empresaId) return;
    setSalvando(true);
    try {
      const versao = VERSOES.find((v) => v.id === versaoId) || COPSOQ_CURTA;
      const itens = buildItensFlat(versao);
      const dimensoesConfig = buildDimensoesConfig(versao);
      const setoresIds = todosSetores ? setores.map((s) => s.id) : setoresSelecionados;

      // Setores com nome — embutidos no doc público para acesso sem auth
      const setoresInfo = setores
        .filter((s) => setoresIds.length === 0 || setoresIds.includes(s.id))
        .map((s) => ({ id: s.id, nome: s.nome }));

      // Colaboradores dos setores selecionados — embutidos para dropdowns públicos
      const colaboradoresInfo = funcionarios
        .filter((f) => {
          if (!f.funcionarioNome && !f.nome) return false;
          return setoresIds.length === 0 || setoresIds.includes(f.setorId);
        })
        .map((f) => ({
          id: f.id,
          nome: f.funcionarioNome || f.nome || "",
          cargo: f.cargo || "",
          setorId: f.setorId || "",
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

      const payload = {
        nome: nome.trim(),
        tipo: versao.nome,
        versaoId: versao.id,
        itens,
        dimensoesConfig,
        setoresIds,
        setoresInfo,        // [{id, nome}] — setores vinculados
        colaboradoresInfo,  // [{id, nome, cargo, setorId}] — colaboradores para dropdown
        anonimato,
        prazo,
        canais: Object.keys(canais).filter((c) => canais[c]),
        status: "Aberto",
        criacao: serverTimestamp(),
        totalFuncionarios: colaboradoresInfo.length,
      };

      const ref = await addDoc(
        collection(db, "empresas", empresaId, "questionarios_config"),
        payload
      );

      await setDoc(doc(db, "questionarios_publicos", ref.id), {
        ...payload,
        empresaId,
      });

      setLinkGerado(`${window.location.origin}/responder/${ref.id}`);
      setNome("");
      setVersaoId("curta");
      setSetoresSelecionados([]);
      setTodosSetores(true);
      setAnonimato(true);
      setPrazo("");
      setCanais({ "Link Direto": true });
      setPreviewAberto(false);
      setTab("lista");
    } catch (e) {
      alert("Erro ao criar questionário: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleFechar = async (id) => {
    if (!window.confirm("Fechar este questionário? Não serão aceitas novas respostas.")) return;
    await updateDoc(doc(db, "empresas", empresaId, "questionarios_config", id), { status: "Fechado" });
    await updateDoc(doc(db, "questionarios_publicos", id), { status: "Fechado" }).catch(() => {});
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir este questionário e todas as suas respostas?")) return;
    await deleteDoc(doc(db, "empresas", empresaId, "questionarios_config", id));
  };

  const toggleCanal = (c) => setCanais((prev) => ({ ...prev, [c]: !prev[c] }));
  const toggleSetor = (id) =>
    setSetoresSelecionados((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, background: C.bg, minHeight: "100vh" }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: C.text, fontSize: 20, fontWeight: 700 }}>
          Questionários Psicossociais — COPSOQ II-Br
        </h2>
        <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 12 }}>
          Instrumento validado para identificação de fatores de risco psicossocial · NR-01 / GRO / PGR · ISO 45003
        </p>
      </div>

      {/* Escala NR-01 — informativo */}
      <div style={{ marginBottom: 20, padding: "12px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10 }}>
        <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: C.navyMid }}>
          Classificação de Risco — NR-01 §1.4.1 (escala 0–100)
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { label: "0–33", nome: "Verde — Favorável", desc: "Condição saudável; manter políticas atuais.", cor: "#16a34a", bg: "#dcfce7" },
            { label: "34–66", nome: "Amarelo — Intermediário", desc: "Atenção; exige monitoramento e plano de ação.", cor: "#d97706", bg: "#fef3c7" },
            { label: "67–100", nome: "Vermelho — Desfavorável", desc: "Risco alto; intervenção imediata no PGR.", cor: "#dc2626", bg: "#fee2e2" },
          ].map((item) => (
            <div key={item.nome} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ padding: "3px 9px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: item.bg, color: item.cor, border: `1px solid ${item.cor}44`, whiteSpace: "nowrap" }}>
                {item.label} {item.nome}
              </span>
              <span style={{ fontSize: 11, color: C.muted }}>{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Link gerado */}
      {linkGerado && (
        <Card style={{ marginBottom: 16, background: "#f0fdf4", border: `1px solid #86efac` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div>
              <p style={{ margin: "0 0 4px", color: "#16a34a", fontWeight: 700, fontSize: 13 }}>
                Questionário criado com sucesso!
              </p>
              <p style={{ margin: 0, fontSize: 12, color: C.text }}>
                Link de resposta:{" "}
                <code style={{ background: "#e0f2fe", padding: "2px 6px", borderRadius: 4, wordBreak: "break-all" }}>
                  {linkGerado}
                </code>
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: C.muted }}>
                Compartilhe com os trabalhadores. Respostas ficam disponíveis em tempo real em "Respostas" e "Resultados".
              </p>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <Btn small outline color={C.navyMid} onClick={() => navigator.clipboard?.writeText(linkGerado)}>
                Copiar Link
              </Btn>
              <Btn small outline color={C.gray} onClick={() => setLinkGerado(null)}>
                Fechar
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.white, padding: 4, borderRadius: 10, border: `1px solid ${C.border}`, width: "fit-content" }}>
        <button style={tabStyle(tab === "lista")} onClick={() => setTab("lista")}>Questionários</button>
        <button style={tabStyle(tab === "novo")} onClick={() => setTab("novo")}>+ Novo Questionário</button>
      </div>

      {/* ─── TAB LISTA ───────────────────────────────────────────────────── */}
      {tab === "lista" && (
        <div>
          {questionarios.length === 0 ? (
            <Card>
              <p style={{ textAlign: "center", color: C.muted, fontSize: 13, margin: 0 }}>
                Nenhum questionário cadastrado. Clique em "+ Novo Questionário" para começar.
              </p>
            </Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {questionarios.map((q) => {
                const nRespostas = respostasPorQ[q.id] || 0;
                const progresso = q.totalFuncionarios > 0
                  ? Math.round((nRespostas / q.totalFuncionarios) * 100)
                  : 0;
                const aberto = q.status === "Aberto";

                return (
                  <Card key={q.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{q.nome}</span>
                          <span style={{
                            padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: aberto ? "#dcfce7" : "#f1f5f9",
                            color: aberto ? "#16a34a" : C.muted,
                          }}>
                            {q.status}
                          </span>
                        </div>
                        <p style={{ margin: "0 0 2px", fontSize: 12, color: C.muted }}>
                          {q.tipo} · {q.itens?.length || "?"} itens · {q.dimensoesConfig?.length || "?"} dimensões
                        </p>
                        <p style={{ margin: "0 0 4px", fontSize: 12, color: C.muted }}>
                          Anonimato: {q.anonimato ? "Sim" : "Não"}
                          {q.prazo ? ` · Prazo: ${new Date(q.prazo).toLocaleDateString("pt-BR")}` : ""}
                        </p>
                        <p style={{ margin: "0 0 8px", fontSize: 12, color: C.muted }}>
                          {nRespostas} resposta{nRespostas !== 1 ? "s" : ""} recebida{nRespostas !== 1 ? "s" : ""}
                        </p>
                        {aberto && q.totalFuncionarios > 0 && (
                          <div style={{ marginTop: 4 }}>
                            <p style={{ margin: "0 0 4px", fontSize: 11, color: C.muted }}>
                              Participação: {progresso}% ({nRespostas}/{q.totalFuncionarios})
                            </p>
                            <div style={{ background: C.border, borderRadius: 4, height: 6, overflow: "hidden" }}>
                              <div style={{ width: `${progresso}%`, height: "100%", background: C.navyMid, transition: "width 0.3s" }} />
                            </div>
                          </div>
                        )}
                        {aberto && (
                          <p style={{ margin: "8px 0 0", fontSize: 11, color: C.muted }}>
                            Link:{" "}
                            <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>
                              {window.location.origin}/responder/{q.id}
                            </code>
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <Btn small outline color={C.navyMid}
                          onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/responder/${q.id}`)}>
                          Copiar Link
                        </Btn>
                        {aberto && (
                          <Btn small outline color="#d97706" onClick={() => handleFechar(q.id)}>
                            Fechar
                          </Btn>
                        )}
                        <Btn small outline color={C.red} onClick={() => handleExcluir(q.id)}>
                          Excluir
                        </Btn>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB NOVO ────────────────────────────────────────────────────── */}
      {tab === "novo" && (
        <div style={{ maxWidth: 780 }}>
          <Card>
            <h3 style={{ margin: "0 0 20px", fontSize: 15, color: C.text }}>Criar Novo Questionário COPSOQ II-Br</h3>

            <Input
              label="Nome do Questionário *"
              value={nome}
              onChange={setNome}
              placeholder="Ex.: Avaliação Psicossocial 2025 — Unidade SP"
              required
            />

            {/* Seleção de Versão */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ ...labelStyle, marginBottom: 10 }}>Versão do COPSOQ II-Br *</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {VERSOES.map((v) => {
                  const ativo = versaoId === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVersaoId(v.id)}
                      style={{
                        padding: "14px 12px", borderRadius: 10, textAlign: "left", cursor: "pointer",
                        border: `2px solid ${ativo ? C.navyMid : C.border}`,
                        background: ativo ? "#eff6ff" : C.white,
                        transition: "all 0.15s", fontFamily: "inherit",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ativo ? C.navyMid : C.text }}>
                          {v.id === "curta" ? "Versão Curta" : v.id === "media" ? "Versão Média" : "Versão Longa"}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8,
                          background: ativo ? C.navyMid : C.border,
                          color: ativo ? "#fff" : C.muted,
                        }}>
                          {v.totalItens} itens
                        </span>
                      </div>
                      <p style={{ margin: "0 0 4px", fontSize: 11, color: C.muted, lineHeight: 1.4 }}>
                        {v.uso}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: ativo ? C.navyMid : C.muted, fontWeight: 600 }}>
                        ⏱ {v.tempo} · {v.dimensoes.length} dimensões
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Alerta versão longa */}
            {versaoId === "longa" && (
              <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 12, color: "#92400e" }}>
                  <strong>Atenção:</strong> A Versão Longa é recomendada para pesquisa científica, avaliação pericial e análise de nexo causal. Para uso rotineiro em GRO/PGR, prefira a Versão Curta ou Média.
                </p>
              </div>
            )}

            {/* Preview de dimensões */}
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setPreviewAberto(!previewAberto)}
                style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 11, color: C.navyMid, fontWeight: 600, fontFamily: "inherit" }}>
                {previewAberto ? "▲ Ocultar itens" : "▼ Visualizar itens e dimensões"}
              </button>

              {previewAberto && (
                <div style={{ marginTop: 12, background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, maxHeight: 400, overflowY: "auto" }}>
                  <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: C.navyMid }}>
                    {versaoSelecionada.nome} — {versaoSelecionada.totalItens} itens em {versaoSelecionada.dimensoes.length} dimensões
                  </p>
                  {versaoSelecionada.dimensoes.map((d, di) => (
                    <div key={di} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{di + 1}. {d.nome}</span>
                        <span style={{
                          fontSize: 10, padding: "1px 6px", borderRadius: 8, fontWeight: 600,
                          background: d.favoravel ? "#dcfce7" : "#fee2e2",
                          color: d.favoravel ? "#16a34a" : "#dc2626",
                        }}>
                          {d.favoravel ? "↑ Favorável" : "↑ Demanda"}
                        </span>
                        <span style={{ fontSize: 10, color: C.muted }}>{d.itens.length} itens</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {d.itens.map((item, ii) => (
                          <li key={ii} style={{ fontSize: 11, color: C.muted, marginBottom: 2, lineHeight: 1.4 }}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <p style={{ margin: "12px 0 0", fontSize: 11, color: C.muted }}>
                    Escala: Nunca/Quase nunca · Raramente · Às vezes · Frequentemente · Sempre
                  </p>
                </div>
              )}
            </div>

            {/* Setores */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Setor(es) Alvo</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <input type="checkbox" id="todos-setores" checked={todosSetores}
                  onChange={(e) => setTodosSetores(e.target.checked)} />
                <label htmlFor="todos-setores" style={{ fontSize: 12, color: C.text, cursor: "pointer" }}>
                  Todos os setores
                </label>
              </div>
              {!todosSetores && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 10, background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
                  {setores.map((s) => (
                    <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer" }}>
                      <input type="checkbox"
                        checked={setoresSelecionados.includes(s.id)}
                        onChange={() => toggleSetor(s.id)} />
                      {s.nome}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Preview de colaboradores vinculados */}
            {(() => {
              const ids = todosSetores ? setores.map(s => s.id) : setoresSelecionados;
              const colab = funcionarios.filter(f =>
                (f.funcionarioNome || f.nome) && (ids.length === 0 || ids.includes(f.setorId))
              );
              return colab.length > 0 ? (
                <div style={{ marginBottom: 16, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "#15803d" }}>
                    {colab.length} colaborador{colab.length !== 1 ? "es" : ""} vinculado{colab.length !== 1 ? "s" : ""} nos setores selecionados
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "#166534" }}>
                    Serão carregados como lista de seleção na página de resposta, com filtro por setor.
                  </p>
                </div>
              ) : (
                <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8 }}>
                  <p style={{ margin: 0, fontSize: 11, color: "#92400e" }}>
                    Nenhum colaborador cadastrado nos setores selecionados. Cadastre-os em <strong>Configurações → Funcionários</strong> para habilitar os dropdowns na página de resposta.
                  </p>
                </div>
              );
            })()}

            {/* Anonimato */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Anonimato das Respostas</label>
              <div style={{ display: "flex", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                  <input type="radio" name="anonimato" checked={anonimato} onChange={() => setAnonimato(true)} />
                  Sim — anônimo (recomendado para maior sinceridade)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                  <input type="radio" name="anonimato" checked={!anonimato} onChange={() => setAnonimato(false)} />
                  Não — identificado
                </label>
              </div>
            </div>

            {/* Prazo */}
            <Input
              label="Prazo de Encerramento"
              type="date"
              value={prazo}
              onChange={setPrazo}
            />

            {/* Canais */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Canais de Distribuição</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {CANAIS.map((c) => (
                  <label key={c} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!canais[c]} onChange={() => toggleCanal(c)} />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            {/* Resumo */}
            <div style={{ marginBottom: 20, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8 }}>
              <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "#15803d" }}>Resumo do questionário a ser criado</p>
              <p style={{ margin: 0, fontSize: 11, color: "#166534" }}>
                {versaoSelecionada.nome} · {versaoSelecionada.totalItens} itens · {versaoSelecionada.dimensoes.length} dimensões ·{" "}
                Anonimato: {anonimato ? "Sim" : "Não"} ·{" "}
                {todosSetores ? "Todos os setores" : `${setoresSelecionados.length} setor(es)`} ·{" "}
                {Object.keys(canais).filter((c) => canais[c]).join(", ") || "Nenhum canal"} ·{" "}
                Tempo: {versaoSelecionada.tempo}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#166534" }}>
                Classificação: Verde (0–33) · Amarelo (34–66) · Vermelho (67–100) — NR-01 §1.4.1
              </p>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={handleCriar} disabled={salvando}>
                {salvando ? "Criando..." : "Criar e Gerar Link"}
              </Btn>
              <Btn outline color={C.gray} onClick={() => setTab("lista")}>
                Cancelar
              </Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
