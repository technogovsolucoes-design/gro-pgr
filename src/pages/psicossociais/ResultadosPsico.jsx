import { useState, useEffect, useMemo } from "react";
import {
  collection, onSnapshot, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card } from "../../components/ui";
import { C } from "../../constants";
import { calcularRiscoScore, classificar, RECOMENDACOES, ESCALA, ESCALA_VALORES } from "../../data/copsoq";

// Compatibilidade com questionários antigos (19 itens, sem dimensoesConfig)
const DIMS_LEGADO = [
  { nome: "Demandas Quantitativas",        count: 2, favoravel: false },
  { nome: "Influência no Trabalho",        count: 2, favoravel: true  },
  { nome: "Possibilidades de Desenvolvimento", count: 2, favoravel: true  },
  { nome: "Suporte Social de Colegas",     count: 2, favoravel: true  },
  { nome: "Suporte Social de Superiores",  count: 2, favoravel: true  },
  { nome: "Insegurança no Emprego",        count: 2, favoravel: false },
  { nome: "Saúde e Bem-estar Geral",       count: 5, favoravel: true  },
];

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

function RiscoBar({ risco, nome, classif }) {
  const w = Math.max(risco ?? 0, 0);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{nome}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            padding: "2px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700,
            background: classif.bg, color: classif.cor, border: `1px solid ${classif.cor}44`,
          }}>
            {classif.label}
          </span>
          <span style={{ fontSize: 11, color: C.muted, minWidth: 32, textAlign: "right" }}>
            {risco !== null ? risco : "—"}
          </span>
        </div>
      </div>
      <div style={{ background: "#e2e8f0", borderRadius: 4, height: 18, overflow: "hidden", position: "relative" }}>
        <div style={{
          width: `${w}%`, height: "100%", background: classif.cor,
          display: "flex", alignItems: "center", paddingLeft: 8,
          transition: "width 0.5s ease",
        }}>
          {w > 10 && (
            <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{risco}</span>
          )}
        </div>
        {/* marcadores 33 e 66 */}
        {[33, 66].map((pct) => (
          <div key={pct} style={{
            position: "absolute", top: 0, left: `${pct}%`,
            width: 1, height: "100%", background: "rgba(255,255,255,0.6)",
          }} />
        ))}
      </div>
    </div>
  );
}

export default function ResultadosPsico() {
  const { empresaAtiva, setores } = useApp();
  const [questionarios,     setQuestionarios]     = useState([]);
  const [respostas,         setRespostas]         = useState([]);
  const [respostasPublicas, setRespostasPublicas] = useState([]);
  const [qSelecionado,      setQSelecionado]      = useState("");

  const empresaId = empresaAtiva?.id;

  // ─── Listeners ──────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (!qSelecionado) { setRespostasPublicas([]); return; }
    return onSnapshot(
      collection(db, "questionarios_publicos", qSelecionado, "respostas"),
      (snap) => setRespostasPublicas(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [qSelecionado]);

  // ─── Dados derivados ─────────────────────────────────────────────────────
  const questionarioObj = useMemo(
    () => questionarios.find((q) => q.id === qSelecionado),
    [questionarios, qSelecionado]
  );

  const respostasFiltradas = useMemo(() => {
    const manuais = respostas.filter((r) => r.questionarioId === qSelecionado);
    const mapa = {};
    [...manuais, ...respostasPublicas].forEach((r) => { mapa[r.id] = r; });
    return Object.values(mapa);
  }, [respostas, respostasPublicas, qSelecionado]);

  const dimsConfig = useMemo(() => {
    return questionarioObj?.dimensoesConfig || DIMS_LEGADO;
  }, [questionarioObj]);

  // ─── Scores por dimensão (0-100) ─────────────────────────────────────────
  const scoresDimensao = useMemo(() => {
    if (!respostasFiltradas.length) return [];
    return calcularRiscoScore(respostasFiltradas, dimsConfig).map((d) => ({
      ...d,
      ...classificar(d.risco),
    }));
  }, [respostasFiltradas, dimsConfig]);

  // ─── Distribuição por item ───────────────────────────────────────────────
  const distribuicao = useMemo(() => {
    if (!respostasFiltradas.length || !questionarioObj?.itens) return [];
    return questionarioObj.itens.map((item, idx) => {
      const cont = {};
      ESCALA.forEach((op) => { cont[op] = 0; });
      respostasFiltradas.forEach((r) => {
        const val = r.respostas?.[idx];
        if (val !== undefined && cont[val] !== undefined) cont[val]++;
      });
      return { item, idx, cont, total: respostasFiltradas.length };
    });
  }, [respostasFiltradas, questionarioObj]);

  // ─── Scores por setor ────────────────────────────────────────────────────
  const scoresPorSetor = useMemo(() => {
    if (!respostasFiltradas.length || !dimsConfig.length) return [];
    const setoresUsados = [...new Set(respostasFiltradas.map((r) => r.setorId).filter(Boolean))];
    return setoresUsados.map((sid) => {
      const resp = respostasFiltradas.filter((r) => r.setorId === sid);
      const scores = calcularRiscoScore(resp, dimsConfig).map((d) => d.risco);
      return {
        setorId: sid,
        nome: setores.find((s) => s.id === sid)?.nome || sid,
        scores,
        total: resp.length,
      };
    });
  }, [respostasFiltradas, dimsConfig, setores]);

  // ─── KPIs executivos ─────────────────────────────────────────────────────
  const kpisExec = useMemo(() => {
    const total = respostasFiltradas.length;
    const totalEsperado = questionarioObj?.totalFuncionarios || 0;
    const taxa = totalEsperado > 0 ? Math.round((total / totalEsperado) * 100) : null;
    const vermelhos = scoresDimensao.filter((d) => d.nivel === "vermelho");
    const amarelos  = scoresDimensao.filter((d) => d.nivel === "amarelo");

    // Score global = média dos riscos por dimensão
    const scores = scoresDimensao.filter((d) => d.risco !== null).map((d) => d.risco);
    const scoreGlobal = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const classifGlobal = classificar(scoreGlobal);

    return { total, taxa, vermelhos, amarelos, scoreGlobal, classifGlobal };
  }, [respostasFiltradas, questionarioObj, scoresDimensao]);

  // ─── Exportar para PGR ───────────────────────────────────────────────────
  const exportarPGR = () => {
    const empresa = empresaAtiva?.nome || "Empresa";
    const dataHoje = new Date().toLocaleDateString("pt-BR");

    const classifGlobal = kpisExec.classifGlobal;

    const linhasDim = scoresDimensao.map((d) => `
      <tr>
        <td>${d.nome}</td>
        <td style="text-align:center;font-weight:700;color:${d.cor}">${d.risco ?? "—"}/100</td>
        <td><span style="padding:3px 10px;border-radius:10px;font-size:11px;font-weight:700;background:${d.bg};color:${d.cor}">${d.label}</span></td>
        <td style="font-size:12px;color:#555">${RECOMENDACOES[d.nome] || "Avaliar medidas específicas."}</td>
      </tr>
    `).join("");

    const dimsInterv = scoresDimensao.filter((d) => d.nivel === "vermelho" || d.nivel === "amarelo");

    const linhasInterv = dimsInterv.map((d) => `
      <div style="margin-bottom:14px;padding:12px 14px;background:${d.bg};border-left:4px solid ${d.cor};border-radius:6px">
        <strong style="color:${d.cor}">${d.nome}</strong> — Risco: ${d.risco}/100 (${d.label})<br>
        <span style="font-size:12px;color:#444;margin-top:5px;display:block">${RECOMENDACOES[d.nome] || ""}</span>
      </div>
    `).join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Psicossocial PGR — ${empresa}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #222; font-size: 14px; }
    h1 { color: #1652a1; border-bottom: 2px solid #1652a1; padding-bottom: 8px; }
    h2 { color: #1652a1; margin-top: 28px; font-size: 15px; border-left: 4px solid #1652a1; padding-left: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #1652a1; color: #fff; padding: 10px; text-align: left; font-size: 12px; }
    td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .score-global { display:inline-block; font-size:32px; font-weight:800; }
    .footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #888; }
  </style>
</head>
<body>
  <h1>Relatório de Fatores Psicossociais — PGR / NR-01 §1.4.1</h1>

  <p>
    <strong>Empresa:</strong> ${empresa}<br>
    <strong>Questionário:</strong> ${questionarioObj?.nome || "—"}<br>
    <strong>Instrumento:</strong> ${questionarioObj?.tipo || "—"}<br>
    <strong>Data da análise:</strong> ${dataHoje}<br>
    <strong>Total de respostas:</strong> ${kpisExec.total}${kpisExec.taxa !== null ? ` (${kpisExec.taxa}% de participação)` : ""}
  </p>

  <h2>Índice de Risco Global</h2>
  <div style="padding:16px;border-radius:8px;background:${classifGlobal.bg};border:2px solid ${classifGlobal.cor};display:inline-block;margin-bottom:8px">
    <span class="score-global" style="color:${classifGlobal.cor}">${kpisExec.scoreGlobal ?? "—"}/100</span>
    <span style="margin-left:16px;font-size:18px;font-weight:700;color:${classifGlobal.cor}">${classifGlobal.label}</span>
  </div>
  <p style="font-size:12px;color:#555;margin-top:4px">
    Classificação NR-01 §1.4.1: Verde (0–33 Favorável) · Amarelo (34–66 Intermediário) · Vermelho (67–100 Desfavorável)
  </p>

  <h2>Resultados por Dimensão</h2>
  <table>
    <thead>
      <tr>
        <th>Dimensão Psicossocial</th>
        <th style="width:90px;text-align:center">Score (0–100)</th>
        <th style="width:160px">Classificação NR-01</th>
        <th>Recomendações para o PGR</th>
      </tr>
    </thead>
    <tbody>${linhasDim}</tbody>
  </table>

  <h2>Medidas de Controle Recomendadas</h2>
  ${dimsInterv.length > 0 ? linhasInterv : '<p style="color:#555">Nenhuma dimensão com risco Intermediário ou Desfavorável identificada. Manter monitoramento periódico.</p>'}

  <div style="margin-top:20px;padding:16px;background:#eff6ff;border-radius:8px;border-left:4px solid #1652a1">
    <strong style="color:#1652a1">Base Legal:</strong>
    NR-01 §1.4.1 e §1.5.3.2 — Os fatores psicossociais identificados devem integrar o Programa de Gerenciamento de Riscos (PGR)
    com medidas de prevenção, controle e monitoramento. A adoção do COPSOQ II-Br como instrumento de avaliação atende ao princípio
    da objetividade técnica exigido pela Fundacentro e pela ISO 45003:2021.
  </div>

  <div class="footer">
    Gerado pelo Sistema NEXUS SST · Technogov Soluções · ${dataHoje}<br>
    Instrumento: ${questionarioObj?.tipo || "COPSOQ II-Br"} · ${questionarioObj?.itens?.length || "?"} itens · ${dimsConfig.length} dimensões
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, background: C.bg, minHeight: "100vh" }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: C.text, fontSize: 20, fontWeight: 700 }}>
          Resultados — Análise Psicossocial COPSOQ II-Br
        </h2>
        <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 12 }}>
          Semáforo de risco por dimensão · Escala 0–100 · Verde/Amarelo/Vermelho conforme NR-01 §1.4.1
        </p>
      </div>

      {/* Seletor */}
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
              Exportar PGR
            </Btn>
          )}
        </div>
      </Card>

      {!qSelecionado && (
        <Card>
          <p style={{ textAlign: "center", color: C.muted, fontSize: 13, margin: 0 }}>
            Selecione um questionário acima para visualizar os resultados.
          </p>
        </Card>
      )}

      {qSelecionado && respostasFiltradas.length === 0 && (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Aguardando respostas</p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: C.muted }}>
            Nenhuma resposta recebida ainda. Compartilhe o link do questionário com os trabalhadores.
          </p>
        </Card>
      )}

      {qSelecionado && respostasFiltradas.length > 0 && (
        <div>

          {/* ── 1. RESUMO EXECUTIVO ──────────────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, color: C.text, fontWeight: 700 }}>
              1. Resumo Executivo
            </h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {/* Score global */}
              <Card style={{ flex: "0 0 auto", minWidth: 150, border: `2px solid ${kpisExec.classifGlobal.cor}`, background: kpisExec.classifGlobal.bg }}>
                <p style={{ margin: 0, fontSize: 11, color: kpisExec.classifGlobal.cor, fontWeight: 600 }}>Risco Global</p>
                <p style={{ margin: "4px 0 0", fontSize: 32, fontWeight: 800, color: kpisExec.classifGlobal.cor }}>
                  {kpisExec.scoreGlobal ?? "—"}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 700, color: kpisExec.classifGlobal.cor }}>
                  {kpisExec.classifGlobal.label}
                </p>
              </Card>
              <Card style={{ flex: 1, minWidth: 120 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Respostas</p>
                <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, color: C.navyMid }}>{kpisExec.total}</p>
              </Card>
              <Card style={{ flex: 1, minWidth: 120 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Participação</p>
                <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, color: kpisExec.taxa === null ? C.muted : kpisExec.taxa >= 60 ? "#16a34a" : kpisExec.taxa >= 30 ? "#d97706" : "#dc2626" }}>
                  {kpisExec.taxa !== null ? `${kpisExec.taxa}%` : "—"}
                </p>
              </Card>
              <Card style={{ flex: 1, minWidth: 120 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Dimensões Vermelhas</p>
                <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, color: kpisExec.vermelhos.length > 0 ? "#dc2626" : "#16a34a" }}>
                  {kpisExec.vermelhos.length}
                </p>
              </Card>
              <Card style={{ flex: 1, minWidth: 120 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Dimensões Amarelas</p>
                <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, color: kpisExec.amarelos.length > 0 ? "#d97706" : "#16a34a" }}>
                  {kpisExec.amarelos.length}
                </p>
              </Card>
              <Card style={{ flex: 1, minWidth: 120 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Instrumento</p>
                <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 600, color: C.text, lineHeight: 1.4 }}>
                  {questionarioObj?.tipo || "—"}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 10, color: C.muted }}>
                  {dimsConfig.length} dimensões
                </p>
              </Card>
            </div>
          </div>

          {/* ── 2. SEMÁFORO POR DIMENSÃO ─────────────────────────────────── */}
          {scoresDimensao.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, color: C.text, fontWeight: 700 }}>
                2. Semáforo de Risco por Dimensão — NR-01
              </h3>
              <Card>
                {/* Legenda */}
                <div style={{ display: "flex", gap: 16, marginBottom: 16, padding: "8px 12px", background: "#f8fafc", borderRadius: 8, flexWrap: "wrap" }}>
                  {[
                    { label: "0–33  Favorável", cor: "#16a34a", bg: "#dcfce7" },
                    { label: "34–66  Intermediário", cor: "#d97706", bg: "#fef3c7" },
                    { label: "67–100  Desfavorável", cor: "#dc2626", bg: "#fee2e2" },
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: item.bg, color: item.cor }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                  <span style={{ fontSize: 11, color: C.muted, marginLeft: "auto" }}>
                    Linhas verticais: limites 33 e 66
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {scoresDimensao.map((dim) => (
                    <RiscoBar key={dim.nome} risco={dim.risco} nome={dim.nome} classif={dim} />
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── 3. RECOMENDAÇÕES POR DIMENSÃO ────────────────────────────── */}
          {(kpisExec.vermelhos.length > 0 || kpisExec.amarelos.length > 0) && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, color: C.text, fontWeight: 700 }}>
                3. Medidas Recomendadas — Integração ao PGR
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[...kpisExec.vermelhos, ...kpisExec.amarelos].map((d) => (
                  <div key={d.nome} style={{
                    padding: "12px 16px",
                    background: d.bg,
                    border: `1px solid ${d.cor}44`,
                    borderLeft: `4px solid ${d.cor}`,
                    borderRadius: 8,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: d.cor }}>{d.nome}</span>
                      <span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: "rgba(255,255,255,0.7)", color: d.cor }}>
                        Risco {d.risco}/100 — {d.label}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
                      {RECOMENDACOES[d.nome] || "Avaliar e implementar medidas de controle específicas."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Todas favoráveis */}
          {kpisExec.vermelhos.length === 0 && kpisExec.amarelos.length === 0 && scoresDimensao.length > 0 && (
            <div style={{ marginBottom: 20, padding: "14px 18px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#15803d", fontWeight: 600 }}>
                Todas as dimensões estão na faixa Favorável (0–33). Manter monitoramento periódico conforme NR-01.
              </p>
            </div>
          )}

          {/* ── 4. DISTRIBUIÇÃO POR ITEM ─────────────────────────────────── */}
          {distribuicao.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, color: C.text, fontWeight: 700 }}>
                4. Distribuição de Respostas por Item
              </h3>
              <Card style={{ padding: 0, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      <th style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}`, minWidth: 220 }}>Item</th>
                      {ESCALA.map((op) => (
                        <th key={op} style={{ padding: "10px 8px", textAlign: "center", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", fontSize: 10 }}>
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
                          {row.item.length > 80 ? row.item.slice(0, 80) + "…" : row.item}
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

          {/* ── 5. ANÁLISE POR SETOR ─────────────────────────────────────── */}
          {scoresPorSetor.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, color: C.text, fontWeight: 700 }}>
                5. Análise por Setor
              </h3>
              <Card style={{ padding: 0, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      <th style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>Setor</th>
                      {dimsConfig.map((d) => (
                        <th key={d.nome} style={{ padding: "10px 6px", textAlign: "center", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}`, fontSize: 10, maxWidth: 70 }}>
                          {d.nome.split(" ").slice(0, 2).join(" ")}
                        </th>
                      ))}
                      <th style={{ padding: "10px 8px", textAlign: "center", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>n</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoresPorSetor.map((setor) => (
                      <tr key={setor.setorId} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "9px 14px", fontWeight: 600, color: C.text }}>{setor.nome}</td>
                        {setor.scores.map((score, i) => {
                          const cl = classificar(score);
                          return (
                            <td key={i} style={{ padding: "9px 6px", textAlign: "center" }}>
                              {score !== null ? (
                                <span style={{
                                  display: "inline-block", padding: "2px 7px", borderRadius: 8,
                                  fontSize: 11, fontWeight: 700,
                                  background: cl.bg, color: cl.cor,
                                }}>
                                  {score}
                                </span>
                              ) : <span style={{ color: C.muted }}>—</span>}
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

          {/* ── 6. INTEGRAÇÃO COM PGR ────────────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, color: C.text, fontWeight: 700 }}>
              6. Integração com PGR — NR-01 §1.4.1
            </h3>
            <Card style={{ border: `1px solid ${kpisExec.classifGlobal.cor}`, background: kpisExec.classifGlobal.bg }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: kpisExec.classifGlobal.cor }}>
                    Risco Global: {kpisExec.scoreGlobal ?? "—"}/100 — {kpisExec.classifGlobal.label}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "#374151", lineHeight: 1.5 }}>
                    {kpisExec.vermelhos.length > 0
                      ? `${kpisExec.vermelhos.length} dimensão(ões) Desfavorável(is) requerem intervenção imediata no PGR conforme NR-01 §1.4.1.`
                      : kpisExec.amarelos.length > 0
                      ? `${kpisExec.amarelos.length} dimensão(ões) Intermediária(s) requerem monitoramento e plano de ação preventivo.`
                      : "Todas as dimensões estão na faixa Favorável. Manter monitoramento periódico."}
                  </p>
                </div>
                <Btn onClick={exportarPGR}>Exportar PGR</Btn>
              </div>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}
