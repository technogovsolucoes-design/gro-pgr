import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";
import { Shield, Users, CalendarDays, Vote, Plus, Edit2, Trash2, ThumbsUp } from "lucide-react";

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

const VAZIO_MEMBRO = { nome:"", cargo:"", setor:"", tipo:"Empregado", funcao:"Membro", mandatoInicio:"", mandatoFim:"", status:"Ativo", votos:0 };
const VAZIO_REUNIAO = { data:"", pauta:"", ata:"", participantes:"", status:"Programada" };

const TABS = ["Membros","Reuniões","Votação"];

export default function CIPA() {
  const { empresaAtiva, setores } = useApp();
  const [tab, setTab] = useState("Membros");
  const [membros, setMembros] = useState([]);
  const [reunioes, setReunioes] = useState([]);
  const [votacaoAberta, setVotacaoAberta] = useState(false);
  const [modalMembro, setModalMembro] = useState(false);
  const [modalReuniao, setModalReuniao] = useState(false);
  const [editMembro, setEditMembro] = useState(null);
  const [editReuniao, setEditReuniao] = useState(null);
  const [formMembro, setFormMembro] = useState(VAZIO_MEMBRO);
  const [formReuniao, setFormReuniao] = useState(VAZIO_REUNIAO);

  useEffect(() => {
    if (!empresaAtiva) return;
    const unsubM = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "cipa_membros"), orderBy("nome")),
      snap => setMembros(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    );
    const unsubR = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "cipa_reunioes"), orderBy("data", "desc")),
      snap => setReunioes(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    );
    // votacao aberta flag
    const unsubV = onSnapshot(doc(db, "empresas", empresaAtiva.id, "cipa", "votacao"), snap => {
      if (snap.exists()) setVotacaoAberta(snap.data().aberta || false);
    });
    return () => { unsubM(); unsubR(); unsubV(); };
  }, [empresaAtiva]);

  // ── Membros ──
  async function salvarMembro() {
    if (!formMembro.nome) return;
    if (editMembro) {
      const { id, ...data } = formMembro;
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "cipa_membros", editMembro.id), data);
    } else {
      await addDoc(collection(db, "empresas", empresaAtiva.id, "cipa_membros"), { ...formMembro, votos: 0, criadoEm: serverTimestamp() });
    }
    setModalMembro(false);
  }

  async function excluirMembro(id) {
    if (!window.confirm("Excluir membro?")) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "cipa_membros", id));
  }

  // ── Reuniões ──
  async function salvarReuniao() {
    if (!formReuniao.data) return;
    if (editReuniao) {
      const { id, ...data } = formReuniao;
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "cipa_reunioes", editReuniao.id), data);
    } else {
      await addDoc(collection(db, "empresas", empresaAtiva.id, "cipa_reunioes"), { ...formReuniao, criadoEm: serverTimestamp() });
    }
    setModalReuniao(false);
  }

  async function excluirReuniao(id) {
    if (!window.confirm("Excluir reunião?")) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "cipa_reunioes", id));
  }

  // ── Votação ──
  async function toggleVotacao() {
    const { setDoc } = await import("firebase/firestore");
    await setDoc(doc(db, "empresas", empresaAtiva.id, "cipa", "votacao"), { aberta: !votacaoAberta });
  }

  async function registrarVoto(membro) {
    if (!votacaoAberta) return;
    await updateDoc(doc(db, "empresas", empresaAtiva.id, "cipa_membros", membro.id), { votos: (membro.votos || 0) + 1 });
  }

  const fm = (field) => (val) => setFormMembro(p => ({ ...p, [field]:val }));
  const fr = (field) => (val) => setFormReuniao(p => ({ ...p, [field]:val }));

  if (!empresaAtiva) return <div style={{ padding:32, color:C.muted }}>Selecione uma empresa.</div>;

  const statusReuniaoColor = { "Programada":{ color:C.navyMid, bg:"#dbeafe" }, "Realizada":{ color:C.green, bg:"#dcfce7" }, "Cancelada":{ color:C.red, bg:"#fee2e2" } };
  const totalVotos = membros.reduce((s, m) => s + (m.votos || 0), 0);
  const candidatos = membros.filter(m => m.tipo === "Empregado");

  return (
    <div style={{ padding:24, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Shield size={22} color={C.navy} />
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:C.navy }}>Gestão de CIPA</h2>
            <p style={{ margin:0, fontSize:12, color:C.muted }}>Comissão Interna de Prevenção de Acidentes — NR-5</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:20, borderBottom:`1px solid ${C.border}`, paddingBottom:0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:"8px 18px", border:"none", borderBottom: tab === t ? `2px solid ${C.navyMid}` : "2px solid transparent",
            background:"none", cursor:"pointer", fontSize:13, fontWeight: tab === t ? 700 : 400,
            color: tab === t ? C.navyMid : C.muted, fontFamily:"inherit"
          }}>{t}</button>
        ))}
      </div>

      {/* ── Tab: Membros ── */}
      {tab === "Membros" && (
        <>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
            <Btn onClick={() => { setFormMembro(VAZIO_MEMBRO); setEditMembro(null); setModalMembro(true); }} icon={<Plus size={14}/>}>Novo Membro</Btn>
          </div>
          {membros.length === 0 ? (
            <Card><p style={{ textAlign:"center", color:C.muted, fontSize:13, margin:0 }}>Nenhum membro cadastrado.</p></Card>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {membros.map(m => (
                <Card key={m.id}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <span style={{ fontWeight:700, fontSize:13 }}>{m.nome}</span>
                        <Badge label={m.funcao} color={C.navyMid} bg="#dbeafe" />
                        <Badge label={m.tipo} color={C.gray} bg="#f1f5f9" />
                        <Badge label={m.status} color={m.status === "Ativo" ? C.green : C.red} bg={m.status === "Ativo" ? "#dcfce7" : "#fee2e2"} />
                      </div>
                      <div style={{ fontSize:11, color:C.muted, display:"flex", gap:12, flexWrap:"wrap" }}>
                        {m.cargo && <span>Cargo: {m.cargo}</span>}
                        {m.setor && <span>Setor: {m.setor}</span>}
                        {m.mandatoInicio && <span>Mandato: {m.mandatoInicio} → {m.mandatoFim}</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <Btn small outline onClick={() => { setFormMembro({ ...m }); setEditMembro(m); setModalMembro(true); }} icon={<Edit2 size={12}/>}>Editar</Btn>
                      <Btn small outline color={C.red} onClick={() => excluirMembro(m.id)} icon={<Trash2 size={12}/>}>Excluir</Btn>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Tab: Reuniões ── */}
      {tab === "Reuniões" && (
        <>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
            <Btn onClick={() => { setFormReuniao(VAZIO_REUNIAO); setEditReuniao(null); setModalReuniao(true); }} icon={<Plus size={14}/>}>Nova Reunião</Btn>
          </div>
          {reunioes.length === 0 ? (
            <Card><p style={{ textAlign:"center", color:C.muted, fontSize:13, margin:0 }}>Nenhuma reunião registrada.</p></Card>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {reunioes.map(r => {
                const sc = statusReuniaoColor[r.status] || { color:C.gray, bg:"#f1f5f9" };
                return (
                  <Card key={r.id}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                          <span style={{ fontWeight:700, fontSize:13 }}>{r.data}</span>
                          <Badge label={r.status} color={sc.color} bg={sc.bg} />
                        </div>
                        {r.pauta && <p style={{ fontSize:12, color:C.text, margin:"0 0 4px" }}><strong>Pauta:</strong> {r.pauta.slice(0, 200)}</p>}
                        {r.participantes && <p style={{ fontSize:11, color:C.muted, margin:0 }}>Participantes: {r.participantes}</p>}
                      </div>
                      <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                        <Btn small outline onClick={() => { setFormReuniao({ ...r }); setEditReuniao(r); setModalReuniao(true); }} icon={<Edit2 size={12}/>}>Editar</Btn>
                        <Btn small outline color={C.red} onClick={() => excluirReuniao(r.id)} icon={<Trash2 size={12}/>}>Excluir</Btn>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Tab: Votação ── */}
      {tab === "Votação" && (
        <>
          <Card style={{ marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div>
              <p style={{ margin:"0 0 2px", fontWeight:700, fontSize:13 }}>Status da Votação</p>
              <Badge label={votacaoAberta ? "Aberta" : "Fechada"} color={votacaoAberta ? C.green : C.red} bg={votacaoAberta ? "#dcfce7" : "#fee2e2"} />
              {totalVotos > 0 && <span style={{ fontSize:12, color:C.muted, marginLeft:12 }}>Total de votos: {totalVotos}</span>}
            </div>
            <Btn onClick={toggleVotacao} color={votacaoAberta ? C.red : C.green} icon={<Vote size={14}/>}>
              {votacaoAberta ? "Fechar Votação" : "Abrir Votação"}
            </Btn>
          </Card>
          {candidatos.length === 0 ? (
            <Card><p style={{ textAlign:"center", color:C.muted, fontSize:13, margin:0 }}>Nenhum candidato (membros do tipo Empregado) cadastrado.</p></Card>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[...candidatos].sort((a, b) => (b.votos || 0) - (a.votos || 0)).map(m => (
                <Card key={m.id}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:"0 0 2px", fontWeight:700, fontSize:13 }}>{m.nome}</p>
                      <p style={{ margin:0, fontSize:11, color:C.muted }}>{m.cargo} {m.setor && `· ${m.setor}`}</p>
                      <div style={{ marginTop:8, background:C.bg, borderRadius:4, height:8, overflow:"hidden" }}>
                        <div style={{ height:"100%", background:C.navyMid, width: totalVotos > 0 ? `${((m.votos||0)/totalVotos)*100}%` : "0%" }} />
                      </div>
                    </div>
                    <div style={{ textAlign:"center", minWidth:60 }}>
                      <p style={{ margin:"0 0 6px", fontSize:22, fontWeight:700, color:C.navy }}>{m.votos || 0}</p>
                      <Btn small disabled={!votacaoAberta} onClick={() => registrarVoto(m)} icon={<ThumbsUp size={12}/>}>+1 Voto</Btn>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal Membro */}
      {modalMembro && (
        <Modal title={editMembro ? "Editar Membro" : "Novo Membro CIPA"} onClose={() => setModalMembro(false)}>
          <Input label="Nome *" value={formMembro.nome} onChange={fm("nome")} placeholder="Nome completo" required />
          <Input label="Cargo" value={formMembro.cargo} onChange={fm("cargo")} placeholder="Cargo na empresa" />
          <Input label="Setor" value={formMembro.setor} onChange={fm("setor")} placeholder="Setor de trabalho" />
          <Select label="Tipo" value={formMembro.tipo} onChange={fm("tipo")} options={["Empregador","Empregado"]} />
          <Select label="Função na CIPA" value={formMembro.funcao} onChange={fm("funcao")} options={["Presidente","Vice-Presidente","Secretário","Membro","Suplente"]} />
          <Input label="Início do Mandato" value={formMembro.mandatoInicio} onChange={fm("mandatoInicio")} type="date" />
          <Input label="Fim do Mandato" value={formMembro.mandatoFim} onChange={fm("mandatoFim")} type="date" />
          <Select label="Status" value={formMembro.status} onChange={fm("status")} options={["Ativo","Inativo"]} />
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn outline onClick={() => setModalMembro(false)}>Cancelar</Btn>
            <Btn onClick={salvarMembro}>{editMembro ? "Salvar" : "Adicionar"}</Btn>
          </div>
        </Modal>
      )}

      {/* Modal Reunião */}
      {modalReuniao && (
        <Modal title={editReuniao ? "Editar Reunião" : "Nova Reunião CIPA"} onClose={() => setModalReuniao(false)}>
          <Input label="Data *" value={formReuniao.data} onChange={fr("data")} type="date" required />
          <Textarea label="Pauta" value={formReuniao.pauta} onChange={fr("pauta")} rows={3} placeholder="Tópicos a serem discutidos..." />
          <Textarea label="Ata" value={formReuniao.ata} onChange={fr("ata")} rows={4} placeholder="Registro da ata da reunião..." />
          <Textarea label="Participantes" value={formReuniao.participantes} onChange={fr("participantes")} rows={2} placeholder="Nome dos participantes..." />
          <Select label="Status" value={formReuniao.status} onChange={fr("status")} options={["Programada","Realizada","Cancelada"]} />
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn outline onClick={() => setModalReuniao(false)}>Cancelar</Btn>
            <Btn onClick={salvarReuniao}>{editReuniao ? "Salvar" : "Registrar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
