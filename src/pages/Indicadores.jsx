import { useState } from "react";
import { Activity, TrendingUp, TrendingDown, Plus, Trash2, Save, X, Edit2, Info, Loader } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Btn, Input, Card, SectionTitle, Badge } from "../components/ui";
import { C } from "../constants";

const META_ABS = 3.5;

const calcTaxa = ({ diasPerdidos, totalFuncionarios, diasUteis }) => {
  if (!diasPerdidos || !totalFuncionarios || !diasUteis) return null;
  return parseFloat(((diasPerdidos / (totalFuncionarios * diasUteis)) * 100).toFixed(2));
};

const fmtPeriodo = (periodo) => {
  if (!periodo) return "—";
  const [ano, mes] = periodo.split("-");
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${meses[parseInt(mes) - 1]}/${ano}`;
};

const ABS_FORM_VAZIO = { periodo:"", diasPerdidos:"", totalFuncionarios:"", diasUteis:22 };
const FAP_FORM_VAZIO = { valor:"", ano: new Date().getFullYear(), rat:"", ratAjustado:"" };

export default function Indicadores() {
  const { absenteismo, fap, salvarAbsenteismo, excluirAbsenteismo, salvarFAP, canEdit } = useApp();

  const [addingAbs, setAddingAbs] = useState(false);
  const [absForm, setAbsForm]     = useState(ABS_FORM_VAZIO);
  const [savingAbs, setSavingAbs] = useState(false);

  const [editFAP, setEditFAP]   = useState(false);
  const [fapForm, setFapForm]   = useState(FAP_FORM_VAZIO);
  const [savingFAP, setSavingFAP] = useState(false);

  const absOrdenado = [...absenteismo].sort((a, b) => b.id.localeCompare(a.id));
  const latestAbs   = absOrdenado[0];
  const taxaAtual   = latestAbs ? calcTaxa(latestAbs) : null;
  const taxaAnterior = absOrdenado[1] ? calcTaxa(absOrdenado[1]) : null;
  const tendencia    = taxaAtual !== null && taxaAnterior !== null
    ? taxaAtual < taxaAnterior ? "melhora" : taxaAtual > taxaAnterior ? "piora" : "estável"
    : null;

  const handleSalvarAbs = async () => {
    if (!absForm.periodo || !absForm.diasPerdidos || !absForm.totalFuncionarios) return;
    setSavingAbs(true);
    await salvarAbsenteismo({
      periodo: absForm.periodo,
      diasPerdidos: Number(absForm.diasPerdidos),
      totalFuncionarios: Number(absForm.totalFuncionarios),
      diasUteis: Number(absForm.diasUteis) || 22,
    });
    setAbsForm(ABS_FORM_VAZIO);
    setAddingAbs(false);
    setSavingAbs(false);
  };

  const handleExcluirAbs = async (periodo) => {
    if (!window.confirm(`Excluir registro de ${fmtPeriodo(periodo)}?`)) return;
    await excluirAbsenteismo(periodo);
  };

  const iniciarEditFAP = () => {
    setFapForm(fap
      ? { valor: fap.valor, ano: fap.ano, rat: fap.rat || "", ratAjustado: fap.ratAjustado || "" }
      : FAP_FORM_VAZIO
    );
    setEditFAP(true);
  };

  const handleSalvarFAP = async () => {
    if (!fapForm.valor) return;
    setSavingFAP(true);
    const rat = parseFloat(fapForm.rat) || null;
    const valor = parseFloat(fapForm.valor);
    await salvarFAP({
      valor,
      ano: Number(fapForm.ano) || new Date().getFullYear(),
      rat: rat || null,
      ratAjustado: rat ? parseFloat((rat * valor).toFixed(4)) : null,
    });
    setEditFAP(false);
    setSavingFAP(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* ── Absenteísmo CID-F ── */}
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
          <div>
            <SectionTitle><Activity size={14} /> Absenteísmo CID-F — Saúde Mental</SectionTitle>
            <p style={{ fontSize:11, color:C.muted, margin:"-8px 0 0" }}>
              Dias perdidos por afastamentos com CID-F (F41, F43, F48 e similares). Taxa = Dias Perdidos ÷ (Funcionários × Dias Úteis) × 100.
            </p>
          </div>
          {canEdit && (
            <Btn onClick={() => setAddingAbs(p => !p)} color={C.navyMid} small icon={<Plus size={12}/>}>Adicionar Período</Btn>
          )}
        </div>

        {/* KPI resumo */}
        {taxaAtual !== null && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
            <div style={{ background: taxaAtual > META_ABS ? "#fef2f2" : "#f0fdf4", border:`1px solid ${taxaAtual > META_ABS ? "#fca5a5" : "#86efac"}`, borderRadius:8, padding:"12px 14px" }}>
              <p style={{ fontSize:10.5, color:C.muted, margin:"0 0 4px" }}>Taxa Atual ({fmtPeriodo(latestAbs?.periodo)})</p>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <p style={{ fontSize:22, fontWeight:700, margin:0, color: taxaAtual > META_ABS ? C.red : C.green }}>{taxaAtual}%</p>
                {tendencia === "melhora" && <TrendingDown size={16} color={C.green}/>}
                {tendencia === "piora"   && <TrendingUp   size={16} color={C.red}/>}
              </div>
              <p style={{ fontSize:10, color:C.muted, margin:"3px 0 0" }}>Meta: ≤ {META_ABS}%</p>
            </div>
            <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"12px 14px" }}>
              <p style={{ fontSize:10.5, color:C.muted, margin:"0 0 4px" }}>Período Anterior</p>
              <p style={{ fontSize:22, fontWeight:700, margin:0, color:C.text }}>{taxaAnterior !== null ? `${taxaAnterior}%` : "—"}</p>
              <p style={{ fontSize:10, color:C.muted, margin:"3px 0 0" }}>
                {tendencia === "melhora" ? "↓ Melhora em relação ao mês anterior" : tendencia === "piora" ? "↑ Piora em relação ao mês anterior" : "Sem comparação"}
              </p>
            </div>
            <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"12px 14px" }}>
              <p style={{ fontSize:10.5, color:C.muted, margin:"0 0 4px" }}>Períodos Registrados</p>
              <p style={{ fontSize:22, fontWeight:700, margin:0, color:C.text }}>{absenteismo.length}</p>
              <p style={{ fontSize:10, color:C.muted, margin:"3px 0 0" }}>Total de meses com dados</p>
            </div>
          </div>
        )}

        {/* Formulário adicionar */}
        {addingAbs && (
          <div style={{ background:"#f8fafc", border:`1px solid ${C.navyMid}`, borderRadius:8, padding:14, marginBottom:14 }}>
            <p style={{ fontWeight:600, fontSize:12, color:C.navy, margin:"0 0 10px" }}>Novo Registro</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, alignItems:"end" }}>
              <div>
                <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Período *</p>
                <input type="month" value={absForm.periodo} onChange={e => setAbsForm(p => ({ ...p, periodo: e.target.value }))}
                  style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
              </div>
              <Input label="Dias Perdidos *" type="number" value={absForm.diasPerdidos} onChange={v => setAbsForm(p => ({ ...p, diasPerdidos: v }))} placeholder="ex: 12"/>
              <Input label="Total Funcionários *" type="number" value={absForm.totalFuncionarios} onChange={v => setAbsForm(p => ({ ...p, totalFuncionarios: v }))} placeholder="ex: 80"/>
              <Input label="Dias Úteis no Mês" type="number" value={absForm.diasUteis} onChange={v => setAbsForm(p => ({ ...p, diasUteis: v }))} placeholder="22"/>
            </div>
            {absForm.diasPerdidos && absForm.totalFuncionarios && absForm.diasUteis && (
              <p style={{ fontSize:11, color:C.navyMid, margin:"4px 0 8px", fontWeight:600 }}>
                Taxa calculada: {calcTaxa({ diasPerdidos: Number(absForm.diasPerdidos), totalFuncionarios: Number(absForm.totalFuncionarios), diasUteis: Number(absForm.diasUteis) })}%
              </p>
            )}
            <div style={{ display:"flex", gap:8 }}>
              <Btn onClick={handleSalvarAbs} color={C.green} small disabled={savingAbs || !absForm.periodo} icon={savingAbs ? <Loader size={11}/> : <Save size={11}/>}>
                {savingAbs ? "Salvando..." : "Salvar"}
              </Btn>
              <Btn onClick={() => { setAddingAbs(false); setAbsForm(ABS_FORM_VAZIO); }} outline color={C.gray} small icon={<X size={11}/>}>Cancelar</Btn>
            </div>
          </div>
        )}

        {/* Tabela de registros */}
        {absOrdenado.length === 0 ? (
          <div style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:8, padding:"14px 16px", fontSize:12, color:"#92400e", display:"flex", gap:8, alignItems:"center" }}>
            <Info size={13} color="#ca8a04"/>
            {canEdit ? "Clique em \"Adicionar Período\" para lançar os dados mensais de absenteísmo." : "Nenhum dado de absenteísmo registrado."}
          </div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead>
                <tr style={{ background:C.navy }}>
                  {["Período","Dias Perdidos","Funcionários","Dias Úteis","Taxa (%)","Situação",""].map(h => (
                    <th key={h} style={{ padding:"7px 10px", textAlign:"left", color:"#e2e8f0", fontWeight:500, fontSize:10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {absOrdenado.map((rec, i) => {
                  const taxa = calcTaxa(rec);
                  const ok = taxa !== null && taxa <= META_ABS;
                  return (
                    <tr key={rec.id} style={{ background: i % 2 === 0 ? C.white : C.bg, borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:"7px 10px", fontWeight:600 }}>{fmtPeriodo(rec.periodo)}</td>
                      <td style={{ padding:"7px 10px" }}>{rec.diasPerdidos}</td>
                      <td style={{ padding:"7px 10px" }}>{rec.totalFuncionarios}</td>
                      <td style={{ padding:"7px 10px" }}>{rec.diasUteis}</td>
                      <td style={{ padding:"7px 10px", fontWeight:700, color: ok ? C.green : C.red }}>{taxa !== null ? `${taxa}%` : "—"}</td>
                      <td style={{ padding:"7px 10px" }}>
                        {taxa !== null && <Badge label={ok ? "Dentro da Meta" : "Acima da Meta"} color={ok ? "#166534" : C.red} bg={ok ? "#dcfce7" : "#fee2e2"}/>}
                      </td>
                      <td style={{ padding:"7px 10px" }}>
                        {canEdit && (
                          <button onClick={() => handleExcluirAbs(rec.periodo)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red }}>
                            <Trash2 size={12}/>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── FAP / RAT ── */}
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
          <div>
            <SectionTitle><TrendingUp size={14}/> FAP / RAT — Fator Acidentário de Prevenção</SectionTitle>
            <p style={{ fontSize:11, color:C.muted, margin:"-8px 0 0" }}>
              Valor publicado anualmente pelo INSS. FAP {">"} 1,000 majora o RAT; FAP {"<"} 1,000 reduz. Consulte o e-CAC do INSS.
            </p>
          </div>
          {canEdit && !editFAP && (
            <Btn onClick={iniciarEditFAP} outline color={C.navyMid} small icon={<Edit2 size={12}/>}>
              {fap ? "Atualizar FAP" : "Informar FAP"}
            </Btn>
          )}
        </div>

        {editFAP ? (
          <div style={{ background:"#f8fafc", border:`1px solid ${C.navyMid}`, borderRadius:8, padding:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, alignItems:"end" }}>
              <Input label="Ano de Referência" type="number" value={fapForm.ano} onChange={v => setFapForm(p => ({ ...p, ano: v }))} placeholder="2024"/>
              <Input label="Valor FAP *" type="number" value={fapForm.valor} onChange={v => setFapForm(p => ({ ...p, valor: v }))} placeholder="ex: 1.47"/>
              <Input label="RAT Base (%)" type="number" value={fapForm.rat} onChange={v => setFapForm(p => ({ ...p, rat: v }))} placeholder="ex: 3"/>
              <div>
                <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>RAT Ajustado (calculado)</p>
                <p style={{ fontSize:14, fontWeight:700, color:C.navyMid, padding:"8px 10px", background:C.white, border:`1px solid ${C.border}`, borderRadius:6 }}>
                  {fapForm.valor && fapForm.rat
                    ? `${(parseFloat(fapForm.rat) * parseFloat(fapForm.valor)).toFixed(2)}%`
                    : "—"}
                </p>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <Btn onClick={handleSalvarFAP} color={C.green} small disabled={savingFAP || !fapForm.valor} icon={savingFAP ? <Loader size={11}/> : <Save size={11}/>}>
                {savingFAP ? "Salvando..." : "Salvar"}
              </Btn>
              <Btn onClick={() => setEditFAP(false)} outline color={C.gray} small icon={<X size={11}/>}>Cancelar</Btn>
            </div>
          </div>
        ) : fap ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            {[
              { label:`FAP ${fap.ano || ""}`, value: fap.valor?.toString().replace(".",","), alert: fap.valor > 1, ok: fap.valor < 1, sub: fap.valor > 1 ? "RAT majorado" : fap.valor < 1 ? "RAT reduzido" : "RAT neutro" },
              { label:"RAT Base", value: fap.rat != null ? `${fap.rat}%` : "—", alert:false, ok:false, sub:"Alíquota CNAE" },
              { label:"RAT Ajustado", value: fap.ratAjustado != null ? `${fap.ratAjustado}%` : "—", alert: fap.valor > 1, ok: fap.valor < 1, sub:"RAT × FAP" },
              { label:"Situação", value: fap.valor > 1 ? "Majoração" : fap.valor < 1 ? "Redução" : "Neutro", alert: fap.valor > 1, ok: fap.valor < 1, sub: fap.valor > 1 ? "FAP > 1,000" : "FAP ≤ 1,000" },
            ].map((k, i) => (
              <div key={i} style={{ background: k.alert ? "#fef2f2" : k.ok ? "#f0fdf4" : C.bg, border:`1px solid ${k.alert ? "#fca5a5" : k.ok ? "#86efac" : C.border}`, borderRadius:8, padding:"12px 14px" }}>
                <p style={{ fontSize:10.5, color:C.muted, margin:"0 0 4px" }}>{k.label}</p>
                <p style={{ fontSize:20, fontWeight:700, margin:"0 0 3px", color: k.alert ? C.red : k.ok ? C.green : C.text }}>{k.value}</p>
                <p style={{ fontSize:10, color:C.muted, margin:0 }}>{k.sub}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:8, padding:"14px 16px", fontSize:12, color:"#92400e", display:"flex", gap:8, alignItems:"center" }}>
            <Info size={13} color="#ca8a04"/>
            {canEdit ? "Clique em \"Informar FAP\" para registrar o valor do Fator Acidentário recebido do INSS." : "FAP não informado."}
          </div>
        )}
      </Card>
    </div>
  );
}
