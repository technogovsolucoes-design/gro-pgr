import { useState, useMemo } from "react";
import {
  FileText, Stethoscope, Send, Plus, Trash2, Edit2, AlertTriangle,
  CheckCircle, Clock, X, ClipboardList, RefreshCw,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { Btn, Card, Input } from "../components/ui";
import { C, EXAME_TIPOS, EXAME_RESULTADOS, CAT_TIPOS, ESOCIAL_EVENTOS } from "../constants";

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:12, padding:24, width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <p style={{ fontWeight:700, fontSize:15, margin:0 }}>{title}</p>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.gray }}><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Badge({ label, color, bg }) {
  return <span style={{ fontSize:10, fontWeight:600, color, background:bg, borderRadius:12, padding:"2px 8px", whiteSpace:"nowrap" }}>{label}</span>;
}

function asoStatus(dataVencimento) {
  if (!dataVencimento) return { label:"Sem data", color:C.gray, bg:"#f1f5f9" };
  const dias = Math.floor((new Date(dataVencimento + "T12:00:00") - new Date()) / 86400000);
  if (dias < 0)   return { label:"Vencido",          color:C.red,   bg:"#fee2e2" };
  if (dias <= 30) return { label:`Vence em ${dias}d`, color:C.amber, bg:"#fef3c7" };
  return               { label:"Válido",              color:C.green, bg:"#dcfce7" };
}

const VAZIO_EXAME = { funcionarioId:"", nomeFunc:"", tipo:"Periódico", resultado:"Apto", data:"", dataVencimento:"", medico:"", crm:"", observacoes:"" };
const VAZIO_CAT   = { funcionarioId:"", nomeFunc:"", tipo:"Acidente Típico", data:"", descricao:"", afastamento:false };

export default function PGR() {
  const {
    empresaAtiva, riscos, setores, funcionarios,
    exames, cats, salvarExame, excluirExame,
    registrarCAT, excluirCAT, atualizarStatusCAT,
    treinamentos,
  } = useApp();

  const [aba, setAba] = useState(0);

  // PCMSO modal
  const [exModal, setExModal]   = useState(false);
  const [exForm, setExForm]     = useState({ ...VAZIO_EXAME });
  const [exSaving, setExSaving] = useState(false);

  // CAT modal
  const [catModal, setCatModal]   = useState(false);
  const [catForm, setCatForm]     = useState({ ...VAZIO_CAT });
  const [catSaving, setCatSaving] = useState(false);

  // KPIs gerais
  const criticos   = riscos.filter(r => r.score >= 13).length;
  const relevantes = riscos.filter(r => r.score >= 7 && r.score < 13).length;
  const vencidos   = exames.filter(e => asoStatus(e.dataVencimento).label === "Vencido").length;
  const catsPend   = cats.filter(c => c.status === "Pendente").length;

  // PGR info compilado
  const pgrInfo = useMemo(() => {
    const setoresAtivos = setores.length;
    const riscosTotal   = riscos.length;
    const aetObrig      = riscos.filter(r => r.aet).length;
    return { setoresAtivos, riscosTotal, aetObrig };
  }, [riscos, setores]);

  // PCMSO: próximos vencimentos
  const proximosExames = useMemo(() => {
    return [...exames]
      .filter(e => e.dataVencimento)
      .sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento))
      .slice(0, 5);
  }, [exames]);

  // eSocial: completude
  const eSocialStatus = useMemo(() => {
    return ESOCIAL_EVENTOS.map(ev => {
      let ok = false;
      if (ev.id === "S-2210") ok = cats.length > 0;
      if (ev.id === "S-2220") ok = exames.length > 0;
      if (ev.id === "S-2240") ok = riscos.length > 0;
      if (ev.id === "S-2245") ok = treinamentos.length > 0;
      return { ...ev, ok };
    });
  }, [cats, exames, riscos, treinamentos]);

  // ── Handlers Exame ──
  function abrirExModal(ex = null) {
    setExForm(ex ? { ...VAZIO_EXAME, ...ex } : { ...VAZIO_EXAME });
    setExModal(true);
  }
  async function salvarEx() {
    if (!exForm.nomeFunc || !exForm.tipo) return;
    setExSaving(true);
    await salvarExame({ ...exForm });
    setExSaving(false);
    setExModal(false);
  }

  // ── Handlers CAT ──
  async function salvarCat() {
    if (!catForm.nomeFunc || !catForm.tipo) return;
    setCatSaving(true);
    await registrarCAT({ ...catForm });
    setCatSaving(false);
    setCatModal(false);
  }

  const sEX = (k, v) => setExForm(p => ({ ...p, [k]: v }));
  const sCAT = (k, v) => setCatForm(p => ({ ...p, [k]: v }));

  const TABS = ["PGR", "PCMSO", "eSocial SST"];

  return (
    <div>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Riscos Críticos/AET", val:criticos,   icon:<AlertTriangle size={18} color={C.red}/>,    bg:"#fef2f2" },
          { label:"Riscos Relevantes",   val:relevantes,  icon:<AlertTriangle size={18} color={C.amber}/>,  bg:"#fffbeb" },
          { label:"ASO Vencidos",        val:vencidos,    icon:<Stethoscope size={18} color={C.red}/>,      bg:"#fef2f2" },
          { label:"CATs Pendentes",      val:catsPend,    icon:<Send size={18} color={C.amber}/>,           bg:"#fffbeb" },
        ].map((k, i) => (
          <Card key={i} style={{ background:k.bg, border:"none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {k.icon}
              <div>
                <p style={{ fontSize:20, fontWeight:800, margin:0 }}>{k.val}</p>
                <p style={{ fontSize:10, color:C.muted, margin:0 }}>{k.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:16 }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setAba(i)} style={{ padding:"10px 16px", border:"none", background:"none", cursor:"pointer", fontSize:12, fontWeight:600, color:aba===i ? C.navyMid : C.gray, borderBottom:aba===i ? `2px solid ${C.navyMid}` : "2px solid transparent" }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab 0: PGR ── */}
      {aba === 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {/* Status do PGR */}
          <Card>
            <p style={{ fontWeight:700, fontSize:14, margin:"0 0 14px" }}>Programa de Gerenciamento de Riscos (NR-01)</p>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { label:"Empresa",              val:empresaAtiva?.razao || "—" },
                { label:"CNPJ",                 val:empresaAtiva?.cnpj  || "—" },
                { label:"CNAE",                 val:empresaAtiva?.cnae  || "—" },
                { label:"Grau de Risco",        val:`GR ${empresaAtiva?.grauRisco || "—"}` },
                { label:"Responsável Técnico",  val:empresaAtiva?.responsavel || "—" },
                { label:"Última Avaliação",     val:empresaAtiva?.dataAvaliacao || "—" },
                { label:"Setores Avaliados",    val:pgrInfo.setoresAtivos },
                { label:"Riscos Identificados", val:pgrInfo.riscosTotal },
                { label:"Requerem AET",         val:pgrInfo.aetObrig },
              ].map(({ label, val }, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${C.border}`, fontSize:12 }}>
                  <span style={{ color:C.muted }}>{label}</span>
                  <span style={{ fontWeight:600 }}>{val}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Distribuição de riscos */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Card>
              <p style={{ fontWeight:700, fontSize:14, margin:"0 0 12px" }}>Distribuição de Riscos</p>
              {[
                { label:"Catastrófico (17–25)", riscos: riscos.filter(r => r.score >= 17), color:"#991b1b", bg:"#fecaca" },
                { label:"Crítico (13–16)",       riscos: riscos.filter(r => r.score >= 13 && r.score < 17), color:C.red, bg:"#fee2e2" },
                { label:"Relevante (7–12)",      riscos: riscos.filter(r => r.score >= 7  && r.score < 13), color:C.amber, bg:"#fef3c7" },
                { label:"Tolerável (4–6)",       riscos: riscos.filter(r => r.score >= 4  && r.score < 7),  color:"#ca8a04", bg:"#fef9c3" },
                { label:"Aceitável (≤3)",        riscos: riscos.filter(r => r.score < 4),  color:C.green, bg:"#dcfce7" },
              ].map(({ label, riscos: r, color, bg }, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0" }}>
                  <span style={{ fontSize:11, color:C.muted }}>{label}</span>
                  <Badge label={r.length} color={color} bg={bg}/>
                </div>
              ))}
            </Card>

            <Card style={{ background:"#fffbeb", border:`1px solid #fde68a` }}>
              <p style={{ fontWeight:700, fontSize:12, margin:"0 0 6px", color:"#92400e" }}>Nota Regulatória</p>
              <p style={{ fontSize:11, color:"#92400e", margin:0, lineHeight:1.5 }}>
                Riscos psicossociais <strong>não devem ser enviados na Tabela 24 do eSocial (S-2240)</strong>.
                São essenciais para contestação de NTEP e compõem o PGR conforme NR-01 (2022).
              </p>
            </Card>

            <Card>
              <p style={{ fontWeight:700, fontSize:13, margin:"0 0 8px" }}>Top 5 Riscos Mais Críticos</p>
              {riscos.slice(0, 5).length === 0 ? (
                <p style={{ color:C.muted, fontSize:12 }}>Nenhum risco levantado.</p>
              ) : riscos.slice(0, 5).map((r, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom: i < 4 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ flex:1, marginRight:8 }}>
                    <p style={{ margin:0, fontSize:11, fontWeight:600 }}>{r.fator}</p>
                    <p style={{ margin:0, fontSize:10, color:C.muted }}>{r.setor}</p>
                  </div>
                  <Badge label={`${r.label} (${r.score})`} color={r.color} bg={r.bg}/>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── Tab 1: PCMSO ── */}
      {aba === 1 && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, alignItems:"start" }}>
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <p style={{ fontWeight:700, fontSize:14, margin:0 }}>Exames Médicos (NR-07 / ASO)</p>
              <Btn icon={<Plus size={13}/>} onClick={() => abrirExModal()}>Novo Exame</Btn>
            </div>
            <Card style={{ padding:0, overflow:"hidden" }}>
              {exames.length === 0 ? (
                <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 20px" }}>Nenhum exame registrado.</p>
              ) : (
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ background:C.bg }}>
                      {["Funcionário","Tipo","Data","Vencimento","Resultado","Status",""].map((h, i) => (
                        <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exames.map(e => {
                      const st = asoStatus(e.dataVencimento);
                      return (
                        <tr key={e.id} style={{ borderTop:`1px solid ${C.border}` }}>
                          <td style={{ padding:"9px 10px", fontWeight:500 }}>{e.nomeFunc || "—"}</td>
                          <td style={{ padding:"9px 10px" }}><Badge label={e.tipo} color={C.navyMid} bg="#eff6ff"/></td>
                          <td style={{ padding:"9px 10px", color:C.muted }}>{e.data ? new Date(e.data + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                          <td style={{ padding:"9px 10px", color:C.muted }}>{e.dataVencimento ? new Date(e.dataVencimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                          <td style={{ padding:"9px 10px" }}>
                            <Badge
                              label={e.resultado || "—"}
                              color={e.resultado === "Apto" ? C.green : e.resultado === "Inapto" ? C.red : C.amber}
                              bg={e.resultado === "Apto" ? "#dcfce7" : e.resultado === "Inapto" ? "#fee2e2" : "#fef3c7"}
                            />
                          </td>
                          <td style={{ padding:"9px 10px" }}><Badge {...st}/></td>
                          <td style={{ padding:"9px 10px" }}>
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={() => abrirExModal(e)} style={{ background:"none", border:"none", cursor:"pointer", color:C.navyMid }}><Edit2 size={14}/></button>
                              <button onClick={() => { if (confirm("Excluir este exame?")) excluirExame(e.id); }} style={{ background:"none", border:"none", cursor:"pointer", color:C.red }}><Trash2 size={14}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          </div>

          {/* Próximos Vencimentos */}
          <Card>
            <p style={{ fontWeight:700, fontSize:14, margin:"0 0 12px" }}>Próximos Vencimentos de ASO</p>
            {proximosExames.length === 0 ? (
              <p style={{ color:C.muted, fontSize:12 }}>Sem vencimentos próximos.</p>
            ) : proximosExames.map((e, i) => {
              const st = asoStatus(e.dataVencimento);
              return (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom: i < proximosExames.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div>
                    <p style={{ margin:0, fontSize:12, fontWeight:600 }}>{e.nomeFunc}</p>
                    <p style={{ margin:0, fontSize:10, color:C.muted }}>{e.tipo} · {e.data ? new Date(e.data + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</p>
                  </div>
                  <Badge {...st}/>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* ── Tab 2: eSocial SST ── */}
      {aba === 2 && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {/* Checklist de eventos */}
          <Card>
            <p style={{ fontWeight:700, fontSize:14, margin:"0 0 14px" }}>Status dos Eventos eSocial SST</p>
            {eSocialStatus.map((ev, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 0", borderBottom: i < eSocialStatus.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ flexShrink:0, marginTop:2 }}>
                  {ev.ok
                    ? <CheckCircle size={16} color={C.green}/>
                    : <Clock size={16} color={C.amber}/>}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:12, fontWeight:600 }}>{ev.nome}</p>
                  <p style={{ margin:0, fontSize:10, color:C.muted, marginTop:2 }}>Prazo: {ev.prazo}</p>
                </div>
                <Badge label={ev.ok ? "Com dados" : "Sem dados"} color={ev.ok ? C.green : C.amber} bg={ev.ok ? "#dcfce7" : "#fef3c7"}/>
              </div>
            ))}
          </Card>

          {/* CAT */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <p style={{ fontWeight:700, fontSize:14, margin:0 }}>CAT — Comunicação de Acidente (S-2210)</p>
              <Btn icon={<Plus size={13}/>} onClick={() => { setCatForm({ ...VAZIO_CAT }); setCatModal(true); }}>Nova CAT</Btn>
            </div>
            <Card style={{ padding:0, overflow:"hidden" }}>
              {cats.length === 0 ? (
                <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"24px 20px" }}>Nenhuma CAT registrada.</p>
              ) : (
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ background:C.bg }}>
                      {["Funcionário","Tipo","Data","Status","Protocolo",""].map((h, i) => (
                        <th key={i} style={{ padding:"7px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cats.map(c => (
                      <tr key={c.id} style={{ borderTop:`1px solid ${C.border}` }}>
                        <td style={{ padding:"8px 10px", fontWeight:500 }}>{c.nomeFunc || "—"}</td>
                        <td style={{ padding:"8px 10px" }}>{c.tipo}</td>
                        <td style={{ padding:"8px 10px", color:C.muted }}>{c.data?.toDate ? c.data.toDate().toLocaleDateString("pt-BR") : "—"}</td>
                        <td style={{ padding:"8px 10px" }}>
                          <Badge
                            label={c.status}
                            color={c.status === "Enviado" ? C.green : c.status === "Pendente" ? C.amber : C.navyMid}
                            bg={c.status === "Enviado" ? "#dcfce7" : c.status === "Pendente" ? "#fef3c7" : "#eff6ff"}
                          />
                        </td>
                        <td style={{ padding:"8px 10px", color:C.muted, fontSize:11 }}>{c.protocolo || "—"}</td>
                        <td style={{ padding:"8px 10px" }}>
                          <div style={{ display:"flex", gap:4 }}>
                            {c.status === "Pendente" && (
                              <button
                                onClick={() => {
                                  const prot = prompt("Protocolo eSocial (opcional):", "");
                                  if (prot !== null) atualizarStatusCAT(c.id, "Enviado", prot);
                                }}
                                title="Marcar como enviado"
                                style={{ background:"none", border:"none", cursor:"pointer", color:C.green }}
                              >
                                <Send size={13}/>
                              </button>
                            )}
                            <button onClick={() => { if (confirm("Excluir esta CAT?")) excluirCAT(c.id); }} style={{ background:"none", border:"none", cursor:"pointer", color:C.red }}><Trash2 size={13}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── Modal Exame ── */}
      {exModal && (
        <Modal title={exForm.id ? "Editar Exame" : "Novo Exame Médico"} onClose={() => setExModal(false)}>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Funcionário <span style={{ color:C.red }}>*</span></p>
            {funcionarios.length > 0 ? (
              <select
                value={exForm.funcionarioId}
                onChange={e => {
                  const f = funcionarios.find(f => f.id === e.target.value);
                  sEX("funcionarioId", e.target.value);
                  sEX("nomeFunc", f?.nome || "");
                }}
                style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}
              >
                <option value="">Selecione o funcionário…</option>
                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            ) : (
              <Input value={exForm.nomeFunc} onChange={v => sEX("nomeFunc", v)} placeholder="Nome do funcionário"/>
            )}
          </div>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Tipo de Exame</p>
            <select value={exForm.tipo} onChange={e => sEX("tipo", e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
              {EXAME_TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Data do Exame" value={exForm.data} onChange={v => sEX("data", v)} type="date" required/>
            <Input label="Data Vencimento ASO" value={exForm.dataVencimento} onChange={v => sEX("dataVencimento", v)} type="date"/>
          </div>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Resultado</p>
            <select value={exForm.resultado} onChange={e => sEX("resultado", e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
              {EXAME_RESULTADOS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <Input label="Médico Responsável" value={exForm.medico} onChange={v => sEX("medico", v)}/>
          <Input label="CRM" value={exForm.crm} onChange={v => sEX("crm", v)}/>
          <Input label="Observações" value={exForm.observacoes} onChange={v => sEX("observacoes", v)}/>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn outline onClick={() => setExModal(false)}>Cancelar</Btn>
            <Btn disabled={!exForm.nomeFunc || exSaving} onClick={salvarEx}>{exSaving ? "Salvando…" : "Salvar"}</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal CAT ── */}
      {catModal && (
        <Modal title="Registrar CAT — S-2210" onClose={() => setCatModal(false)}>
          <div style={{ background:"#fef2f2", border:`1px solid #fca5a5`, borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:11, color:"#991b1b" }}>
            <strong>Prazo legal:</strong> A CAT deve ser comunicada até o 1º dia útil seguinte ao acidente. Em caso de morte: imediatamente.
          </div>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Funcionário Acidentado <span style={{ color:C.red }}>*</span></p>
            {funcionarios.length > 0 ? (
              <select
                value={catForm.funcionarioId}
                onChange={e => {
                  const f = funcionarios.find(f => f.id === e.target.value);
                  sCAT("funcionarioId", e.target.value);
                  sCAT("nomeFunc", f?.nome || "");
                }}
                style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}
              >
                <option value="">Selecione…</option>
                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            ) : (
              <Input value={catForm.nomeFunc} onChange={v => sCAT("nomeFunc", v)} placeholder="Nome do funcionário"/>
            )}
          </div>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Tipo</p>
            <select value={catForm.tipo} onChange={e => sCAT("tipo", e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
              {CAT_TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <Input label="Data do Acidente" value={catForm.data} onChange={v => sCAT("data", v)} type="date" required/>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Descrição do Ocorrido</p>
            <textarea
              value={catForm.descricao}
              onChange={e => sCAT("descricao", e.target.value)}
              rows={3}
              placeholder="Descreva como ocorreu o acidente…"
              style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}
            />
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn outline onClick={() => setCatModal(false)}>Cancelar</Btn>
            <Btn disabled={!catForm.nomeFunc || catSaving} onClick={salvarCat}>{catSaving ? "Salvando…" : "Registrar CAT"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
