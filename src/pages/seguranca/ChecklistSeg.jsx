import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";
import { ClipboardCheck, Plus, Edit2, Trash2, CheckCircle, XCircle, MinusCircle } from "lucide-react";

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:12, padding:24, width:"100%", maxWidth:580, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
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

const TIPOS_CHECKLIST = ["Inspeção de EPI","Inspeção de EPC","Inspeção de Máquinas","CIPA","Emergência","Personalizado"];

const ITENS_PADRAO = {
  "Inspeção de EPI": [
    "EPIs disponíveis e organizados no local",
    "CAs (Certificados de Aprovação) dentro da validade",
    "EPIs em boas condições de conservação",
    "Fichas de entrega de EPI atualizadas e assinadas",
    "Funcionários treinados no uso correto dos EPIs",
    "EPIs adequados aos riscos do setor",
    "Armazenamento correto dos EPIs",
    "Higienização periódica dos EPIs realizada",
  ],
  "Inspeção de EPC": [
    "EPCs sinalizados e identificados",
    "Extintores dentro do prazo de validade e carga",
    "Saídas de emergência desobstruídas e sinalizadas",
    "Chuveiros e lava-olhos em condições operacionais",
    "Proteções de máquinas e equipamentos instaladas",
    "Sistema de ventilação em funcionamento",
    "Iluminação de emergência operacional",
    "EPCs registrados no inventário",
  ],
  "Inspeção de Máquinas": [
    "Dispositivos de segurança (proteções, travas) instalados",
    "Botões de parada de emergência acessíveis e funcionais",
    "Proteções de partes móveis instaladas",
    "Placa de identificação e especificação afixada",
    "Manutenção preventiva em dia (registros disponíveis)",
    "Operadores treinados e habilitados (NR-12)",
    "Área ao redor da máquina organizada e sinalizada",
    "Ausência de vazamentos de óleo, fluidos e gases",
  ],
  "CIPA": [
    "Reunião mensal realizada e ata registrada",
    "Mural da CIPA atualizado",
    "Membros identificados e com mandato vigente",
    "Mapa de riscos atualizado e afixado",
    "Atas de reuniões arquivadas",
    "Registro de candidatos para eleição (quando aplicável)",
    "Treinamento dos membros realizado",
    "Denúncias/sugestões encaminhadas e respondidas",
  ],
  "Emergência": [
    "Plano de emergência atualizado e divulgado",
    "Brigada de emergência treinada",
    "Rotas de fuga sinalizadas e desobstruídas",
    "Extintores nos pontos corretos conforme projeto",
    "Ponto de encontro definido e comunicado",
    "Exercício de evacuação realizado nos últimos 12 meses",
    "Caixas de primeiros socorros completas",
    "Hidrantes e sprinklers operacionais",
  ],
  "Personalizado": [],
};

function calcConformidade(itens) {
  if (!itens || itens.length === 0) return null;
  const aplicaveis = itens.filter(i => i.situacao !== "na");
  if (aplicaveis.length === 0) return null;
  const conformes = aplicaveis.filter(i => i.situacao === "conforme").length;
  return Math.round((conformes / aplicaveis.length) * 100);
}

const VAZIO_FORM = { nome:"", setorId:"", tipo:"", responsavel:"", data:"" };

export default function ChecklistSeg() {
  const { empresaAtiva, setores } = useApp();
  const [checklists, setChecklists] = useState([]);
  const [modalNovo, setModalNovo] = useState(false);
  const [modalPreench, setModalPreench] = useState(false);
  const [form, setForm] = useState(VAZIO_FORM);
  const [itensForm, setItensForm] = useState([]);
  const [novoItem, setNovoItem] = useState("");
  const [checkAtual, setCheckAtual] = useState(null);

  useEffect(() => {
    if (!empresaAtiva) return;
    const q = query(collection(db, "empresas", empresaAtiva.id, "checklists"), orderBy("data", "desc"));
    const unsub = onSnapshot(q, snap => setChecklists(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    return unsub;
  }, [empresaAtiva]);

  function handleTipoChange(tipo) {
    setForm(p => ({ ...p, tipo }));
    const padrao = (ITENS_PADRAO[tipo] || []).map(desc => ({ descricao:desc, situacao:"", observacao:"" }));
    setItensForm(padrao);
  }

  function addItem() {
    if (!novoItem.trim()) return;
    setItensForm(p => [...p, { descricao:novoItem.trim(), situacao:"", observacao:"" }]);
    setNovoItem("");
  }

  function removeItem(idx) {
    setItensForm(p => p.filter((_, i) => i !== idx));
  }

  function setSituacao(idx, situacao) {
    setItensForm(p => p.map((it, i) => i === idx ? { ...it, situacao } : it));
  }

  function setObsItem(idx, observacao) {
    setItensForm(p => p.map((it, i) => i === idx ? { ...it, observacao } : it));
  }

  async function salvarNovo() {
    if (!form.nome || !form.tipo || !form.data) return;
    await addDoc(collection(db, "empresas", empresaAtiva.id, "checklists"), {
      ...form, itens: itensForm, criadoEm: serverTimestamp()
    });
    setModalNovo(false);
    setForm(VAZIO_FORM);
    setItensForm([]);
  }

  function abrirPreench(item) {
    setCheckAtual(item);
    setItensForm(item.itens ? item.itens.map(it => ({ ...it })) : []);
    setModalPreench(true);
  }

  async function salvarPreench() {
    if (!checkAtual) return;
    await updateDoc(doc(db, "empresas", empresaAtiva.id, "checklists", checkAtual.id), {
      itens: itensForm, updatedAt: serverTimestamp()
    });
    setModalPreench(false);
  }

  async function excluir(id) {
    if (!window.confirm("Excluir este checklist?")) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "checklists", id));
  }

  const ff = (field) => (val) => setForm(p => ({ ...p, [field]:val }));
  const nomeSetor = (id) => setores.find(s => s.id === id)?.nome || id;

  if (!empresaAtiva) return <div style={{ padding:32, color:C.muted }}>Selecione uma empresa.</div>;

  return (
    <div style={{ padding:24, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <ClipboardCheck size={22} color={C.navy} />
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:C.navy }}>Checklists de Segurança</h2>
            <p style={{ margin:0, fontSize:12, color:C.muted }}>Inspeções e verificações de segurança</p>
          </div>
        </div>
        <Btn onClick={() => { setForm(VAZIO_FORM); setItensForm([]); setModalNovo(true); }} icon={<Plus size={14}/>}>Novo Checklist</Btn>
      </div>

      {checklists.length === 0 ? (
        <Card><p style={{ textAlign:"center", color:C.muted, fontSize:13, margin:0 }}>Nenhum checklist realizado.</p></Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {checklists.map(item => {
            const perc = calcConformidade(item.itens);
            const percColor = perc === null ? C.muted : perc >= 80 ? C.green : perc >= 60 ? C.amber : C.red;
            return (
              <Card key={item.id}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
                      <span style={{ fontWeight:700, fontSize:13, color:C.navy }}>{item.nome}</span>
                      <Badge label={item.tipo} color={C.navyMid} bg="#dbeafe" />
                      {perc !== null && (
                        <span style={{ fontSize:11, fontWeight:700, color:percColor }}>
                          {perc}% conformidade
                        </span>
                      )}
                    </div>
                    <div style={{ display:"flex", gap:16, flexWrap:"wrap", fontSize:11, color:C.muted }}>
                      {item.data && <span>{item.data}</span>}
                      {item.setorId && <span>Setor: {nomeSetor(item.setorId)}</span>}
                      {item.responsavel && <span>Responsável: {item.responsavel}</span>}
                      {item.itens && <span>{item.itens.length} item(ns)</span>}
                    </div>
                    {perc !== null && (
                      <div style={{ marginTop:8, background:C.bg, borderRadius:4, height:6, overflow:"hidden", maxWidth:300 }}>
                        <div style={{ height:"100%", background:percColor, width:`${perc}%`, borderRadius:4 }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <Btn small outline onClick={() => abrirPreench(item)} icon={<Edit2 size={12}/>}>Preencher</Btn>
                    <Btn small outline color={C.red} onClick={() => excluir(item.id)} icon={<Trash2 size={12}/>}>Excluir</Btn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Novo Checklist */}
      {modalNovo && (
        <Modal title="Novo Checklist de Segurança" onClose={() => setModalNovo(false)}>
          <Input label="Nome do Checklist *" value={form.nome} onChange={ff("nome")} placeholder="Ex: Inspeção Semanal EPI — Produção" required />
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Tipo *</p>
            <select value={form.tipo} onChange={e => handleTipoChange(e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box", color:C.text, background:C.white }}>
              <option value="">Selecione o tipo...</option>
              {TIPOS_CHECKLIST.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Setor</p>
            <select value={form.setorId} onChange={e => ff("setorId")(e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box", color:C.text, background:C.white }}>
              <option value="">Todos os setores</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <Input label="Responsável" value={form.responsavel} onChange={ff("responsavel")} placeholder="Nome do responsável" />
          <Input label="Data *" value={form.data} onChange={ff("data")} type="date" required />

          {/* Itens */}
          {itensForm.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <p style={{ fontSize:11, color:C.muted, margin:"0 0 8px", fontWeight:500 }}>Itens do Checklist</p>
              {itensForm.map((item, idx) => (
                <div key={idx} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, padding:"6px 8px", background:C.bg, borderRadius:6 }}>
                  <span style={{ flex:1, fontSize:12, color:C.text }}>{item.descricao}</span>
                  <button onClick={() => removeItem(idx)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:14, padding:0 }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Adicionar item */}
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            <input value={novoItem} onChange={e => setNovoItem(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()}
              placeholder="Adicionar item ao checklist..."
              style={{ flex:1, padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", color:C.text }} />
            <Btn small onClick={addItem} icon={<Plus size={12}/>}>Add</Btn>
          </div>

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn outline onClick={() => setModalNovo(false)}>Cancelar</Btn>
            <Btn onClick={salvarNovo}>Criar Checklist</Btn>
          </div>
        </Modal>
      )}

      {/* Modal Preenchimento */}
      {modalPreench && checkAtual && (
        <Modal title={`Preencher: ${checkAtual.nome}`} onClose={() => setModalPreench(false)}>
          <div style={{ marginBottom:12 }}>
            {itensForm.length === 0 ? (
              <p style={{ fontSize:12, color:C.muted, textAlign:"center" }}>Nenhum item neste checklist.</p>
            ) : (
              itensForm.map((item, idx) => (
                <div key={idx} style={{ marginBottom:12, padding:10, background:C.bg, borderRadius:8, border:`1px solid ${C.border}` }}>
                  <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:600, color:C.text }}>{item.descricao}</p>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
                    {[
                      { key:"conforme",    label:"Conforme",     icon:<CheckCircle size={12}/>, color:C.green   },
                      { key:"naoConforme", label:"Não Conforme", icon:<XCircle size={12}/>,     color:C.red     },
                      { key:"na",          label:"N/A",          icon:<MinusCircle size={12}/>,  color:C.gray    },
                    ].map(opt => (
                      <button key={opt.key} onClick={() => setSituacao(idx, opt.key)} style={{
                        display:"flex", alignItems:"center", gap:4,
                        padding:"5px 10px", borderRadius:6, border:`1px solid ${item.situacao === opt.key ? opt.color : C.border}`,
                        background: item.situacao === opt.key ? `${opt.color}15` : C.white,
                        color: item.situacao === opt.key ? opt.color : C.muted,
                        cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:"inherit"
                      }}>{opt.icon}{opt.label}</button>
                    ))}
                  </div>
                  {(item.situacao === "naoConforme" || item.situacao === "conforme") && (
                    <input value={item.observacao || ""} onChange={e => setObsItem(idx, e.target.value)}
                      placeholder="Observação (opcional)..."
                      style={{ width:"100%", padding:"6px 8px", borderRadius:5, border:`1px solid ${C.border}`, fontSize:11, fontFamily:"inherit", boxSizing:"border-box", color:C.text }} />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Resumo de conformidade */}
          {itensForm.length > 0 && (() => {
            const perc = calcConformidade(itensForm);
            const percColor = perc === null ? C.muted : perc >= 80 ? C.green : perc >= 60 ? C.amber : C.red;
            return (
              <div style={{ padding:"10px 12px", background:C.bg, borderRadius:8, marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:12, color:C.muted }}>Conformidade atual:</span>
                <span style={{ fontSize:18, fontWeight:700, color:percColor }}>{perc !== null ? `${perc}%` : "—"}</span>
              </div>
            );
          })()}

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn outline onClick={() => setModalPreench(false)}>Cancelar</Btn>
            <Btn onClick={salvarPreench}>Salvar Checklist</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
