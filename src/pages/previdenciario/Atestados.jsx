import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";
import { db } from "../../firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:12, padding:24, width:"100%", maxWidth:500, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
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

const VAZIO = {
  funcionarioNome:"", dataApresentacao:"", dataInicio:"", dataFim:"",
  diasAfastados:"", cid:"", medicoNome:"", crm:"", especialidade:"",
  validado:false, observacoes:"",
};

export default function Atestados() {
  const { empresaAtiva } = useApp();
  const [atestados, setAtestados] = useState([]);
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState({ ...VAZIO });
  const [saving, setSaving]       = useState(false);
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroVal, setFiltroVal] = useState("Todos");

  useEffect(() => {
    if (!empresaAtiva) { setAtestados([]); return; }
    const q = query(collection(db, "empresas", empresaAtiva.id, "atestados"), orderBy("dataApresentacao", "desc"));
    const unsub = onSnapshot(q, snap => setAtestados(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    return unsub;
  }, [empresaAtiva]);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function abrirModal(at = null) {
    setForm(at ? { ...VAZIO, ...at } : { ...VAZIO });
    setModal(true);
  }

  async function salvar() {
    if (!form.funcionarioNome || !form.dataApresentacao) return;
    setSaving(true);
    if (form.id) {
      const { id, ...rest } = form;
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "atestados", form.id), rest);
    } else {
      await addDoc(collection(db, "empresas", empresaAtiva.id, "atestados"), { ...form, criadoEm: serverTimestamp() });
    }
    setSaving(false);
    setModal(false);
  }

  async function excluir(id, nome) {
    if (!confirm(`Excluir atestado de "${nome}"?`)) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "atestados", id));
  }

  async function validar(at) {
    await updateDoc(doc(db, "empresas", empresaAtiva.id, "atestados", at.id), { validado: !at.validado });
  }

  const hoje = new Date();
  const mesAtual = hoje.toISOString().slice(0, 7);

  const doMes = atestados.filter(a => (a.dataApresentacao || "").startsWith(mesAtual));
  const kpis = {
    totalMes: doMes.length,
    diasMes: doMes.reduce((acc, a) => acc + (Number(a.diasAfastados) || 0), 0),
    mediaDias: doMes.length > 0 ? (doMes.reduce((acc, a) => acc + (Number(a.diasAfastados) || 0), 0) / doMes.length).toFixed(1) : "0",
    pendentes: atestados.filter(a => !a.validado).length,
  };

  let lista = atestados;
  if (filtroMes) lista = lista.filter(a => (a.dataApresentacao || "").startsWith(filtroMes));
  if (filtroVal === "Validado")   lista = lista.filter(a => a.validado);
  if (filtroVal === "Pendente")   lista = lista.filter(a => !a.validado);

  return (
    <div>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total do Mês",          val:kpis.totalMes,  bg:"#eff6ff", color:C.navyMid },
          { label:"Dias Concedidos (mês)", val:kpis.diasMes,   bg:"#fef2f2", color:C.red    },
          { label:"Média de Dias",         val:kpis.mediaDias, bg:"#fffbeb", color:C.amber  },
          { label:"Pendentes de Validação",val:kpis.pendentes, bg:"#fef2f2", color:C.red    },
        ].map((k, i) => (
          <Card key={i} style={{ background:k.bg, border:"none" }}>
            <p style={{ fontSize:22, fontWeight:800, margin:0, color:k.color }}>{k.val}</p>
            <p style={{ fontSize:10, color:C.muted, margin:0 }}>{k.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
          <p style={{ fontWeight:700, fontSize:14, margin:0 }}>Atestados Médicos</p>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
              style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}/>
            <select value={filtroVal} onChange={e => setFiltroVal(e.target.value)}
              style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
              <option>Todos</option>
              <option>Validado</option>
              <option>Pendente</option>
            </select>
            <Btn onClick={() => abrirModal()}>+ Novo Atestado</Btn>
          </div>
        </div>

        {lista.length === 0 ? (
          <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>Nenhum atestado encontrado.</p>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {["Funcionário","Apresentação","Início","Fim","Dias","CID","Médico","Especialidade","Status","Ações"].map((h, i) => (
                  <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(at => (
                <tr key={at.id} style={{ borderTop:`1px solid ${C.border}` }}>
                  <td style={{ padding:"9px 10px", fontWeight:600 }}>{at.funcionarioNome}</td>
                  <td style={{ padding:"9px 10px" }}>{at.dataApresentacao ? new Date(at.dataApresentacao + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td style={{ padding:"9px 10px" }}>{at.dataInicio ? new Date(at.dataInicio + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td style={{ padding:"9px 10px" }}>{at.dataFim ? new Date(at.dataFim + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td style={{ padding:"9px 10px" }}>{at.diasAfastados || "—"}</td>
                  <td style={{ padding:"9px 10px", color:C.muted }}>{at.cid || "—"}</td>
                  <td style={{ padding:"9px 10px" }}>
                    <p style={{ margin:0 }}>{at.medicoNome || "—"}</p>
                    {at.crm && <p style={{ margin:0, fontSize:10, color:C.muted }}>CRM: {at.crm}</p>}
                  </td>
                  <td style={{ padding:"9px 10px", color:C.muted }}>{at.especialidade || "—"}</td>
                  <td style={{ padding:"9px 10px" }}>
                    {at.validado
                      ? <Badge label="Validado" color={C.green} bg="#dcfce7"/>
                      : <Badge label="Pendente" color={C.amber} bg="#fef3c7"/>}
                  </td>
                  <td style={{ padding:"9px 10px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => validar(at)}
                        style={{ background: at.validado ? "#dcfce7" : "#fef3c7", border:"none", borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:11, color: at.validado ? C.green : C.amber, fontWeight:600 }}>
                        {at.validado ? "Invalidar" : "Validar"}
                      </button>
                      <button onClick={() => abrirModal(at)} style={{ background:"none", border:"none", cursor:"pointer", color:C.navyMid, fontSize:11, fontWeight:600 }}>Editar</button>
                      <button onClick={() => excluir(at.id, at.funcionarioNome)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:11, fontWeight:600 }}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {modal && (
        <Modal title={form.id ? "Editar Atestado" : "Novo Atestado"} onClose={() => setModal(false)}>
          <Input label="Nome do Funcionário" value={form.funcionarioNome} onChange={v => sf("funcionarioNome", v)} required/>
          <Input label="Data de Apresentação" value={form.dataApresentacao} onChange={v => sf("dataApresentacao", v)} type="date" required/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Data de Início" value={form.dataInicio} onChange={v => sf("dataInicio", v)} type="date"/>
            <Input label="Data de Fim" value={form.dataFim} onChange={v => sf("dataFim", v)} type="date"/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Dias Afastados" value={form.diasAfastados} onChange={v => sf("diasAfastados", v)} type="number" placeholder="0"/>
            <Input label="CID-10" value={form.cid} onChange={v => sf("cid", v)} placeholder="Ex.: J11.1"/>
          </div>
          <Input label="Nome do Médico" value={form.medicoNome} onChange={v => sf("medicoNome", v)}/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="CRM" value={form.crm} onChange={v => sf("crm", v)} placeholder="CRM/UF 000000"/>
            <Input label="Especialidade" value={form.especialidade} onChange={v => sf("especialidade", v)} placeholder="Ex.: Clínica Geral"/>
          </div>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Observações</p>
            <textarea value={form.observacoes} onChange={e => sf("observacoes", e.target.value)} rows={3}
              style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, cursor:"pointer", fontSize:12 }}>
            <input type="checkbox" checked={form.validado} onChange={e => sf("validado", e.target.checked)}/>
            Validado pelo SESMT
          </label>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn outline onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn disabled={!form.funcionarioNome || !form.dataApresentacao || saving} onClick={salvar}>{saving ? "Salvando…" : "Salvar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
