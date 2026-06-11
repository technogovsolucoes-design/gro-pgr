import { useState } from "react";
import { Users, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Btn, Input, Card, SectionTitle } from "../components/ui";
import { C } from "../constants";

export default function Setores() {
  const { setores, riscos, salvarSetor, atualizarSetor, excluirSetor, canEdit } = useApp();

  const [editSetor, setEditSetor]     = useState(null);
  const [addingSetor, setAddingSetor] = useState(false);
  const [newSetor, setNewSetor]       = useState({ nome:"", responsavel:"", servidores:[], nFunc:0 });
  const [newServidor, setNewServidor] = useState("");
  const [saving, setSaving]           = useState(false);

  const handleSalvar = async () => {
    if (!newSetor.nome) return;
    setSaving(true);
    await salvarSetor(newSetor);
    setNewSetor({ nome:"", responsavel:"", servidores:[], nFunc:0 });
    setAddingSetor(false);
    setSaving(false);
  };

  const handleAtualizar = async () => {
    if (!editSetor) return;
    setSaving(true);
    await atualizarSetor(editSetor);
    setEditSetor(null);
    setSaving(false);
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir este setor?")) return;
    await excluirSetor(id);
  };

  const adicionarServidor = () => {
    if (!newServidor.trim()) return;
    setNewSetor(p => ({ ...p, servidores: [...p.servidores, newServidor.trim()] }));
    setNewServidor("");
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <SectionTitle><Users size={14} /> Setores Cadastrados ({setores.length})</SectionTitle>
        {canEdit && <Btn onClick={() => setAddingSetor(true)} color={C.navyMid} small icon={<Plus size={12} />}>Novo Setor</Btn>}
      </div>

      {addingSetor && (
        <Card style={{ marginBottom:14, border:`1px solid ${C.navyMid}` }}>
          <p style={{ fontWeight:600, fontSize:13, margin:"0 0 12px", color:C.navy }}>Cadastrar Novo Setor</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <Input label="Nome do Setor *" value={newSetor.nome} onChange={v => setNewSetor(p => ({ ...p, nome:v }))} />
            <Input label="Responsável" value={newSetor.responsavel} onChange={v => setNewSetor(p => ({ ...p, responsavel:v }))} />
            <Input label="Nº de Funcionários" type="number" value={newSetor.nFunc || ""} onChange={v => setNewSetor(p => ({ ...p, nFunc: parseInt(v) || 0 }))} />
          </div>
          <p style={{ fontSize:11, color:C.muted, margin:"0 0 6px", fontWeight:500 }}>Servidores / Trabalhadores</p>
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <input
              value={newServidor}
              onChange={e => setNewServidor(e.target.value)}
              onKeyDown={e => e.key === "Enter" && adicionarServidor()}
              placeholder="Nome do servidor — Enter para adicionar"
              style={{ flex:1, padding:"7px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}
            />
            <Btn onClick={adicionarServidor} color={C.blue} small icon={<Plus size={12} />}>Add</Btn>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
            {newSetor.servidores.map((s, i) => (
              <span key={i} style={{ background:"#e0e7ff", color:"#3730a3", fontSize:11, padding:"3px 10px", borderRadius:20, display:"flex", alignItems:"center", gap:4 }}>
                {s}
                <button onClick={() => setNewSetor(p => ({ ...p, servidores: p.servidores.filter((_, j) => j !== i) }))} style={{ background:"none", border:"none", cursor:"pointer", color:"#6366f1", padding:0 }}><X size={10} /></button>
              </span>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={handleSalvar} color={C.green} small disabled={saving} icon={<Save size={12} />}>{saving ? "Salvando..." : "Salvar Setor"}</Btn>
            <Btn onClick={() => setAddingSetor(false)} outline color={C.gray} small icon={<X size={12} />}>Cancelar</Btn>
          </div>
        </Card>
      )}

      {setores.length === 0 && !addingSetor && (
        <div style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:8, padding:"16px 20px", fontSize:12, color:"#92400e", textAlign:"center" }}>
          Nenhum setor cadastrado. {canEdit && <span>Clique em <strong>Novo Setor</strong> para começar.</span>}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {setores.map(s => (
          editSetor?.id === s.id
            ? <Card key={s.id} style={{ border:`1px solid ${C.navyMid}` }}>
                <Input label="Nome" value={editSetor.nome} onChange={v => setEditSetor(p => ({ ...p, nome:v }))} />
                <Input label="Responsável" value={editSetor.responsavel || ""} onChange={v => setEditSetor(p => ({ ...p, responsavel:v }))} />
                <Input label="Nº Funcionários" type="number" value={editSetor.nFunc || ""} onChange={v => setEditSetor(p => ({ ...p, nFunc: parseInt(v) || 0 }))} />
                <div style={{ display:"flex", gap:8, marginTop:4 }}>
                  <Btn onClick={handleAtualizar} color={C.green} small disabled={saving} icon={<Save size={12} />}>{saving ? "Salvando..." : "Salvar"}</Btn>
                  <Btn onClick={() => setEditSetor(null)} outline color={C.gray} small icon={<X size={12} />}>Cancelar</Btn>
                </div>
              </Card>
            : <Card key={s.id}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div>
                    <p style={{ fontWeight:600, fontSize:14, margin:"0 0 2px", color:C.navy }}>{s.nome}</p>
                    <p style={{ fontSize:11, color:C.muted, margin:0 }}>Responsável: {s.responsavel || "—"} | {s.nFunc || 0} funcionários</p>
                  </div>
                  {canEdit && (
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => setEditSetor({ ...s })} style={{ background:"none", border:"none", cursor:"pointer", color:C.blue }}><Edit2 size={13} /></button>
                      <button onClick={() => handleExcluir(s.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red }}><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
                  {(s.servidores || []).length === 0
                    ? <span style={{ fontSize:11, color:C.muted }}>Nenhum servidor cadastrado</span>
                    : (s.servidores || []).map((sv, i) => (
                        <span key={i} style={{ background:"#f0f9ff", color:"#0369a1", fontSize:11, padding:"3px 9px", borderRadius:20 }}>{sv}</span>
                      ))
                  }
                </div>
                <div style={{ padding:"6px 10px", background:C.bg, borderRadius:6, fontSize:11, color:C.muted, display:"flex", gap:16 }}>
                  <span>Riscos mapeados: <strong style={{ color:C.text }}>{riscos.filter(r => r.setorId === s.id).length}</strong></span>
                  <span>Críticos/Catastróficos: <strong style={{ color:C.red }}>{riscos.filter(r => r.setorId === s.id && r.score >= 13).length}</strong></span>
                </div>
              </Card>
        ))}
      </div>
    </div>
  );
}
