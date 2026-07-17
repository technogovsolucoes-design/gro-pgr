import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";
import { Users, Plus, Edit2, Trash2, AlertTriangle, ShieldAlert } from "lucide-react";

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

const NIVEIS = ["Baixo","Médio","Alto","Crítico"];

const NIVEL_CORES = {
  "Baixo":    { color:C.green, bg:"#dcfce7" },
  "Médio":    { color:C.amber, bg:"#fef3c7" },
  "Alto":     { color:"#ea580c", bg:"#ffedd5" },
  "Crítico":  { color:C.red,   bg:"#fee2e2" },
};

const VAZIO = {
  nome:"", descricao:"", setorId:"", cargos:"", agentes:"",
  nivelRisco:"Baixo", medidasControle:"", responsavel:"", dataAvaliacao:""
};

function isVencida(dataAvaliacao) {
  if (!dataAvaliacao) return false;
  const dias = Math.floor((new Date() - new Date(dataAvaliacao + "T12:00:00")) / 86400000);
  return dias > 365;
}

export default function AvaliacaoGHE() {
  const { empresaAtiva, setores } = useApp();
  const [ghe, setGhe] = useState([]);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(VAZIO);

  useEffect(() => {
    if (!empresaAtiva) return;
    const q = query(collection(db, "empresas", empresaAtiva.id, "ghe"), orderBy("nome"));
    const unsub = onSnapshot(q, snap => setGhe(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    return unsub;
  }, [empresaAtiva]);

  function abrirNovo() { setForm(VAZIO); setEditItem(null); setModal(true); }
  function abrirEditar(item) { setForm({ ...item }); setEditItem(item); setModal(true); }

  async function salvar() {
    if (!form.nome) return;
    const col = collection(db, "empresas", empresaAtiva.id, "ghe");
    if (editItem) {
      const { id, ...data } = form;
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "ghe", editItem.id), { ...data, updatedAt: serverTimestamp() });
    } else {
      await addDoc(col, { ...form, criadoEm: serverTimestamp() });
    }
    setModal(false);
  }

  async function excluir(id) {
    if (!window.confirm("Excluir este GHE?")) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "ghe", id));
  }

  const f = (field) => (val) => setForm(p => ({ ...p, [field]:val }));
  const nomeSetor = (id) => setores.find(s => s.id === id)?.nome || id;

  if (!empresaAtiva) return <div style={{ padding:32, color:C.muted }}>Selecione uma empresa.</div>;

  const total = ghe.length;
  const criticos = ghe.filter(g => g.nivelRisco === "Crítico").length;
  const vencidos = ghe.filter(g => isVencida(g.dataAvaliacao)).length;

  return (
    <div style={{ padding:24, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <ShieldAlert size={22} color={C.navy} />
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:C.navy }}>Avaliação por GHE</h2>
            <p style={{ margin:0, fontSize:12, color:C.muted }}>Grupos Homogêneos de Exposição</p>
          </div>
        </div>
        <Btn onClick={abrirNovo} icon={<Plus size={14}/>}>Novo GHE</Btn>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total de GHEs", value:total, color:C.navy, bg:"#dbeafe" },
          { label:"GHEs Críticos", value:criticos, color:C.red, bg:"#fee2e2" },
          { label:"Avaliação Vencida (>12m)", value:vencidos, color:C.amber, bg:"#fef3c7" },
        ].map(k => (
          <Card key={k.label} style={{ textAlign:"center" }}>
            <p style={{ margin:"0 0 4px", fontSize:24, fontWeight:700, color:k.color }}>{k.value}</p>
            <p style={{ margin:0, fontSize:11, color:C.muted }}>{k.label}</p>
          </Card>
        ))}
      </div>

      {ghe.length === 0 ? (
        <Card>
          <p style={{ textAlign:"center", color:C.muted, fontSize:13, margin:0 }}>Nenhum GHE cadastrado.</p>
        </Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {ghe.map(item => {
            const nc = NIVEL_CORES[item.nivelRisco] || NIVEL_CORES["Baixo"];
            const venc = isVencida(item.dataAvaliacao);
            return (
              <Card key={item.id} style={{ border: venc ? "1px solid #fbbf24" : undefined }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
                      <span style={{ fontWeight:700, fontSize:13, color:C.navy }}>{item.nome}</span>
                      <Badge label={item.nivelRisco} color={nc.color} bg={nc.bg} />
                      {venc && <Badge label="Avaliação vencida" color={C.amber} bg="#fef3c7" />}
                    </div>
                    <div style={{ display:"flex", gap:16, flexWrap:"wrap", fontSize:11, color:C.muted, marginBottom:4 }}>
                      {item.setorId && <span>Setor: {nomeSetor(item.setorId)}</span>}
                      {item.responsavel && <span>Responsável: {item.responsavel}</span>}
                      {item.dataAvaliacao && <span>Avaliação: {item.dataAvaliacao}</span>}
                    </div>
                    {item.descricao && <p style={{ fontSize:11, color:C.text, margin:"4px 0 0" }}>{item.descricao}</p>}
                    {item.agentes && (
                      <p style={{ fontSize:11, color:C.text, margin:"4px 0 0", borderLeft:`3px solid ${C.border}`, paddingLeft:8 }}>
                        <strong>Agentes:</strong> {item.agentes.slice(0, 150)}{item.agentes.length > 150 ? "..." : ""}
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
        <Modal title={editItem ? "Editar GHE" : "Novo GHE"} onClose={() => setModal(false)}>
          <Input label="Nome do GHE *" value={form.nome} onChange={f("nome")} placeholder="Ex: GHE-01 Operadores de Máquinas" required />
          <Textarea label="Descrição" value={form.descricao} onChange={f("descricao")} rows={2} placeholder="Descreva as atividades do grupo..." />
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Setor</p>
            <select value={form.setorId} onChange={e => f("setorId")(e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box", color:C.text, background:C.white }}>
              <option value="">Todos os setores</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <Textarea label="Cargos do GHE" value={form.cargos} onChange={f("cargos")} rows={3} placeholder="Liste os cargos pertencentes a este GHE..." />
          <Textarea label="Agentes de Risco" value={form.agentes} onChange={f("agentes")} rows={4} placeholder="Físico, Químico, Biológico, Ergonômico, Mecânico, Psicossocial..." />
          <Select label="Nível de Risco" value={form.nivelRisco} onChange={f("nivelRisco")} options={NIVEIS} />
          <Textarea label="Medidas de Controle" value={form.medidasControle} onChange={f("medidasControle")} rows={3} placeholder="Descreva as medidas de controle adotadas..." />
          <Input label="Responsável pela Avaliação" value={form.responsavel} onChange={f("responsavel")} placeholder="Nome do responsável" />
          <Input label="Data da Avaliação" value={form.dataAvaliacao} onChange={f("dataAvaliacao")} type="date" />
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn outline onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={salvar}>{editItem ? "Salvar" : "Criar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
