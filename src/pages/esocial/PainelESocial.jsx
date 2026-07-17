import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C, ESOCIAL_EVENTOS } from "../../constants";
import { db } from "../../firebase";
import { updateDoc, doc } from "firebase/firestore";

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:12, padding:24, width:"100%", maxWidth:500, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <p style={{ fontWeight:700, fontSize:15, margin:0 }}>{title}</p>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Badge({ label, color, bg }) {
  return <span style={{ fontSize:10, fontWeight:600, color, background:bg, borderRadius:12, padding:"2px 8px", whiteSpace:"nowrap" }}>{label}</span>;
}

function statusESocialBadge(status) {
  if (status === "Aprovado")  return { color:C.green, bg:"#dcfce7" };
  if (status === "Enviado")   return { color:C.navyMid, bg:"#eff6ff" };
  return                             { color:C.amber, bg:"#fef3c7" };
}

const TABS = [
  { key:"eventos",  label:"Eventos SST" },
  { key:"cat",      label:"CAT (S-2210)" },
  { key:"s2220",    label:"S-2220 (ASO)" },
  { key:"s2240",    label:"S-2240" },
  { key:"s2245",    label:"S-2245" },
];

function tabIndexFromKey(key) {
  return TABS.findIndex(t => t.key === key);
}

const CAT_VAZIO = { funcionario:"", tipo:"Acidente Típico", dataAcidente:"", descricao:"", parteAtingida:"" };
const CAT_TIPOS = ["Acidente Típico","Acidente de Trajeto","Doença Ocupacional"];

export default function PainelESocial({ defaultTab }) {
  const { cats, exames, riscos, treinamentos, atualizarStatusCAT, excluirCAT, registrarCAT, funcionarios, empresaAtiva } = useApp();

  const initIdx = defaultTab ? Math.max(tabIndexFromKey(defaultTab), 0) : 0;
  const [abaIdx, setAbaIdx]     = useState(initIdx);
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm]   = useState({ ...CAT_VAZIO });
  const [prot, setProt]         = useState({ id:"", value:"" });
  const [protModal, setProtModal] = useState(false);
  const [s2240Form, setS2240Form] = useState({ descricao:"", dataEnvio:"" });
  const [s2240List, setS2240List] = useState([]);
  const [saving, setSaving]     = useState(false);

  const aba = TABS[abaIdx].key;
  const sf = (k, v) => setCatForm(p => ({ ...p, [k]: v }));

  async function salvarCAT() {
    if (!catForm.funcionario || !catForm.dataAcidente) return;
    setSaving(true);
    await registrarCAT(catForm);
    setSaving(false);
    setCatModal(false);
    setCatForm({ ...CAT_VAZIO });
  }

  function abrirProtocolo(cat) {
    setProt({ id: cat.id, value: cat.protocolo || "" });
    setProtModal(true);
  }

  async function confirmarEnvioCAT() {
    await atualizarStatusCAT(prot.id, "Enviado", prot.value);
    setProtModal(false);
  }

  async function atualizarStatusESocial(colecao, itemId, status) {
    if (!empresaAtiva) return;
    await updateDoc(doc(db, "empresas", empresaAtiva.id, colecao, itemId), { statusESocial: status });
  }

  function adicionarS2240() {
    if (!s2240Form.descricao || !s2240Form.dataEnvio) return;
    setS2240List(p => [...p, { ...s2240Form, id: Date.now() }]);
    setS2240Form({ descricao:"", dataEnvio:"" });
  }

  const statusESocialOpts = ["Não enviado","Enviado","Aprovado"];

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:20, overflowX:"auto" }}>
        {TABS.map((t, i) => (
          <button key={t.key} onClick={() => setAbaIdx(i)}
            style={{ padding:"10px 16px", border:"none", background:"none", cursor:"pointer", fontSize:12, fontWeight:600,
              color: abaIdx===i ? C.navyMid : C.gray, borderBottom: abaIdx===i ? `2px solid ${C.navyMid}` : "2px solid transparent",
              whiteSpace:"nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Eventos SST ── */}
      {aba === "eventos" && (
        <div>
          <p style={{ fontWeight:700, fontSize:14, margin:"0 0 16px" }}>Painel Unificado eSocial SST</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {[
              { ev: ESOCIAL_EVENTOS[0], count: cats.length,        tabKey:"cat",   icone:"🔴" },
              { ev: ESOCIAL_EVENTOS[1], count: exames.length,      tabKey:"s2220", icone:"🟢" },
              { ev: ESOCIAL_EVENTOS[2], count: riscos.length,      tabKey:"s2240", icone:"🔵" },
              { ev: ESOCIAL_EVENTOS[3], count: treinamentos.length, tabKey:"s2245", icone:"🟡" },
            ].map(({ ev, count, tabKey, icone }) => (
              <Card key={ev.id} style={{ borderLeft:`4px solid ${C.navyMid}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div>
                    <p style={{ fontWeight:700, fontSize:13, margin:0 }}>{icone} {ev.id}</p>
                    <p style={{ fontSize:11, color:C.muted, margin:"2px 0 0" }}>{ev.nome.split(" — ")[1]}</p>
                  </div>
                  <span style={{ fontSize:24, fontWeight:800, color:C.navyMid }}>{count}</span>
                </div>
                <p style={{ fontSize:10, color:C.muted, margin:"0 0 10px", background:C.bg, padding:"4px 8px", borderRadius:6 }}>
                  Prazo: {ev.prazo}
                </p>
                <Btn small onClick={() => setAbaIdx(tabIndexFromKey(tabKey))}>Ver detalhes</Btn>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: CAT (S-2210) ── */}
      {aba === "cat" && (
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <p style={{ fontWeight:700, fontSize:14, margin:0 }}>CAT — S-2210</p>
              <p style={{ fontSize:11, color:C.muted, margin:"2px 0 0" }}>Comunicação de Acidente de Trabalho • Prazo: até o 1º dia útil seguinte</p>
            </div>
            <Btn onClick={() => setCatModal(true)}>+ Nova CAT</Btn>
          </div>
          {cats.length === 0 ? (
            <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>Nenhuma CAT registrada.</p>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:C.bg }}>
                  {["Funcionário","Tipo","Data Acidente","Status","Protocolo","Ações"].map((h, i) => (
                    <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cats.map(cat => {
                  const enviada = cat.status === "Enviado";
                  return (
                    <tr key={cat.id} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"9px 10px", fontWeight:600 }}>{cat.funcionario}</td>
                      <td style={{ padding:"9px 10px" }}>{cat.tipo}</td>
                      <td style={{ padding:"9px 10px" }}>{cat.dataAcidente ? new Date(cat.dataAcidente + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                      <td style={{ padding:"9px 10px" }}>
                        <Badge label={cat.status || "Pendente"} color={enviada ? C.green : C.amber} bg={enviada ? "#dcfce7" : "#fef3c7"}/>
                      </td>
                      <td style={{ padding:"9px 10px", color:C.muted }}>{cat.protocolo || "—"}</td>
                      <td style={{ padding:"9px 10px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          {!enviada && (
                            <button onClick={() => abrirProtocolo(cat)}
                              style={{ background:"#eff6ff", border:`1px solid #bfdbfe`, borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:11, color:C.navyMid, fontWeight:600 }}>
                              Marcar como enviado
                            </button>
                          )}
                          <button onClick={() => { if (confirm("Excluir esta CAT?")) excluirCAT(cat.id); }}
                            style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:11, fontWeight:600 }}>
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ── Tab: S-2220 (ASO) ── */}
      {aba === "s2220" && (
        <Card>
          <div style={{ marginBottom:14 }}>
            <p style={{ fontWeight:700, fontSize:14, margin:0 }}>S-2220 — Monitoramento da Saúde do Trabalhador (ASO)</p>
            <p style={{ fontSize:11, color:C.muted, margin:"2px 0 0" }}>Prazo: até dia 15 do mês seguinte</p>
          </div>
          {exames.length === 0 ? (
            <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>Nenhum exame registrado. Cadastre exames no módulo PCMSO.</p>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:C.bg }}>
                  {["Funcionário","Tipo","Data","Resultado","Status eSocial","Ação"].map((h, i) => (
                    <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exames.map(ex => {
                  const st = ex.statusESocial || "Não enviado";
                  const bd = statusESocialBadge(st);
                  return (
                    <tr key={ex.id} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"9px 10px", fontWeight:600 }}>{ex.funcionario || ex.funcionarioNome || "—"}</td>
                      <td style={{ padding:"9px 10px" }}>{ex.tipo || "—"}</td>
                      <td style={{ padding:"9px 10px" }}>{ex.data?.seconds ? new Date(ex.data.seconds * 1000).toLocaleDateString("pt-BR") : ex.data ? new Date(ex.data + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                      <td style={{ padding:"9px 10px" }}>{ex.resultado || "—"}</td>
                      <td style={{ padding:"9px 10px" }}><Badge label={st} {...bd}/></td>
                      <td style={{ padding:"9px 10px" }}>
                        <select value={st} onChange={e => atualizarStatusESocial("exames", ex.id, e.target.value)}
                          style={{ padding:"5px 8px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:11, fontFamily:"inherit", cursor:"pointer" }}>
                          {statusESocialOpts.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ── Tab: S-2240 ── */}
      {aba === "s2240" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card style={{ borderLeft:`4px solid ${C.amber}`, background:"#fffbeb" }}>
            <p style={{ fontWeight:700, fontSize:13, margin:"0 0 6px", color:C.amber }}>⚠ Aviso Importante — S-2240</p>
            <p style={{ fontSize:12, color:C.text, margin:0, lineHeight:1.6 }}>
              Riscos psicossociais <strong>NÃO devem ser enviados</strong> no S-2240. Este evento é destinado exclusivamente a agentes
              <strong> físicos, químicos e biológicos</strong> conforme a NR-09. Eventos de natureza psicossocial são tratados
              no âmbito do PGR (NR-01) e <strong>não possuem evento eSocial específico</strong> até a presente data.
            </p>
          </Card>
          <Card>
            <p style={{ fontWeight:700, fontSize:14, margin:"0 0 14px" }}>S-2240 — Registrar Envio de Condições Ambientais</p>
            <div style={{ marginBottom:12 }}>
              <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Descrição do envio (agentes físicos/químicos/biológicos informados)</p>
              <textarea value={s2240Form.descricao} onChange={e => setS2240Form(p => ({ ...p, descricao:e.target.value }))} rows={4}
                placeholder="Ex.: Envio das condições ambientais do setor de Produção — ruído (85dB), calor (IBUTG 28°C), poeiras minerais..."
                style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
            </div>
            <Input label="Data de Envio" value={s2240Form.dataEnvio} onChange={v => setS2240Form(p => ({ ...p, dataEnvio:v }))} type="date"/>
            <Btn disabled={!s2240Form.descricao || !s2240Form.dataEnvio} onClick={adicionarS2240}>Registrar Envio</Btn>
          </Card>
          {s2240List.length > 0 && (
            <Card>
              <p style={{ fontWeight:700, fontSize:13, margin:"0 0 12px" }}>Histórico de Envios S-2240</p>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:C.bg }}>
                    {["Data de Envio","Descrição",""].map((h, i) => (
                      <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s2240List.map(r => (
                    <tr key={r.id} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"9px 10px", whiteSpace:"nowrap" }}>{r.dataEnvio ? new Date(r.dataEnvio + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                      <td style={{ padding:"9px 10px", color:C.muted }}>{r.descricao}</td>
                      <td style={{ padding:"9px 10px" }}>
                        <button onClick={() => setS2240List(p => p.filter(x => x.id !== r.id))}
                          style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:11, fontWeight:600 }}>Remover</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: S-2245 ── */}
      {aba === "s2245" && (
        <Card>
          <div style={{ marginBottom:14 }}>
            <p style={{ fontWeight:700, fontSize:14, margin:0 }}>S-2245 — Treinamentos e Capacitações</p>
            <p style={{ fontSize:11, color:C.muted, margin:"2px 0 0" }}>Prazo: até dia 15 do mês seguinte</p>
          </div>
          {treinamentos.length === 0 ? (
            <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>Nenhum treinamento registrado. Cadastre treinamentos no módulo correspondente.</p>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:C.bg }}>
                  {["Treinamento","NR/Tema","Data","C/H","Status eSocial","Ação"].map((h, i) => (
                    <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {treinamentos.map(tr => {
                  const st = tr.statusESocial || "Não enviado";
                  const bd = statusESocialBadge(st);
                  return (
                    <tr key={tr.id} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"9px 10px", fontWeight:600 }}>{tr.nome}</td>
                      <td style={{ padding:"9px 10px" }}>{tr.nr || "—"}</td>
                      <td style={{ padding:"9px 10px" }}>{tr.data ? new Date(tr.data + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                      <td style={{ padding:"9px 10px" }}>{tr.cargaHoraria ? `${tr.cargaHoraria}h` : "—"}</td>
                      <td style={{ padding:"9px 10px" }}><Badge label={st} {...bd}/></td>
                      <td style={{ padding:"9px 10px" }}>
                        <select value={st} onChange={e => atualizarStatusESocial("treinamentos", tr.id, e.target.value)}
                          style={{ padding:"5px 8px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:11, fontFamily:"inherit", cursor:"pointer" }}>
                          {statusESocialOpts.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ── Modal Nova CAT ── */}
      {catModal && (
        <Modal title="Nova CAT — S-2210" onClose={() => setCatModal(false)}>
          <div style={{ background:"#fef3c7", border:`1px solid #fde68a`, borderRadius:8, padding:"8px 12px", marginBottom:14 }}>
            <p style={{ margin:0, fontSize:11, color:"#92400e", fontWeight:600 }}>⚠ Prazo: até o 1º dia útil após o acidente</p>
          </div>
          <Input label="Nome do Funcionário" value={catForm.funcionario} onChange={v => sf("funcionario", v)} required/>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Tipo de Acidente <span style={{ color:C.red }}>*</span></p>
            <select value={catForm.tipo} onChange={e => sf("tipo", e.target.value)}
              style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
              {CAT_TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <Input label="Data do Acidente" value={catForm.dataAcidente} onChange={v => sf("dataAcidente", v)} type="date" required/>
          <Input label="Parte do Corpo Atingida" value={catForm.parteAtingida} onChange={v => sf("parteAtingida", v)} placeholder="Ex.: Mão direita"/>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Descrição do Acidente</p>
            <textarea value={catForm.descricao} onChange={e => sf("descricao", e.target.value)} rows={3}
              style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn outline onClick={() => setCatModal(false)}>Cancelar</Btn>
            <Btn disabled={!catForm.funcionario || !catForm.dataAcidente || saving} onClick={salvarCAT}>{saving ? "Salvando…" : "Registrar CAT"}</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal Protocolo ── */}
      {protModal && (
        <Modal title="Marcar CAT como Enviada" onClose={() => setProtModal(false)}>
          <p style={{ fontSize:12, color:C.muted, marginBottom:14 }}>Informe o número de protocolo do eSocial para registrar o envio.</p>
          <Input label="Número do Protocolo eSocial" value={prot.value} onChange={v => setProt(p => ({ ...p, value:v }))} placeholder="Ex.: 1.2.202401.0000001"/>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn outline onClick={() => setProtModal(false)}>Cancelar</Btn>
            <Btn onClick={confirmarEnvioCAT}>Confirmar Envio</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
