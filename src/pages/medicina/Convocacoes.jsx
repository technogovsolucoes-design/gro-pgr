import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";
import { Bell, Plus, Trash2, Edit2, CheckCircle, AlertTriangle, Clock } from "lucide-react";

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:12, padding:24, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <p style={{ fontWeight:700, fontSize:15, margin:0 }}>{title}</p>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.gray }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const TIPOS = ["Periódico","Admissional","Demissional","Retorno","Mudança de Risco"];
const STATUS_LIST = ["Pendente","Confirmado","Realizado","Não Compareceu"];
const CANAIS = ["Email","SMS","WhatsApp","Pessoalmente"];

const statusCor = { "Pendente": C.amber, "Confirmado": C.blue, "Realizado": C.green, "Não Compareceu": C.red };
const statusIcon = { "Pendente": Clock, "Confirmado": CheckCircle, "Realizado": CheckCircle, "Não Compareceu": AlertTriangle };

const empty = { funcionarioNome:"", tipo:"Periódico", dataConvocacao:"", dataPrazo:"", status:"Pendente", canal:"Email", observacoes:"" };

export default function Convocacoes() {
  const { empresaAtiva } = useApp();
  const [convocacoes, setConvocacoes] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!empresaAtiva?.id) return;
    const unsub = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "convocacoes"), orderBy("dataConvocacao", "desc")),
      snap => setConvocacoes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [empresaAtiva?.id]);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setForm(empty); setEditId(null); setModal(true); };
  const openEdit = c => { setForm({ funcionarioNome:c.funcionarioNome||"", tipo:c.tipo||"Periódico", dataConvocacao:c.dataConvocacao||"", dataPrazo:c.dataPrazo||"", status:c.status||"Pendente", canal:c.canal||"Email", observacoes:c.observacoes||"" }); setEditId(c.id); setModal(true); };

  const save = async () => {
    if (!form.funcionarioNome || !form.dataConvocacao) return;
    setLoading(true);
    const col = collection(db, "empresas", empresaAtiva.id, "convocacoes");
    if (editId) {
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "convocacoes", editId), { ...form, updatedAt: serverTimestamp() });
    } else {
      await addDoc(col, { ...form, createdAt: serverTimestamp() });
    }
    setLoading(false); setModal(false);
  };

  const remove = async id => {
    if (!window.confirm("Excluir convocação?")) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "convocacoes", id));
  };

  const today = new Date();
  const pendentes = convocacoes.filter(c => c.status === "Pendente").length;
  const confirmadas = convocacoes.filter(c => c.status === "Confirmado").length;
  const vencidas = convocacoes.filter(c => c.dataPrazo && new Date(c.dataPrazo) < today && c.status !== "Realizado").length;

  const filtradas = filtroStatus === "Todos" ? convocacoes : convocacoes.filter(c => c.status === filtroStatus);

  const fmtDate = s => s ? new Date(s + "T00:00:00").toLocaleDateString("pt-BR") : "-";

  const kpis = [
    { label:"Pendentes", value:pendentes, color:C.amber, icon:Clock },
    { label:"Confirmadas", value:confirmadas, color:C.blue, icon:CheckCircle },
    { label:"Vencidas", value:vencidas, color:C.red, icon:AlertTriangle },
  ];

  return (
    <div style={{ padding:24, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Bell size={22} color={C.navyMid} />
          <h2 style={{ margin:0, color:C.navy, fontSize:20, fontWeight:700 }}>Convocações</h2>
        </div>
        <Btn onClick={openNew} icon={<Plus size={14}/>}>Nova Convocação</Btn>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:24 }}>
        {kpis.map(k=>(
          <Card key={k.label} style={{ padding:16, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ background:k.color+"18", borderRadius:8, padding:8 }}>
              <k.icon size={18} color={k.color} />
            </div>
            <div>
              <p style={{ margin:0, fontSize:22, fontWeight:700, color:k.color }}>{k.value}</p>
              <p style={{ margin:0, fontSize:12, color:C.muted }}>{k.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filtro */}
      <div style={{ marginBottom:14, display:"flex", gap:8, flexWrap:"wrap" }}>
        {["Todos","Pendente","Confirmado","Realizado","Não Compareceu"].map(s=>(
          <button key={s} onClick={() => setFiltroStatus(s)} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${filtroStatus===s ? C.navyMid : C.border}`, background: filtroStatus===s ? C.navyMid : C.white, color: filtroStatus===s ? C.white : C.text, fontSize:12, fontWeight:600, cursor:"pointer" }}>{s}</button>
        ))}
      </div>

      <Card>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {["Funcionário","Tipo","Convocação","Prazo","Canal","Status","Ações"].map(h=>(
                  <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:C.muted, fontWeight:600, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:24, textAlign:"center", color:C.muted }}>Nenhuma convocação encontrada</td></tr>
              ) : filtradas.map(c => {
                const Ico = statusIcon[c.status] || Clock;
                return (
                  <tr key={c.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:"10px 14px", fontWeight:500 }}>{c.funcionarioNome}</td>
                    <td style={{ padding:"10px 14px", color:C.muted }}>{c.tipo}</td>
                    <td style={{ padding:"10px 14px" }}>{fmtDate(c.dataConvocacao)}</td>
                    <td style={{ padding:"10px 14px" }}>{fmtDate(c.dataPrazo)}</td>
                    <td style={{ padding:"10px 14px", color:C.muted }}>{c.canal}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ background:(statusCor[c.status]||C.gray)+"20", color:statusCor[c.status]||C.gray, borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:600, display:"inline-flex", alignItems:"center", gap:4 }}>
                        <Ico size={11} /> {c.status}
                      </span>
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        <Btn onClick={() => openEdit(c)} outline small icon={<Edit2 size={12}/>}>Editar</Btn>
                        <Btn onClick={() => remove(c.id)} color={C.red} outline small icon={<Trash2 size={12}/>}>Excluir</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && (
        <Modal title={editId ? "Editar Convocação" : "Nova Convocação"} onClose={() => setModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Input label="Funcionário *" value={form.funcionarioNome} onChange={set("funcionarioNome")} placeholder="Nome do funcionário" required />
            <div>
              <label style={{ fontSize:12, color:C.muted, fontWeight:600, display:"block", marginBottom:4 }}>Tipo *</label>
              <select value={form.tipo} onChange={e => set("tipo")(e.target.value)} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, color:C.text }}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Input label="Data Convocação *" value={form.dataConvocacao} onChange={set("dataConvocacao")} type="date" required />
              <Input label="Prazo" value={form.dataPrazo} onChange={set("dataPrazo")} type="date" />
            </div>
            <div>
              <label style={{ fontSize:12, color:C.muted, fontWeight:600, display:"block", marginBottom:4 }}>Canal</label>
              <select value={form.canal} onChange={e => set("canal")(e.target.value)} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, color:C.text }}>
                {CANAIS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, color:C.muted, fontWeight:600, display:"block", marginBottom:4 }}>Status</label>
              <select value={form.status} onChange={e => set("status")(e.target.value)} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, color:C.text }}>
                {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, color:C.muted, fontWeight:600, display:"block", marginBottom:4 }}>Observações</label>
              <textarea value={form.observacoes} onChange={e => set("observacoes")(e.target.value)} rows={3} placeholder="Observações" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, color:C.text, resize:"vertical", boxSizing:"border-box" }} />
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:4 }}>
              <Btn onClick={() => setModal(false)} outline>Cancelar</Btn>
              <Btn onClick={save} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
