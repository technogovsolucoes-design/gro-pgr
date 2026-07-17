import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";
import { Plus, Trash2, Edit2, CheckCircle, AlertTriangle, Bell } from "lucide-react";

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

const VACINAS_PRE = ["Hepatite B","Tríplice Viral","Tétano","Influenza","COVID-19","Febre Amarela","Raiva"];
const DOSES = ["1ª Dose","2ª Dose","3ª Dose","Reforço"];

const getStatus = v => {
  if (!v.dataProximaDose) return "Em dia";
  const d = new Date(v.dataProximaDose);
  const today = new Date();
  const diff = Math.ceil((d - today) / 86400000);
  if (diff < 0) return "Atrasado";
  if (diff <= 30) return "Reforço próximo";
  return "Em dia";
};

const statusCor = { "Em dia": C.green, "Reforço próximo": C.amber, "Atrasado": C.red };
const statusIcon = { "Em dia": CheckCircle, "Reforço próximo": Bell, "Atrasado": AlertTriangle };

const empty = { funcionarioNome:"", vacina:"Hepatite B", dose:"1ª Dose", dataAplicacao:"", dataProximaDose:"", lote:"", profissionalAplicador:"", localAplicacao:"", observacoes:"" };

export default function Vacinacao() {
  const { empresaAtiva } = useApp();
  const [vacinas, setVacinas] = useState([]);
  const [filtroVacina, setFiltroVacina] = useState("Todas");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!empresaAtiva?.id) return;
    const unsub = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "vacinas"), orderBy("dataAplicacao", "desc")),
      snap => setVacinas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [empresaAtiva?.id]);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setForm(empty); setEditId(null); setModal(true); };
  const openEdit = v => { setForm({ funcionarioNome:v.funcionarioNome||"", vacina:v.vacina||"Hepatite B", dose:v.dose||"1ª Dose", dataAplicacao:v.dataAplicacao||"", dataProximaDose:v.dataProximaDose||"", lote:v.lote||"", profissionalAplicador:v.profissionalAplicador||"", localAplicacao:v.localAplicacao||"", observacoes:v.observacoes||"" }); setEditId(v.id); setModal(true); };

  const save = async () => {
    if (!form.funcionarioNome || !form.dataAplicacao) return;
    setLoading(true);
    const col = collection(db, "empresas", empresaAtiva.id, "vacinas");
    if (editId) {
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "vacinas", editId), { ...form, updatedAt: serverTimestamp() });
    } else {
      await addDoc(col, { ...form, createdAt: serverTimestamp() });
    }
    setLoading(false); setModal(false);
  };

  const remove = async id => {
    if (!window.confirm("Excluir registro de vacina?")) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "vacinas", id));
  };

  const filtradas = filtroVacina === "Todas" ? vacinas : vacinas.filter(v => v.vacina === filtroVacina);
  const fmtDate = s => s ? new Date(s + "T00:00:00").toLocaleDateString("pt-BR") : "-";

  return (
    <div style={{ padding:24, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Bell size={22} color={C.navyMid} />
          <h2 style={{ margin:0, color:C.navy, fontSize:20, fontWeight:700 }}>Controle de Vacinação</h2>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <select value={filtroVacina} onChange={e => setFiltroVacina(e.target.value)} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", fontSize:13, color:C.text }}>
            <option value="Todas">Todas as vacinas</option>
            {VACINAS_PRE.map(v => <option key={v}>{v}</option>)}
          </select>
          <Btn onClick={openNew} icon={<Plus size={14}/>}>Nova Vacinação</Btn>
        </div>
      </div>

      <Card>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {["Funcionário","Vacina","Dose","Aplicação","Próxima Dose","Lote","Status","Ações"].map(h=>(
                  <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:C.muted, fontWeight:600, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr><td colSpan={8} style={{ padding:24, textAlign:"center", color:C.muted }}>Nenhum registro de vacinação</td></tr>
              ) : filtradas.map(v => {
                const st = getStatus(v);
                const Ico = statusIcon[st];
                return (
                  <tr key={v.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:"10px 14px", fontWeight:500 }}>{v.funcionarioNome}</td>
                    <td style={{ padding:"10px 14px" }}>{v.vacina}</td>
                    <td style={{ padding:"10px 14px", color:C.muted }}>{v.dose}</td>
                    <td style={{ padding:"10px 14px" }}>{fmtDate(v.dataAplicacao)}</td>
                    <td style={{ padding:"10px 14px" }}>{fmtDate(v.dataProximaDose)}</td>
                    <td style={{ padding:"10px 14px", color:C.muted }}>{v.lote || "-"}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ background:(statusCor[st])+"20", color:statusCor[st], borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:600, display:"inline-flex", alignItems:"center", gap:4 }}>
                        <Ico size={11} /> {st}
                      </span>
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        <Btn onClick={() => openEdit(v)} outline small icon={<Edit2 size={12}/>}>Editar</Btn>
                        <Btn onClick={() => remove(v.id)} color={C.red} outline small icon={<Trash2 size={12}/>}>Excluir</Btn>
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
        <Modal title={editId ? "Editar Vacinação" : "Nova Vacinação"} onClose={() => setModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Input label="Funcionário *" value={form.funcionarioNome} onChange={set("funcionarioNome")} placeholder="Nome do funcionário" required />
            <div>
              <label style={{ fontSize:12, color:C.muted, fontWeight:600, display:"block", marginBottom:4 }}>Vacina *</label>
              <select value={form.vacina} onChange={e => set("vacina")(e.target.value)} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, color:C.text }}>
                {VACINAS_PRE.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, color:C.muted, fontWeight:600, display:"block", marginBottom:4 }}>Dose</label>
              <select value={form.dose} onChange={e => set("dose")(e.target.value)} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, color:C.text }}>
                {DOSES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Input label="Data Aplicação *" value={form.dataAplicacao} onChange={set("dataAplicacao")} type="date" required />
              <Input label="Próxima Dose" value={form.dataProximaDose} onChange={set("dataProximaDose")} type="date" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Input label="Lote" value={form.lote} onChange={set("lote")} placeholder="Lote" />
              <Input label="Local de Aplicação" value={form.localAplicacao} onChange={set("localAplicacao")} placeholder="Local" />
            </div>
            <Input label="Profissional Aplicador" value={form.profissionalAplicador} onChange={set("profissionalAplicador")} placeholder="Nome" />
            <div>
              <label style={{ fontSize:12, color:C.muted, fontWeight:600, display:"block", marginBottom:4 }}>Observações</label>
              <textarea value={form.observacoes} onChange={e => set("observacoes")(e.target.value)} rows={2} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, color:C.text, resize:"vertical", boxSizing:"border-box" }} />
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
