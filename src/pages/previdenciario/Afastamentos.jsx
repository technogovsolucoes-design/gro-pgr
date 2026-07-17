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

function statusBadge(status) {
  if (status === "Afastado")   return { color:C.red,   bg:"#fee2e2" };
  if (status === "Prorrogado") return { color:C.amber, bg:"#fef3c7" };
  return                              { color:C.green, bg:"#dcfce7" };
}

function calcDias(dataInicio, dataFim) {
  if (!dataInicio || !dataFim) return "";
  const d1 = new Date(dataInicio + "T12:00:00");
  const d2 = new Date(dataFim + "T12:00:00");
  const diff = Math.ceil((d2 - d1) / 86400000);
  return diff > 0 ? diff : "";
}

function alertaRetorno(af) {
  if (af.status !== "Afastado" || !af.dataPrevisaoRetorno) return null;
  const dias = Math.ceil((new Date(af.dataPrevisaoRetorno + "T12:00:00") - new Date()) / 86400000);
  if (dias <= 7 && dias >= 0) return `Retorno previsto em ${dias} dia(s)`;
  if (dias < 0) return "Prazo de retorno vencido";
  return null;
}

const VAZIO = {
  funcionarioNome:"", cpf:"", tipo:"Doença", cid:"", dataInicio:"",
  dataPrevisaoRetorno:"", dataRetornoEfetivo:"", beneficioINSS:"Não se aplica",
  diasAfastados:"", status:"Afastado", observacoes:"",
};

const TIPOS = ["Doença","Acidente de Trabalho","Acidente de Trajeto","Licença Maternidade","Outro"];
const BENEFICIOS = ["B31","B91","B93","Não se aplica"];
const STATUS_OPTS = ["Afastado","Retornou","Prorrogado"];

export default function Afastamentos() {
  const { empresaAtiva } = useApp();
  const [afastamentos, setAfastamentos] = useState([]);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState({ ...VAZIO });
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState("Todos");

  useEffect(() => {
    if (!empresaAtiva) { setAfastamentos([]); return; }
    const q = query(collection(db, "empresas", empresaAtiva.id, "afastamentos"), orderBy("dataInicio", "desc"));
    const unsub = onSnapshot(q, snap => setAfastamentos(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    return unsub;
  }, [empresaAtiva]);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function abrirModal(af = null) {
    setForm(af ? { ...VAZIO, ...af } : { ...VAZIO });
    setModal(true);
  }

  async function salvar() {
    if (!form.funcionarioNome || !form.dataInicio) return;
    setSaving(true);
    const dados = {
      ...form,
      diasAfastados: calcDias(form.dataInicio, form.dataRetornoEfetivo || form.dataPrevisaoRetorno) || form.diasAfastados || 0,
    };
    if (form.id) {
      const { id, ...rest } = dados;
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "afastamentos", form.id), rest);
    } else {
      await addDoc(collection(db, "empresas", empresaAtiva.id, "afastamentos"), { ...dados, criadoEm: serverTimestamp() });
    }
    setSaving(false);
    setModal(false);
  }

  async function excluir(id, nome) {
    if (!confirm(`Excluir afastamento de "${nome}"?`)) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "afastamentos", id));
  }

  const hoje = new Date();
  const mesAtual = hoje.toISOString().slice(0, 7);

  const kpis = {
    total: afastamentos.length,
    ativos: afastamentos.filter(a => !a.dataRetornoEfetivo && a.status === "Afastado").length,
    diasPerdidos: afastamentos.reduce((acc, a) => acc + (Number(a.diasAfastados) || 0), 0),
    acidentesTrab: afastamentos.filter(a => a.tipo === "Acidente de Trabalho").length,
  };

  const lista = filtro === "Todos" ? afastamentos : afastamentos.filter(a => a.status === filtro);

  const diasAuto = calcDias(form.dataInicio, form.dataRetornoEfetivo || form.dataPrevisaoRetorno);

  return (
    <div>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total de Afastamentos", val:kpis.total,        bg:"#eff6ff", color:C.navyMid },
          { label:"Afastados Atualmente",  val:kpis.ativos,       bg:"#fef2f2", color:C.red    },
          { label:"Total Dias Perdidos",   val:kpis.diasPerdidos, bg:"#fffbeb", color:C.amber  },
          { label:"Acidentes de Trabalho", val:kpis.acidentesTrab,bg:"#fef2f2", color:C.red    },
        ].map((k, i) => (
          <Card key={i} style={{ background:k.bg, border:"none" }}>
            <p style={{ fontSize:22, fontWeight:800, margin:0, color:k.color }}>{k.val}</p>
            <p style={{ fontSize:10, color:C.muted, margin:0 }}>{k.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
          <p style={{ fontWeight:700, fontSize:14, margin:0 }}>Registros de Afastamentos</p>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
              <option>Todos</option>
              {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
            </select>
            <Btn onClick={() => abrirModal()}>+ Novo Afastamento</Btn>
          </div>
        </div>

        {lista.length === 0 ? (
          <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>Nenhum afastamento {filtro !== "Todos" ? `com status "${filtro}"` : "registrado"}.</p>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {["Funcionário","CPF","Tipo","CID","Início","Prev. Retorno","Benefício INSS","Dias","Status",""].map((h, i) => (
                  <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(af => {
                const alerta = alertaRetorno(af);
                const bd = statusBadge(af.status);
                return (
                  <tr key={af.id} style={{ borderTop:`1px solid ${C.border}`, background: alerta ? "#fffbeb" : "transparent" }}>
                    <td style={{ padding:"9px 10px" }}>
                      <p style={{ margin:0, fontWeight:600 }}>{af.funcionarioNome}</p>
                      {alerta && <p style={{ margin:0, fontSize:10, color:C.amber, fontWeight:600 }}>⚠ {alerta}</p>}
                    </td>
                    <td style={{ padding:"9px 10px", color:C.muted }}>{af.cpf || "—"}</td>
                    <td style={{ padding:"9px 10px" }}>{af.tipo}</td>
                    <td style={{ padding:"9px 10px", color:C.muted }}>{af.cid || "—"}</td>
                    <td style={{ padding:"9px 10px" }}>{af.dataInicio ? new Date(af.dataInicio + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                    <td style={{ padding:"9px 10px" }}>{af.dataPrevisaoRetorno ? new Date(af.dataPrevisaoRetorno + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                    <td style={{ padding:"9px 10px" }}><Badge label={af.beneficioINSS || "—"} color={C.navyMid} bg="#eff6ff"/></td>
                    <td style={{ padding:"9px 10px" }}>{af.diasAfastados || "—"}</td>
                    <td style={{ padding:"9px 10px" }}><Badge label={af.status} {...bd}/></td>
                    <td style={{ padding:"9px 10px" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => abrirModal(af)} style={{ background:"none", border:"none", cursor:"pointer", color:C.navyMid, fontSize:11, fontWeight:600 }}>Editar</button>
                        <button onClick={() => excluir(af.id, af.funcionarioNome)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:11, fontWeight:600 }}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {modal && (
        <Modal title={form.id ? "Editar Afastamento" : "Novo Afastamento"} onClose={() => setModal(false)}>
          <Input label="Nome do Funcionário" value={form.funcionarioNome} onChange={v => sf("funcionarioNome", v)} required/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="CPF" value={form.cpf} onChange={v => sf("cpf", v)} placeholder="000.000.000-00"/>
            <Input label="CID-10" value={form.cid} onChange={v => sf("cid", v)} placeholder="Ex.: M54.5"/>
          </div>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Tipo de Afastamento <span style={{ color:C.red }}>*</span></p>
            <select value={form.tipo} onChange={e => sf("tipo", e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
              {TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Data de Início" value={form.dataInicio} onChange={v => sf("dataInicio", v)} type="date" required/>
            <Input label="Previsão de Retorno" value={form.dataPrevisaoRetorno} onChange={v => sf("dataPrevisaoRetorno", v)} type="date"/>
          </div>
          <Input label="Data de Retorno Efetivo (opcional)" value={form.dataRetornoEfetivo} onChange={v => sf("dataRetornoEfetivo", v)} type="date"/>
          {diasAuto && (
            <div style={{ background:"#eff6ff", border:`1px solid #bfdbfe`, borderRadius:8, padding:"8px 12px", marginBottom:12 }}>
              <p style={{ margin:0, fontSize:12, color:C.navyMid, fontWeight:600 }}>Dias calculados automaticamente: {diasAuto} dias</p>
            </div>
          )}
          {!diasAuto && (
            <Input label="Dias Afastados (manual)" value={form.diasAfastados} onChange={v => sf("diasAfastados", v)} type="number" placeholder="0"/>
          )}
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Benefício INSS</p>
            <select value={form.beneficioINSS} onChange={e => sf("beneficioINSS", e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
              {BENEFICIOS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Status</p>
            <select value={form.status} onChange={e => sf("status", e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
              {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Observações</p>
            <textarea value={form.observacoes} onChange={e => sf("observacoes", e.target.value)} rows={3} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn outline onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn disabled={!form.funcionarioNome || !form.dataInicio || saving} onClick={salvar}>{saving ? "Salvando…" : "Salvar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
