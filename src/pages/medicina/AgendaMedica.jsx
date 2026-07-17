import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";
import { Calendar, Plus, Trash2, Edit2, Clock } from "lucide-react";

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

const TIPOS = ["Consulta", "Retorno", "Urgência", "Admissional", "Periódico", "Demissional"];
const STATUS = ["Agendado", "Confirmado", "Realizado", "Cancelado"];

const statusCor = { Agendado: C.blue, Confirmado: "#06b6d4", Realizado: C.green, Cancelado: C.red };

const empty = { funcionarioNome:"", tipo:"Consulta", data:"", hora:"", medico:"", status:"Agendado", observacoes:"" };

export default function AgendaMedica() {
  const { empresaAtiva } = useApp();
  const [consultas, setConsultas] = useState([]);
  const [filtroData, setFiltroData] = useState(new Date().toISOString().slice(0, 10));
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!empresaAtiva?.id) return;
    const unsub = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "consultas"), orderBy("data"), orderBy("hora")),
      snap => setConsultas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [empresaAtiva?.id]);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setForm(empty); setEditId(null); setModal(true); };
  const openEdit = c => { setForm({ funcionarioNome:c.funcionarioNome||"", tipo:c.tipo||"Consulta", data:c.data||"", hora:c.hora||"", medico:c.medico||"", status:c.status||"Agendado", observacoes:c.observacoes||"" }); setEditId(c.id); setModal(true); };

  const save = async () => {
    if (!form.funcionarioNome || !form.data) return;
    setLoading(true);
    const col = collection(db, "empresas", empresaAtiva.id, "consultas");
    if (editId) {
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "consultas", editId), { ...form, updatedAt: serverTimestamp() });
    } else {
      await addDoc(col, { ...form, createdAt: serverTimestamp() });
    }
    setLoading(false); setModal(false);
  };

  const remove = async id => {
    if (!window.confirm("Excluir consulta?")) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "consultas", id));
  };

  const filtradas = filtroData ? consultas.filter(c => c.data === filtroData) : consultas;

  const fmtDate = s => s ? new Date(s + "T00:00:00").toLocaleDateString("pt-BR") : "-";

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Calendar size={22} color={C.navyMid} />
          <h2 style={{ margin:0, color:C.navy, fontSize:20, fontWeight:700 }}>Agenda Médica</h2>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)}
            style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", fontSize:13, color:C.text }} />
          <Btn onClick={() => setFiltroData("")} outline small>Todas as datas</Btn>
          <Btn onClick={openNew} icon={<Plus size={14}/>}>Nova Consulta</Btn>
        </div>
      </div>

      <Card>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {["Funcionário","Tipo","Data","Hora","Médico","Status","Ações"].map(h=>(
                  <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:C.muted, fontWeight:600, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:24, textAlign:"center", color:C.muted }}>Nenhuma consulta encontrada</td></tr>
              ) : filtradas.map(c => (
                <tr key={c.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"10px 14px", fontWeight:500 }}>{c.funcionarioNome}</td>
                  <td style={{ padding:"10px 14px", color:C.muted }}>{c.tipo}</td>
                  <td style={{ padding:"10px 14px" }}>{fmtDate(c.data)}</td>
                  <td style={{ padding:"10px 14px" }}>{c.hora || "-"}</td>
                  <td style={{ padding:"10px 14px" }}>{c.medico || "-"}</td>
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{ background:(statusCor[c.status]||C.gray)+"20", color:statusCor[c.status]||C.gray, borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:600 }}>{c.status}</span>
                  </td>
                  <td style={{ padding:"10px 14px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <Btn onClick={() => openEdit(c)} outline small icon={<Edit2 size={12}/>}>Editar</Btn>
                      <Btn onClick={() => remove(c.id)} color={C.red} outline small icon={<Trash2 size={12}/>}>Excluir</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && (
        <Modal title={editId ? "Editar Consulta" : "Nova Consulta"} onClose={() => setModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Input label="Funcionário *" value={form.funcionarioNome} onChange={set("funcionarioNome")} placeholder="Nome do funcionário" required />
            <div>
              <label style={{ fontSize:12, color:C.muted, fontWeight:600, display:"block", marginBottom:4 }}>Tipo *</label>
              <select value={form.tipo} onChange={e => set("tipo")(e.target.value)} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, color:C.text }}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Data *" value={form.data} onChange={set("data")} type="date" required />
            <Input label="Hora" value={form.hora} onChange={set("hora")} type="time" />
            <Input label="Médico" value={form.medico} onChange={set("medico")} placeholder="Nome do médico" />
            <div>
              <label style={{ fontSize:12, color:C.muted, fontWeight:600, display:"block", marginBottom:4 }}>Status</label>
              <select value={form.status} onChange={e => set("status")(e.target.value)} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, color:C.text }}>
                {STATUS.map(s => <option key={s}>{s}</option>)}
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
