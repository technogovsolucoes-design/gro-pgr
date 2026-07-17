import { useState, useEffect, useMemo } from "react";
import {
  collection, onSnapshot, addDoc,
  doc, query, orderBy, serverTimestamp,
} from "firebase/firestore";

import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";

const ESCALA = ["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca/Quase nunca"];

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

export default function RespostasPsico() {
  const { empresaAtiva, setores } = useApp();
  const [tab, setTab] = useState("recebidas");
  const [questionarios, setQuestionarios] = useState([]);
  const [respostas,         setRespostas]         = useState([]);
  const [respostasPublicas, setRespostasPublicas] = useState([]);

  // Filtros
  const [qFiltro, setQFiltro] = useState("");

  // Lançamento manual
  const [qSelecionado, setQSelecionado] = useState("");
  const [respostasForm, setRespostasForm] = useState({});
  const [identificacao, setIdentificacao] = useState("");
  const [setorId, setSetorId] = useState("");
  const [salvando, setSalvando] = useState(false);

  const empresaId = empresaAtiva?.id;

  // ─── Listeners ────────────────────────────────────────────────────────
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
      setRespostas(snap.docs.map((d) => ({ id: d.id, ...d.data(), fonte: d.data().fonte || "Manual" })))
    );
  }, [empresaId]);

  // Listener para respostas recebidas via link público
  useEffect(() => {
    if (!qFiltro) { setRespostasPublicas([]); return; }
    return onSnapshot(
      collection(db, "questionarios_publicos", qFiltro, "respostas"),
      snap => setRespostasPublicas(snap.docs.map(d => ({ id: d.id, ...d.data(), fonte: "Link Público" })))
    );
  }, [qFiltro]);

  // ─── Dados derivados ─────────────────────────────────────────────────
  const questionarioSelecionadoObj = useMemo(
    () => questionarios.find((q) => q.id === qSelecionado),
    [questionarios, qSelecionado]
  );

  const respostasFiltradas = useMemo(() => {
    const manuais = qFiltro
      ? respostas.filter(r => r.questionarioId === qFiltro)
      : respostas;
    // Deduplica por ID (segurança caso uma resposta apareça nos dois listeners)
    const mapa = {};
    [...manuais, ...respostasPublicas].forEach(r => { mapa[r.id] = r; });
    return Object.values(mapa).sort((a, b) => {
      const da = a.dataResposta?.toDate?.() ?? new Date(0);
      const db_ = b.dataResposta?.toDate?.() ?? new Date(0);
      return db_ - da;
    });
  }, [respostas, respostasPublicas, qFiltro]);

  const questionarioFiltroObj = useMemo(
    () => questionarios.find((q) => q.id === qFiltro),
    [questionarios, qFiltro]
  );

  const kpis = useMemo(() => {
    const total = respostasFiltradas.length;
    const totalEsperado = questionarioFiltroObj?.totalFuncionarios || 0;
    const taxa = totalEsperado > 0 ? Math.round((total / totalEsperado) * 100) : null;

    // Média geral: média de todos os valores numéricos registrados
    let somaTotal = 0;
    let contTotal = 0;
    const PESOS = { Sempre: 5, Frequentemente: 4, "Às vezes": 3, Raramente: 2, "Nunca/Quase nunca": 1 };
    respostasFiltradas.forEach((r) => {
      if (r.respostas) {
        Object.values(r.respostas).forEach((v) => {
          if (PESOS[v]) { somaTotal += PESOS[v]; contTotal++; }
        });
      }
    });
    const media = contTotal > 0 ? (somaTotal / contTotal).toFixed(2) : null;

    return { total, taxa, media };
  }, [respostasFiltradas, questionarioFiltroObj]);

  // ─── Lançamento manual ───────────────────────────────────────────────
  const handleRespostaItem = (idx, valor) =>
    setRespostasForm((prev) => ({ ...prev, [idx]: valor }));

  const handleSalvar = async () => {
    if (!qSelecionado) { alert("Selecione um questionário."); return; }
    if (!setorId) { alert("Selecione o setor."); return; }
    if (!empresaId) return;

    const q = questionarioSelecionadoObj;
    const totalItens = q?.itens?.length || 0;
    const respondidas = Object.keys(respostasForm).length;
    if (respondidas < totalItens) {
      if (!window.confirm(`Apenas ${respondidas} de ${totalItens} questões foram respondidas. Salvar assim mesmo?`)) return;
    }

    setSalvando(true);
    try {
      await addDoc(
        collection(db, "empresas", empresaId, "questionarios_respostas"),
        {
          questionarioId: qSelecionado,
          setorId,
          anonimato: q?.anonimato ?? true,
          identificacao: q?.anonimato ? null : (identificacao.trim() || null),
          respostas: respostasForm,
          dataResposta: serverTimestamp(),
          fonte: "Manual",
        }
      );
      // Reset formulário
      setRespostasForm({});
      setIdentificacao("");
      setSetorId("");
      alert("Resposta salva com sucesso!");
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const getSetorNome = (id) => setores.find((s) => s.id === id)?.nome || id || "—";

  const formatData = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("pt-BR");
  };

  // ─── RENDER ──────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, background: C.bg, minHeight: "100vh" }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: C.text, fontSize: 20, fontWeight: 700 }}>
          Respostas — Questionários Psicossociais
        </h2>
        <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 12 }}>
          Visualização de respostas recebidas e lançamento manual de respostas em papel
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.white, padding: 4, borderRadius: 10, border: `1px solid ${C.border}`, width: "fit-content" }}>
        <button style={tabStyle(tab === "recebidas")} onClick={() => setTab("recebidas")}>
          Respostas Recebidas
        </button>
        <button style={tabStyle(tab === "manual")} onClick={() => setTab("manual")}>
          Lançamento Manual
        </button>
      </div>

      {/* ─── TAB RESPOSTAS RECEBIDAS ────────────────────────────────────── */}
      {tab === "recebidas" && (
        <div>
          {/* Filtro */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={labelStyle}>Filtrar por Questionário</label>
                <select value={qFiltro} onChange={(e) => setQFiltro(e.target.value)} style={selectStyle}>
                  <option value="">Todos os questionários</option>
                  {questionarios.map((q) => (
                    <option key={q.id} value={q.id}>{q.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* KPIs */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <Card style={{ flex: 1, minWidth: 140 }}>
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Total de Respostas</p>
              <p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 700, color: C.navyMid }}>
                {kpis.total}
              </p>
            </Card>
            <Card style={{ flex: 1, minWidth: 140 }}>
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Taxa de Participação</p>
              <p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 700, color: kpis.taxa === null ? C.muted : (kpis.taxa >= 60 ? C.green : kpis.taxa >= 30 ? C.amber : C.red) }}>
                {kpis.taxa !== null ? `${kpis.taxa}%` : "—"}
              </p>
            </Card>
            <Card style={{ flex: 1, minWidth: 140 }}>
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Média Geral (1-5)</p>
              <p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 700, color: C.navyMid }}>
                {kpis.media ?? "—"}
              </p>
            </Card>
          </div>

          {/* Lista de respostas */}
          {respostasFiltradas.length === 0 ? (
            <Card>
              <p style={{ textAlign: "center", color: C.muted, fontSize: 13, margin: 0 }}>
                Nenhuma resposta encontrada{qFiltro ? " para o questionário selecionado" : ""}.
              </p>
            </Card>
          ) : (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>#</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>Data</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>Setor</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>Identificação</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>Questões respondidas</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {respostasFiltradas.map((r, i) => {
                    const totalRespondidas = r.respostas ? Object.keys(r.respostas).length : 0;
                    const qObj = questionarios.find((q) => q.id === r.questionarioId);
                    const totalItens = qObj?.itens?.length || "?";
                    return (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "9px 14px", color: C.muted }}>{i + 1}</td>
                        <td style={{ padding: "9px 14px", color: C.text }}>{formatData(r.dataResposta)}</td>
                        <td style={{ padding: "9px 14px", color: C.text }}>
                          {r.anonimato ? <span style={{ color: C.muted, fontStyle: "italic" }}>Anônimo</span> : getSetorNome(r.setorId)}
                        </td>
                        <td style={{ padding: "9px 14px", color: C.text }}>
                          {r.anonimato ? <span style={{ color: C.muted, fontStyle: "italic" }}>Anônimo</span> : (r.identificacao || "—")}
                        </td>
                        <td style={{ padding: "9px 14px" }}>
                          <span style={{ color: totalRespondidas === totalItens ? C.green : C.amber }}>
                            {totalRespondidas}/{totalItens}
                          </span>
                        </td>
                        <td style={{ padding: "9px 14px" }}>
                          <span style={{
                            padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                            background: r.fonte === "Manual" ? "#fef3c7" : "#dbeafe",
                            color: r.fonte === "Manual" ? C.amber : C.navyMid,
                          }}>
                            {r.fonte || "Online"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ─── TAB LANÇAMENTO MANUAL ──────────────────────────────────────── */}
      {tab === "manual" && (
        <div style={{ maxWidth: 760 }}>
          <Card>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, color: C.text }}>
              Lançamento Manual de Resposta
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: C.muted }}>
              Use esta função para registrar respostas coletadas em papel ou de forma verbal.
            </p>

            {/* Selecionar questionário */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Questionário *</label>
              <select
                value={qSelecionado}
                onChange={(e) => { setQSelecionado(e.target.value); setRespostasForm({}); }}
                style={selectStyle}
              >
                <option value="">Selecione um questionário...</option>
                {questionarios.filter((q) => q.status === "Aberto").map((q) => (
                  <option key={q.id} value={q.id}>{q.nome}</option>
                ))}
              </select>
            </div>

            {/* Setor */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Setor *</label>
              <select value={setorId} onChange={(e) => setSetorId(e.target.value)} style={selectStyle}>
                <option value="">Selecione o setor...</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>

            {/* Identificação (só se não for anônimo) */}
            {questionarioSelecionadoObj && !questionarioSelecionadoObj.anonimato && (
              <Input
                label="Identificação do Respondente"
                value={identificacao}
                onChange={setIdentificacao}
                placeholder="Nome ou matrícula do funcionário"
              />
            )}
            {questionarioSelecionadoObj?.anonimato && (
              <div style={{ marginBottom: 12, padding: "8px 12px", background: "#f0fdf4", borderRadius: 6, border: `1px solid ${C.green}` }}>
                <p style={{ margin: 0, fontSize: 11, color: C.green }}>
                  Este questionário é anônimo — a identificação não será coletada.
                </p>
              </div>
            )}

            {/* Itens do questionário */}
            {questionarioSelecionadoObj?.itens?.length > 0 ? (
              <div>
                <div style={{ margin: "16px 0 12px", paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>
                    Questões ({questionarioSelecionadoObj.itens.length} itens)
                  </p>
                </div>
                {questionarioSelecionadoObj.itens.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: 16, padding: 12, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: C.text, fontWeight: 500 }}>
                      <span style={{ color: C.navyMid, fontWeight: 700 }}>{idx + 1}.</span> {item}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {ESCALA.map((opcao) => (
                        <label key={opcao} style={{
                          display: "flex", alignItems: "center", gap: 5, fontSize: 11,
                          cursor: "pointer", padding: "4px 10px", borderRadius: 20,
                          border: `1px solid ${respostasForm[idx] === opcao ? C.navyMid : C.border}`,
                          background: respostasForm[idx] === opcao ? "#e8f0fe" : C.white,
                          color: respostasForm[idx] === opcao ? C.navyMid : C.text,
                          fontWeight: respostasForm[idx] === opcao ? 600 : 400,
                          transition: "all 0.1s",
                        }}>
                          <input
                            type="radio"
                            name={`item-${idx}`}
                            value={opcao}
                            checked={respostasForm[idx] === opcao}
                            onChange={() => handleRespostaItem(idx, opcao)}
                            style={{ display: "none" }}
                          />
                          {opcao}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Progresso */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, color: C.muted }}>
                    {Object.keys(respostasForm).length}/{questionarioSelecionadoObj.itens.length} questões respondidas
                  </p>
                  <div style={{ background: C.border, borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{
                      width: `${(Object.keys(respostasForm).length / questionarioSelecionadoObj.itens.length) * 100}%`,
                      height: "100%", background: C.navyMid, transition: "width 0.3s",
                    }} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={handleSalvar} disabled={salvando}>
                    {salvando ? "Salvando..." : "Salvar Resposta"}
                  </Btn>
                  <Btn outline color={C.gray} onClick={() => { setRespostasForm({}); setIdentificacao(""); setSetorId(""); setQSelecionado(""); }}>
                    Limpar
                  </Btn>
                </div>
              </div>
            ) : qSelecionado ? (
              <div style={{ padding: "20px 0", textAlign: "center" }}>
                <p style={{ color: C.muted, fontSize: 13 }}>
                  Este questionário não possui itens cadastrados.
                </p>
              </div>
            ) : (
              <div style={{ padding: "20px 0", textAlign: "center" }}>
                <p style={{ color: C.muted, fontSize: 13 }}>
                  Selecione um questionário acima para exibir as questões.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
