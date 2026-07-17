import { useState, useEffect, useMemo } from "react";
import {
  collection, onSnapshot, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card } from "../../components/ui";
import { C } from "../../constants";

// ─── COPSOQ CURTA — estrutura local ──────────────────────────────────────
const COPSOQ_DIMENSOES = [
  { nome: "Demandas Quantitativas", indices: [0, 1] },
  { nome: "Influência no Trabalho", indices: [2, 3] },
  { nome: "Possibilidades de Desenvolvimento", indices: [4, 5] },
  { nome: "Suporte Social de Colegas", indices: [6, 7] },
  { nome: "Suporte Social de Superiores", indices: [8, 9] },
  { nome: "Insegurança no Emprego", indices: [10, 11] },
  { nome: "Saúde Geral", indices: [12, 13, 14, 15, 16] },
];

const ESCALA = ["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca/Quase nunca"];
const PESOS = { Sempre: 5, Frequentemente: 4, "Às vezes": 3, Raramente: 2, "Nunca/Quase nunca": 1 };

// Normaliza média (1-5) para score (0-100)
const normalizar = (media) => Math.round(((media - 1) / 4) * 100);

const classificar = (score) => {
  if (score >= 60) return { label: "Risco Baixo / Satisfatório", cor: C.green, nivel: "baixo" };
  if (score >= 40) return { label: "Risco Moderado / Atenção", cor: C.amber, nivel: "moderado" };
  if (score >= 25) return { label: "Risco Elevado", cor: "#f97316", nivel: "elevado" };
  return { label: "Risco Crítico / Intervenção Urgente", cor: C.red, nivel: "critico" };
};

// Recomendações por dimensão
const RECOMENDACOES = {
  "Demandas Quantitativas": "Revisar distribuição de tarefas, implementar gerenciamento de carga de trabalho e garantir pausas adequadas.",
  "Influência no Trabalho": "Promover autonomia dos trabalhadores, criar canais de participação nas decisões e reduzir microgerenciamento.",
  "Possibilidades de Desenvolvimento": "Implementar planos de desenvolvimento individual, promover capacitações e oferecer desafios profissionais.",
  "Suporte Social de Colegas": "Fomentar trabalho em equipe, atividades de integração e cultura de colaboração entre pares.",
  "Suporte Social de Superiores": "Capacitar lideranças em gestão humanizada, reconhecimento e feedback construtivo.",
  "Insegurança no Emprego": "Comunicar estratégias organizacionais com transparência, criar planos de carreira e reduzir incertezas.",
  "Saúde Geral": "Implementar Programa de Saúde Mental, oferecer suporte psicológico e monitorar indicadores de bem-estar.",
};

const selectStyle = {
  padding: "8px 12px",
  borderRadius: 6,
  border: `1px solid ${C.border}`,
  fontSize: 12,
  fontFamily: "inherit",
  color: C.text,
  background: C.white,
  minWidth: 260,
};

export default function ResultadosPsico() {
  const { empresaAtiva, setores } = useApp();
  const [questionarios, setQuestionarios] = useState([]);
  const [respostas, setRespostas] = useState([]);
  const [qSelecionado, setQSelecionado] = useState("");

  const empresaId = empresaAtiva?.id;

  // ─── Listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!empresaId) return;
    const q = query(
      collection(db, "empresas", empresaId, "questionarios_config"),
      orderBy("criacao", "desc")
    );
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setQuestionarios(docs);
      if (!qSelecionado && docs.length > 0) setQSelecionado(docs[0].id);
    });
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

  // ─── Dados filtrados ─────────────────────────────────────────────────
  const questionarioObj = useMemo(
    () => questionarios.find((q) => q.id === qSelecionado),
    [questionarios, qSelecionado]
  );

  const respostasFiltradas = useMemo(
    () => respostas.filter((r) => r.questionarioId === qSelecionado),
    [respostas, qSelecionado]
  );

  // ─── Scores por dimensão ─────────────────────────────────────────────
  const scoresDimensao = useMemo(() => {
    if (!respostasFiltradas.length) return [];
    const isCOPSOQ = questionarioObj?.tipo === "COPSOQ II — Versão Curta";
    if (!isCOPSOQ) return [];

    return COPSOQ_DIMENSOES.map((dim) => {
      let soma = 0;
      let cont = 0;
      respostasFiltradas.forEach((r) => {
        if (!r.respostas) return;
        dim.indices.forEach((idx) => {
          const val = r.respostas[idx];
          if (val && PESOS[val]) { soma += PESOS[val]; cont++; }
        });
      });
      const media = cont > 0 ? soma / cont : 0;
      const score = cont > 0 ? normalizar(media) : 0;
      const classif = classificar(score);
      return { nome: dim.nome, score, media: media.toFixed(2), ...classif, cont };
    });
  }, [respostasFiltradas, questionarioObj]);

  // ─── Distribuição de respostas ────────────────────────────────────────
  const distribuicao = useMemo(() => {
    if (!respostasFiltradas.length || !questionarioObj?.itens) return [];
    return questionarioObj.itens.map((item, idx) => {
      const cont = {};
      ESCALA.forEach((op) => { cont[op] = 0; });
      respostasFiltradas.forEach((r) => {
        const val = r.respostas?.[idx];
        if (val && cont[val] !== undefined) cont[val]++;
      });
      const total = respostasFiltradas.length;
      return { item, idx, cont, total };
    });
  }, [respostasFiltradas, questionarioObj]);

  // ─── Scores por setor ─────────────────────────────────────────────────
  const scoresPorSetor = useMemo(() => {
    if (!respostasFiltradas.length) return [];
    const isCOPSOQ = questionarioObj?.tipo === "COPSOQ II — Versão Curta";
    if (!isCOPSOQ) return [];

    const setoresUsados = [...new Set(respostasFiltradas.map((r) => r.setorId).filter(Boolean))];
    return setoresUsados.map((sid) => {
      const respostasSetor = respostasFiltradas.filter((r) => r.setorId === sid);
      const scores = COPSOQ_DIMENSOES.map((dim) => {
        let soma = 0; let cont = 0;
        respostasSetor.forEach((r) => {
          if (!r.respostas) return;
          dim.indices.forEach((idx) => {
            const val = r.respostas[idx];
            if (val && PESOS[val]) { soma += PESOS[val]; cont++; }
          });
        });
        const media = cont > 0 ? soma / cont : 0;
        return cont > 0 ? normalizar(media) : null;
      });
      return {
        setorId: sid,
        nome: setores.find((s) => s.id === sid)?.nome || sid,
        scores,
        total: respostasSetor.length,
      };
    });
  }, [respostasFiltradas, questionarioObj, setores]);

  // ─── KPIs Executivos ──────────────────────────────────────────────────
  const kpisExec = useMemo(() => {
    const total = respostasFiltradas.length;
    const totalEsperado = questionarioObj?.totalFuncionarios || 0;
    const taxa = totalEsperado > 0 ? Math.round((total / totalEsperado) * 100) : null;
    const criticos = scoresDimensao.filter((d) => d.nivel === "critico" || d.nivel === "elevado");
    return { total, taxa, criticos };
  }, [respostasFiltradas, questionarioObj, scoresDimensao]);

  // ─── Exportar para PGR ────────────────────────────────────────────────
  const exportarPGR = () => {
    const empresa = empresaAtiva?.nome || "Empresa";
    const dataHoje = new Date().toLocaleDateString("pt-BR");
    const dimensoesCriticas = scoresDimensao.filter((d) => d.nivel === "critico" || d.nivel === "elevado");

    const linhasDim = scoresDimensao.map((d) => `
      <tr>
        <td>${d.nome}</td>
        <td style="text-align:center;font-weight:700;color:${d.cor}">${d.score}</td>
        <td style="text-align:center;color:${d.cor};font-weight:600">${d.label}</td>
        <td style="font-size:12px;color:#555">${RECOMENDACOES[d.nome] || "—"}</td>
      </tr>
    `).join("");

    const linhasRec = dimensoesCriticas.map((d) => `
      <div style="margin-bottom:14px;padding:12px;background:#fff3cd;border-left:4px solid ${d.cor};border-radius:4px">
        <strong style="color:${d.cor}">${d.nome}</strong> — Score: ${d.score}/100 (${d.label})<br>
        <span style="font-size:13px;color:#555;margin-top:6px;display:block">${RECOMENDACOES[d.nome] || ""}</span>
      </div>
    `).join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Psicossocial — ${empresa}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #222; font-size: 14px; }
    h1 { color: #1652a1; border-bottom: 2px solid #1652a1; padding-bottom: 8px; }
    h2 { color: #1652a1; margin-top: 32px; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #1652a1; color: #fff; padding: 10px; text-align: left; font-size: 13px; }
    td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    tr:nth-child(even) td { background: #f8fafc; }
    .badge { display:inline-block; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:600; }
    .footer { margin-top:40px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:11px; color:#888; }
  </style>
</head>
<body>
  <h1>Relatório de Fatores Psicossociais — PGR/NR-01</h1>
  <p><strong>Empresa:</strong> ${empresa}<br>
  <strong>Questionário:</strong> ${questionarioObj?.nome || "—"}<br>
  <strong>Tipo:</strong> ${questionarioObj?.tipo || "—"}<br>
  <strong>Data da análise:</strong> ${dataHoje}<br>
  <strong>Total de respostas:</strong> ${kpisExec.total}${kpisExec.taxa !== null ? ` (${kpisExec.taxa}% de participação)` : ""}</p>

  <h2>Resultados por Dimensão</h2>
  <table>
    <thead>
      <tr>
        <th>Dimensão</th>
        <th style="text-align:center;width:80px">Score (0-100)</th>
        <th style="width:200px">Classificação</th>
        <th>Recomendações</th>
      </tr>
    </thead>
    <tbody>${linhasDim}</tbody>
  </table>

  <h2>Medidas Recomendadas — Dimensões com Risco Elevado/Crítico</h2>
  ${dimensoesCriticas.length > 0 ? linhasRec : '<p style="color:#888">Nenhuma dimensão com risco elevado ou crítico identificada.</p>'}

  <div style="margin-top:24px;padding:16px;background:#e8f0fe;border-radius:6px;border-left:4px solid #1652a1">
    <strong>Base legal:</strong> NR-01 §1.4.1 — Os fatores psicossociais identificados devem ser integrados ao Programa de Gerenciamento de Riscos (PGR) com medidas de prevenção e controle.
  </div>

  <div class="footer">
    Gerado pelo Sistema NEXUS SST · ${dataHoje}<br>
    Metodologia: ${questionarioObj?.tipo || "—"}
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  // ─── RENDER ──────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, background: C.bg, minHeight: "100vh" }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: C.text, fontSize: 20, fontWeight: 700 }}>
          Resultados — Análise Psicossocial
        </h2>
        <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 12 }}>
          Análise e semáforo de risco por dimensão COPSOQ · Integração com PGR conforme NR-01 §1.4.1
        </p>
      </div>

      {/* Seletor de questionário */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Questionário:</label>
          <select value={qSelecionado} onChange={(e) => setQSelecionado(e.target.value)} style={selectStyle}>
            <option value="">Selecione um questionário...</option>
            {questionarios.map((q) => (
              <option key={q.id} value={q.id}>{q.nome} ({q.status})</option>
            ))}
          </select>
          {qSelecionado && (
            <Btn small onClick={exportarPGR} disabled={respostasFiltradas.length === 0}>
              Exportar para PGR
            </Btn>
          )}
        </div>
      </Card>

      {/* Sem questionário */}
      {!qSelecionado && (
        <Card>
          <p style={{ textAlign: "center", color: C.muted, fontSize: 13, margin: 0 }}>
            Selecione um questionário acima para visualizar os resultados.
          </p>
        </Card>
      )}

      {/* Sem respostas */}
      {qSelecionado && respostasFiltradas.length === 0 && (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Sem dados suficientes</p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: C.muted }}>
            Nenhuma resposta recebida para este questionário ainda.<br />
            Compartilhe o link com os respondentes ou lance respostas manualmente.
          </p>
        </Card>
      )}

      {/* Conteúdo principal */}
      {qSelecionado && respostasFiltradas.length > 0 && (
        <div>
          {/* ── SEÇÃO 1: RESUMO EXECUTIVO ─────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, color: C.text, fontWeight: 700 }}>
              1. Resumo Executivo
            </h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Card style={{ flex: 1, minWidth: 130 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Total de Respostas</p>
                <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, color: C.navyMid }}>{kpisExec.total}</p>
              </Card>
              <Card style={{ flex: 1, minWidth: 130 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Taxa de Participação</p>
                <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, color: kpisExec.taxa === null ? C.muted : (kpisExec.taxa >= 60 ? C.green : kpisExec.taxa >= 30 ? C.amber : C.red) }}>
                  {kpisExec.taxa !== null ? `${kpisExec.taxa}%` : "—"}
                </p>
              </Card>
              <Card style={{ flex: 1, minWidth: 130 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Dimensões em Risco Elevado/Crítico</p>
                <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, color: kpisExec.criticos.length > 0 ? C.red : C.green }}>
                  {kpisExec.criticos.length}
                </p>
              </Card>
              <Card style={{ flex: 1, minWidth: 130 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Questionário</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 600, color: C.text }}>{questionarioObj?.tipo || "—"}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>
                  Data análise: {new Date().toLocaleDateString("pt-BR")}
                </p>
              </Card>
            </div>
          </div>

          {/* ── SEÇÃO 2: SEMÁFORO POR DIMENSÃO ──────────────────────────── */}
          {scoresDimensao.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, color: C.text, fontWeight: 700 }}>
                2. Resultados por Dimensão — Semáforo de Risco
              </h3>
              <Card>
                {/* Legenda */}
                <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                  {[
                    { label: "Baixo (60-100)", cor: C.green },
                    { label: "Moderado (40-59)", cor: C.amber },
                    { label: "Elevado (25-39)", cor: "#f97316" },
                    { label: "Crítico (0-24)", cor: C.red },
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.cor }} />
                      <span style={{ fontSize: 11, color: C.muted }}>{item.label}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {scoresDimensao.map((dim) => (
                    <div key={dim.nome}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{dim.nome}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            padding: "2px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600,
                            background: dim.cor + "22", color: dim.cor,
                            border: `1px solid ${dim.cor}55`,
                          }}>
                            {dim.label}
                          </span>
                          <span style={{ fontSize: 11, color: C.muted }}>Média: {dim.media}/5</span>
                        </div>
                      </div>
                      {/* Barra horizontal */}
                      <div style={{ background: C.border, borderRadius: 4, height: 20, overflow: "hidden" }}>
                        <div style={{
                          width: `${dim.score}%`, height: "100%", background: dim.cor,
                          display: "flex", alignItems: "center", paddingLeft: 8,
                          transition: "width 0.5s ease",
                        }}>
                          {dim.score > 8 && (
                            <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{dim.score}</span>
                          )}
                        </div>
                      </div>
                      {dim.score <= 8 && (
                        <span style={{ fontSize: 11, color: dim.cor, fontWeight: 700 }}>{dim.score}</span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── SEÇÃO 3: DISTRIBUIÇÃO DE RESPOSTAS ───────────────────────── */}
          {distribuicao.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, color: C.text, fontWeight: 700 }}>
                3. Distribuição de Respostas por Item
              </h3>
              <Card style={{ padding: 0, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      <th style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}`, minWidth: 220 }}>Item</th>
                      {ESCALA.map((op) => (
                        <th key={op} style={{ padding: "10px 8px", textAlign: "center", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                          {op}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {distribuicao.map((row) => (
                      <tr key={row.idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "8px 14px", color: C.text }}>
                          <span style={{ color: C.navyMid, fontWeight: 600 }}>{row.idx + 1}.</span>{" "}
                          {row.item.length > 70 ? row.item.slice(0, 70) + "…" : row.item}
                        </td>
                        {ESCALA.map((op) => {
                          const count = row.cont[op] || 0;
                          const pct = row.total > 0 ? Math.round((count / row.total) * 100) : 0;
                          return (
                            <td key={op} style={{ padding: "8px", textAlign: "center" }}>
                              <div style={{ fontWeight: 700, color: C.text }}>{count}</div>
                              <div style={{ color: C.muted, fontSize: 10 }}>{pct}%</div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* ── SEÇÃO 4: ANÁLISE POR SETOR ────────────────────────────────── */}
          {scoresPorSetor.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, color: C.text, fontWeight: 700 }}>
                4. Análise por Setor
              </h3>
              <Card style={{ padding: 0, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      <th style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>
                        Setor
                      </th>
                      {COPSOQ_DIMENSOES.map((d) => (
                        <th key={d.nome} style={{ padding: "10px 8px", textAlign: "center", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}`, fontSize: 10, maxWidth: 80 }}>
                          {d.nome.split(" ").slice(0, 2).join(" ")}
                        </th>
                      ))}
                      <th style={{ padding: "10px 8px", textAlign: "center", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>
                        Respostas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoresPorSetor.map((setor) => (
                      <tr key={setor.setorId} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "9px 14px", fontWeight: 600, color: C.text }}>{setor.nome}</td>
                        {setor.scores.map((score, i) => {
                          const classif = score !== null ? classificar(score) : null;
                          return (
                            <td key={i} style={{ padding: "9px 8px", textAlign: "center" }}>
                              {score !== null ? (
                                <span style={{
                                  display: "inline-block",
                                  padding: "3px 8px", borderRadius: 10, fontSize: 11,
                                  fontWeight: 700, background: classif.cor + "22",
                                  color: classif.cor,
                                }}>
                                  {score}
                                </span>
                              ) : (
                                <span style={{ color: C.muted }}>—</span>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ padding: "9px 8px", textAlign: "center", color: C.muted }}>{setor.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* ── SEÇÃO 5: INTEGRAÇÃO COM PGR ───────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, color: C.text, fontWeight: 700 }}>
              5. Integração com PGR — NR-01 §1.4.1
            </h3>
            <Card style={{ border: `1px solid ${kpisExec.criticos.length > 0 ? C.red : C.green}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  {kpisExec.criticos.length > 0 ? (
                    <>
                      <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: C.red }}>
                        {kpisExec.criticos.length} dimensão{kpisExec.criticos.length !== 1 ? "s" : ""} com risco elevado identificada{kpisExec.criticos.length !== 1 ? "s" : ""}.
                        Recomenda-se integração ao PGR conforme NR-01 §1.4.1.
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {kpisExec.criticos.map((d) => (
                          <div key={d.nome} style={{
                            padding: "10px 14px",
                            background: d.cor + "11",
                            border: `1px solid ${d.cor}44`,
                            borderLeft: `4px solid ${d.cor}`,
                            borderRadius: 6,
                          }}>
                            <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: d.cor }}>
                              {d.nome} — Score {d.score}/100 ({d.label})
                            </p>
                            <p style={{ margin: 0, fontSize: 11, color: C.text }}>
                              {RECOMENDACOES[d.nome] || "Avaliar medidas de controle específicas."}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: C.green, fontWeight: 600 }}>
                      Nenhuma dimensão com risco elevado ou crítico identificada.
                      Manter monitoramento periódico conforme NR-01.
                    </p>
                  )}
                </div>
                <Btn onClick={exportarPGR}>
                  Exportar para PGR
                </Btn>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
