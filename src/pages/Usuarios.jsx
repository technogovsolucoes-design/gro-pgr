import { useState } from "react";
import { UserCheck, Lock, Edit2, Save, X, Loader } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Btn, Input, Card, SectionTitle, Badge } from "../components/ui";
import { C, PERFIS, PERFIL_CORES } from "../constants";

export default function Usuarios() {
  const { usuarios, empresas, salvarUsuario } = useApp();
  const [editUsuario, setEditUsuario]   = useState(null);
  const [saving, setSaving]             = useState(false);

  const handleSalvar = async () => {
    setSaving(true);
    await salvarUsuario(editUsuario);
    setEditUsuario(null);
    setSaving(false);
  };

  const toggleEmpresa = (empId) => {
    setEditUsuario(p => {
      const lista = p.empresas || [];
      return { ...p, empresas: lista.includes(empId) ? lista.filter(id => id !== empId) : [...lista, empId] };
    });
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <SectionTitle><UserCheck size={14} /> Gerenciamento de Usuários ({usuarios.length})</SectionTitle>
        <div style={{ display:"flex", alignItems:"center", gap:6, background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:6, padding:"5px 10px" }}>
          <Lock size={11} color="#1e40af" />
          <span style={{ fontSize:11, color:"#1e40af" }}>Visível apenas para Admin</span>
        </div>
      </div>

      <div style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:11, color:"#92400e" }}>
        Usuários são criados no <strong>Firebase Authentication</strong>. Aqui você define o perfil de acesso e associa cada usuário às empresas que ele pode visualizar.
      </div>

      {usuarios.length === 0 ? (
        <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"24px", textAlign:"center", color:C.muted, fontSize:12 }}>
          Nenhum usuário encontrado.
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {usuarios.map(u => {
            const pc = PERFIL_CORES[u.perfil] || PERFIL_CORES["Usuário"];
            const isEditing = editUsuario?.id === u.id;
            const initials = (u.nome || u.email || "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

            return (
              <Card key={u.id} style={isEditing ? { border:`1px solid ${C.navyMid}` } : {}}>
                {!isEditing ? (
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:"#e0e7ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#3730a3", flexShrink:0 }}>
                      {initials}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                        <p style={{ fontWeight:600, fontSize:13, margin:0, color:C.navy, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.nome || "—"}</p>
                        <Badge label={u.perfil || "Usuário"} color={pc.color} bg={pc.bg} />
                      </div>
                      <p style={{ fontSize:11, color:C.muted, margin:"0 0 5px" }}>{u.email || u.id}</p>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {(u.empresas || []).length === 0
                          ? <span style={{ fontSize:10, color:C.muted }}>Sem empresas associadas</span>
                          : (u.empresas || []).map(eid => {
                              const emp = empresas.find(e => e.id === eid);
                              return emp ? <span key={eid} style={{ background:"#f0f9ff", color:"#0369a1", fontSize:10, padding:"2px 8px", borderRadius:4 }}>{emp.razao}</span> : null;
                            })
                        }
                      </div>
                    </div>
                    <Btn onClick={() => setEditUsuario({ ...u })} outline color={C.navyMid} small icon={<Edit2 size={11} />}>Editar</Btn>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight:600, fontSize:13, color:C.navy, margin:"0 0 14px" }}>Editando: {editUsuario.nome || editUsuario.email}</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                      <Input label="Nome" value={editUsuario.nome || ""} onChange={v => setEditUsuario(p => ({ ...p, nome:v }))} />
                      <div>
                        <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Perfil de Acesso</p>
                        <select
                          value={editUsuario.perfil || "Gestor"}
                          onChange={e => setEditUsuario(p => ({ ...p, perfil: e.target.value }))}
                          style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", color:C.text, background:C.white }}
                        >
                          {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom:14 }}>
                      <p style={{ fontSize:11, color:C.muted, margin:"0 0 8px", fontWeight:500 }}>Empresas com acesso</p>
                      {empresas.length === 0
                        ? <p style={{ fontSize:11, color:C.muted }}>Nenhuma empresa cadastrada.</p>
                        : <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                            {empresas.map(emp => {
                              const marcada = (editUsuario.empresas || []).includes(emp.id);
                              return (
                                <label key={emp.id} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", padding:"5px 10px", borderRadius:6, border:`1px solid ${marcada ? C.navyMid : C.border}`, background: marcada ? "#eff6ff" : C.white, fontSize:11, fontWeight: marcada ? 600 : 400, color: marcada ? C.navyMid : C.text }}>
                                  <input type="checkbox" checked={marcada} onChange={() => toggleEmpresa(emp.id)} style={{ accentColor:C.navyMid }} />
                                  {emp.razao}
                                </label>
                              );
                            })}
                          </div>
                      }
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <Btn onClick={handleSalvar} color={C.green} small disabled={saving} icon={saving ? <Loader size={11} /> : <Save size={11} />}>
                        {saving ? "Salvando..." : "Salvar"}
                      </Btn>
                      <Btn onClick={() => setEditUsuario(null)} outline color={C.gray} small icon={<X size={11} />}>Cancelar</Btn>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
