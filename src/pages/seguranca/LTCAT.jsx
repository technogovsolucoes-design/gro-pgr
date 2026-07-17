import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";
import { FileText, Plus, Edit2, Trash2, AlertTriangle, CheckCircle, Clock } from "lucide-react";

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:12, padding:24, width:"100%", maxWidth:500, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
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

function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ marginBottom:12 }}>
      {label && <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>{label}{required && <span style={{ color:C.red }}> *</span>}</p>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box", color:C.text, background:C.white }}>
        <option value="">Selecione...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Textarea({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <div style={{ marginBottom:12 }}>
      {label && <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>{label}</p>}
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", color:C.text }} />
    </div>
  );
}

const VAZIO = {
  tipo:"LTCAT", titulo:"", setorId:"", responsavelTecnico:"", crea:"",
  dataElaboracao:"", dataVigencia:"", agentesNocivos:"", metodologia:"",
  conclusao:"Não Insalubre", observacoes:"", status:"Em elaboração"
};

function statusBadge(item) {
  const s = item.status;
  if (s === "Vigente")       return { color:C.green, bg:"#dcfce7" };
  if (s === "Vencido")       return { color:C.red,   bg:"#fee2e2" };
  return                           { color:C.amber,  bg:"#fef3c7" };
}

function conclusaoBadge(c) {
  if (c === "Insalubre" || c === "Perigoso") return { color:C.red, bg:"#fee2e2" };
  return { color:C.green, bg:"#dcfce7" };
}

function isVencendoBreve(dataVigencia) {
  if (!dataVigencia) return false;
  const dias = Math.floor((new Date(dataVigencia + "T12:00:00") - new Date()) / 86400000);
  return dias >= 0 && dias <= 90;
}

export default function LTCAT() {
  const { empresaAtiva, setores } = useApp();
  const [docs, setDocs] = useState([]);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(VAZIO);

  useEffect(() => {
    if (!empresaAtiva) return;
    const q = query(collection(db, "empresas", empresaAtiva.id, "ltcat"), orderBy("dataElaboracao", "desc"));
    const unsub = onSnapshot(q, snap => setDocs(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    return unsub;
  }, [empresaAtiva]);

  function abrirNovo() { setForm(VAZIO); setEditItem(null); setModal(true); }
  function abrirEditar(item) { setForm({ ...item }); setEditItem(item); setModal(true); }

  async function salvar() {
    if (!form.titulo || !form.tipo) return;
    const col = collection(db, "empresas", empresaAtiva.id, "ltcat");
    if (editItem) {
      const { id, ...data } = form;
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "ltcat", editItem.id), { ...data, updatedAt: serverTimestamp() });
    } else {
      await addDoc(col, { ...form, criadoEm: serverTimestamp() });
    }
    setModal(false);
  }

  async function excluir(id) {
    if (!window.confirm("Excluir este documento?")) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "ltcat", id));
  }

  const f = (field) => (val) => setForm(p => ({ ...p, [field]:val }));
  const nomeSetor = (id) => setores.find(s => s.id === id)?.nome || id;

  if (!empresaAtiva) return <div style={{ padding:32, color:C.muted }}>Selecione uma empresa.</div>;

  const alertas = docs.filter(d => isVencendoBreve(d.dataVigencia));

  return (
    <div style={{ padding:24, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <FileText size={22} color={C.navy} />
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:C.navy }}>LTCAT / LIP / LTIP</h2>
            <p style={{ margin:0, fontSize:12, color:C.muted }}>Laudos Técnicos — NR-15 e NR-16</p>
          </div>
        </div>
        <Btn onClick={abrirNovo} icon={<Plus size={14}/>}>Novo Documento</Btn>
      </div>

      {alertas.length > 0 && (
        <Card style={{ marginBottom:16, background:"#fef3c7", border:"1px solid #fbbf24" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <AlertTriangle size={16} color={C.amber}/>
            <span style={{ fontSize:12, fontWeight:600, color:C.amber }}>
              {alertas.length} documento(s) vencem nos próximos 90 dias: {alertas.map(a => a.titulo).join(", ")}
            </span>
          </div>
        </Card>
      )}

      {docs.length === 0 ? (
        <Card>
          <p style={{ textAlign:"center", color:C.muted, fontSize:13, margin:0 }}>Nenhum documento cadastrado.</p>
        </Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {docs.map(item => {
            const sb = statusBadge(item);
            const cb = conclusaoBadge(item.conclusao);
            const alerta = isVencendoBreve(item.dataVigencia);
            return (
              <Card key={item.id} style={{ border: alerta ? "1px solid #fbbf24" : undefined }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
                      <span style={{ fontWeight:700, fontSize:13, color:C.navy }}>{item.titulo}</span>
                      <Badge label={item.tipo} color={C.navyMid} bg="#dbeafe" />
                      <Badge label={item.status} color={sb.color} bg={sb.bg} />
                      {item.conclusao && <Badge label={item.conclusao} color={cb.color} bg={cb.bg} />}
                      {alerta && <Badge label="Vence em breve" color={C.amber} bg="#fef3c7" />}
                    </div>
                    <div style={{ display:"flex", gap:16, flexWrap:"wrap", fontSize:11, color:C.muted }}>
                      {item.setorId && <span>Setor: {nomeSetor(item.setorId)}</span>}
                      {item.responsavelTecnico && <span>RT: {item.responsavelTecnico} {item.crea && `(CREA: ${item.crea})`}</span>}
                      {item.dataElaboracao && <span>Elaboração: {item.dataElaboracao}</span>}
                      {item.dataVigencia && <span>Vigência: {item.dataVigencia}</span>}
                    </div>
                    {item.agentesNocivos && (
                      <p style={{ fontSize:11, color:C.text, margin:"6px 0 0", borderLeft:`3px solid ${C.border}`, paddingLeft:8 }}>
                        <strong>Agentes:</strong> {item.agentesNocivos.slice(0, 120)}{item.agentesNocivos.length > 120 ? "..." : ""}
                      </p>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <Btn small outline onClick={() => abrirEditar(item)} icon={<Edit2 size={12}/>}>Editar</Btn>
                    <Btn small outline color={C.red} onClick={() => excluir(item.id)} icon={<Trash2 size={12}/>}>Excluir</Btn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={editItem ? "Editar Documento" : "Novo LTCAT / LIP / LTIP"} onClose={() => setModal(false)}>
          <Select label="Tipo *" value={form.tipo} onChange={f("tipo")} options={["LTCAT","LIP","LTIP"]} required />
          <Input label="Título *" value={form.titulo} onChange={f("titulo")} placeholder="Ex: LTCAT 2024 - Setor de Produção" required />
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Setor</p>
            <select value={form.setorId} onChange={e => f("setorId")(e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box", color:C.text, background:C.white }}>
              <option value="">Todos os setores</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <Input label="Responsável Técnico" value={form.responsavelTecnico} onChange={f("responsavelTecnico")} placeholder="Nome do engenheiro/técnico" />
          <Input label="CREA" value={form.crea} onChange={f("crea")} placeholder="Número do CREA" />
          <Input label="Data de Elaboração" value={form.dataElaboracao} onChange={f("dataElaboracao")} type="date" />
          <Input label="Data de Vigência" value={form.dataVigencia} onChange={f("dataVigencia")} type="date" />
          <Textarea label="Agentes Nocivos Identificados" value={form.agentesNocivos} onChange={f("agentesNocivos")} rows={4} placeholder="Liste os agentes físicos, químicos e biológicos identificados..." />
          <Textarea label="Metodologia" value={form.metodologia} onChange={f("metodologia")} rows={3} placeholder="Métodos e equipamentos utilizados nas avaliações..." />
          <Select label="Conclusão" value={form.conclusao} onChange={f("conclusao")} options={["Insalubre","Não Insalubre","Perigoso","Não Perigoso"]} />
          <Select label="Status" value={form.status} onChange={f("status")} options={["Vigente","Vencido","Em elaboração"]} />
          <Textarea label="Observações" value={form.observacoes} onChange={f("observacoes")} rows={2} />
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn outline onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={salvar}>{editItem ? "Salvar" : "Criar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
