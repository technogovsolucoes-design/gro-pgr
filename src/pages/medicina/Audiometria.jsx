import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";
import { Activity, Plus, Trash2, Edit2 } from "lucide-react";

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:12, padding:24, width:"100%", maxWidth:640, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <p style={{ fontWeight:700, fontSize:15, margin:0 }}>{title}</p>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.gray }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const TIPOS = ["Admissional","Periódico","Demissional","Retorno"];
const FREQS = ["500","1k","2k","3k","4k","6k","8k"];
const RESULTADOS = ["Normal","Perda Leve","Perda Moderada","Perda Severa","Perda Profunda"];

const emptyFreqs = () => {
  const obj = {};
  FREQS.forEach(f => { obj["OD_"+f] = ""; obj["OE_"+f] = ""; });
  return obj;
};

const calcResultado = freqs => {
  const vals = Object.values(freqs).map(v => parseFloat(v)).filter(v => !isNaN(v));
  if (!vals.length) return "Normal";
  const max = Math.max(...vals);
  if (max > 55) return "Perda Severa";
  if (max > 40) return "Perda Moderada";
  if (max > 25) return "Perda Leve";
  return "Normal";
};

const resultCor = { "Normal": C.green, "Perda Leve": C.amber, "Perda Moderada": "#f97316", "Perda Severa": C.red, "Perda Profunda": "#7c3aed" };

const emptyForm = { funcionarioNome:"", data:"", tipo:"Admissional", fonoaudiologo:"", observacoes:"", ...emptyFreqs() };

export default function Audiometria() {
  const { empresaAtiva } = useApp();
  const [audiometrias, setAudiometrias] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!empresaAtiva?.id) return;
    const unsub = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "audiometrias"), orderBy("data", "desc")),
      snap => setAudiometrias(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [empresaAtiva?.id]);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setForm({ ...emptyForm, ...emptyFreqs() }); setEditId(null); setModal(true); };
  const openEdit = a => {
    const f = { funcionarioNome:a.funcionarioNome||"", data:a.data||"", tipo:a.tipo||"Admissional", fonoaudiologo:a.fonoaudiologo||"", observacoes:a.observacoes||"" };
    FREQS.forEach(freq => { f["OD_"+freq] = a["OD_"+freq]||""; f["OE_"+freq] = a["OE_"+freq]||""; });
    setForm(f); setEditId(a.id); setModal(true);
  };

  const save = async () => {
    if (!form.funcionarioNome || !form.data) return;
    setLoading(true);
    const resultado = calcResultado(form);
    const data = { ...form, resultado };
    const col = collection(db, "empresas", empresaAtiva.id, "audiometrias");
    if (editId) {
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "audiometrias", editId), { ...data, updatedAt: serverTimestamp() });
    } else {
      await addDoc(col, { ...data, createdAt: serverTimestamp() });
    }
    setLoading(false); setModal(false);
  };

  const remove = async id => {
    if (!window.confirm("Excluir audiometria?")) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "audiometrias", id));
  };

  const fmtDate = s => s ? new Date(s + "T00:00:00").toLocaleDateString("pt-BR") : "-";

  return (
    <div style={{ padding:24, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Activity size={22} color={C.navyMid} />
          <h2 style={{ margin:0, color:C.navy, fontSize:20, fontWeight:700 }}>Audiometria</h2>
        </div>
        <Btn onClick={openNew} icon={<Plus size={14}/>}>Nova Audiometria</Btn>
      </div>

      <Card>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {["Funcionário","Data","Tipo","Fonoaudiólogo","Resultado","Ações"].map(h=>(
                  <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:C.muted, fontWeight:600, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audiometrias.length === 0 ? (
                <tr><td colSpan={6} style={{ padding:24, textAlign:"center", color:C.muted }}>Nenhuma audiometria registrada</td></tr>
              ) : audiometrias.map(a => (
                <tr key={a.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"10px 14px", fontWeight:500 }}>{a.funcionarioNome}</td>
                  <td style={{ padding:"10px 14px" }}>{fmtDate(a.data)}</td>
                  <td style={{ padding:"10px 14px", color:C.muted }}>{a.tipo}</td>
                  <td style={{ padding:"10px 14px", color:C.muted }}>{a.fonoaudiologo || "-"}</td>
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{ background:(resultCor[a.resultado]||C.gray)+"20", color:resultCor[a.resultado]||C.gray, borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:600 }}>{a.resultado||"—"}</span>
                  </td>
                  <td style={{ padding:"10px 14px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <Btn onClick={() => openEdit(a)} outline small icon={<Edit2 size={12}/>}>Editar</Btn>
                      <Btn onClick={() => remove(a.id)} color={C.red} outline small icon={<Trash2 size={12}/>}>Excluir</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && (
        <Modal title={editId ? "Editar Audiometria" : "Nova Audiometria"} onClose={() => setModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Input label="Funcionário *" value={form.funcionarioNome} onChange={set("funcionarioNome")} placeholder="Nome do funcionário" required />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Input label="Data *" value={form.data} onChange={set("data")} type="date" required />
              <div>
                <label style={{ fontSize:12, color:C.muted, fontWeight:600, display:"block", marginBottom:4 }}>Tipo</label>
                <select value={form.tipo} onChange={e => set("tipo")(e.target.value)} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, color:C.text }}>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <Input label="Fonoaudiólogo" value={form.fonoaudiologo} onChange={set("fonoaudiologo")} placeholder="Nome do profissional" />

            {/* Tabela de frequências */}
            <div>
              <label style={{ fontSize:12, color:C.muted, fontWeight:600, display:"block", marginBottom:8 }}>Limiares Auditivos (dB)</label>
              <div style={{ overflowX:"auto" }}>
                <table style={{ borderCollapse:"collapse", fontSize:12, width:"100%" }}>
                  <thead>
                    <tr style={{ background:C.bg }}>
                      <th style={{ padding:"6px 8px", textAlign:"left", color:C.muted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Orelha</th>
                      {FREQS.map(f => <th key={f} style={{ padding:"6px 8px", textAlign:"center", color:C.muted, fontWeight:600, borderBottom:`1px solid ${C.border}`, minWidth:50 }}>{f} Hz</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {["OD","OE"].map(orelha => (
                      <tr key={orelha} style={{ borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:"6px 8px", fontWeight:600, color: orelha==="OD" ? C.blue : C.red }}>{orelha === "OD" ? "OD (Dir.)" : "OE (Esq.)"}</td>
                        {FREQS.map(f => (
                          <td key={f} style={{ padding:"4px" }}>
                            <input type="number" value={form[`${orelha}_${f}`]} onChange={e => set(`${orelha}_${f}`)(e.target.value)}
                              style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 6px", fontSize:12, textAlign:"center", boxSizing:"border-box" }} placeholder="dB" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize:11, color:C.muted, margin:"6px 0 0" }}>Resultado automático: <strong style={{ color: resultCor[calcResultado(form)] }}>{calcResultado(form)}</strong></p>
            </div>

            <div>
              <label style={{ fontSize:12, color:C.muted, fontWeight:600, display:"block", marginBottom:4 }}>Observações</label>
              <textarea value={form.observacoes} onChange={e => set("observacoes")(e.target.value)} rows={2} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, color:C.text, resize:"vertical", boxSizing:"border-box" }} />
            </div>

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
