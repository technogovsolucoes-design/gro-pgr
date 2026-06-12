import { useState } from "react";
import { UserCheck, Lock, Edit2, Save, X, Loader, Plus, Eye, EyeOff, Trash2, UserPlus } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Btn, Input, Card, SectionTitle, Badge } from "../components/ui";
import { C, PERFIS, PERFIL_CORES } from "../constants";

const FORM_VAZIO = { nome:"", email:"", senha:"", confirmarSenha:"", perfil:"SESMT", empresas:[] };

export default function Usuarios() {
  const { usuarios, empresas, salvarUsuario, criarUsuario, excluirUsuario, user: userAtual, isAdmin, isGestor } = useApp();

  const [editUsuario, setEditUsuario] = useState(null);
  const [saving, setSaving]           = useState(false);

  const [criando, setCriando]   = useState(false);
  const [form, setForm]         = useState(FORM_VAZIO);
  const [formErr, setFormErr]   = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [savingNovo, setSavingNovo] = useState(false);

  // ── Editar ──
  const handleSalvar = async () => {
    setSaving(true);
    await salvarUsuario(editUsuario);
    setEditUsuario(null);
    setSaving(false);
  };

  const toggleEmpresaEdit = (empId) => {
    setEditUsuario(p => {
      const lista = p.empresas || [];
      return { ...p, empresas: lista.includes(empId) ? lista.filter(id => id !== empId) : [...lista, empId] };
    });
  };

  // ── Criar ──
  const handleCriar = async () => {
    setFormErr("");
    if (!form.nome.trim())  return setFormErr("Informe o nome completo.");
    if (!form.email.trim()) return setFormErr("Informe o e-mail.");
    if (form.senha.length < 6) return setFormErr("Senha deve ter no mínimo 6 caracteres.");
    if (form.senha !== form.confirmarSenha) return setFormErr("As senhas não conferem.");

    setSavingNovo(true);
    const res = await criarUsuario({
      email: form.email.trim(),
      senha: form.senha,
      nome: form.nome.trim(),
      perfil: form.perfil,
      empresasIds: form.empresas,
    });
    setSavingNovo(false);

    if (res.ok) {
      setForm(FORM_VAZIO);
      setCriando(false);
    } else {
      setFormErr(res.msg);
    }
  };

  const toggleEmpresaForm = (empId) => {
    setForm(p => {
      const lista = p.empresas || [];
      return { ...p, empresas: lista.includes(empId) ? lista.filter(id => id !== empId) : [...lista, empId] };
    });
  };

  // Regras de hierarquia
  const podeEditar  = (u) => isAdmin || (isGestor && (u.id === userAtual?.uid || u.perfil === "SESMT"));
  const podeExcluir = (u) => isAdmin && u.id !== userAtual?.uid;
  const perfisDisponiveis = isAdmin ? PERFIS : ["SESMT"];
  const perfisEditaveis = (u) => {
    if (isAdmin) return PERFIS;
    if (isGestor && u.id === userAtual?.uid) return PERFIS.filter(p => p !== "Admin");
    return ["SESMT"];
  };

  const handleExcluir = async (u) => {
    if (!window.confirm(`Excluir ${u.nome || u.email} do sistema?`)) return;
    await excluirUsuario(u.id);
  };

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <SectionTitle><UserCheck size={14}/> Usuários do Sistema ({usuarios.length})</SectionTitle>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:6, padding:"5px 10px" }}>
            <Lock size={11} color="#1e40af"/>
            <span style={{ fontSize:11, color:"#1e40af" }}>Visível apenas para Admin</span>
          </div>
          <Btn onClick={() => { setCriando(p => !p); setFormErr(""); setForm(FORM_VAZIO); }} color={C.navyMid} icon={<UserPlus size={13}/>}>
            Novo Usuário
          </Btn>
        </div>
      </div>

      {/* Formulário de criação */}
      {criando && (
        <Card style={{ marginBottom:20, border:`1px solid ${C.navyMid}` }}>
          <SectionTitle><Plus size={13}/> Cadastrar Novo Usuário</SectionTitle>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <Input label="Nome Completo *" value={form.nome} onChange={v => setForm(p => ({ ...p, nome:v }))} placeholder="Ex: João Silva"/>
            <Input label="E-mail *" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email:v }))} placeholder="joao@empresa.com"/>

            {/* Senha */}
            <div>
              <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Senha * (mín. 6 caracteres)</p>
              <div style={{ position:"relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.senha}
                  onChange={e => setForm(p => ({ ...p, senha:e.target.value }))}
                  placeholder="••••••"
                  style={{ width:"100%", padding:"8px 32px 8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}
                />
                <button onClick={() => setShowPwd(p => !p)} style={{ position:"absolute", right:8, top:8, background:"none", border:"none", cursor:"pointer", color:C.muted }}>
                  {showPwd ? <EyeOff size={13}/> : <Eye size={13}/>}
                </button>
              </div>
            </div>

            {/* Confirmar senha */}
            <div>
              <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Confirmar Senha *</p>
              <input
                type={showPwd ? "text" : "password"}
                value={form.confirmarSenha}
                onChange={e => setForm(p => ({ ...p, confirmarSenha:e.target.value }))}
                placeholder="••••••"
                style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${form.confirmarSenha && form.confirmarSenha !== form.senha ? "#fca5a5" : C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}
              />
              {form.confirmarSenha && form.confirmarSenha !== form.senha && (
                <p style={{ fontSize:10, color:C.red, margin:"3px 0 0" }}>Senhas não conferem</p>
              )}
            </div>

            {/* Perfil */}
            <div>
              <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Perfil de Acesso *</p>
              <select
                value={form.perfil}
                onChange={e => setForm(p => ({ ...p, perfil:e.target.value }))}
                style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", color:C.text, background:C.white }}
              >
                {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <p style={{ fontSize:10, color:C.muted, margin:"3px 0 0" }}>
                {form.perfil === "Admin" ? "Acesso total ao sistema" : form.perfil === "SESMT" ? "Cria e edita avaliações" : "Apenas leitura"}
              </p>
            </div>
          </div>

          {/* Empresas */}
          {empresas.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <p style={{ fontSize:11, color:C.muted, margin:"0 0 8px", fontWeight:500 }}>Empresas com acesso</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {empresas.map(emp => {
                  const marcada = form.empresas.includes(emp.id);
                  return (
                    <label key={emp.id} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", padding:"5px 10px", borderRadius:6, border:`1px solid ${marcada ? C.navyMid : C.border}`, background:marcada ? "#eff6ff" : C.white, fontSize:11, fontWeight:marcada ? 600 : 400, color:marcada ? C.navyMid : C.text }}>
                      <input type="checkbox" checked={marcada} onChange={() => toggleEmpresaForm(emp.id)} style={{ accentColor:C.navyMid }}/>
                      {emp.razao}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {formErr && (
            <div style={{ background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:6, padding:"8px 12px", marginBottom:12, fontSize:12, color:C.red }}>
              {formErr}
            </div>
          )}

          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={handleCriar} color={C.green} disabled={savingNovo} icon={savingNovo ? <Loader size={12}/> : <Save size={12}/>}>
              {savingNovo ? "Criando..." : "Criar Usuário"}
            </Btn>
            <Btn onClick={() => { setCriando(false); setForm(FORM_VAZIO); setFormErr(""); }} outline color={C.gray} icon={<X size={12}/>}>Cancelar</Btn>
          </div>
        </Card>
      )}

      {/* Lista de usuários */}
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
            const ehEuMesmo = u.id === userAtual?.uid;

            return (
              <Card key={u.id} style={isEditing ? { border:`1px solid ${C.navyMid}` } : {}}>
                {!isEditing ? (
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:"#e0e7ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#3730a3", flexShrink:0 }}>
                      {initials}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                        <p style={{ fontWeight:600, fontSize:13, margin:0, color:C.navy }}>{u.nome || "—"}</p>
                        <Badge label={u.perfil || "Usuário"} color={pc.color} bg={pc.bg}/>
                        {ehEuMesmo && <Badge label="você" color={C.muted} bg={C.bg}/>}
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
                    <div style={{ display:"flex", gap:6 }}>
                      {podeEditar(u) && (
                        <Btn onClick={() => setEditUsuario({ ...u })} outline color={C.navyMid} small icon={<Edit2 size={11}/>}>Editar</Btn>
                      )}
                      {podeExcluir(u) && (
                        <Btn onClick={() => handleExcluir(u)} outline color={C.red} small icon={<Trash2 size={11}/>}>Excluir</Btn>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight:600, fontSize:13, color:C.navy, margin:"0 0 14px" }}>Editando: {editUsuario.nome || editUsuario.email}</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                      <Input label="Nome" value={editUsuario.nome || ""} onChange={v => setEditUsuario(p => ({ ...p, nome:v }))}/>
                      <div>
                        <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Perfil de Acesso</p>
                        <select
                          value={editUsuario.perfil || "Gestor"}
                          onChange={e => setEditUsuario(p => ({ ...p, perfil:e.target.value }))}
                          style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", color:C.text, background:C.white }}
                        >
                          {perfisEditaveis(editUsuario).map(p => <option key={p} value={p}>{p}</option>)}
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
                                <label key={emp.id} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", padding:"5px 10px", borderRadius:6, border:`1px solid ${marcada ? C.navyMid : C.border}`, background:marcada ? "#eff6ff" : C.white, fontSize:11, fontWeight:marcada ? 600 : 400, color:marcada ? C.navyMid : C.text }}>
                                  <input type="checkbox" checked={marcada} onChange={() => toggleEmpresaEdit(emp.id)} style={{ accentColor:C.navyMid }}/>
                                  {emp.razao}
                                </label>
                              );
                            })}
                          </div>
                      }
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <Btn onClick={handleSalvar} color={C.green} small disabled={saving} icon={saving ? <Loader size={11}/> : <Save size={11}/>}>
                        {saving ? "Salvando..." : "Salvar"}
                      </Btn>
                      <Btn onClick={() => setEditUsuario(null)} outline color={C.gray} small icon={<X size={11}/>}>Cancelar</Btn>
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
