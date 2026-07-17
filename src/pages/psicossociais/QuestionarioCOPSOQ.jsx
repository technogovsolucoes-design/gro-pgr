import { useState, useEffect, useMemo } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, setDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";

// ─── COPSOQ II VERSÃO CURTA ────────────────────────────────────────────────
const COPSOQ_CURTA = {
  nome: "COPSOQ II — Versão Curta (19 itens)",
  dimensoes: [
    {
      nome: "Demandas Quantitativas",
      itens: [
        "Seu trabalho exige que você trabalhe muito rapidamente?",
        "Você tem tempo suficiente para realizar todas as tarefas do seu trabalho?",
      ],
    },
    {
      nome: "Influência no Trabalho",
      itens: [
        "Você tem grande influência sobre as decisões relativas ao seu trabalho?",
        "Você pode influenciar a quantidade de trabalho designada a você?",
      ],
    },
    {
      nome: "Possibilidades de Desenvolvimento",
      itens: [
        "Seu trabalho requer que você tome iniciativa?",
        "Seu trabalho lhe fornece oportunidades para aprender coisas novas?",
      ],
    },
    {
      nome: "Suporte Social de Colegas",
      itens: [
        "Seus colegas de trabalho estão dispostos a ouvi-lo(a) sobre seus problemas de trabalho?",
        "Seus colegas de trabalho colaboram com você?",
      ],
    },
    {
      nome: "Suporte Social de Superiores",
      itens: [
        "Seu superior imediato reconhece o bom trabalho que você realiza?",
        "Seu superior oferece ajuda e apoio quando você precisa?",
      ],
    },
    {
      nome: "Insegurança no Emprego",
      itens: [
        "Você está preocupado(a) com a possibilidade de ser demitido(a)?",
        "Você está preocupado(a) com o futuro do seu emprego?",
      ],
    },
    {
      nome: "Saúde Geral",
      itens: [
        "Em geral, você diria que sua saúde é:",
        "Você tem se sentido estressado(a) ultimamente?",
        "Você tem conseguido dormir bem?",
        "Você tem se sentido feliz?",
        "Você tem se sentido calmo(a) e tranquilo(a)?",
      ],
    },
  ],
  escala: ["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca/Quase nunca"],
  pesos: { Sempre: 5, Frequentemente: 4, "Às vezes": 3, Raramente: 2, "Nunca/Quase nunca": 1 },
};

const TIPOS = [
  "COPSOQ II — Versão Curta",
  "COPSOQ II — Versão Média (personalizado)",
  "HSE-IT",
  "Personalizado",
];

const CANAIS = ["Email", "SMS", "WhatsApp", "Link Direto"];

// ─── ESTILOS COMUNS ───────────────────────────────────────────────────────
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

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────
export default function QuestionarioCOPSOQ() {
  const { empresaAtiva, setores } = useApp();
  const [tab, setTab] = useState("lista");
  const [questionarios, setQuestionarios] = useState([]);
  const [respostas, setRespostas] = useState([]);

  // Novo questionário — estado do formulário
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [setoresSelecionados, setSetoresSelecionados] = useState([]);
  const [todosSetores, setTodosSetores] = useState(true);
  const [anonimato, setAnonimato] = useState(true);
  const [prazo, setPrazo] = useState("");
  const [canais, setCanais] = useState({ "Link Direto": true });
  const [salvando, setSalvando] = useState(false);
  const [linkGerado, setLinkGerado] = useState(null);

  const empresaId = empresaAtiva?.id;

  // ─── Listeners ─────────────────────────────────────────────────────────
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

  // ─── Contagem de respostas por questionário ─────────────────────────────
  const respostasPorQ = useMemo(() => {
    const map = {};
    respostas.forEach((r) => {
      map[r.questionarioId] = (map[r.questionarioId] || 0) + 1;
    });
    return map;
  }, [respostas]);

  // ─── Ações ─────────────────────────────────────────────────────────────
  const handleCriar = async () => {
    if (!nome.trim()) { alert("Informe o nome do questionário."); return; }
    if (!empresaId) return;
    setSalvando(true);
    try {
      const itens =
        tipo === "COPSOQ II — Versão Curta"
          ? COPSOQ_CURTA.dimensoes.flatMap((d) => d.itens)
          : [];

      const setoresIds = todosSetores ? setores.map((s) => s.id) : setoresSelecionados;
      const totalFuncionarios = 0; // a ser preenchido conforme integração

      const payload = {
        nome: nome.trim(),
        tipo,
        itens,
        setoresIds,
        anonimato,
        prazo,
        canais: Object.keys(canais).filter((c) => canais[c]),
        status: "Aberto",
        criacao: serverTimestamp(),
        totalFuncionarios,
      };

      const ref = await addDoc(
        collection(db, "empresas", empresaId, "questionarios_config"),
        payload
      );

      // Escreve cópia pública para que /responder/:id funcione sem auth
      await setDoc(doc(db, "questionarios_publicos", ref.id), {
        ...payload,
        empresaId,
      });

      const appUrl = window.location.origin;
      setLinkGerado(`${appUrl}/responder/${ref.id}`);
      // reset
      setNome("");
      setTipo(TIPOS[0]);
      setSetoresSelecionados([]);
      setTodosSetores(true);
      setAnonimato(true);
      setPrazo("");
      setCanais({ "Link Direto": true });
      setTab("lista");
    } catch (e) {
      alert("Erro ao criar questionário: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleFechar = async (id) => {
    if (!window.confirm("Fechar este questionário? Não serão aceitas novas respostas.")) return;
    await updateDoc(doc(db, "empresas", empresaId, "questionarios_config", id), {
      status: "Fechado",
    });
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir este questionário e todas as suas respostas?")) return;
    await deleteDoc(doc(db, "empresas", empresaId, "questionarios_config", id));
  };

  const toggleCanal = (c) =>
    setCanais((prev) => ({ ...prev, [c]: !prev[c] }));

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
          Questionários Psicossociais — COPSOQ
        </h2>
        <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 12 }}>
          Gestão de questionários formais para avaliação de fatores psicossociais
        </p>
      </div>

      {/* Link gerado (notificação) */}
      {linkGerado && (
        <Card style={{ marginBottom: 16, background: "#f0fdf4", border: `1px solid ${C.green}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, color: C.green, fontWeight: 700, fontSize: 13 }}>
                Questionário criado com sucesso!
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: C.text }}>
                Link de resposta:{" "}
                <code style={{ background: "#e0f2fe", padding: "2px 6px", borderRadius: 4 }}>
                  {linkGerado}
                </code>
              </p>
            </div>
            <Btn small outline color={C.green} onClick={() => setLinkGerado(null)}>
              Fechar
            </Btn>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.white, padding: 4, borderRadius: 10, border: `1px solid ${C.border}`, width: "fit-content" }}>
        <button style={tabStyle(tab === "lista")} onClick={() => setTab("lista")}>
          Questionários
        </button>
        <button style={tabStyle(tab === "novo")} onClick={() => setTab("novo")}>
          Novo Questionário
        </button>
      </div>

      {/* ─── TAB LISTA ──────────────────────────────────────────────────── */}
      {tab === "lista" && (
        <div>
          {questionarios.length === 0 ? (
            <Card>
              <p style={{ textAlign: "center", color: C.muted, fontSize: 13, margin: 0 }}>
                Nenhum questionário cadastrado. Clique em "Novo Questionário" para começar.
              </p>
            </Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {questionarios.map((q) => {
                const respostasQ = respostasPorQ[q.id] || 0;
                const progresso =
                  q.totalFuncionarios > 0
                    ? Math.round((respostasQ / q.totalFuncionarios) * 100)
                    : 0;
                const aberto = q.status === "Aberto";

                return (
                  <Card key={q.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{q.nome}</span>
                          <span style={{
                            padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: aberto ? "#dcfce7" : "#f1f5f9",
                            color: aberto ? C.green : C.muted,
                          }}>
                            {q.status}
                          </span>
                        </div>
                        <p style={{ margin: "0 0 4px", fontSize: 12, color: C.muted }}>
                          Tipo: {q.tipo} · Anonimato: {q.anonimato ? "Sim" : "Não"}
                          {q.prazo ? ` · Prazo: ${q.prazo}` : ""}
                        </p>
                        <p style={{ margin: "0 0 8px", fontSize: 12, color: C.muted }}>
                          {respostasQ} resposta{respostasQ !== 1 ? "s" : ""} recebida{respostasQ !== 1 ? "s" : ""}
                        </p>
                        {/* Barra de progresso */}
                        {aberto && q.totalFuncionarios > 0 && (
                          <div style={{ marginTop: 6 }}>
                            <p style={{ margin: "0 0 4px", fontSize: 11, color: C.muted }}>
                              Participação: {progresso}% ({respostasQ}/{q.totalFuncionarios})
                            </p>
                            <div style={{ background: C.border, borderRadius: 4, height: 8, overflow: "hidden" }}>
                              <div style={{ width: `${progresso}%`, height: "100%", background: C.navyMid, transition: "width 0.3s" }} />
                            </div>
                          </div>
                        )}
                        {/* Link */}
                        {aberto && (
                          <p style={{ margin: "8px 0 0", fontSize: 11, color: C.muted }}>
                            Link:{" "}
                            <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 4 }}>
                              nexus-sst.app/responder/{q.id}
                            </code>
                          </p>
                        )}
                      </div>
                      {/* Ações */}
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <Btn small outline color={C.navyMid} onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/responder/${q.id}`)}>
                          Ver Link
                        </Btn>
                        {aberto && (
                          <Btn small outline color={C.amber} onClick={() => handleFechar(q.id)}>
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

      {/* ─── TAB NOVO ───────────────────────────────────────────────────── */}
      {tab === "novo" && (
        <div style={{ maxWidth: 700 }}>
          <Card>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, color: C.text }}>Criar Novo Questionário</h3>

            <Input
              label="Nome *"
              value={nome}
              onChange={setNome}
              placeholder="Ex.: Avaliação Psicossocial 2024 — Todos os Setores"
              required
            />

            {/* Tipo */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Tipo de Questionário *</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={selectStyle}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Preview COPSOQ curta */}
            {tipo === "COPSOQ II — Versão Curta" && (
              <div style={{ marginBottom: 16, background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: C.navyMid }}>
                  Preview — 19 itens em 7 dimensões
                </p>
                {COPSOQ_CURTA.dimensoes.map((d, di) => (
                  <div key={di} style={{ marginBottom: 10 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: C.text }}>
                      {di + 1}. {d.nome}
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {d.itens.map((item, ii) => (
                        <li key={ii} style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p style={{ margin: "8px 0 0", fontSize: 11, color: C.muted }}>
                  Escala: {COPSOQ_CURTA.escala.join(" · ")}
                </p>
              </div>
            )}

            {/* Setores */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Setor(es) Alvo</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  id="todos-setores"
                  checked={todosSetores}
                  onChange={(e) => setTodosSetores(e.target.checked)}
                />
                <label htmlFor="todos-setores" style={{ fontSize: 12, color: C.text, cursor: "pointer" }}>
                  Todos os setores
                </label>
              </div>
              {!todosSetores && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 10, background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
                  {setores.map((s) => (
                    <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={setoresSelecionados.includes(s.id)}
                        onChange={() => toggleSetor(s.id)}
                      />
                      {s.nome}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Anonimato */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Anonimato das Respostas</label>
              <div style={{ display: "flex", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                  <input type="radio" name="anonimato" checked={anonimato} onChange={() => setAnonimato(true)} />
                  Sim (anônimo)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                  <input type="radio" name="anonimato" checked={!anonimato} onChange={() => setAnonimato(false)} />
                  Não (identificado)
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
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Canais de Distribuição</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {CANAIS.map((c) => (
                  <label key={c} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={!!canais[c]}
                      onChange={() => toggleCanal(c)}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={handleCriar} disabled={salvando}>
                {salvando ? "Criando..." : "Criar Questionário"}
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
