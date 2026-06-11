import { useState } from "react";
import { Loader } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Badge } from "../components/ui";
import { C, FATORES, FREQ_OPT, SEV_OPT } from "../constants";
import { getRiskScore, getRiskLabel } from "../utils";

const SEV_COLORS = ["#16a34a", "#65a30d", "#d97706", "#ea580c", "#dc2626"];

export default function Levantamento({ onNavigate }) {
  const { setores, checklist, setCheckField, canEdit, savingCheck } = useApp();
  const [setorSel, setSetorSel] = useState("");
  const [catFiltro, setCatFiltro] = useState("Todas");

  const cats = ["Todas", ...[...new Set(FATORES.map(f => f.cat))]];
  const fatoresFiltrados = catFiltro === "Todas" ? FATORES : FATORES.filter(f => f.cat === catFiltro);

  return (
    <div>
      <div style={{ display:"flex", gap:12, alignItems:"flex-end", marginBottom:14, flexWrap:"wrap" }}>
        <div>
          <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Setor avaliado *</p>
          <select value={setorSel} onChange={e => setSetorSel(e.target.value)} style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", color:C.text, background:C.white, minWidth:180 }}>
            <option value="">— Selecione —</option>
            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div>
          <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Filtrar categoria</p>
          <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)} style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", color:C.text, background:C.white }}>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {savingCheck && (
          <span style={{ fontSize:11, color:C.muted, display:"flex", alignItems:"center", gap:4 }}>
            <Loader size={11} /> Salvando...
          </span>
        )}
        {setorSel && (
          <span style={{ fontSize:11, color:C.muted, marginLeft:"auto" }}>
            {fatoresFiltrados.filter(f => checklist[`${f.id}__${setorSel}`]?.freq).length}/{fatoresFiltrados.length} avaliados
          </span>
        )}
      </div>

      {!setorSel && (
        <div style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:8, padding:"12px 16px", fontSize:12, color:"#92400e" }}>
          {setores.length === 0
            ? <>Nenhum setor cadastrado. <button onClick={() => onNavigate(2)} style={{ background:"none", border:"none", color:C.navyMid, cursor:"pointer", fontWeight:600, fontFamily:"inherit", fontSize:12 }}>Cadastre setores primeiro.</button></>
            : "Selecione um setor acima para iniciar o levantamento epidemiológico."
          }
        </div>
      )}

      {[...new Set(fatoresFiltrados.map(f => f.cat))].map(cat => (
        <div key={cat} style={{ marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <div style={{ width:3, height:16, background:C.navyMid, borderRadius:2 }} />
            <p style={{ fontWeight:600, fontSize:13, color:C.navy, margin:0 }}>{cat}</p>
          </div>

          {fatoresFiltrados.filter(f => f.cat === cat).map(item => {
            const key = `${item.id}__${setorSel}`;
            const val = checklist[key] || {};
            const score = val.freq && val.sev ? getRiskScore(val.freq, val.sev) : null;
            const rk = score !== null ? getRiskLabel(score) : null;

            return (
              <div key={item.id} style={{ background:C.white, border:`1px solid ${rk ? rk.color : C.border}`, borderLeft:`3px solid ${rk ? rk.color : C.border}`, borderRadius:8, padding:"12px 14px", marginBottom:8, opacity: setorSel ? 1 : 0.5 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:500, fontSize:12, margin:"0 0 2px" }}>{item.label}</p>
                    <p style={{ fontSize:10, color:C.muted, margin:0 }}>Ref.: {item.ref}</p>
                  </div>
                  {rk && <Badge label={`${rk.label} (${score})`} color={rk.color} bg={rk.bg} />}
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <p style={{ fontSize:10, color:C.muted, margin:"0 0 5px", fontWeight:500 }}>Frequência de Exposição</p>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {FREQ_OPT.map(o => {
                        const sel = val.freq === o;
                        const dis = !setorSel || !canEdit;
                        return (
                          <button key={o} disabled={dis} onClick={() => setCheckField(item.id, setorSel, "freq", o)}
                            style={{ fontSize:10, padding:"3px 9px", borderRadius:20, border:`1px solid ${sel ? C.navyMid : C.border}`, background: sel ? C.navyMid : C.white, color: sel ? C.white : C.gray, cursor: dis ? "not-allowed" : "pointer", fontWeight: sel ? 600 : 400, fontFamily:"inherit" }}>
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize:10, color:C.muted, margin:"0 0 5px", fontWeight:500 }}>Severidade do Dano Esperado</p>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {SEV_OPT.map((o, oi) => {
                        const sel = val.sev === o;
                        const dis = !setorSel || !canEdit;
                        return (
                          <button key={o} disabled={dis} onClick={() => setCheckField(item.id, setorSel, "sev", o)}
                            style={{ fontSize:10, padding:"3px 9px", borderRadius:20, border:`1px solid ${sel ? SEV_COLORS[oi] : C.border}`, background: sel ? SEV_COLORS[oi] : C.white, color: sel ? C.white : C.gray, cursor: dis ? "not-allowed" : "pointer", fontWeight: sel ? 600 : 400, fontFamily:"inherit" }}>
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
