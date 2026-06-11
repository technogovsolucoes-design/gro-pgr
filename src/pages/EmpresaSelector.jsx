import { useState } from "react";
import { Building2, Plus, Save, X, Loader, LogOut, Shield } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Btn, Input, Card, SectionTitle } from "../components/ui";
import { C, EMP_FORM_VAZIO } from "../constants";

export default function EmpresaSelector() {
  const { user, userProfile, logout, empresas, loadingEmpresas, selecionarEmpresa, criarEmpresa, canEdit } = useApp();
  const [criando, setCriando]     = useState(false);
  const [form, setForm]           = useState(EMP_FORM_VAZIO);
  const [saving, setSaving]       = useState(false);

  const avatarInicial = (userProfile?.nome || "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

  const handleCriar = async () => {
    if (!form.razao) return;
    setSaving(true);
    await criarEmpresa(form, () => { setCriando(false); setForm(EMP_FORM_VAZIO); });
    setSaving(false);
  };

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", background:C.bg, minHeight:"100vh", color:C.text }}>
      <div style={{ background:C.navy, padding:"12px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <Shield size={20} color="#93c5fd" />
        <div style={{ flex:1 }}>
          <p style={{ color:"#fff", fontWeight:600, fontSize:14, margin:0 }}>GRO/PGR — SST</p>
          <p style={{ color:"#93c5fd", fontSize:10, margin:0 }}>Gestão de Riscos Psicossociais · NR-01</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:"50%", background:"#3a6aa8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>{avatarInicial}</div>
          <div style={{ textAlign:"right" }}>
            <p style={{ color:"#fff", fontSize:12, margin:0, fontWeight:500 }}>{userProfile?.nome || user.email}</p>
            <p style={{ color:"#93c5fd", fontSize:10, margin:0 }}>{userProfile?.perfil || "Usuário"}</p>
          </div>
          <button onClick={logout} style={{ background:"none", border:"none", cursor:"pointer", color:"#93c5fd", marginLeft:4 }}><LogOut size={15} /></button>
        </div>
      </div>

      <div style={{ padding:"32px 20px", maxWidth:960, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:28 }}>
          <div>
            <p style={{ fontSize:20, fontWeight:700, color:C.navy, margin:"0 0 4px" }}>Selecionar Empresa</p>
            <p style={{ fontSize:13, color:C.muted, margin:0 }}>Olá, <strong>{userProfile?.nome}</strong> — escolha a empresa para continuar.</p>
          </div>
          {canEdit && (
            <Btn onClick={() => setCriando(p => !p)} color={C.navyMid} icon={<Plus size={13} />}>Nova Empresa</Btn>
          )}
        </div>

        {criando && (
          <Card style={{ marginBottom:24, border:`1px solid ${C.navyMid}` }}>
            <SectionTitle><Building2 size={14} /> Cadastrar Nova Empresa</SectionTitle>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Razão Social" value={form.razao} onChange={v => setForm(p => ({ ...p, razao:v }))} required />
              <Input label="CNPJ" value={form.cnpj} onChange={v => setForm(p => ({ ...p, cnpj:v }))} />
              <Input label="CNAE Principal" value={form.cnae} onChange={v => setForm(p => ({ ...p, cnae:v }))} />
              <Input label="Grau de Risco (GR 1–4)" value={form.grauRisco} onChange={v => setForm(p => ({ ...p, grauRisco:v }))} />
              <Input label="Endereço Completo" value={form.endereco} onChange={v => setForm(p => ({ ...p, endereco:v }))} />
              <Input label="Responsável Técnico" value={form.responsavel} onChange={v => setForm(p => ({ ...p, responsavel:v }))} />
              <Input label="Data da Avaliação" type="date" value={form.dataAvaliacao} onChange={v => setForm(p => ({ ...p, dataAvaliacao:v }))} />
            </div>
            <div style={{ display:"flex", gap:8, marginTop:4 }}>
              <Btn onClick={handleCriar} color={C.green} disabled={saving || !form.razao} icon={saving ? <Loader size={12} /> : <Save size={12} />}>
                {saving ? "Criando..." : "Criar e Entrar"}
              </Btn>
              <Btn onClick={() => { setCriando(false); setForm(EMP_FORM_VAZIO); }} outline color={C.gray} icon={<X size={12} />}>Cancelar</Btn>
            </div>
          </Card>
        )}

        {loadingEmpresas ? (
          <div style={{ textAlign:"center", padding:"40px 0" }}>
            <Loader size={24} color={C.navyMid} />
            <p style={{ color:C.muted, fontSize:13, marginTop:10 }}>Carregando empresas...</p>
          </div>
        ) : empresas.length === 0 ? (
          <div style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:10, padding:"32px", textAlign:"center" }}>
            <Building2 size={32} color="#ca8a04" style={{ marginBottom:10 }} />
            <p style={{ fontSize:14, fontWeight:600, color:"#92400e", margin:"0 0 6px" }}>Nenhuma empresa cadastrada</p>
            <p style={{ fontSize:12, color:"#a16207", margin:0 }}>Clique em <strong>Nova Empresa</strong> para começar.</p>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
            {empresas.map(e => (
              <div
                key={e.id}
                onClick={() => selecionarEmpresa(e)}
                style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:18, cursor:"pointer" }}
                onMouseEnter={ev => ev.currentTarget.style.borderColor = C.navyMid}
                onMouseLeave={ev => ev.currentTarget.style.borderColor = C.border}
              >
                <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                  <div style={{ width:38, height:38, borderRadius:8, background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Building2 size={18} color={C.navyMid} />
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
      </div>
    </div>
  );
}
