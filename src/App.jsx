import { useState } from "react";
import { Shield, Building2, LogOut, ArrowLeft, Info, BarChart2, Users, Clipboard, FileText, UserCheck, Loader } from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
import LoginScreen from "./pages/LoginScreen";
import EmpresaSelector from "./pages/EmpresaSelector";
import Dashboard from "./pages/Dashboard";
import Empresa from "./pages/Empresa";
import Setores from "./pages/Setores";
import Levantamento from "./pages/Levantamento";
import Matriz from "./pages/Matriz";
import PlanoAcao from "./pages/PlanoAcao";
import Usuarios from "./pages/Usuarios";
import { C } from "./constants";

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  const { loading, user, empresaAtiva, userProfile, logout, voltarSeletor, isAdmin } = useApp();
  const [aba, setAba] = useState(0);

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  if (!empresaAtiva) return <EmpresaSelector />;

  const avatarInicial = (userProfile?.nome || "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

  const ABAS = [
    { label:"Dashboard",    icon:<BarChart2 size={14}/> },
    { label:"Empresa",      icon:<Building2 size={14}/> },
    { label:"Setores",      icon:<Users size={14}/> },
    { label:"Levantamento", icon:<Clipboard size={14}/> },
    { label:"Matriz",       icon:<Shield size={14}/> },
    { label:"Plano de Ação",icon:<FileText size={14}/> },
    ...(isAdmin ? [{ label:"Usuários", icon:<UserCheck size={14}/> }] : []),
  ];

  const PAGES = [
    <Dashboard />,
    <Empresa />,
    <Setores />,
    <Levantamento onNavigate={setAba} />,
    <Matriz onNavigate={setAba} />,
    <PlanoAcao onNavigate={setAba} />,
    ...(isAdmin ? [<Usuarios />] : []),
  ];

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", background:C.bg, minHeight:"100vh", color:C.text }}>

      {/* Header */}
      <div style={{ background:C.navy, padding:"10px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <Shield size={20} color="#93c5fd" />
        <div style={{ flex:1 }}>
          <p style={{ color:"#fff", fontWeight:600, fontSize:14, margin:0 }}>GRO/PGR — Riscos Psicossociais</p>
          <p style={{ color:"#93c5fd", fontSize:10, margin:0 }}>NR-01 | NR-17 | ISO 45003 | eSocial | FAP/NTEP</p>
        </div>

        {/* Empresa ativa + troca */}
        <button
          onClick={voltarSeletor}
          style={{ display:"flex", alignItems:"center", gap:7, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:7, padding:"5px 10px", cursor:"pointer", maxWidth:220 }}
        >
          <Building2 size={12} color="#93c5fd" style={{ flexShrink:0 }} />
          <span style={{ color:"#e2e8f0", fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, textAlign:"left" }}>{empresaAtiva.razao || "Empresa"}</span>
          <ArrowLeft size={11} color="#93c5fd" style={{ flexShrink:0 }} />
        </button>

        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:"50%", background:"#3a6aa8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>
            {avatarInicial}
          </div>
          <div style={{ textAlign:"right" }}>
            <p style={{ color:"#fff", fontSize:12, margin:0, fontWeight:500 }}>{userProfile?.nome || user.email}</p>
            <p style={{ color:"#93c5fd", fontSize:10, margin:0 }}>{userProfile?.perfil || "Usuário"}</p>
          </div>
          <button onClick={logout} style={{ background:"none", border:"none", cursor:"pointer", color:"#93c5fd", marginLeft:4 }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Alerta regulatório */}
      <div style={{ background:"#eff6ff", borderBottom:`1px solid #bfdbfe`, padding:"7px 20px", display:"flex", alignItems:"center", gap:8 }}>
        <Info size={13} color="#1d4ed8" style={{ flexShrink:0 }} />
        <p style={{ fontSize:11, color:"#1e40af", margin:0 }}>
          <strong>Nota Regulatória:</strong> Riscos psicossociais <strong>não geram aposentadoria especial</strong> (Anexo IV Dec. 3.048/99) e <strong>não devem ser enviados na Tabela 24 do eSocial</strong> (S-2240). São essenciais para <strong>contestação de NTEP</strong>.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ background:C.white, borderBottom:`1px solid ${C.border}`, display:"flex", padding:"0 20px", overflowX:"auto" }}>
        {ABAS.map((a, i) => (
          <button
            key={i}
            onClick={() => setAba(i)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"11px 14px", border:"none", background:"none", cursor:"pointer", fontSize:12, fontWeight:500, whiteSpace:"nowrap", color: aba === i ? C.navyMid : C.gray, borderBottom: aba === i ? `2px solid ${C.navyMid}` : "2px solid transparent" }}
          >
            {a.icon}{a.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div style={{ padding:20, maxWidth:1100, margin:"0 auto" }}>
        {PAGES[aba]}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:C.bg }}>
      <div style={{ textAlign:"center" }}>
        <Loader size={32} color={C.navyMid} />
        <p style={{ color:C.muted, marginTop:12, fontSize:13 }}>Carregando sistema...</p>
      </div>
    </div>
  );
}
