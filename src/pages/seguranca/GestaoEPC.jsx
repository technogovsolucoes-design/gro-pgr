import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";
import { ShieldCheck, Plus, Edit2, Trash2, AlertTriangle, Wrench } from "lucide-react";

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

function Select({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom:12 }}>
      {label && <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>{label}</p>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box", color:C.text, background:C.white }}>
        <option value="">Selecione...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Textarea({ label, value, onChange, rows = 2 }) {
  return (
    <div style={{ marginBottom:12 }}>
      {label && <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>{label}</p>}
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
        style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", color:C.text }} />
    </div>
  );
}

const EPC_TIPOS = ["Enclausuramento","Ventilação","Proteção de Máquina","Sinalização","Extintor","Sprinkler","Chuveiro de Emergência","Outro"];

const VAZIO = {
  nome:"", tipo:"", setorId:"", fabricante:"", nSerie:"",
  dataInstalacao:"", dataProximaInspecao:"", status:"Operacional", responsavel:"", observacoes:""
};

function statusBadge(s) {
  if (s === "Operacional")    return { color:C.green, bg:"#dcfce7" };
  if (s === "Em Manutenção") return { color:C.amber, bg:"#fef3c7" };
  return                            { color:C.red,   bg:"#fee2e2" };
}

function inspecaoProxima(dataProximaInspecao) {
  if (!dataProximaInspecao) return false;
  const dias = Math.floor((new Date(dataProximaInspecao + "T12:00:00") - new Date()) / 86400000);
  return dias >= 0 && dias <= 30;
}

export default function GestaoEPC() {
  const { empresaAtiva, setores } = useApp();
  const [epcs, setEpcs] = useState([]);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [filtroStatus, setFiltroStatus] = useState("");

  useEffect(() => {
    if (!empresaAtiva) return;
    const q = query(collection(db, "empresas", empresaAtiva.id, "epcs"), orderBy("nome"));
    const unsub = onSnapshot(q, snap => setEpcs(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    return unsub;
  }, [empresaAtiva]);

  function abrirNovo() { setForm(VAZIO); setEditItem(null); setModal(true); }
  function abrirEditar(item) { setForm({ ...item }); setEditItem(item); setModal(true); }

  async function salvar() {
    if (!form.nome) return;
    if (editItem) {
      const { id, ...data } = form;
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "epcs", editItem.id), { ...data, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, "empresas", empresaAtiva.id, "epcs"), { ...form, criadoEm: serverTimestamp() });
    }
    setModal(false);
  }

  async function excluir(id) {
    if (!window.confirm("Excluir este EPC?")) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "epcs", id));
  }

  const f = (field) => (val) => setForm(p => ({ ...p, [field]:val }));
  const nomeSetor = (id) => setores.find(s => s.id === id)?.nome || id;

  if (!empresaAtiva) return <div style={{ padding:32, color:C.muted }}>Selecione uma empresa.</div>;

  const lista = filtroStatus ? epcs.filter(e => e.status === filtroStatus) : epcs;
  const total       = epcs.length;
  const operacionais = epcs.filter(e => e.status === "Operacional").length;
  const manutencao   = epcs.filter(e => e.status === "Em Manutenção").length;
  const inspecProxima = epcs.filter(e => inspecaoProxima(e.dataProximaInspecao)).length;

  return (
    <div style={{ padding:24, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <ShieldCheck size={22} color={C.navy} />
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:C.navy }}>Gestão de EPCs</h2>
            <p style={{ margin:0, fontSize:12, color:C.muted }}>Equipamentos de Proteção Coletiva</p>
          </div>
        </div>
        <Btn onClick={abrirNovo} icon={<Plus size={14}/>}>Novo EPC</Btn>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total",           value:total,         color:C.navy,  bg:"#dbeafe" },
          { label:"Operacionais",    value:operacionais,  color:C.green, bg:"#dcfce7" },
          { label:"Em Manutenção",   value:manutencao,    color:C.amber, bg:"#fef3c7" },
          { label:"Inspeção < 30d",  value:inspecProxima, color:C.red,   bg:"#fee2e2" },
        ].map(k => (
          <Card key={k.label} style={{ textAlign:"center" }}>
            <p style={{ margin:"0 0 4px", fontSize:24, fontWeight:700, color:k.color }}>{k.value}</p>
            <p style={{ margin:0, fontSize:11, color:C.muted }}>{k.label}</p>
          </Card>
        ))}
      </div>

      {/* Filtro */}
      <div style={{ marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
        <p style={{ fontSize:12, color:C.muted, margin:0 }}>Filtrar:</p>
        {["","Operacional","Em Manutenção","Inativo"].map(s => (
          <button key={s} onClick={() => setFiltroStatus(s)} style={{
            padding:"5px 12px", borderRadius:6, border:`1px solid ${filtroStatus === s ? C.navyMid : C.border}`,
            background: filtroStatus === s ? C.navyMid : C.white, color: filtroStatus === s ? C.white : C.text,
            cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:"inherit"
          }}>{s === "" ? "Todos" : s}</button>
        ))}
      </div>

      {lista.length === 0 ? (
        <Card><p style={{ textAlign:"center", color:C.muted, fontSize:13, margin:0 }}>Nenhum EPC encontrado.</p></Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {lista.map(item => {
            const sb = statusBadge(item.status);
            const alerta = inspecaoProxima(item.dataProximaInspecao);
            return (
              <Card key={item.id} style={{ border: alerta ? "1px solid #fbbf24" : undefined }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
                      <span style={{ fontWeight:700, fontSize:13, color:C.navy }}>{item.nome}</span>
                      <Badge label={item.tipo} color={C.navyMid} bg="#dbeafe" />
                      <Badge label={item.status} color={sb.color} bg={sb.bg} />
                      {alerta && <Badge label="Inspeção próxima" color={C.amber} bg="#fef3c7" />}
                    </div>
                    <div style={{ display:"flex", gap:16, flexWrap:"wrap", fontSize:11, color:C.muted }}>
                      {item.setorId && <span>Setor: {nomeSetor(item.setorId)}</span>}
                      {item.fabricante && <span>Fabricante: {item.fabricante}</span>}
                      {item.nSerie && <span>N° Série: {item.nSerie}</span>}
                      {item.dataInstalacao && <span>Instalação: {item.dataInstalacao}</span>}
                      {item.dataProximaInspecao && <span>Próx. Inspeção: {item.dataProximaInspecao}</span>}
                      {item.responsavel && <span>Responsável: {item.responsavel}</span>}
                    </div>
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
        <Modal title={editItem ? "Editar EPC" : "Novo EPC"} onClose={() => setModal(false)}>
          <Input label="Nome *" value={form.nome} onChange={f("nome")} placeholder="Ex: Extintor de Incêndio PQS 6kg" required />
          <Select label="Tipo" value={form.tipo} onChange={f("tipo")} options={EPC_TIPOS} />
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Setor</p>
            <select value={form.setorId} onChange={e => f("setorId")(e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box", color:C.text, background:C.white }}>
              <option value="">Selecione...</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <Input label="Fabricante" value={form.fabricante} onChange={f("fabricante")} placeholder="Fabricante / marca" />
          <Input label="Número de Série" value={form.nSerie} onChange={f("nSerie")} placeholder="N° de identificação" />
          <Input label="Data de Instalação" value={form.dataInstalacao} onChange={f("dataInstalacao")} type="date" />
          <Input label="Data da Próxima Inspeção" value={form.dataProximaInspecao} onChange={f("dataProximaInspecao")} type="date" />
          <Select label="Status" value={form.status} onChange={f("status")} options={["Operacional","Em Manutenção","Inativo"]} />
          <Input label="Responsável" value={form.responsavel} onChange={f("responsavel")} placeholder="Nome do responsável" />
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
