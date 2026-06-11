import { useState } from "react";
import { Shield, Eye, EyeOff, Loader } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Input, Btn } from "../components/ui";
import { C } from "../constants";

export default function LoginScreen() {
  const { login, loginLoading, loginErr } = useApp();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, padding:36, width:360 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
          <Shield size={26} color={C.navyMid} />
          <div>
            <p style={{ fontWeight:700, fontSize:15, margin:0, color:C.navy }}>GRO/PGR — SST</p>
            <p style={{ fontSize:11, color:C.muted, margin:0 }}>Gestão de Riscos Psicossociais</p>
          </div>
        </div>

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
          <button
            onClick={() => setShowPwd(p => !p)}
            style={{ position:"absolute", right:8, top:24, background:"none", border:"none", cursor:"pointer", color:C.muted }}
          >
            {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {loginErr && <p style={{ color:C.red, fontSize:12, margin:"0 0 10px" }}>{loginErr}</p>}

        <Btn onClick={() => login(email, senha)} color={C.navyMid} disabled={loginLoading} icon={loginLoading ? <Loader size={13} /> : null}>
          {loginLoading ? "Entrando..." : "Entrar no Sistema"}
        </Btn>

        <p style={{ marginTop:16, fontSize:11, color:C.muted }}>
          Usuários são cadastrados pelo administrador no Firebase Authentication.
        </p>
      </div>
    </div>
  );
}
