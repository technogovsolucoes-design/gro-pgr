import { useState } from "react";
import { Building2, Plus, Save, X, Loader, LogOut, UserPlus, Eye, EyeOff, Users, ChevronDown, ChevronRight, Edit2, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Btn, Input, Card, SectionTitle, Badge } from "../components/ui";
import { C, EMP_FORM_VAZIO, PERFIS, PERFIL_CORES } from "../constants";
import { NexusLogo } from "../assets/NexusLogo";

const USER_FORM_VAZIO = { nome:"", email:"", senha:"", confirmarSenha:"", perfil:"SESMT", empresas:[] };

export default function EmpresaSelector() {
  const {
    user, userProfile, logout,
    isAdmin, isGestor, canCreateEmpresa, canManageUsers,
    empresas, loadingEmpresas, selecionarEmpresa, criarEmpresa,
    usuarios, salvarUsuario, criarUsuario, excluirUsuario,
  } = useApp();

  // ── Empresa ──
  const [criandoEmp, setCriandoEmp] = useState(false);
  const [empForm, setEmpForm]       = useState(EMP_FORM_VAZIO);
  const [savingEmp, setSavingEmp]   = useState(false);

  // ── Painel usuários ──
  const [painelUsuarios, setPainelUsuarios] = useState(false);
  const [criandoUser, setCriandoUser]       = useState(false);
  const [userForm, setUserForm]             = useState(USER_FORM_VAZIO);
  const [userErr, setUserErr]               = useState("");
  const [showPwd, setShowPwd]               = useState(false);
  const [savingUser, setSavingUser]         = useState(false);
  const [editando, setEditando]             = useState(null); // usuário sendo editado
  const [savingEdit, setSavingEdit]         = useState(false);

  const avatarInicial = (userProfile?.nome || "?").split(" ").map(p => p[0]).slice(0,2).join("").toUpperCase();

  // ── Regras de permissão por usuário-alvo ──
  const podeEditar  = (u) => isAdmin || (isGestor && (u.id === user?.uid || u.perfil === "SESMT"));
  const podeExcluir = (u) => isAdmin && u.id !== user?.uid;
  // Perfis que o criador pode atribuir
  const perfisDisponiveis = isAdmin ? PERFIS : ["SESMT"];

  // ── Handlers empresa ──
  const handleCriarEmp = async () => {
    if (!empForm.razao) return;
    setSavingEmp(true);
    await criarEmpresa(empForm, () => { setCriandoEmp(false); setEmpForm(EMP_FORM_VAZIO); });
    setSavingEmp(false);
  };

  // ── Handlers usuário — criar ──
  const toggleEmpresaUser = (empId) =>
    setUserForm(p => ({ ...p, empresas: p.empresas.includes(empId) ? p.empresas.filter(id => id !== empId) : [...p.empresas, empId] }));

  const handleCriarUser = async () => {
    setUserErr("");
    if (!userForm.nome.trim())     return setUserErr("Informe o nome completo.");
    if (!userForm.email.trim())    return setUserErr("Informe o e-mail.");
    if (userForm.senha.length < 6) return setUserErr("Senha deve ter no mínimo 6 caracteres.");
    if (userForm.senha !== userForm.confirmarSenha) return setUserErr("As senhas não conferem.");
    setSavingUser(true);
    const res = await criarUsuario({ email:userForm.email.trim(), senha:userForm.senha, nome:userForm.nome.trim(), perfil:userForm.perfil, empresasIds:userForm.empresas });
    setSavingUser(false);
    if (res.ok) { setUserForm(USER_FORM_VAZIO); setCriandoUser(false); }
    else setUserErr(res.msg);
  };

  // ── Handlers usuário — editar ──
  const toggleEmpresaEdit = (empId) =>
    setEditando(p => ({ ...p, empresas: (p.empresas||[]).includes(empId) ? p.empresas.filter(id => id !== empId) : [...(p.empresas||[]), empId] }));

  const handleSalvarEdit = async () => {
    setSavingEdit(true);
    await salvarUsuario(editando);
    setEditando(null);
    setSavingEdit(false);
  };

  const handleExcluir = async (u) => {
    if (!window.confirm(`Excluir ${u.nome || u.email}?`)) return;
    await excluirUsuario(u.id);
  };

  // Perfis editáveis para o alvo
  const perfisEditaveis = (u) => {
    if (isAdmin) return PERFIS;
    if (isGestor && u.id === user?.uid) return PERFIS.filter(p => p !== "Admin"); // gestor não vira admin por si
    return ["SESMT"]; // gestor editando SESMT
  };

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", background:C.bg, minHeight:"100vh", color:C.text }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(90deg, #0d2a5e 0%, #1652a1 100%)`, padding:"8px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <NexusLogo size={36}/>
        <div style={{ flex:1 }}>
          <p style={{ color:"#fff", fontWeight:800, fontSize:15, margin:0, letterSpacing:"-0.3px" }}>
            NEX<span style={{ color:"#38b249" }}>US</span>
            <span style={{ fontWeight:400, fontSize:11, color:"rgba(255,255,255,0.6)", marginLeft:10 }}>Gestão de Riscos Psicossociais</span>
          </p>
          <p style={{ color:"rgba(255,255,255,0.5)", fontSize:9.5, margin:0 }}>NR-01 · NR-17 · ISO 45003 · eSocial · FAP/NTEP · Technogov Soluções</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:"50%", background:"#3a6aa8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>{avatarInicial}</div>
          <div style={{ textAlign:"right" }}>
            <p style={{ color:"#fff", fontSize:12, margin:0, fontWeight:500 }}>{userProfile?.nome || user.email}</p>
            <p style={{ color:"#93c5fd", fontSize:10, margin:0 }}>{userProfile?.perfil || "Usuário"}</p>
          </div>
          <button onClick={logout} style={{ background:"none", border:"none", cursor:"pointer", color:"#93c5fd", marginLeft:4 }}><LogOut size={15}/></button>
        </div>
      </div>

      <div style={{ padding:"32px 20px", maxWidth:960, margin:"0 auto" }}>

        {/* ── Empresas ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20 }}>
          <div>
            <p style={{ fontSize:20, fontWeight:700, color:C.navy, margin:"0 0 4px" }}>Selecionar Empresa</p>
            <p style={{ fontSize:13, color:C.muted, margin:0 }}>Olá, <strong>{userProfile?.nome}</strong> — escolha a empresa para continuar.</p>
          </div>
          {canCreateEmpresa && (
            <Btn onClick={() => setCriandoEmp(p => !p)} color={C.navyMid} icon={<Plus size={13}/>}>Nova Empresa</Btn>
          )}
        </div>

        {criandoEmp && (
          <Card style={{ marginBottom:20, border:`1px solid ${C.navyMid}` }}>
            <SectionTitle><Building2 size={14}/> Cadastrar Nova Empresa</SectionTitle>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Razão Social" value={empForm.razao} onChange={v => setEmpForm(p => ({ ...p, razao:v }))}/>
              <Input label="CNPJ" value={empForm.cnpj} onChange={v => setEmpForm(p => ({ ...p, cnpj:v }))}/>
              <Input label="CNAE Principal" value={empForm.cnae} onChange={v => setEmpForm(p => ({ ...p, cnae:v }))}/>
              <Input label="Grau de Risco (GR 1–4)" value={empForm.grauRisco} onChange={v => setEmpForm(p => ({ ...p, grauRisco:v }))}/>
              <Input label="Endereço Completo" value={empForm.endereco} onChange={v => setEmpForm(p => ({ ...p, endereco:v }))}/>
              <Input label="Responsável Técnico" value={empForm.responsavel} onChange={v => setEmpForm(p => ({ ...p, responsavel:v }))}/>
              <Input label="Data da Avaliação" type="date" value={empForm.dataAvaliacao} onChange={v => setEmpForm(p => ({ ...p, dataAvaliacao:v }))}/>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:4 }}>
              <Btn onClick={handleCriarEmp} color={C.green} disabled={savingEmp || !empForm.razao} icon={savingEmp ? <Loader size={12}/> : <Save size={12}/>}>
                {savingEmp ? "Criando..." : "Criar e Entrar"}
              </Btn>
              <Btn onClick={() => { setCriandoEmp(false); setEmpForm(EMP_FORM_VAZIO); }} outline color={C.gray} icon={<X size={12}/>}>Cancelar</Btn>
            </div>
          </Card>
        )}

        {loadingEmpresas ? (
          <div style={{ textAlign:"center", padding:"40px 0" }}><Loader size={24} color={C.navyMid}/><p style={{ color:C.muted, fontSize:13, marginTop:10 }}>Carregando...</p></div>
        ) : empresas.length === 0 ? (
          <div style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:10, padding:"32px", textAlign:"center" }}>
            <Building2 size={32} color="#ca8a04" style={{ marginBottom:10 }}/>
            <p style={{ fontSize:14, fontWeight:600, color:"#92400e", margin:"0 0 6px" }}>Nenhuma empresa cadastrada</p>
            <p style={{ fontSize:12, color:"#a16207", margin:0 }}>Clique em <strong>Nova Empresa</strong> para começar.</p>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
            {empresas.map(e => (
              <div key={e.id} onClick={() => selecionarEmpresa(e)}
                style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:18, cursor:"pointer" }}
                onMouseEnter={ev => ev.currentTarget.style.borderColor = C.navyMid}
                onMouseLeave={ev => ev.currentTarget.style.borderColor = C.border}
              >
                <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                  <div style={{ width:38, height:38, borderRadius:8, background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Building2 size={18} color={C.navyMid}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:700, fontSize:13, color:C.navy, margin:"0 0 2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.razao || "—"}</p>
                    <p style={{ fontSize:11, color:C.muted, margin:0 }}>CNPJ: {e.cnpj || "—"}</p>
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {e.cnae && <span style={{ background:"#f0f9ff", color:"#0369a1", fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:500 }}>CNAE {e.cnae}</span>}
                  {e.grauRisco && <span style={{ background:"#f0fdf4", color:"#15803d", fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:500 }}>GR {e.grauRisco}</span>}
                  {e.responsavel && <span style={{ background:C.bg, color:C.muted, fontSize:10, padding:"2px 8px", borderRadius:4 }}>{e.responsavel}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Gerenciar Usuários (Admin e Gestor) ── */}
        {canManageUsers && (
          <div style={{ marginTop:32 }}>
            <button onClick={() => setPainelUsuarios(p => !p)}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%", background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", cursor:"pointer" }}>
              <div style={{ width:34, height:34, borderRadius:8, background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Users size={16} color={C.navyMid}/>
              </div>
              <div style={{ flex:1, textAlign:"left" }}>
                <p style={{ fontWeight:600, fontSize:13, color:C.navy, margin:0 }}>Gerenciar Usuários</p>
                <p style={{ fontSize:11, color:C.muted, margin:0 }}>{usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""} cadastrado{usuarios.length !== 1 ? "s" : ""}</p>
              </div>
              {painelUsuarios ? <ChevronDown size={16} color={C.muted}/> : <ChevronRight size={16} color={C.muted}/>}
            </button>

            {painelUsuarios && (
              <Card style={{ borderTopLeftRadius:0, borderTopRightRadius:0, borderTop:"none" }}>

                {/* Botão novo usuário */}
                <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
                  <Btn onClick={() => { setCriandoUser(p => !p); setUserErr(""); setUserForm(USER_FORM_VAZIO); setEditando(null); }} color={C.navyMid} icon={<UserPlus size={13}/>}>
                    Novo Usuário
                  </Btn>
                </div>

                {/* ── Formulário criação ── */}
                {criandoUser && (
                  <div style={{ background:"#f8fafc", border:`1px solid ${C.navyMid}`, borderRadius:8, padding:16, marginBottom:16 }}>
                    <p style={{ fontWeight:600, fontSize:13, color:C.navy, margin:"0 0 12px" }}>Cadastrar Novo Usuário</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                      <Input label="Nome Completo *" value={userForm.nome} onChange={v => setUserForm(p => ({ ...p, nome:v }))} placeholder="Ex: João Silva"/>
                      <Input label="E-mail *" type="email" value={userForm.email} onChange={v => setUserForm(p => ({ ...p, email:v }))} placeholder="joao@empresa.com"/>
                      <div>
                        <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Senha * (mín. 6 caracteres)</p>
                        <div style={{ position:"relative" }}>
                          <input type={showPwd?"text":"password"} value={userForm.senha} onChange={e => setUserForm(p => ({ ...p, senha:e.target.value }))} placeholder="••••••"
                            style={{ width:"100%", padding:"8px 32px 8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
                          <button onClick={() => setShowPwd(p => !p)} style={{ position:"absolute", right:8, top:8, background:"none", border:"none", cursor:"pointer", color:C.muted }}>
                            {showPwd ? <EyeOff size={13}/> : <Eye size={13}/>}
                          </button>
                        </div>
                      </div>
                      <div>
                        <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Confirmar Senha *</p>
                        <input type={showPwd?"text":"password"} value={userForm.confirmarSenha} onChange={e => setUserForm(p => ({ ...p, confirmarSenha:e.target.value }))} placeholder="••••••"
                          style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${userForm.confirmarSenha && userForm.confirmarSenha !== userForm.senha ? "#fca5a5" : C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
                        {userForm.confirmarSenha && userForm.confirmarSenha !== userForm.senha && <p style={{ fontSize:10, color:C.red, margin:"3px 0 0" }}>Senhas não conferem</p>}
                      </div>
                      <div>
                        <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Perfil *</p>
                        <select value={userForm.perfil} onChange={e => setUserForm(p => ({ ...p, perfil:e.target.value }))}
                          style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", color:C.text, background:C.white }}>
                          {perfisDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <p style={{ fontSize:10, color:C.muted, margin:"3px 0 0" }}>
                          {userForm.perfil === "Admin" ? "Acesso total ao sistema" : userForm.perfil === "Gestor" ? "Cria empresas e gerencia SESMT" : "Realiza avaliações de risco"}
                        </p>
                      </div>
                    </div>

                    {empresas.length > 0 && (
                      <div style={{ marginBottom:10 }}>
                        <p style={{ fontSize:11, color:C.muted, margin:"0 0 6px", fontWeight:500 }}>Empresas com acesso</p>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {empresas.map(emp => {
                            const marcada = userForm.empresas.includes(emp.id);
                            return (
                              <label key={emp.id} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", padding:"4px 10px", borderRadius:6, border:`1px solid ${marcada?C.navyMid:C.border}`, background:marcada?"#eff6ff":C.white, fontSize:11, fontWeight:marcada?600:400, color:marcada?C.navyMid:C.text }}>
                                <input type="checkbox" checked={marcada} onChange={() => toggleEmpresaUser(emp.id)} style={{ accentColor:C.navyMid }}/>
                                {emp.razao}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {userErr && <div style={{ background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:6, padding:"8px 12px", marginBottom:10, fontSize:12, color:C.red }}>{userErr}</div>}
                    <div style={{ display:"flex", gap:8 }}>
                      <Btn onClick={handleCriarUser} color={C.green} disabled={savingUser} icon={savingUser?<Loader size={12}/>:<Save size={12}/>}>
                        {savingUser ? "Criando..." : "Criar Usuário"}
                      </Btn>
                      <Btn onClick={() => { setCriandoUser(false); setUserForm(USER_FORM_VAZIO); setUserErr(""); }} outline color={C.gray} icon={<X size={12}/>}>Cancelar</Btn>
                    </div>
                  </div>
                )}

                {/* ── Lista de usuários ── */}
                {usuarios.length === 0 ? (
                  <p style={{ fontSize:12, color:C.muted, textAlign:"center", padding:"12px 0" }}>Nenhum usuário cadastrado.</p>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {usuarios.map(u => {
                      const pc = PERFIL_CORES[u.perfil] || PERFIL_CORES["Usuário"];
                      const initials = (u.nome||u.email||"?").split(" ").map(p=>p[0]).slice(0,2).join("").toUpperCase();
                      const ehEuMesmo = u.id === user?.uid;
                      const isEditandoEste = editando?.id === u.id;

                      if (isEditandoEste) return (
                        <div key={u.id} style={{ background:"#f8fafc", border:`1px solid ${C.navyMid}`, borderRadius:8, padding:14 }}>
                          <p style={{ fontWeight:600, fontSize:12, color:C.navy, margin:"0 0 10px" }}>Editando: {editando.nome || editando.email}</p>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                            <Input label="Nome" value={editando.nome||""} onChange={v => setEditando(p => ({ ...p, nome:v }))}/>
                            <div>
                              <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Perfil</p>
                              <select value={editando.perfil||"Gestor"} onChange={e => setEditando(p => ({ ...p, perfil:e.target.value }))}
                                style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", color:C.text, background:C.white }}>
                                {perfisEditaveis(u).map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                          </div>
                          {empresas.length > 0 && (
                            <div style={{ marginBottom:10 }}>
                              <p style={{ fontSize:11, color:C.muted, margin:"0 0 6px", fontWeight:500 }}>Empresas com acesso</p>
                              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                                {empresas.map(emp => {
                                  const marcada = (editando.empresas||[]).includes(emp.id);
                                  return (
                                    <label key={emp.id} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", padding:"4px 10px", borderRadius:6, border:`1px solid ${marcada?C.navyMid:C.border}`, background:marcada?"#eff6ff":C.white, fontSize:11, fontWeight:marcada?600:400, color:marcada?C.navyMid:C.text }}>
                                      <input type="checkbox" checked={marcada} onChange={() => toggleEmpresaEdit(emp.id)} style={{ accentColor:C.navyMid }}/>
                                      {emp.razao}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <div style={{ display:"flex", gap:8 }}>
                            <Btn onClick={handleSalvarEdit} color={C.green} small disabled={savingEdit} icon={savingEdit?<Loader size={11}/>:<Save size={11}/>}>
                              {savingEdit?"Salvando...":"Salvar"}
                            </Btn>
                            <Btn onClick={() => setEditando(null)} outline color={C.gray} small icon={<X size={11}/>}>Cancelar</Btn>
                          </div>
                        </div>
                      );

                      return (
                        <div key={u.id} style={{ display:"flex", alignItems:"center", gap:10, background:C.bg, borderRadius:8, padding:"10px 12px" }}>
                          <div style={{ width:32, height:32, borderRadius:"50%", background:"#e0e7ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#3730a3", flexShrink:0 }}>{initials}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2, flexWrap:"wrap" }}>
                              <p style={{ fontWeight:600, fontSize:12, color:C.navy, margin:0 }}>{u.nome||"—"}</p>
                              <Badge label={u.perfil||"Usuário"} color={pc.color} bg={pc.bg}/>
                              {ehEuMesmo && <Badge label="você" color={C.muted} bg={C.bg}/>}
                            </div>
                            <p style={{ fontSize:11, color:C.muted, margin:0 }}>{u.email}</p>
                          </div>
                          <div style={{ display:"flex", gap:4 }}>
                            {podeEditar(u) && (
                              <button onClick={() => { setEditando({ ...u }); setCriandoUser(false); }}
                                style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer", color:C.navyMid, padding:"4px 8px", display:"flex", alignItems:"center", gap:4, fontSize:11 }}>
                                <Edit2 size={12}/> Editar
                              </button>
                            )}
                            {podeExcluir(u) && (
                              <button onClick={() => handleExcluir(u)}
                                style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer", color:C.red, padding:"4px 8px", display:"flex", alignItems:"center", gap:4, fontSize:11 }}>
                                <Trash2 size={12}/>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
