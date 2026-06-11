import { Activity, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useApp } from "../context/AppContext";
import { Card, SectionTitle } from "../components/ui";
import { C, PIE_COLORS, FATORES } from "../constants";

const calcTaxaAbs = ({ diasPerdidos, totalFuncionarios, diasUteis }) => {
  if (!diasPerdidos || !totalFuncionarios || !diasUteis) return null;
  return parseFloat(((diasPerdidos / (totalFuncionarios * diasUteis)) * 100).toFixed(2));
};

export default function Dashboard() {
  const { empresaAtiva, riscos, setores, absenteismo, fap } = useApp();

  const kpiCriticos = riscos.filter(r => r.score >= 13).length;
  const kpiAssedio  = riscos.filter(r => r.cat === "Suporte Social e Relações" && r.score >= 8).length;

  const latestAbs = [...absenteismo].sort((a, b) => b.id.localeCompare(a.id))[0];
  const taxaAbs   = latestAbs ? calcTaxaAbs(latestAbs) : null;
  const absAlerta = taxaAbs !== null && taxaAbs > 3.5;
  const absValor  = taxaAbs !== null ? `${taxaAbs}%` : "—";
  const absSub    = taxaAbs !== null
    ? `Meta ≤ 3,5% | ${absAlerta ? "Acima" : "Dentro"} da meta`
    : "Sem dados — preencha Indicadores";

  const fapValor  = fap?.valor != null ? String(fap.valor).replace(".", ",") : "—";
  const fapAlerta = fap?.valor != null && fap.valor > 1;
  const fapSub    = fap?.valor != null
    ? `FAP ${fap.valor > 1 ? "> 1 → Majoração" : "< 1 → Redução"} do RAT`
    : "Sem dados — preencha Indicadores";

  const dadosSetor = setores.map(s => {
    const rs = riscos.filter(r => r.setorId === s.id);
    const avg = rs.length ? Math.round(rs.reduce((a, r) => a + r.score, 0) / rs.length * 4) : 0;
    return { setor: s.nome, nivel: avg };
  });

  const dadosCat = [...new Set(FATORES.map(f => f.cat))].map(cat => ({
    name: cat.split(" ")[0],
    value: riscos.filter(r => r.cat === cat).length || 0,
  }));

  return (
    <div>
      <p style={{ fontSize:12, color:C.muted, marginBottom:14 }}>
        Empresa: <strong>{empresaAtiva?.razao || "—"}</strong> | CNAE: {empresaAtiva?.cnae || "—"} | Responsável: {empresaAtiva?.responsavel || "—"}
      </p>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
        {[
          { label:"Absenteísmo CID-F", value:absValor, sub:absSub, icon:<Activity size={16}/>, bg:absAlerta?"#fef2f2":taxaAbs!==null?"#f0fdf4":"#fffbeb", bc:absAlerta?"#fca5a5":taxaAbs!==null?"#86efac":"#fcd34d", ic:absAlerta?C.red:taxaAbs!==null?C.green:C.amber },
          { label:"Riscos Críticos / Catastróficos", value:kpiCriticos, sub:"Requerem AET imediata", icon:<AlertTriangle size={16}/>, bg:kpiCriticos>0?"#fef2f2":"#f0fdf4", bc:kpiCriticos>0?"#fca5a5":"#86efac", ic:kpiCriticos>0?C.red:C.green },
          { label:"FAP — Fator Acidentário", value:fapValor, sub:fapSub, icon:<TrendingUp size={16}/>, bg:fapAlerta?"#fffbeb":fap?.valor!=null?"#f0fdf4":"#fffbeb", bc:fapAlerta?"#fcd34d":fap?.valor!=null?"#86efac":"#fcd34d", ic:fapAlerta?C.amber:fap?.valor!=null?C.green:C.amber },
          { label:"Ocorrências CIPA+A", value:kpiAssedio, sub:"Assédio / Violência mapeados", icon:<Users size={16}/>, bg:kpiAssedio>0?"#fffbeb":"#f0fdf4", bc:kpiAssedio>0?"#fcd34d":"#86efac", ic:kpiAssedio>0?C.amber:C.green },
        ].map((k, i) => (
          <div key={i} style={{ background:k.bg, border:`1px solid ${k.bc}`, borderRadius:10, padding:"13px 15px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
              <p style={{ fontSize:10.5, color:C.muted, margin:0, lineHeight:1.3 }}>{k.label}</p>
              <span style={{ color:k.ic }}>{k.icon}</span>
            </div>
            <p style={{ fontSize:22, fontWeight:700, margin:"0 0 3px" }}>{k.value}</p>
            <p style={{ fontSize:10, color:C.muted, margin:0 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:14 }}>
        <Card>
          <SectionTitle>Nível de Risco por Setor</SectionTitle>
          {dadosSetor.length === 0
            ? <p style={{ fontSize:12, color:C.muted, textAlign:"center", padding:"30px 0" }}>Cadastre setores e preencha o levantamento para visualizar.</p>
            : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dadosSetor} layout="vertical" margin={{ left:8, right:20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize:10 }} />
                  <YAxis type="category" dataKey="setor" tick={{ fontSize:11 }} width={100} />
                  <Tooltip formatter={v => [v + " pts", "Risco"]} />
                  <Bar dataKey="nivel" radius={[0, 4, 4, 0]}>
                    {dadosSetor.map((e, i) => <Cell key={i} fill={e.nivel >= 70 ? "#dc2626" : e.nivel >= 50 ? "#d97706" : "#2d5382"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </Card>

        <Card>
          <SectionTitle>Fatores por Categoria</SectionTitle>
          {riscos.length === 0
            ? <p style={{ fontSize:12, color:C.muted, textAlign:"center", padding:"30px 0" }}>Sem dados ainda.</p>
            : <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={dadosCat.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value" paddingAngle={2}>
                      {dadosCat.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:4 }}>
                  {dadosCat.filter(d => d.value > 0).map((d, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:10.5 }}>
                      <span style={{ display:"flex", alignItems:"center", gap:5, color:C.muted }}>
                        <span style={{ width:8, height:8, borderRadius:2, background:PIE_COLORS[i % PIE_COLORS.length], display:"inline-block" }} />
                        {d.name}
                      </span>
                      <strong>{d.value}</strong>
                    </div>
                  ))}
                </div>
              </>
          }
        </Card>
      </div>
    </div>
  );
}
