import { useState } from "react";
import { History, Camera, ChevronDown, ChevronRight, AlertTriangle, Shield, CheckCircle, Clock, User, Loader, Info } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useApp } from "../context/AppContext";
import { Btn, Card, SectionTitle, Badge } from "../components/ui";
import { C } from "../constants";

const fmtData = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
};

const fmtDataCurta = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("pt-BR", { day:"2-digit", month:"short" });
};

export default function Historico() {
  const { historico, riscos, savingSnap, criarSnapshot, canEdit, userProfile, user } = useApp();
  const [expandido, setExpandido] = useState(null);
  const [confirmando, setConfirmando] = useState(false);

  const handleRegistrar = async () => {
    if (riscos.length === 0 && !confirmando) { setConfirmando(true); return; }
    const autor = userProfile?.nome || user?.email || "—";
    await criarSnapshot(riscos, autor);
    setConfirmando(false);
  };

  const dadosGrafico = [...historico]
    .filter(h => h.data)
    .slice(0, 12)
    .reverse()
    .map(h => ({
      data: fmtDataCurta(h.data),
      Críticos: h.criticos || 0,
      Altos: h.altos || 0,
      Total: h.totalRiscos || 0,
    }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* ── Cabeçalho + botão ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <SectionTitle><History size={14}/> Histórico de Avaliações</SectionTitle>
          <p style={{ fontSize:11, color:C.muted, margin:"-10px 0 0" }}>
            Cada registro captura um snapshot completo dos riscos mapeados. Use para monitorar a evolução e comparar períodos.
          </p>
        </div>
        {canEdit && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
            <Btn
              onClick={handleRegistrar}
              color={confirmando ? "#92400e" : C.navyMid}
              disabled={savingSnap}
              icon={savingSnap ? <Loader size={13}/> : <Camera size={13}/>}
            >
              {savingSnap ? "Salvando..." : confirmando ? "Confirmar (0 riscos)" : "Registrar Avaliação Agora"}
            </Btn>
            {confirmando && (
              <div style={{ display:"flex", gap:6 }}>
                <p style={{ fontSize:10, color:"#92400e", margin:0, alignSelf:"center" }}>Sem riscos mapeados.</p>
                <button onClick={() => setConfirmando(false)} style={{ fontSize:10, color:C.gray, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Cancelar</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Gráfico de evolução ── */}
      {dadosGrafico.length >= 2 && (
        <Card>
          <SectionTitle>Evolução dos Riscos (últimas {dadosGrafico.length} avaliações)</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dadosGrafico} margin={{ left:0, right:16, top:4, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="data" tick={{ fontSize:10 }} />
              <YAxis tick={{ fontSize:10 }} allowDecimals={false} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize:11 }} />
              <Line type="monotone" dataKey="Total"    stroke={C.navyMid} strokeWidth={2} dot={{ r:3 }} />
              <Line type="monotone" dataKey="Críticos" stroke={C.red}     strokeWidth={2} dot={{ r:3 }} />
              <Line type="monotone" dataKey="Altos"    stroke={C.amber}   strokeWidth={2} dot={{ r:3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── Sem dados ── */}
      {historico.length === 0 ? (
        <div style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:8, padding:"16px 18px", fontSize:12, color:"#92400e", display:"flex", gap:8, alignItems:"center" }}>
          <Info size={13} color="#ca8a04" style={{ flexShrink:0 }}/>
          {canEdit
            ? "Nenhuma avaliação registrada ainda. Preencha o Levantamento e clique em \"Registrar Avaliação Agora\" para salvar o primeiro histórico."
            : "Nenhuma avaliação registrada para esta empresa."}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {historico.map((h, idx) => {
            const aberto = expandido === h.id;
            const semRiscos = !h.riscos || h.riscos.length === 0;
            return (
              <Card key={h.id} style={{ padding:0, overflow:"hidden" }}>
                {/* Linha resumo clicável */}
                <button
                  onClick={() => setExpandido(aberto ? null : h.id)}
                  style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:"14px 16px", textAlign:"left", display:"flex", alignItems:"center", gap:12 }}
                >
                  {/* Badge ordinal */}
                  <div style={{ width:32, height:32, borderRadius:"50%", background: idx === 0 ? C.navyMid : C.bg, border:`1px solid ${idx === 0 ? C.navyMid : C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color: idx === 0 ? "#fff" : C.muted, flexShrink:0 }}>
                    {historico.length - idx}
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                      <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>{fmtData(h.data)}</span>
                      {idx === 0 && <Badge label="Mais recente" color="#1e40af" bg="#dbeafe"/>}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                      <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.muted }}>
                        <User size={10}/>{h.autor}
                      </span>
                      <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.muted }}>
                        <Shield size={10}/>{h.totalRiscos} riscos mapeados
                      </span>
                      <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.muted }}>
                        <Clock size={10}/>{h.setoresAfetados} setores
                      </span>
                    </div>
                  </div>

                  {/* KPIs inline */}
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    {h.criticos > 0 && (
                      <span style={{ display:"flex", alignItems:"center", gap:4, background:"#fee2e2", color:C.red, padding:"3px 8px", borderRadius:12, fontSize:10, fontWeight:700 }}>
                        <AlertTriangle size={10}/>{h.criticos} críticos
                      </span>
                    )}
                    {h.altos > 0 && (
                      <span style={{ background:"#fffbeb", color:C.amber, padding:"3px 8px", borderRadius:12, fontSize:10, fontWeight:700 }}>
                        {h.altos} altos
                      </span>
                    )}
                    {h.criticos === 0 && h.altos === 0 && h.totalRiscos > 0 && (
                      <span style={{ display:"flex", alignItems:"center", gap:4, background:"#dcfce7", color:C.green, padding:"3px 8px", borderRadius:12, fontSize:10, fontWeight:700 }}>
                        <CheckCircle size={10}/>Sem críticos
                      </span>
                    )}
                  </div>

                  {aberto ? <ChevronDown size={14} color={C.muted}/> : <ChevronRight size={14} color={C.muted}/>}
                </button>

                {/* Detalhe expandido */}
                {aberto && (
                  <div style={{ borderTop:`1px solid ${C.border}`, padding:"14px 16px", background:"#f8fafc" }}>
                    {semRiscos ? (
                      <p style={{ fontSize:12, color:C.muted, margin:0 }}>Nenhum risco estava mapeado nesta avaliação.</p>
                    ) : (
                      <div style={{ overflowX:"auto" }}>
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                          <thead>
                            <tr style={{ background:C.navy }}>
                              {["Fator de Risco","Categoria","Setor","Score","Classificação","AET"].map(col => (
                                <th key={col} style={{ padding:"6px 10px", textAlign:"left", color:"#e2e8f0", fontWeight:500, fontSize:10 }}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {h.riscos.map((r, i) => (
                              <tr key={i} style={{ background: i % 2 === 0 ? C.white : "#f1f5f9", borderBottom:`1px solid ${C.border}` }}>
                                <td style={{ padding:"6px 10px", fontWeight:500, maxWidth:180 }}>{r.fator}</td>
                                <td style={{ padding:"6px 10px", color:C.muted }}>{r.cat?.split(" ")[0]}</td>
                                <td style={{ padding:"6px 10px" }}>{r.setor}</td>
                                <td style={{ padding:"6px 10px", fontWeight:700 }}>{r.score}</td>
                                <td style={{ padding:"6px 10px" }}><Badge label={r.label} color={r.color} bg={r.bg}/></td>
                                <td style={{ padding:"6px 10px", fontSize:10, color: r.aet ? C.red : C.muted, fontWeight: r.aet ? 700 : 400 }}>
                                  {r.aet ? "✔ AET" : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
