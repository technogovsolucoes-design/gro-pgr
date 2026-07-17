import { AlertCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Card, SectionTitle, Badge } from "../components/ui";
import { C } from "../constants";

const NIVEIS = [
  ["Aceitável",    "1–3",  "#dcfce7", "#15803d", [1,  3]],
  ["Tolerável",    "4–6",  "#fef9c3", "#854d0e", [4,  6]],
  ["Relevante",    "7–12", "#fed7aa", "#92400e", [7,  12]],
  ["Crítico",      "13–16","#fee2e2", "#991b1b", [13, 16]],
  ["Catastrófico", "17–25","#fecaca", "#7f1d1d", [17, 25]],
];

export default function Matriz({ onNavigate }) {
  const { riscos } = useApp();

  return (
    <div>
      <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:8, padding:"10px 14px", marginBottom:16, display:"flex", gap:8, alignItems:"flex-start" }}>
        <AlertCircle size={13} color={C.red} style={{ flexShrink:0, marginTop:2 }} />
        <p style={{ fontSize:11, color:"#991b1b", margin:0 }}>
          <strong>Critério AET:</strong> Pontuação ≥ 13 (Crítico/Catastrófico) exige Análise Ergonômica do Trabalho imediata — NR-17 / Nota Técnica FUNDACENTRO.
        </p>
      </div>

      {riscos.length === 0 ? (
        <div style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:8, padding:"20px", fontSize:12, color:"#92400e", textAlign:"center" }}>
          Sem dados de risco. Preencha o{" "}
          <button onClick={() => onNavigate("seguranca", "levantamento")} style={{ background:"none", border:"none", color:C.navyMid, cursor:"pointer", fontWeight:600, fontFamily:"inherit", fontSize:12 }}>Levantamento</button>{" "}
          primeiro.
        </div>
      ) : (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:20 }}>
            {NIVEIS.map(([z, rng, bg, cl, lim]) => {
              const n = riscos.filter(r => r.score >= lim[0] && r.score <= lim[1]).length;
              return (
                <div key={z} style={{ background:bg, borderRadius:8, padding:"12px", textAlign:"center" }}>
                  <p style={{ fontSize:11, fontWeight:600, color:cl, margin:"0 0 2px" }}>{z}</p>
                  <p style={{ fontSize:10, color:cl, margin:"0 0 6px", opacity:0.8 }}>{rng}</p>
                  <p style={{ fontSize:24, fontWeight:700, color:cl, margin:0 }}>{n}</p>
                </div>
              );
            })}
          </div>

          <Card>
            <SectionTitle>Todos os Riscos — Ordenados por Pontuação</SectionTitle>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, tableLayout:"fixed" }}>
                <thead>
                  <tr style={{ background:C.navy }}>
                    {["Fator de Risco","Categoria","Setor","Frequência","Severidade","Pontuação","Classificação","AET?"].map(h => (
                      <th key={h} style={{ padding:"8px 10px", textAlign:"left", color:"#e2e8f0", fontWeight:500, fontSize:10 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {riscos.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.white : C.bg, borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:"8px 10px", fontWeight:500 }}>{r.fator}</td>
                      <td style={{ padding:"8px 10px", color:C.muted, fontSize:10 }}>{r.cat}</td>
                      <td style={{ padding:"8px 10px" }}>{r.setor}</td>
                      <td style={{ padding:"8px 10px", color:C.muted }}>{r.freq}</td>
                      <td style={{ padding:"8px 10px", color:C.muted }}>{r.sev}</td>
                      <td style={{ padding:"8px 10px", fontWeight:700, fontSize:14 }}>{r.score}</td>
                      <td style={{ padding:"8px 10px" }}><Badge label={r.label} color={r.color} bg={r.bg} /></td>
                      <td style={{ padding:"8px 10px" }}>
                        {r.aet
                          ? <span style={{ color:C.red, fontWeight:700, fontSize:10 }}>✔ SIM</span>
                          : <span style={{ color:C.muted, fontSize:10 }}>Não</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
