import { useState, useMemo } from "react";
import {
  GraduationCap, Plus, Trash2, Edit2, CheckSquare, Square,
  Calendar, Users, AlertTriangle, X, BookOpen,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { Btn, Card, Input } from "../components/ui";
import { C, TREINAMENTO_NRS } from "../constants";

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

function statusTreino(data, periodicidade) {
  if (!data) return { label:"Sem data", color:C.gray, bg:"#f1f5f9" };
  const realizado = new Date(data);
  if (isNaN(realizado)) return { label:"Sem data", color:C.gray, bg:"#f1f5f9" };
  if (!periodicidade || periodicidade === "0") return { label:"Realizado", color:C.green, bg:"#dcfce7" };
  const vence = new Date(realizado);
  vence.setMonth(vence.getMonth() + Number(periodicidade));
  const dias = Math.floor((vence - new Date()) / 86400000);
  if (dias < 0)   return { label:"Vencido",          color:C.red,   bg:"#fee2e2" };
  if (dias <= 30) return { label:`Vence em ${dias}d`, color:C.amber, bg:"#fef3c7" };
  return               { label:"Em dia",              color:C.green, bg:"#dcfce7" };
}

const VAZIO = {
  nome:"", nr:"", cargaHoraria:"", periodicidade:"12",
  instrutor:"", local:"", data:"", dataValidade:"",
  participantes: [],
};

export default function Treinamentos() {
  const { treinamentos, funcionarios, setores, salvarTreinamento, excluirTreinamento } = useApp();

  const [aba, setAba] = useState(0);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ ...VAZIO });
  const [saving, setSaving]   = useState(false);
  const [presModal, setPresModal] = useState(null); // treinamento selecionado
  const [presForm, setPresForm]   = useState([]);   // { funcId, presente }

  // KPIs
  const hoje = new Date();
  const mesAtual = hoje.toISOString().slice(0, 7);
  const realizadosMes = treinamentos.filter(t => t.data?.startsWith?.(mesAtual)).length;
  const vencidos = treinamentos.filter(t => {
    const st = statusTreino(t.data, t.periodicidade);
    return st.label === "Vencido";
  }).length;
  const vencendo = treinamentos.filter(t => {
    const st = statusTreino(t.data, t.periodicidade);
    return st.label.startsWith("Vence");
  }).length;
  const totalPart = treinamentos.reduce((acc, t) => acc + (t.participantes?.length || 0), 0);

  // Compliance por NR
  const compliance = useMemo(() => {
    const nrs = {};
    treinamentos.forEach(t => {
      if (!t.nr) return;
      if (!nrs[t.nr]) nrs[t.nr] = { total: 0, vencidos: 0, participantes: 0 };
      nrs[t.nr].total++;
      const st = statusTreino(t.data, t.periodicidade);
      if (st.label === "Vencido") nrs[t.nr].vencidos++;
      nrs[t.nr].participantes += t.participantes?.length || 0;
    });
    return Object.entries(nrs).map(([nr, v]) => ({ nr, ...v }));
  }, [treinamentos]);

  function abrirModal(t = null) {
    setForm(t ? { ...VAZIO, ...t } : { ...VAZIO });
    setModal(true);
  }

  async function salvar() {
    if (!form.nome || !form.nr) return;
    setSaving(true);
    await salvarTreinamento({ ...form });
    setSaving(false);
    setModal(false);
  }

  function abrirPresenca(treino) {
    const pList = funcionarios.map(f => {
      const jaPresente = (treino.participantes || []).some(p => p.funcId === f.id);
      return { funcId: f.id, nome: f.nome, matricula: f.matricula, presente: jaPresente };
    });
    setPresForm(pList);
    setPresModal(treino);
  }

  async function salvarPresenca() {
    const participantes = presForm.filter(p => p.presente).map(({ funcId, nome, matricula }) => ({ funcId, nome, matricula }));
    await salvarTreinamento({ ...presModal, participantes });
    setPresModal(null);
  }

  const togglePresenca = (funcId) => {
    setPresForm(p => p.map(f => f.funcId === funcId ? { ...f, presente: !f.presente } : f));
  };

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const TAB = ["Treinamentos", "Conformidade por NR"];

  return (
    <div>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Treinamentos",      val:treinamentos.length, icon:<GraduationCap size={18} color={C.navyMid}/>, bg:"#eff6ff" },
          { label:"Realizados (mês)",  val:realizadosMes,       icon:<Calendar size={18} color={C.green}/>,        bg:"#f0fdf4" },
          { label:"Vencendo (30d)",    val:vencendo,             icon:<AlertTriangle size={18} color={C.amber}/>,   bg:"#fffbeb" },
          { label:"Vencidos",          val:vencidos,             icon:<AlertTriangle size={18} color={C.red}/>,     bg:"#fef2f2" },
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
        {TAB.map((t, i) => (
          <button key={i} onClick={() => setAba(i)} style={{ padding:"10px 16px", border:"none", background:"none", cursor:"pointer", fontSize:12, fontWeight:600, color:aba===i ? C.navyMid : C.gray, borderBottom:aba===i ? `2px solid ${C.navyMid}` : "2px solid transparent" }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab 0: Lista de Treinamentos ── */}
      {aba === 0 && (
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <p style={{ fontWeight:700, fontSize:14, margin:0 }}>Registros de Treinamentos</p>
            <Btn icon={<Plus size={13}/>} onClick={() => abrirModal()}>Novo Treinamento</Btn>
          </div>
          {treinamentos.length === 0 ? (
            <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>Nenhum treinamento registrado.</p>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:C.bg }}>
                  {["Treinamento","NR","Data","C/H","Instrutor","Participantes","Status",""].map((h, i) => (
                    <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {treinamentos.map(t => {
                  const st = statusTreino(t.data, t.periodicidade);
                  return (
                    <tr key={t.id} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"9px 10px" }}>
                        <p style={{ margin:0, fontWeight:600 }}>{t.nome}</p>
                        <p style={{ margin:0, fontSize:10, color:C.muted }}>{t.local || ""}</p>
                      </td>
                      <td style={{ padding:"9px 10px" }}><Badge label={t.nr || "—"} color={C.navyMid} bg="#eff6ff"/></td>
                      <td style={{ padding:"9px 10px" }}>{t.data ? new Date(t.data + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                      <td style={{ padding:"9px 10px" }}>{t.cargaHoraria ? `${t.cargaHoraria}h` : "—"}</td>
                      <td style={{ padding:"9px 10px", color:C.muted }}>{t.instrutor || "—"}</td>
                      <td style={{ padding:"9px 10px" }}>
                        <button onClick={() => abrirPresenca(t)} style={{ display:"flex", alignItems:"center", gap:4, background:"#eff6ff", border:`1px solid #bfdbfe`, borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:11, color:C.navyMid, fontWeight:600 }}>
                          <Users size={12}/> {t.participantes?.length || 0}
                        </button>
                      </td>
                      <td style={{ padding:"9px 10px" }}><Badge {...st}/></td>
                      <td style={{ padding:"9px 10px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => abrirModal(t)} style={{ background:"none", border:"none", cursor:"pointer", color:C.navyMid }}><Edit2 size={14}/></button>
                          <button onClick={() => { if (confirm(`Excluir "${t.nome}"?`)) excluirTreinamento(t.id); }} style={{ background:"none", border:"none", cursor:"pointer", color:C.red }}><Trash2 size={14}/></button>
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

      {/* ── Tab 1: Conformidade ── */}
      {aba === 1 && (
        <Card>
          <p style={{ fontWeight:700, fontSize:14, margin:"0 0 14px" }}>Conformidade por NR / Tema</p>
          {compliance.length === 0 ? (
            <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>Nenhum treinamento registrado ainda.</p>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:C.bg }}>
                  {["NR / Tema","Realizações","Vencidos","Total Participantes","Conformidade"].map((h, i) => (
                    <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compliance.map((c, i) => {
                  const pct = c.total > 0 ? Math.round(((c.total - c.vencidos) / c.total) * 100) : 100;
                  const cor = pct >= 80 ? C.green : pct >= 50 ? C.amber : C.red;
                  return (
                    <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"9px 10px", fontWeight:600 }}>{c.nr}</td>
                      <td style={{ padding:"9px 10px" }}>{c.total}</td>
                      <td style={{ padding:"9px 10px" }}>
                        {c.vencidos > 0 ? <Badge label={`${c.vencidos} vencido(s)`} color={C.red} bg="#fee2e2"/> : <Badge label="Nenhum" color={C.green} bg="#dcfce7"/>}
                      </td>
                      <td style={{ padding:"9px 10px" }}>{c.participantes}</td>
                      <td style={{ padding:"9px 10px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ flex:1, height:6, background:C.border, borderRadius:3, overflow:"hidden" }}>
                            <div style={{ width:`${pct}%`, height:"100%", background:cor, borderRadius:3 }}/>
                          </div>
                          <span style={{ fontSize:11, fontWeight:700, color:cor, minWidth:32 }}>{pct}%</span>
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

      {/* ── Modal Treinamento ── */}
      {modal && (
        <Modal title={form.id ? "Editar Treinamento" : "Novo Treinamento"} onClose={() => setModal(false)}>
          <Input label="Nome do treinamento" value={form.nome} onChange={v => sf("nome", v)} required placeholder="Ex.: NR-35 — Trabalho em Altura"/>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>NR / Tema <span style={{ color:C.red }}>*</span></p>
            <select value={form.nr} onChange={e => sf("nr", e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
              <option value="">Selecione…</option>
              {TREINAMENTO_NRS.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Carga Horária (h)" value={form.cargaHoraria} onChange={v => sf("cargaHoraria", v)} type="number" placeholder="8"/>
            <div style={{ marginBottom:12 }}>
              <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Periodicidade (meses)</p>
              <select value={form.periodicidade} onChange={e => sf("periodicidade", e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
                <option value="0">Único (sem renovação)</option>
                <option value="6">Semestral (6 meses)</option>
                <option value="12">Anual (12 meses)</option>
                <option value="24">Bienal (24 meses)</option>
                <option value="36">Trienal (36 meses)</option>
              </select>
            </div>
          </div>
          <Input label="Data de realização" value={form.data} onChange={v => sf("data", v)} type="date"/>
          <Input label="Instrutor / Responsável" value={form.instrutor} onChange={v => sf("instrutor", v)}/>
          <Input label="Local" value={form.local} onChange={v => sf("local", v)} placeholder="Ex.: Sala de Treinamentos"/>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn outline onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn disabled={!form.nome || !form.nr || saving} onClick={salvar}>{saving ? "Salvando…" : "Salvar"}</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal Lista de Presença ── */}
      {presModal && (
        <Modal title={`Presença — ${presModal.nome}`} onClose={() => setPresModal(null)}>
          <p style={{ fontSize:11, color:C.muted, margin:"0 0 12px" }}>
            {presModal.data ? new Date(presModal.data + "T12:00:00").toLocaleDateString("pt-BR") : "Sem data"} · {presForm.filter(p => p.presente).length} presentes
          </p>
          {funcionarios.length === 0 ? (
            <p style={{ color:C.muted, fontSize:12 }}>Nenhum funcionário cadastrado. Cadastre funcionários no módulo de EPIs.</p>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:320, overflowY:"auto" }}>
              {presForm.map(p => (
                <button key={p.funcId} onClick={() => togglePresenca(p.funcId)} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, border:`1px solid ${p.presente ? C.navyMid : C.border}`, background: p.presente ? "#eff6ff" : C.white, cursor:"pointer", textAlign:"left" }}>
                  {p.presente ? <CheckSquare size={16} color={C.navyMid}/> : <Square size={16} color={C.muted}/>}
                  <div>
                    <p style={{ margin:0, fontSize:12, fontWeight:600 }}>{p.nome}</p>
                    {p.matricula && <p style={{ margin:0, fontSize:10, color:C.muted }}>{p.matricula}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}>
            <Btn outline onClick={() => setPresModal(null)}>Cancelar</Btn>
            <Btn onClick={salvarPresenca}>Salvar Presença</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
