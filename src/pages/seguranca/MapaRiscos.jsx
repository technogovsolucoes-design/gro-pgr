import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C, FATORES } from "../../constants";
import { getRiskScore } from "../../utils";
import { Map, Plus, X } from "lucide-react";

const TIPOS_RISCO = [
  { label:"Físico",             color:"#1d4ed8", bg:"#dbeafe" },
  { label:"Químico",            color:"#92400e", bg:"#fef3c7" },
  { label:"Biológico",          color:"#166534", bg:"#dcfce7" },
  { label:"Ergonômico",         color:"#9a3412", bg:"#ffedd5" },
  { label:"Acidente/Mecânico",  color:"#991b1b", bg:"#fee2e2" },
  { label:"Psicossocial",       color:"#6b21a8", bg:"#f3e8ff" },
];

const MAGNITUDES = ["Grande","Médio","Pequeno"];

const MAG_CORES = {
  "Grande": { color:"#991b1b", bg:"#fee2e2" },
  "Médio":  { color:"#92400e", bg:"#fef3c7" },
  "Pequeno":{ color:"#166534", bg:"#dcfce7" },
};

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

function Select({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom:12 }}>
      {label && <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>{label}</p>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box", color:C.text, background:C.white }}>
        <option value="">Selecione...</option>
        {options.map(o => <option key={typeof o === "string" ? o : o.label} value={typeof o === "string" ? o : o.label}>{typeof o === "string" ? o : o.label}</option>)}
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

const VAZIO = { setorId:"", tipoRisco:"", descricao:"", magnitude:"Médio", medidas:"" };

// Converte score de risco para magnitude do Mapa de Riscos
function scoreToMagnitude(score) {
  if (score >= 9) return "Grande";
  if (score >= 4) return "Médio";
  return "Pequeno";
}

export default function MapaRiscos() {
  const { empresaAtiva, setores } = useApp();
  const [riscos,    setRiscos]    = useState([]);
  const [checklist, setChecklist] = useState({});
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [filtroSetor, setFiltroSetor] = useState("");

  // Listener: riscos manuais
  useEffect(() => {
    if (!empresaAtiva) return;
    const q = query(collection(db, "empresas", empresaAtiva.id, "mapa_riscos"), orderBy("tipoRisco"));
    return onSnapshot(q, snap => setRiscos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [empresaAtiva]);

  // Listener: checklist do Levantamento Psicossocial
  useEffect(() => {
    if (!empresaAtiva) return;
    return onSnapshot(
      collection(db, "empresas", empresaAtiva.id, "checklist"),
      snap => {
        const data = {};
        snap.docs.forEach(d => { data[d.id] = d.data(); });
        setChecklist(data);
      }
    );
  }, [empresaAtiva]);

  // Derivar riscos psicossociais do checklist (somente freq ≠ "Nunca")
  const riscosLevantamento = useMemo(() => {
    const result = [];
    Object.entries(checklist).forEach(([key, val]) => {
      if (!val.freq || !val.sev || val.freq === "Nunca") return;
      const [fatorId, setorId] = key.split("__");
      const fator = FATORES.find(f => f.id === fatorId);
      if (!fator) return;
      const score = getRiskScore(val.freq, val.sev);
      result.push({
        id: `lev__${key}`,
        setorId,
        tipoRisco: "Psicossocial",
        descricao: fator.label,
        magnitude: scoreToMagnitude(score),
        fromLevantamento: true,
      });
    });
    return result;
  }, [checklist]);

  // Merge: riscos manuais + levantamento (sem duplicar)
  const todosRiscos = useMemo(() => {
    const mapaIds = new Set(riscosLevantamento.map(r => r.id));
    return [...riscos, ...riscosLevantamento];
  }, [riscos, riscosLevantamento]);

  async function salvar() {
    if (!form.setorId || !form.tipoRisco || !form.descricao) return;
    await addDoc(collection(db, "empresas", empresaAtiva.id, "mapa_riscos"), { ...form, criadoEm: serverTimestamp() });
    setModal(false);
    setForm(VAZIO);
  }

  async function excluir(id) {
    if (!window.confirm("Remover este risco do mapa?")) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "mapa_riscos", id));
  }

  const f = (field) => (val) => setForm(p => ({ ...p, [field]:val }));
  const nomeSetor = (id) => setores.find(s => s.id === id)?.nome || id;

  if (!empresaAtiva) return <div style={{ padding:32, color:C.muted }}>Selecione uma empresa.</div>;

  const setoresFiltrados = setores.filter(s => !filtroSetor || s.id === filtroSetor);

  return (
    <div style={{ padding:24, maxWidth:1200, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Map size={22} color={C.navy} />
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:C.navy }}>Mapa de Riscos</h2>
            <p style={{ margin:0, fontSize:12, color:C.muted }}>Identificação visual de riscos por setor</p>
          </div>
        </div>
        <Btn onClick={() => { setForm(VAZIO); setModal(true); }} icon={<Plus size={14}/>}>Adicionar Risco</Btn>
      </div>

      {/* Legenda */}
      <Card style={{ marginBottom:16 }}>
        <p style={{ fontSize:11, color:C.muted, margin:"0 0 8px", fontWeight:600 }}>LEGENDA — TIPOS DE RISCO</p>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {TIPOS_RISCO.map(t => (
            <span key={t.label} style={{ fontSize:11, fontWeight:600, color:t.color, background:t.bg, borderRadius:12, padding:"3px 10px" }}>{t.label}</span>
          ))}
        </div>
      </Card>

      {/* Filtro */}
      <div style={{ marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
        <p style={{ fontSize:12, color:C.muted, margin:0, whiteSpace:"nowrap" }}>Filtrar por setor:</p>
        <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", color:C.text, background:C.white }}>
          <option value="">Todos os setores</option>
          {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>

      {/* Tabela por setor × tipo */}
      {setoresFiltrados.length === 0 ? (
        <Card><p style={{ textAlign:"center", color:C.muted, fontSize:13, margin:0 }}>Nenhum setor cadastrado.</p></Card>
      ) : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr>
                <th style={{ padding:"10px 12px", textAlign:"left", background:C.navy, color:C.white, fontWeight:600, fontSize:11, borderRadius:"8px 0 0 0", minWidth:140 }}>Setor</th>
                {TIPOS_RISCO.map((t, i) => (
                  <th key={t.label} style={{ padding:"10px 8px", textAlign:"center", background:C.navy, color:C.white, fontWeight:600, fontSize:10, borderRadius: i === TIPOS_RISCO.length - 1 ? "0 8px 0 0" : 0 }}>
                    {t.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {setoresFiltrados.map((setor, si) => {
                const riscosDosetor = todosRiscos.filter(r => r.setorId === setor.id);
                return (
                  <tr key={setor.id} style={{ background: si % 2 === 0 ? C.white : C.bg }}>
                    <td style={{ padding:"10px 12px", fontWeight:600, fontSize:12, color:C.navy, border:`1px solid ${C.border}` }}>
                      {setor.nome}
                    </td>
                    {TIPOS_RISCO.map(t => {
                      const items = riscosDosetor.filter(r => r.tipoRisco === t.label);
                      return (
                        <td key={t.label} style={{ padding:8, border:`1px solid ${C.border}`, verticalAlign:"top", minWidth:120 }}>
                          {items.length === 0 ? (
                            <span style={{ color:C.border, fontSize:11 }}>—</span>
                          ) : (
                            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                              {items.map(item => {
                                const mc = MAG_CORES[item.magnitude] || MAG_CORES["Médio"];
                                return (
                                  <div key={item.id} style={{ background: item.fromLevantamento ? "#f3e8ff" : t.bg, borderRadius:6, padding:"4px 6px", border:`1px solid ${item.fromLevantamento ? "#c084fc" : t.color}30`, position:"relative" }}>
                                    <p style={{ margin:0, fontSize:10, fontWeight:600, color: item.fromLevantamento ? "#7e22ce" : t.color }}>{item.descricao}</p>
                                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:2 }}>
                                      <span style={{ fontSize:9, fontWeight:700, color:mc.color, background:mc.bg, borderRadius:4, padding:"1px 5px" }}>{item.magnitude}</span>
                                      {item.fromLevantamento ? (
                                        <span style={{ fontSize:8, color:"#7e22ce", fontWeight:700, opacity:0.8 }}>Levantamento</span>
                                      ) : (
                                        <button onClick={() => excluir(item.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:0, lineHeight:1 }}>
                                          <X size={10} color={C.muted} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title="Adicionar Risco ao Mapa" onClose={() => setModal(false)}>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Setor *</p>
            <select value={form.setorId} onChange={e => f("setorId")(e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box", color:C.text, background:C.white }}>
              <option value="">Selecione o setor...</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <Select label="Tipo de Risco *" value={form.tipoRisco} onChange={f("tipoRisco")} options={TIPOS_RISCO} />
          <Input label="Descrição do Risco *" value={form.descricao} onChange={f("descricao")} placeholder="Descreva o risco identificado..." required />
          <Select label="Magnitude" value={form.magnitude} onChange={f("magnitude")} options={MAGNITUDES} />
          <Textarea label="Medidas de Controle" value={form.medidas} onChange={f("medidas")} rows={3} placeholder="EPIs, EPCs, controles administrativos..." />
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn outline onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={salvar}>Adicionar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
