import { useState } from "react";
import { Building2, LogOut, ArrowLeft, Info, BarChart2, Users, Clipboard, FileText, UserCheck, Activity, History, Shield, Loader, HardHat, GraduationCap, BookOpen } from "lucide-react";
import { NexusLogo } from "./assets/NexusLogo";
import { AppProvider, useApp } from "./context/AppContext";
import LoginScreen from "./pages/LoginScreen";
import EmpresaSelector from "./pages/EmpresaSelector";
import Dashboard from "./pages/Dashboard";
import Empresa from "./pages/Empresa";
import Setores from "./pages/Setores";
import Levantamento from "./pages/Levantamento";
import Matriz from "./pages/Matriz";
import PlanoAcao from "./pages/PlanoAcao";
import Indicadores from "./pages/Indicadores";
import Historico from "./pages/Historico";
import Usuarios from "./pages/Usuarios";
import GestaoEPI from "./pages/GestaoEPI";
import Treinamentos from "./pages/Treinamentos";
import PGR from "./pages/PGR";
import { C } from "./constants";

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  const { loading, user, empresaAtiva, userProfile, logout, voltarSeletor, isAdmin, canManageUsers } = useApp();
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
    { label:"Indicadores",  icon:<Activity size={14}/> },
    { label:"Histórico",    icon:<History size={14}/> },
    { label:"EPIs",         icon:<HardHat size={14}/> },
    { label:"Treinamentos", icon:<GraduationCap size={14}/> },
    { label:"PGR / PCMSO",  icon:<BookOpen size={14}/> },
    ...(canManageUsers ? [{ label:"Usuários", icon:<UserCheck size={14}/> }] : []),
  ];

  const PAGES = [
    <Dashboard />,
    <Empresa />,
    <Setores />,
    <Levantamento onNavigate={setAba} />,
    <Matriz onNavigate={setAba} />,
    <PlanoAcao onNavigate={setAba} />,
    <Indicadores />,
    <Historico />,
    <GestaoEPI />,
    <Treinamentos />,
    <PGR />,
    ...(canManageUsers ? [<Usuarios />] : []),
  ];

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", background:C.bg, minHeight:"100vh", color:C.text }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(90deg, #0d2a5e 0%, #1652a1 100%)`, padding:"8px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <NexusLogo size={36} />
        <div style={{ flex:1 }}>
          <p style={{ color:"#fff", fontWeight:800, fontSize:15, margin:0, letterSpacing:"-0.3px" }}>
            NEX<span style={{ color:"#38b249" }}>US</span>
            <span style={{ fontWeight:400, fontSize:11, color:"rgba(255,255,255,0.6)", marginLeft:10 }}>Gestão de Riscos Psicossociais</span>
          </p>
          <p style={{ color:"rgba(255,255,255,0.5)", fontSize:9.5, margin:0 }}>NR-01 · NR-17 · ISO 45003 · eSocial · FAP/NTEP · Technogov Soluções</p>
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
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:`linear-gradient(135deg, #0d2a5e 0%, #1652a1 50%, #0d3d20 100%)`, flexDirection:"column", gap:16 }}>
      <NexusLogo size={64} />
      <div style={{ textAlign:"center" }}>
        <p style={{ color:"#fff", fontWeight:800, fontSize:20, margin:"0 0 4px", letterSpacing:"-0.3px" }}>
          NEX<span style={{ color:"#38b249" }}>US</span>
        </p>
        <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
          <Loader size={14} color="rgba(255,255,255,0.7)" />
          <p style={{ color:"rgba(255,255,255,0.6)", fontSize:12, margin:0 }}>Carregando...</p>
        </div>
      </div>
    </div>
  );
}
