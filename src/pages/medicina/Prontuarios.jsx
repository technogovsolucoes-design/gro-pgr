import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";
import { FileText, Plus, Trash2, Edit2, Search, ClipboardList } from "lucide-react";

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:12, padding:24, width:"100%", maxWidth:600, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <p style={{ fontWeight:700, fontSize:15, margin:0 }}>{title}</p>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.gray }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const empty = { funcionarioNome:"", cpf:"", matricula:"", dataAdmissao:"", cargo:"", setorId:"", queixasPrincipais:"", historicoMedico:"", medicamentos:"", restricoes:"" };

export default function Prontuarios() {
  const { empresaAtiva, exames } = useApp();
  const [prontuarios, setProntuarios] = useState([]);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!empresaAtiva?.id) return;
    const unsub = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "prontuarios"), orderBy("funcionarioNome")),
      snap => setProntuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [empresaAtiva?.id]);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setForm(empty); setEditId(null); setModal(true); };
  const openEdit = p => { setForm({ funcionarioNome:p.funcionarioNome||"", cpf:p.cpf||"", matricula:p.matricula||"", dataAdmissao:p.dataAdmissao||"", cargo:p.cargo||"", setorId:p.setorId||"", queixasPrincipais:p.queixasPrincipais||"", historicoMedico:p.historicoMedico||"", medicamentos:p.medicamentos||"", restricoes:p.restricoes||"" }); setEditId(p.id); setModal(true); };

  const save = async () => {
    if (!form.funcionarioNome) return;
    setLoading(true);
    const col = collection(db, "empresas", empresaAtiva.id, "prontuarios");
    if (editId) {
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "prontuarios", editId), { ...form, updatedAt: serverTimestamp() });
    } else {
      await addDoc(col, { ...form, dataCriacao: serverTimestamp() });
    }
    setLoading(false); setModal(false);
  };

  const remove = async id => {
    if (!window.confirm("Excluir prontuário?")) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "prontuarios", id));
  };

  const filtrados = prontuarios.filter(p => p.funcionarioNome?.toLowerCase().includes(busca.toLowerCase()));

  const examesFuncionario = nome => (exames || []).filter(e => e.funcionarioNome?.toLowerCase() === nome?.toLowerCase());

  const fmtDate = s => s ? new Date(s + "T00:00:00").toLocaleDateString("pt-BR") : "-";

  const TextArea = ({ label, value, onChange, rows = 3 }) => (
    <div>
      <label style={{ fontSize:12, color:C.muted, fontWeight:600, display:"block", marginBottom:4 }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, color:C.text, resize:"vertical", boxSizing:"border-box" }} />
    </div>
  );

  return (
    <div style={{ padding:24, maxWidth:1000, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <FileText size={22} color={C.navyMid} />
          <h2 style={{ margin:0, color:C.navy, fontSize:20, fontWeight:700 }}>Prontuários Médicos</h2>
        </div>
        <Btn onClick={openNew} icon={<Plus size={14}/>}>Novo Prontuário</Btn>
      </div>

      <div style={{ position:"relative", marginBottom:16, maxWidth:340 }}>
        <Search size={15} color={C.muted} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }} />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por funcionário..." style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px 8px 32px", fontSize:13, boxSizing:"border-box" }} />
      </div>

      <Card>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {["Funcionário","CPF","Matrícula","Cargo","Admissão","Ações"].map(h=>(
                  <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:C.muted, fontWeight:600, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={6} style={{ padding:24, textAlign:"center", color:C.muted }}>Nenhum prontuário encontrado</td></tr>
              ) : filtrados.map(p => (
                <tr key={p.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"10px 14px", fontWeight:500 }}>{p.funcionarioNome}</td>
                  <td style={{ padding:"10px 14px", color:C.muted }}>{p.cpf || "-"}</td>
                  <td style={{ padding:"10px 14px", color:C.muted }}>{p.matricula || "-"}</td>
                  <td style={{ padding:"10px 14px", color:C.muted }}>{p.cargo || "-"}</td>
                  <td style={{ padding:"10px 14px" }}>{fmtDate(p.dataAdmissao)}</td>
                  <td style={{ padding:"10px 14px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <Btn onClick={() => setViewModal(p)} outline small icon={<ClipboardList size={12}/>}>Ver</Btn>
                      <Btn onClick={() => openEdit(p)} outline small icon={<Edit2 size={12}/>}>Editar</Btn>
                      <Btn onClick={() => remove(p.id)} color={C.red} outline small icon={<Trash2 size={12}/>}>Excluir</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal visualização */}
      {viewModal && (
        <Modal title={`Prontuário — ${viewModal.funcionarioNome}`} onClose={() => setViewModal(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[["CPF",viewModal.cpf],["Matrícula",viewModal.matricula],["Cargo",viewModal.cargo],["Admissão",fmtDate(viewModal.dataAdmissao)]].map(([l,v])=>(
                <div key={l}><p style={{ margin:0, fontSize:11, color:C.muted, fontWeight:600 }}>{l}</p><p style={{ margin:0, fontSize:13, color:C.text }}>{v||"-"}</p></div>
              ))}
            </div>
            {[["Queixas Principais",viewModal.queixasPrincipais],["Histórico Médico",viewModal.historicoMedico],["Medicamentos",viewModal.medicamentos],["Restrições",viewModal.restricoes]].map(([l,v])=>v?(
              <div key={l} style={{ background:C.bg, borderRadius:8, padding:12 }}>
                <p style={{ margin:0, fontSize:11, color:C.muted, fontWeight:600, marginBottom:4 }}>{l}</p>
                <p style={{ margin:0, fontSize:13, color:C.text, whiteSpace:"pre-wrap" }}>{v}</p>
              </div>
            ):null)}
            {examesFuncionario(viewModal.funcionarioNome).length > 0 && (
              <div>
                <p style={{ fontWeight:700, fontSize:13, color:C.navy, marginBottom:8, margin:"0 0 8px" }}>Últimos ASOs</p>
                {examesFuncionario(viewModal.funcionarioNome).slice(0,3).map(e=>(
                  <div key={e.id} style={{ background:C.bg, borderRadius:8, padding:10, marginBottom:6, display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:13 }}>{e.tipo || "ASO"}</span>
                    <span style={{ fontSize:12, color:C.muted }}>Venc: {fmtDate(e.dataVencimento)}</span>
                  </div>
                ))}
              </div>
            )}
            <Btn onClick={() => setViewModal(null)} outline>Fechar</Btn>
          </div>
        </Modal>
      )}

      {/* Modal formulário */}
      {modal && (
        <Modal title={editId ? "Editar Prontuário" : "Novo Prontuário"} onClose={() => setModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Input label="Funcionário *" value={form.funcionarioNome} onChange={set("funcionarioNome")} placeholder="Nome completo" required />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Input label="CPF" value={form.cpf} onChange={set("cpf")} placeholder="000.000.000-00" />
              <Input label="Matrícula" value={form.matricula} onChange={set("matricula")} placeholder="Matrícula" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Input label="Cargo" value={form.cargo} onChange={set("cargo")} placeholder="Cargo" />
              <Input label="Data Admissão" value={form.dataAdmissao} onChange={set("dataAdmissao")} type="date" />
            </div>
            <TextArea label="Queixas Principais" value={form.queixasPrincipais} onChange={set("queixasPrincipais")} />
            <TextArea label="Histórico Médico" value={form.historicoMedico} onChange={set("historicoMedico")} />
            <TextArea label="Medicamentos em Uso" value={form.medicamentos} onChange={set("medicamentos")} />
            <TextArea label="Restrições" value={form.restricoes} onChange={set("restricoes")} />
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
