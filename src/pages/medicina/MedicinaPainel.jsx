import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Card } from "../../components/ui";
import { C } from "../../constants";
import { Stethoscope, Calendar, Users, AlertTriangle, Bell, ClipboardList, FileText, Activity } from "lucide-react";

export default function MedicinaPainel({ onNavigate }) {
  const { empresaAtiva, exames } = useApp();
  const [vacinas, setVacinas] = useState([]);
  const [consultas, setConsultas] = useState([]);

  useEffect(() => {
    if (!empresaAtiva?.id) return;
    const unsub = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "vacinas"), orderBy("dataProximaDose")),
      snap => setVacinas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [empresaAtiva?.id]);

  useEffect(() => {
    if (!empresaAtiva?.id) return;
    const unsub = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "consultas"), orderBy("data")),
      snap => setConsultas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [empresaAtiva?.id]);

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const in30Days = new Date(today); in30Days.setDate(in30Days.getDate() + 30);

  const examesVencidos = (exames || []).filter(e => e.dataVencimento && new Date(e.dataVencimento) < today);
  const examesMes = (exames || []).filter(e => {
    if (!e.dataVencimento) return false;
    const d = new Date(e.dataVencimento);
    return d >= startOfMonth && d <= endOfMonth;
  });
  const vacinasProximas = vacinas.filter(v => v.dataProximaDose && new Date(v.dataProximaDose) <= in30Days && new Date(v.dataProximaDose) >= today);

  const proximosVencimentos = [...(exames || [])]
    .filter(e => e.dataVencimento && new Date(e.dataVencimento) >= today)
    .sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento))
    .slice(0, 5);

  const kpis = [
    { label: "Total Funcionários", value: new Set((exames || []).map(e => e.funcionarioNome)).size, icon: Users, color: C.navyMid },
    { label: "ASOs Vencidos", value: examesVencidos.length, icon: AlertTriangle, color: C.red },
    { label: "Exames no Mês", value: examesMes.length, icon: ClipboardList, color: C.blue },
    { label: "Vacinas Próximas", value: vacinasProximas.length, icon: Bell, color: C.amber },
  ];

  const modulos = [
    { label: "Agenda Médica", icon: Calendar, key: "agenda", color: C.blue },
    { label: "Prontuários", icon: FileText, key: "prontuarios", color: C.navyMid },
    { label: "Audiometria", icon: Activity, key: "audiometria", color: C.green },
    { label: "Vacinação", icon: Bell, key: "vacinacao", color: C.amber },
    { label: "Convocações", icon: Stethoscope, key: "convocacoes", color: C.gray },
  ];

  const fmtDate = s => s ? new Date(s + "T00:00:00").toLocaleDateString("pt-BR") : "-";

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <Stethoscope size={24} color={C.navyMid} />
        <h2 style={{ margin: 0, color: C.navy, fontSize: 22, fontWeight: 700 }}>Medicina do Trabalho</h2>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        {kpis.map(k => (
          <Card key={k.label} style={{ padding: 20, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ background: k.color + "18", borderRadius: 10, padding: 10, display: "flex" }}>
              <k.icon size={22} color={k.color} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</p>
              <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{k.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Próximos Vencimentos */}
      <Card style={{ marginBottom: 28 }}>
        <div style={{ padding: "16px 20px 0" }}>
          <p style={{ fontWeight: 700, color: C.navy, margin: 0, marginBottom: 14, fontSize: 14 }}>Próximos Vencimentos de ASO</p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {["Funcionário", "Tipo", "Vencimento", "Status"].map(h => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proximosVencimentos.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 16, color: C.muted, textAlign: "center" }}>Nenhum vencimento próximo</td></tr>
              ) : proximosVencimentos.map(e => {
                const diff = Math.ceil((new Date(e.dataVencimento) - today) / 86400000);
                const cor = diff <= 7 ? C.red : diff <= 30 ? C.amber : C.green;
                return (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 16px", fontWeight: 500 }}>{e.funcionarioNome || "-"}</td>
                    <td style={{ padding: "10px 16px", color: C.muted }}>{e.tipo || "-"}</td>
                    <td style={{ padding: "10px 16px" }}>{fmtDate(e.dataVencimento)}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ background: cor + "20", color: cor, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                        {diff <= 0 ? "Vencido" : `${diff} dias`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Acesso Rápido */}
      <p style={{ fontWeight: 700, color: C.navy, marginBottom: 14, fontSize: 14 }}>Acesso Rápido</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
        {modulos.map(m => (
          <Card
            key={m.key}
            style={{ padding: 20, cursor: "pointer", textAlign: "center", transition: "box-shadow .2s" }}
            onClick={() => onNavigate && onNavigate(m.key)}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <div style={{ background: m.color + "18", borderRadius: 10, padding: 10 }}>
                <m.icon size={22} color={m.color} />
              </div>
            </div>
            <p style={{ margin: 0, fontWeight: 600, color: C.text, fontSize: 13 }}>{m.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
