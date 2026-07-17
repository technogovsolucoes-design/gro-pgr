import { useApp } from "../../context/AppContext";
import { Btn, Card } from "../../components/ui";
import { C, ESOCIAL_EVENTOS } from "../../constants";

function Badge({ label, color, bg }) {
  return <span style={{ fontSize:10, fontWeight:600, color, background:bg, borderRadius:12, padding:"2px 8px", whiteSpace:"nowrap" }}>{label}</span>;
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ background:C.navyMid, color:C.white, padding:"8px 16px", borderRadius:"8px 8px 0 0", fontWeight:700, fontSize:12 }}>
        {title}
      </div>
      <div style={{ border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 8px 8px", padding:16, background:C.white }}>
        {children}
      </div>
    </div>
  );
}

function Linha({ label, valor, destaque }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
      <span style={{ fontSize:12, color:C.muted }}>{label}</span>
      <span style={{ fontSize:12, fontWeight: destaque ? 700 : 500, color: destaque ? C.navyMid : C.text }}>{valor ?? "—"}</span>
    </div>
  );
}

export default function PainelContador() {
  const { userProfile, empresaAtiva, funcionarios, riscos, cats, exames, treinamentos } = useApp();

  const perfil = userProfile?.perfil;
  if (perfil !== "Admin" && perfil !== "Contador") {
    return (
      <Card style={{ textAlign:"center", padding:48 }}>
        <p style={{ fontSize:32 }}>🔒</p>
        <p style={{ fontWeight:700, fontSize:16, color:C.text, margin:"0 0 8px" }}>Acesso Restrito</p>
        <p style={{ fontSize:12, color:C.muted, margin:0 }}>Este painel é exclusivo para Administradores e Contadores.</p>
      </Card>
    );
  }

  const hoje = new Date();
  const dataRelatorio = hoje.toLocaleDateString("pt-BR");

  const examesVencidos = exames.filter(e => {
    if (!e.dataVencimento) return false;
    return new Date(e.dataVencimento + "T12:00:00") < hoje;
  }).length;

  const catsPendentes = cats.filter(c => c.status !== "Enviado").length;

  // Histórico fictício baseado em CATs enviadas
  const historicoEnvios = [
    ...cats.filter(c => c.status === "Enviado").map(c => ({
      evento: "S-2210 — CAT",
      dataEnvio: c.updatedAt ? new Date(c.updatedAt.seconds * 1000).toLocaleDateString("pt-BR") : "—",
      protocolo: c.protocolo || "Sem protocolo",
      status: "Enviado",
    })),
    ...exames.filter(e => e.statusESocial === "Aprovado" || e.statusESocial === "Enviado").slice(0, 3).map(e => ({
      evento: "S-2220 — ASO",
      dataEnvio: "—",
      protocolo: "—",
      status: e.statusESocial,
    })),
    ...treinamentos.filter(t => t.statusESocial === "Enviado" || t.statusESocial === "Aprovado").slice(0, 3).map(t => ({
      evento: "S-2245 — Treinamento",
      dataEnvio: "—",
      protocolo: "—",
      status: t.statusESocial,
    })),
  ];

  function imprimir() {
    window.print();
  }

  const eventosStatus = ESOCIAL_EVENTOS.map(ev => {
    let contagem = 0;
    let pendentes = 0;
    if (ev.id === "S-2210") { contagem = cats.length; pendentes = catsPendentes; }
    if (ev.id === "S-2220") { contagem = exames.length; pendentes = exames.filter(e => !e.statusESocial || e.statusESocial === "Não enviado").length; }
    if (ev.id === "S-2240") { contagem = riscos.length; pendentes = 0; }
    if (ev.id === "S-2245") { contagem = treinamentos.length; pendentes = treinamentos.filter(t => !t.statusESocial || t.statusESocial === "Não enviado").length; }
    return { ...ev, contagem, pendentes };
  });

  return (
    <div>
      {/* Cabeçalho Formal */}
      <div style={{ background:C.navyMid, color:C.white, borderRadius:10, padding:"20px 24px", marginBottom:24, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <p style={{ fontWeight:800, fontSize:16, margin:0 }}>Relatório para Contador</p>
          <p style={{ fontSize:12, margin:"4px 0 0", opacity:0.85 }}>{empresaAtiva?.razao || "Empresa não selecionada"}</p>
          <p style={{ fontSize:11, margin:"2px 0 0", opacity:0.7 }}>Emitido em: {dataRelatorio}</p>
        </div>
        <Btn onClick={imprimir} style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)" }}>
          Imprimir Relatório
        </Btn>
      </div>

      {/* Resumo Executivo */}
      <Section title="1. Resumo Executivo da Empresa">
        <Linha label="Razão Social"         valor={empresaAtiva?.razao}          destaque/>
        <Linha label="CNPJ"                 valor={empresaAtiva?.cnpj}/>
        <Linha label="CNAE"                 valor={empresaAtiva?.cnae}/>
        <Linha label="Grau de Risco"        valor={empresaAtiva?.grauRisco ? `Grau ${empresaAtiva.grauRisco}` : "—"}/>
        <Linha label="Total de Funcionários" valor={funcionarios.length}          destaque/>
        <Linha label="Total de Riscos (PGR)" valor={riscos.length}/>
        <Linha label="CATs Pendentes de Envio" valor={catsPendentes} destaque={catsPendentes > 0}/>
        <Linha label="Exames Vencidos"      valor={examesVencidos} destaque={examesVencidos > 0}/>
      </Section>

      {/* Pendências eSocial */}
      <Section title="2. Pendências eSocial SST">
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ background:C.bg }}>
              {["Evento","Descrição","Prazo","Registros","Pendentes","Status"].map((h, i) => (
                <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {eventosStatus.map(ev => (
              <tr key={ev.id} style={{ borderTop:`1px solid ${C.border}` }}>
                <td style={{ padding:"9px 10px", fontWeight:700, color:C.navyMid }}>{ev.id}</td>
                <td style={{ padding:"9px 10px" }}>{ev.nome.split(" — ")[1]}</td>
                <td style={{ padding:"9px 10px", fontSize:11, color:C.muted }}>{ev.prazo}</td>
                <td style={{ padding:"9px 10px" }}>{ev.contagem}</td>
                <td style={{ padding:"9px 10px" }}>
                  {ev.pendentes > 0
                    ? <Badge label={`${ev.pendentes} pendente(s)`} color={C.amber} bg="#fef3c7"/>
                    : <Badge label="Em dia" color={C.green} bg="#dcfce7"/>}
                </td>
                <td style={{ padding:"9px 10px" }}>
                  {ev.pendentes > 0
                    ? <Badge label="Atenção" color={C.red} bg="#fee2e2"/>
                    : <Badge label="Regular" color={C.green} bg="#dcfce7"/>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Histórico de Envios */}
      <Section title="3. Histórico de Envios">
        {historicoEnvios.length === 0 ? (
          <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"16px 0" }}>Nenhum envio registrado com protocolo.</p>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {["Evento","Data de Envio","Protocolo","Status"].map((h, i) => (
                  <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historicoEnvios.map((h, i) => (
                <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                  <td style={{ padding:"9px 10px", fontWeight:600 }}>{h.evento}</td>
                  <td style={{ padding:"9px 10px" }}>{h.dataEnvio}</td>
                  <td style={{ padding:"9px 10px", color:C.muted, fontFamily:"monospace", fontSize:11 }}>{h.protocolo}</td>
                  <td style={{ padding:"9px 10px" }}>
                    <Badge label={h.status} color={h.status === "Aprovado" ? C.green : C.navyMid} bg={h.status === "Aprovado" ? "#dcfce7" : "#eff6ff"}/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Nota de rodapé */}
      <div style={{ textAlign:"center", padding:"16px 0", borderTop:`1px solid ${C.border}`, fontSize:10, color:C.muted }}>
        Relatório gerado automaticamente pelo sistema NEXUS SST em {dataRelatorio} •
        As informações refletem os dados registrados no sistema até a data de emissão.
      </div>
    </div>
  );
}
