import { useState } from "react";
import { Eye, EyeOff, Loader, Shield } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Input, Btn } from "../components/ui";
import { C } from "../constants";
import { NexusLogo } from "../assets/NexusLogo";

export default function LoginScreen() {
  const { login, loginLoading, loginErr } = useApp();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg, #0d2a5e 0%, #1652a1 50%, #0d3d20 100%)`, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>

      {/* Card principal */}
      <div style={{ background:C.white, borderRadius:16, boxShadow:"0 20px 60px rgba(0,0,0,0.3)", padding:"36px 40px", width:380 }}>

        {/* Logo + nome */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:28 }}>
          <NexusLogo size={64} />
          <div style={{ textAlign:"center", marginTop:10 }}>
            <p style={{ fontWeight:800, fontSize:22, margin:0, color:C.navy, letterSpacing:"-0.5px" }}>
              NEX<span style={{ color:"#38b249" }}>US</span>
            </p>
            <p style={{ fontSize:11, color:C.muted, margin:"2px 0 0", letterSpacing:"0.5px", textTransform:"uppercase" }}>
              Plataforma Integrada de Gestão SST
            </p>
          </div>

          {/* Módulos highlight */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:5, marginTop:14, width:"100%" }}>
            {[
              { label:"Medicina do Trabalho", sub:"PCMSO · ASO · Audiometria" },
              { label:"Segurança do Trabalho", sub:"PGR/GRO · LTCAT · EPIs" },
              { label:"Previdenciário", sub:"PPP · CAT · FAP/NTEP" },
              { label:"eSocial SST", sub:"S-2210 · S-2220 · S-2240" },
              { label:"IA — NEXIA", sub:"Análise inteligente SST" },
              { label:"Psicossociais", sub:"COPSOQ II · NR-01" },
            ].map(f => (
              <div key={f.label} style={{ background:"#f0f9ff", border:"1px solid #bfdbfe", borderRadius:6, padding:"5px 7px", textAlign:"center" }}>
                <p style={{ fontSize:8.5, fontWeight:700, color:"#1652a1", margin:"0 0 1px", lineHeight:1.3 }}>{f.label}</p>
                <p style={{ fontSize:7.5, color:C.muted, margin:0, lineHeight:1.3 }}>{f.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Divisor */}
        <div style={{ height:1, background:`linear-gradient(to right, transparent, ${C.border}, transparent)`, marginBottom:22 }}/>

        <p style={{ fontSize:12, color:C.muted, margin:"0 0 16px", textAlign:"center" }}>Acesse com suas credenciais</p>

        <Input label="E-mail" value={email} onChange={setEmail} placeholder="seu@email.com" type="email" />

        <div style={{ marginBottom:12, position:"relative" }}>
          <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Senha</p>
          <input
            type={showPwd ? "text" : "password"}
            value={senha}
            onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login(email, senha)}
            placeholder="••••••"
            style={{ width:"100%", padding:"8px 36px 8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}
          />
          <button onClick={() => setShowPwd(p => !p)} style={{ position:"absolute", right:8, top:24, background:"none", border:"none", cursor:"pointer", color:C.muted }}>
            {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {loginErr && <p style={{ color:C.red, fontSize:12, margin:"0 0 10px" }}>{loginErr}</p>}

        <Btn onClick={() => login(email, senha)} color={C.navyMid} disabled={loginLoading} icon={loginLoading ? <Loader size={13} /> : null}>
          {loginLoading ? "Entrando..." : "Entrar no Sistema"}
        </Btn>

        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:14, padding:"8px 12px", background:"#f0f9ff", borderRadius:8, border:"1px solid #bfdbfe" }}>
          <Shield size={11} color="#1652a1"/>
          <p style={{ fontSize:10, color:"#1e40af", margin:0 }}>Acesso restrito — usuários cadastrados pelo administrador</p>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{ textAlign:"center" }}>
        <p style={{ fontSize:11, color:"rgba(255,255,255,0.5)", margin:0 }}>
          PCMSO · PGR/GRO · eSocial SST · FAP/NTEP · NR-01 · NR-09 · NR-15 · NR-17 · ISO 45003
        </p>
        <p style={{ fontSize:10, color:"rgba(255,255,255,0.35)", margin:"4px 0 0" }}>
          Desenvolvido por <span style={{ color:"rgba(255,255,255,0.6)", fontWeight:600 }}>Technogov Soluções</span>
        </p>
      </div>
    </div>
  );
}
