import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";
import { AlertOctagon, Plus, Edit2, Trash2, BarChart2 } from "lucide-react";

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:12, padding:24, width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
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

const TIPOS = ["Acidente com Afastamento","Acidente sem Afastamento","Incidente","Quase Acidente","Doença Ocupacional"];
const GRAVIDADES = ["Leve","Moderado","Grave","Fatal"];

const GRAV_CORES = {
  "Leve":     { color:C.green,  bg:"#dcfce7" },
  "Moderado": { color:C.amber,  bg:"#fef3c7" },
  "Grave":    { color:"#ea580c",bg:"#ffedd5" },
  "Fatal":    { color:C.red,    bg:"#fee2e2" },
};

const STATUS_CORES = {
  "Aberto":          { color:C.amber,    bg:"#fef3c7" },
  "Em Investigação": { color:C.navyMid,  bg:"#dbeafe" },
  "Encerrado":       { color:C.green,    bg:"#dcfce7" },
};

const VAZIO = {
  tipo:"", data:"", hora:"", setorId:"", funcionarioNome:"",
  descricao:"", causaImediata:"", causaBasica:"", medidas:"",
  gravidade:"Leve", diasAfastados:0, investigado:false, investigacaoTexto:"", status:"Aberto"
};

export default function Ocorrencias() {
  const { empresaAtiva, setores } = useApp();
  const [ocorrencias, setOcorrencias] = useState([]);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(VAZIO);

  useEffect(() => {
    if (!empresaAtiva) return;
    const q = query(collection(db, "empresas", empresaAtiva.id, "ocorrencias"), orderBy("data", "desc"));
    const unsub = onSnapshot(q, snap => setOcorrencias(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    return unsub;
  }, [empresaAtiva]);

  function abrirNovo() { setForm(VAZIO); setEditItem(null); setModal(true); }
  function abrirEditar(item) { setForm({ ...item }); setEditItem(item); setModal(true); }

  async function salvar() {
    if (!form.tipo || !form.data) return;
    const payload = { ...form, diasAfastados: Number(form.diasAfastados) || 0 };
    if (editItem) {
      const { id, ...data } = payload;
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "ocorrencias", editItem.id), { ...data, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, "empresas", empresaAtiva.id, "ocorrencias"), { ...payload, criadoEm: serverTimestamp() });
    }
    setModal(false);
  }

  async function excluir(id) {
    if (!window.confirm("Excluir esta ocorrência?")) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "ocorrencias", id));
  }

  const f = (field) => (val) => setForm(p => ({ ...p, [field]:val }));
  const nomeSetor = (id) => setores.find(s => s.id === id)?.nome || id;

  if (!empresaAtiva) return <div style={{ padding:32, color:C.muted }}>Selecione uma empresa.</div>;

  const total       = ocorrencias.length;
  const comAfastamento = ocorrencias.filter(o => o.tipo === "Acidente com Afastamento").length;
  const diasPerdidos   = ocorrencias.reduce((s, o) => s + (Number(o.diasAfastados) || 0), 0);
  // Taxa de frequência simulada (acidentes com e sem afastamento × 1.000.000 / horas trabalhadas estimadas)
  const taxaFreq = total > 0 ? ((comAfastamento / Math.max(total * 200, 1)) * 1000000).toFixed(0) : 0;

  // Gráfico por tipo
  const contagemTipos = TIPOS.map(t => ({ label: t, count: ocorrencias.filter(o => o.tipo === t).length }));
  const maxCount = Math.max(...contagemTipos.map(t => t.count), 1);

  return (
    <div style={{ padding:24, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <AlertOctagon size={22} color={C.navy} />
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:C.navy }}>Controle de Ocorrências</h2>
            <p style={{ margin:0, fontSize:12, color:C.muted }}>Acidentes, Incidentes e Doenças Ocupacionais</p>
          </div>
        </div>
        <Btn onClick={abrirNovo} icon={<Plus size={14}/>}>Nova Ocorrência</Btn>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total de Ocorrências", value:total,           color:C.navy  },
          { label:"Acid. c/ Afastamento", value:comAfastamento,  color:C.red   },
          { label:"Dias Perdidos",         value:diasPerdidos,    color:C.amber },
          { label:"Taxa de Frequência",    value:taxaFreq,        color:"#7c3aed" },
        ].map(k => (
          <Card key={k.label} style={{ textAlign:"center" }}>
            <p style={{ margin:"0 0 4px", fontSize:24, fontWeight:700, color:k.color }}>{k.value}</p>
            <p style={{ margin:0, fontSize:11, color:C.muted }}>{k.label}</p>
          </Card>
        ))}
      </div>

      {/* Gráfico de barras simples */}
      {total > 0 && (
        <Card style={{ marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <BarChart2 size={14} color={C.navy} />
            <p style={{ margin:0, fontSize:12, fontWeight:600, color:C.navy }}>Distribuição por Tipo</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {contagemTipos.map(t => (
              <div key={t.label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <p style={{ margin:0, fontSize:11, color:C.text, minWidth:200, flexShrink:0 }}>{t.label}</p>
                <div style={{ flex:1, background:C.bg, borderRadius:4, height:16, overflow:"hidden" }}>
                  <div style={{ height:"100%", background:C.navyMid, width:`${(t.count / maxCount) * 100}%`, borderRadius:4, transition:"width 0.3s" }} />
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:C.navy, minWidth:20, textAlign:"right" }}>{t.count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Lista */}
      {ocorrencias.length === 0 ? (
        <Card><p style={{ textAlign:"center", color:C.muted, fontSize:13, margin:0 }}>Nenhuma ocorrência registrada.</p></Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {ocorrencias.map(item => {
            const gc = GRAV_CORES[item.gravidade] || GRAV_CORES["Leve"];
            const sc = STATUS_CORES[item.status] || STATUS_CORES["Aberto"];
            return (
              <Card key={item.id}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
                      <Badge label={item.tipo} color={C.navyMid} bg="#dbeafe" />
                      <Badge label={item.gravidade} color={gc.color} bg={gc.bg} />
                      <Badge label={item.status} color={sc.color} bg={sc.bg} />
                      {item.investigado && <Badge label="Investigado" color={C.green} bg="#dcfce7" />}
                    </div>
                    <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:600 }}>{item.funcionarioNome || "Funcionário não especificado"}</p>
                    <div style={{ display:"flex", gap:16, flexWrap:"wrap", fontSize:11, color:C.muted }}>
                      {item.data && <span>{item.data}{item.hora && ` às ${item.hora}`}</span>}
                      {item.setorId && <span>Setor: {nomeSetor(item.setorId)}</span>}
                      {item.diasAfastados > 0 && <span>Afastamento: {item.diasAfastados} dia(s)</span>}
                    </div>
                    {item.descricao && <p style={{ fontSize:11, color:C.text, margin:"6px 0 0", borderLeft:`3px solid ${C.border}`, paddingLeft:8 }}>{item.descricao.slice(0, 200)}</p>}
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
        <Modal title={editItem ? "Editar Ocorrência" : "Nova Ocorrência"} onClose={() => setModal(false)}>
          <Select label="Tipo *" value={form.tipo} onChange={f("tipo")} options={TIPOS} />
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1 }}><Input label="Data *" value={form.data} onChange={f("data")} type="date" required /></div>
            <div style={{ flex:1 }}><Input label="Hora" value={form.hora} onChange={f("hora")} type="time" /></div>
          </div>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Setor</p>
            <select value={form.setorId} onChange={e => f("setorId")(e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box", color:C.text, background:C.white }}>
              <option value="">Selecione...</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <Input label="Nome do Funcionário" value={form.funcionarioNome} onChange={f("funcionarioNome")} placeholder="Nome completo" />
          <Textarea label="Descrição da Ocorrência" value={form.descricao} onChange={f("descricao")} rows={3} placeholder="Descreva o que aconteceu..." />
          <Textarea label="Causa Imediata" value={form.causaImediata} onChange={f("causaImediata")} rows={2} placeholder="Ato ou condição insegura direta..." />
          <Textarea label="Causa Básica / Raiz" value={form.causaBasica} onChange={f("causaBasica")} rows={2} placeholder="Fator organizacional ou pessoal..." />
          <Textarea label="Ações Corretivas" value={form.medidas} onChange={f("medidas")} rows={3} placeholder="Medidas preventivas e corretivas adotadas..." />
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1 }}><Select label="Gravidade" value={form.gravidade} onChange={f("gravidade")} options={GRAVIDADES} /></div>
            <div style={{ flex:1 }}><Input label="Dias de Afastamento" value={form.diasAfastados} onChange={f("diasAfastados")} type="number" placeholder="0" /></div>
          </div>
          <div style={{ marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
            <input type="checkbox" id="investigado" checked={!!form.investigado} onChange={e => f("investigado")(e.target.checked)} />
            <label htmlFor="investigado" style={{ fontSize:12, color:C.text }}>Ocorrência investigada</label>
          </div>
          {form.investigado && (
            <Textarea label="Relatório de Investigação" value={form.investigacaoTexto} onChange={f("investigacaoTexto")} rows={3} placeholder="Descreva os resultados da investigação..." />
          )}
          <Select label="Status" value={form.status} onChange={f("status")} options={["Aberto","Em Investigação","Encerrado"]} />
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn outline onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={salvar}>{editItem ? "Salvar" : "Registrar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
