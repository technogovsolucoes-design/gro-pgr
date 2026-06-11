import { FileText, Printer, Shield, Clock, CheckSquare } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Btn, Card, SectionTitle, Badge } from "../components/ui";
import { C } from "../constants";
import { exportarRelatorio } from "../utils";

const ACOES = {
  "Demanda e Carga de Trabalho":      "Revisão de carga horária + rodízio de funções + monitoramento eSocial S-2220",
  "Controle e Autonomia":             "Gestão participativa + metodologias ágeis + autonomia de processos",
  "Suporte Social e Relações":        "Canal CIPA+A + treinamento de liderança + política anti-assédio",
  "Reconhecimento e Recompensa":      "Programa de reconhecimento + revisão salarial + plano de carreira",
  "Interface Trabalho-Vida Privada":  "Política de desconexão digital + controle de jornada via ERP",
  "Organização e Cultura":            "Diagnóstico organizacional + coaching + política de saúde mental",
  "Conteúdo e Significado do Trabalho":"Redesenho de tarefas + suporte psicológico + rotação de funções",
};

const BASE_NORMATIVA = [
  { title:"Base Normativa — PGR/GRO", items:[
    "NR-01 (2022) — Inventário de Riscos Ocupacionais",
    "NR-17 — Ergonomia (AET)",
    "ISO 45003:2021 — Saúde Psicológica no Trabalho",
    "eSocial S-2220 — Monitoramento da Saúde",
    "Lei 14.457/2022 — CIPA+A",
  ]},
  { title:"Base Normativa — NTEP / FAP", items:[
    "Decreto 3.048/99 — Regulamento Previdenciário",
    "IN INSS 77/2015 — Nexo Técnico Epidemiológico",
    "Resolução CNPS 1.316/2010 — FAP",
    "CID-10 Grupos F41, F43, F48",
    "Súmula 736 STF — Responsabilidade do empregador",
  ]},
];

export default function PlanoAcao({ onNavigate }) {
  const { riscos, setores, empresaAtiva, user, userProfile } = useApp();
  const nome   = userProfile?.nome || user?.email || "";
  const perfil = userProfile?.perfil || "";

  const exportar = (tipo) => exportarRelatorio(tipo, empresaAtiva, riscos, nome, perfil);

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <Btn onClick={() => exportar("Anexo GRO — Plano de Ação PGR")} color={C.navyMid} icon={<Printer size={13} />}>Gerar Anexo GRO / PGR</Btn>
        <Btn onClick={() => exportar("Subsídios de Defesa — Nexo Técnico (NTEP)")} color="#7c3aed" icon={<Shield size={13} />}>Subsídios Defesa NTEP</Btn>
        <Btn onClick={() => exportar("Encaminhamento ao PCMSO — Riscos Psicossociais")} color="#0f766e" icon={<FileText size={13} />}>Encaminhar ao PCMSO</Btn>
      </div>

      {riscos.length === 0 ? (
        <div style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:8, padding:"20px", fontSize:12, color:"#92400e", textAlign:"center" }}>
          Sem riscos mapeados. Preencha o{" "}
          <button onClick={() => onNavigate(3)} style={{ background:"none", border:"none", color:C.navyMid, cursor:"pointer", fontWeight:600, fontFamily:"inherit", fontSize:12 }}>Levantamento</button>{" "}
          para gerar o plano automaticamente.
        </div>
      ) : (
        <Card>
          <SectionTitle><FileText size={14} /> Plano de Ação — Gerado Automaticamente</SectionTitle>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead>
                <tr style={{ background:C.navy }}>
                  {["Fator de Risco","Setor","Classificação","Medida de Controle Recomendada","Responsável","Prazo","AET"].map(h => (
                    <th key={h} style={{ padding:"8px 10px", textAlign:"left", color:"#e2e8f0", fontWeight:500, fontSize:10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {riscos.map((r, i) => {
                  const resp = setores.find(s => s.nome === r.setor)?.responsavel || "SESMT";
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.white : C.bg, borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:"8px 10px", fontWeight:500, maxWidth:200 }}>{r.fator}</td>
                      <td style={{ padding:"8px 10px" }}>{r.setor}</td>
                      <td style={{ padding:"8px 10px" }}><Badge label={r.label} color={r.color} bg={r.bg} /></td>
                      <td style={{ padding:"8px 10px", lineHeight:1.4, maxWidth:220 }}>{ACOES[r.cat] || "Avaliação ergonômica + medidas administrativas"}</td>
                      <td style={{ padding:"8px 10px", color:C.muted }}>{resp}</td>
                      <td style={{ padding:"8px 10px" }}>
                        <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color: r.aet ? C.red : C.text, fontWeight: r.aet ? 700 : 400 }}>
                          <Clock size={10} />{r.aet ? "Imediato" : r.score >= 7 ? "60 dias" : "90 dias"}
                        </span>
                      </td>
                      <td style={{ padding:"8px 10px" }}>
                        {r.aet
                          ? <span style={{ color:C.red, fontWeight:700, fontSize:10 }}>✔ AET</span>
                          : <span style={{ color:C.muted, fontSize:10 }}>PGR</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:16 }}>
        {BASE_NORMATIVA.map(c => (
          <Card key={c.title}>
            <SectionTitle>{c.title}</SectionTitle>
            {c.items.map(it => (
              <div key={it} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:7 }}>
                <CheckSquare size={11} color={C.navyMid} style={{ flexShrink:0, marginTop:2 }} />
                <span style={{ fontSize:11.5, color:C.muted }}>{it}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}
