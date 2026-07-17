import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";
import { FileSignature, Plus, Edit2, Trash2, CheckCircle, Filter } from "lucide-react";

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
  numero:"", funcionarioNome:"", setorId:"", cargo:"",
  dataEmissao:"", riscos:"", epis:"", instrucoes:"",
  responsavelSST:"", assinadoPor:"", dataAssinatura:"", status:"Emitida"
};

function statusBadge(s) {
  if (s === "Assinada")           return { color:C.green, bg:"#dcfce7" };
  if (s === "Renovação Necessária") return { color:C.red,   bg:"#fee2e2" };
  return                                  { color:C.amber, bg:"#fef3c7" };
}

export default function OrdemServico() {
  const { empresaAtiva, setores } = useApp();
  const [ordens, setOrdens] = useState([]);
  const [modal, setModal] = useState(false);
  const [modalAssinatura, setModalAssinatura] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [assinanteNome, setAssinanteNome] = useState("");
  const [ordemAssinar, setOrdemAssinar] = useState(null);
  const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  useEffect(() => {
    if (!empresaAtiva) return;
    const q = query(collection(db, "empresas", empresaAtiva.id, "ordens_servico"), orderBy("dataEmissao", "desc"));
    const unsub = onSnapshot(q, snap => setOrdens(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    return unsub;
  }, [empresaAtiva]);

  function gerarNumero(lista) {
    if (!lista.length) return "OS-001";
    const nums = lista.map(o => {
      const n = parseInt((o.numero || "").replace("OS-", ""), 10);
      return isNaN(n) ? 0 : n;
    });
    return `OS-${String(Math.max(...nums) + 1).padStart(3, "0")}`;
  }

  function abrirNovo() {
    const numero = gerarNumero(ordens);
    const hoje = new Date().toISOString().slice(0, 10);
    setForm({ ...VAZIO, numero, dataEmissao: hoje });
    setEditItem(null);
    setModal(true);
  }

  function abrirEditar(item) { setForm({ ...item }); setEditItem(item); setModal(true); }

  async function salvar() {
    if (!form.funcionarioNome || !form.cargo) return;
    if (editItem) {
      const { id, ...data } = form;
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "ordens_servico", editItem.id), { ...data, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, "empresas", empresaAtiva.id, "ordens_servico"), { ...form, criadoEm: serverTimestamp() });
    }
    setModal(false);
  }

  async function excluir(id) {
    if (!window.confirm("Excluir esta OS?")) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "ordens_servico", id));
  }

  function abrirAssinar(item) { setOrdemAssinar(item); setAssinanteNome(""); setModalAssinatura(true); }

  async function confirmarAssinatura() {
    if (!assinanteNome || !ordemAssinar) return;
    const hoje = new Date().toISOString().slice(0, 10);
    await updateDoc(doc(db, "empresas", empresaAtiva.id, "ordens_servico", ordemAssinar.id), {
      status:"Assinada", assinadoPor:assinanteNome, dataAssinatura:hoje
    });
    setModalAssinatura(false);
  }

  const f = (field) => (val) => setForm(p => ({ ...p, [field]:val }));
  const nomeSetor = (id) => setores.find(s => s.id === id)?.nome || id;

  if (!empresaAtiva) return <div style={{ padding:32, color:C.muted }}>Selecione uma empresa.</div>;

  const lista = ordens
    .filter(o => !filtroSetor || o.setorId === filtroSetor)
    .filter(o => !filtroStatus || o.status === filtroStatus);

  return (
    <div style={{ padding:24, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <FileSignature size={22} color={C.navy} />
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:C.navy }}>Ordem de Serviço</h2>
            <p style={{ margin:0, fontSize:12, color:C.muted }}>NR-1 — Instrução de Segurança ao Funcionário</p>
          </div>
        </div>
        <Btn onClick={abrirNovo} icon={<Plus size={14}/>}>Nova OS</Btn>
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <Filter size={14} color={C.muted} />
          <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} style={{ padding:"6px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:11, fontFamily:"inherit", color:C.text, background:C.white }}>
            <option value="">Todos os setores</option>
            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ padding:"6px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:11, fontFamily:"inherit", color:C.text, background:C.white }}>
            <option value="">Todos os status</option>
            {["Emitida","Assinada","Renovação Necessária"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <span style={{ fontSize:11, color:C.muted }}>{lista.length} OS(s)</span>
      </div>

      {lista.length === 0 ? (
        <Card><p style={{ textAlign:"center", color:C.muted, fontSize:13, margin:0 }}>Nenhuma Ordem de Serviço encontrada.</p></Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {lista.map(item => {
            const sb = statusBadge(item.status);
            return (
              <Card key={item.id}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
                      <span style={{ fontWeight:700, fontSize:13, color:C.navy, fontFamily:"monospace" }}>{item.numero}</span>
                      <Badge label={item.status} color={sb.color} bg={sb.bg} />
                    </div>
                    <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:600 }}>{item.funcionarioNome}</p>
                    <div style={{ display:"flex", gap:16, flexWrap:"wrap", fontSize:11, color:C.muted }}>
                      {item.cargo && <span>Cargo: {item.cargo}</span>}
                      {item.setorId && <span>Setor: {nomeSetor(item.setorId)}</span>}
                      {item.dataEmissao && <span>Emissão: {item.dataEmissao}</span>}
                      {item.responsavelSST && <span>SST: {item.responsavelSST}</span>}
                      {item.status === "Assinada" && item.assinadoPor && <span>Assinado por: {item.assinadoPor} em {item.dataAssinatura}</span>}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0, flexWrap:"wrap" }}>
                    {item.status !== "Assinada" && (
                      <Btn small color={C.green} onClick={() => abrirAssinar(item)} icon={<CheckCircle size={12}/>}>Assinar</Btn>
                    )}
                    <Btn small outline onClick={() => abrirEditar(item)} icon={<Edit2 size={12}/>}>Editar</Btn>
                    <Btn small outline color={C.red} onClick={() => excluir(item.id)} icon={<Trash2 size={12}/>}>Excluir</Btn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal OS */}
      {modal && (
        <Modal title={editItem ? "Editar OS" : "Nova Ordem de Serviço"} onClose={() => setModal(false)}>
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1 }}>
              <Input label="Número" value={form.numero} onChange={f("numero")} placeholder="OS-001" />
            </div>
            <div style={{ flex:1 }}>
              <Input label="Data de Emissão" value={form.dataEmissao} onChange={f("dataEmissao")} type="date" />
            </div>
          </div>
          <Input label="Nome do Funcionário *" value={form.funcionarioNome} onChange={f("funcionarioNome")} placeholder="Nome completo" required />
          <Input label="Cargo *" value={form.cargo} onChange={f("cargo")} placeholder="Cargo / função" required />
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Setor</p>
            <select value={form.setorId} onChange={e => f("setorId")(e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box", color:C.text, background:C.white }}>
              <option value="">Selecione...</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <Textarea label="Principais Riscos da Função" value={form.riscos} onChange={f("riscos")} rows={3} placeholder="Liste os riscos identificados para o cargo..." />
          <Textarea label="EPIs Obrigatórios" value={form.epis} onChange={f("epis")} rows={3} placeholder="Liste os EPIs necessários para o cargo..." />
          <Textarea label="Instruções de Segurança" value={form.instrucoes} onChange={f("instrucoes")} rows={4} placeholder="Procedimentos, normas e instruções de segurança..." />
          <Input label="Responsável SST" value={form.responsavelSST} onChange={f("responsavelSST")} placeholder="Nome do responsável pela elaboração" />
          <Select label="Status" value={form.status} onChange={f("status")} options={["Emitida","Assinada","Renovação Necessária"]} />
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn outline onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={salvar}>{editItem ? "Salvar" : "Emitir OS"}</Btn>
          </div>
        </Modal>
      )}

      {/* Modal Assinatura */}
      {modalAssinatura && (
        <Modal title="Registrar Assinatura" onClose={() => setModalAssinatura(false)}>
          <p style={{ fontSize:13, color:C.text, margin:"0 0 16px" }}>
            Confirmar assinatura da OS <strong>{ordemAssinar?.numero}</strong> por {ordemAssinar?.funcionarioNome}.
          </p>
          <Input label="Nome do Assinante *" value={assinanteNome} onChange={setAssinanteNome} placeholder="Nome completo de quem assinou" required />
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn outline onClick={() => setModalAssinatura(false)}>Cancelar</Btn>
            <Btn color={C.green} onClick={confirmarAssinatura} icon={<CheckCircle size={14}/>}>Confirmar Assinatura</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
