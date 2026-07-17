import { useState } from "react";
import {
  BarChart2, LogOut, ArrowLeft, Stethoscope, HardHat, Briefcase,
  Send, Brain, Settings, ChevronDown, ChevronRight, Loader,
  Building2, Sparkles, Shield, Clipboard, Info,
} from "lucide-react";
import { NexusLogo } from "./assets/NexusLogo";
import { AppProvider, useApp } from "./context/AppContext";
import { C } from "./constants";

// ── Páginas existentes ─────────────────────────────────────────────────────
import LoginScreen     from "./pages/LoginScreen";
import EmpresaSelector from "./pages/EmpresaSelector";
import Dashboard       from "./pages/Dashboard";
import Empresa         from "./pages/Empresa";
import Setores         from "./pages/Setores";
import Levantamento    from "./pages/Levantamento";
import Matriz          from "./pages/Matriz";
import PlanoAcao       from "./pages/PlanoAcao";
import Indicadores     from "./pages/Indicadores";
import Historico       from "./pages/Historico";
import Usuarios        from "./pages/Usuarios";
import GestaoEPI       from "./pages/GestaoEPI";
import Treinamentos    from "./pages/Treinamentos";
import PGR             from "./pages/PGR";

// ── Medicina do Trabalho ───────────────────────────────────────────────────
import MedicinaPainel from "./pages/medicina/MedicinaPainel";
import AgendaMedica   from "./pages/medicina/AgendaMedica";
import Prontuarios    from "./pages/medicina/Prontuarios";
import Audiometria    from "./pages/medicina/Audiometria";
import Vacinacao      from "./pages/medicina/Vacinacao";
import Convocacoes    from "./pages/medicina/Convocacoes";

// ── Segurança do Trabalho (novas) ──────────────────────────────────────────
import LTCAT        from "./pages/seguranca/LTCAT";
import AvaliacaoGHE from "./pages/seguranca/AvaliacaoGHE";
import CIPA         from "./pages/seguranca/CIPA";
import MapaRiscos   from "./pages/seguranca/MapaRiscos";
import GestaoEPC    from "./pages/seguranca/GestaoEPC";
import OrdemServico from "./pages/seguranca/OrdemServico";
import Ocorrencias  from "./pages/seguranca/Ocorrencias";
import ChecklistSeg    from "./pages/seguranca/ChecklistSeg";
import EstresseTermico from "./pages/seguranca/EstresseTermico";

// ── Previdenciário ─────────────────────────────────────────────────────────
import Afastamentos from "./pages/previdenciario/Afastamentos";
import PPP          from "./pages/previdenciario/PPP";
import Atestados    from "./pages/previdenciario/Atestados";

// ── eSocial ────────────────────────────────────────────────────────────────
import PainelESocial  from "./pages/esocial/PainelESocial";
import PainelContador from "./pages/esocial/PainelContador";

// ── IA ─────────────────────────────────────────────────────────────────────
import AssistenteIA from "./pages/ia/AssistenteIA";

// ── Página pública (sem auth) ──────────────────────────────────────────────
import RespondentePage from "./pages/RespondentePage";

// ── Psicossociais COPSOQ ───────────────────────────────────────────────────
import QuestionarioCOPSOQ from "./pages/psicossociais/QuestionarioCOPSOQ";
import RespostasPsico     from "./pages/psicossociais/RespostasPsico";
import ResultadosPsico    from "./pages/psicossociais/ResultadosPsico";

// ── Config de módulos ──────────────────────────────────────────────────────
const buildModules = (canManageUsers) => [
  { id:"dashboard", label:"Dashboard",              icon:BarChart2,    color:C.navyMid,  single:true },
  {
    id:"medicina",    label:"Medicina do Trabalho",  icon:Stethoscope,  color:"#0891b2",
    items:[
      { id:"painel",       label:"Painel de Controle" },
      { id:"agenda",       label:"Agenda Médica" },
      { id:"prontuarios",  label:"Prontuários / ASO" },
      { id:"audiometria",  label:"Audiometria" },
      { id:"vacinacao",    label:"Vacinação" },
      { id:"convocacao",   label:"Convocações" },
    ],
  },
  {
    id:"seguranca",   label:"Segurança do Trabalho", icon:HardHat,      color:"#d97706",
    items:[
      { id:"pgr",           label:"GRO / PGR / PAE" },
      { id:"ltcat",         label:"LTCAT / LIP / LTIP" },
      { id:"ghe",           label:"Avaliação por GHE" },
      { id:"levantamento",  label:"Levantamento Psicossocial" },
      { id:"matriz",        label:"Matriz de Riscos" },
      { id:"plano",         label:"Plano de Ação Corretiva" },
      { id:"cipa",          label:"CIPA (NR-5)" },
      { id:"mapa",          label:"Mapa de Riscos" },
      { id:"epi",           label:"Gestão de EPI (NR-6)" },
      { id:"epc",           label:"Gestão de EPC" },
      { id:"treinamentos",  label:"Treinamentos" },
      { id:"os",            label:"Ordem de Serviço (NR-1)" },
      { id:"ocorrencias",   label:"Ocorrências" },
      { id:"checklist",       label:"Checklist" },
      { id:"estressetermico", label:"Estresse Térmico — IBUTG" },
    ],
  },
  {
    id:"previdenciario", label:"Previdenciário",     icon:Briefcase,    color:"#7c3aed",
    items:[
      { id:"afastamentos", label:"Afastamentos" },
      { id:"ppp",          label:"PPP" },
      { id:"atestados",    label:"Atestados" },
      { id:"cat",          label:"CAT (S-2210)" },
      { id:"fap",          label:"Gestão do FAP" },
    ],
  },
  {
    id:"esocial",     label:"eSocial SST",           icon:Send,         color:"#0f766e",
    items:[
      { id:"eventos",   label:"Painel de Eventos SST" },
      { id:"contador",  label:"Painel do Contador" },
    ],
  },
  {
    id:"psicossociais", label:"Fatores Psicossociais", icon:Brain,      color:"#9333ea",
    items:[
      { id:"questionarios", label:"Questionários COPSOQ" },
      { id:"respostas",     label:"Respostas" },
      { id:"resultados",    label:"Resultados / Análise" },
    ],
  },
  {
    id:"ia",          label:"Gestão com IA",          icon:Sparkles,    color:"#2563eb",
    items:[
      { id:"gaudencio", label:"NEXIA — Assistente de IA" },
    ],
  },
  {
    id:"config",      label:"Configurações",          icon:Settings,    color:C.gray,
    items:[
      { id:"empresa",     label:"Dados da Empresa" },
      { id:"setores",     label:"Setores" },
      { id:"indicadores", label:"Indicadores / FAP" },
      { id:"historico",   label:"Histórico de Avaliações" },
      ...(canManageUsers ? [{ id:"usuarios", label:"Usuários" }] : []),
    ],
  },
];

// ── Renderização de página ─────────────────────────────────────────────────
function renderPage(nav, navigate) {
  const { mod, page } = nav;

  if (mod === "dashboard") return <Dashboard />;

  if (mod === "medicina") {
    switch (page) {
      case "agenda":      return <AgendaMedica />;
      case "prontuarios": return <Prontuarios />;
      case "audiometria": return <Audiometria />;
      case "vacinacao":   return <Vacinacao />;
      case "convocacao":  return <Convocacoes />;
      default:            return <MedicinaPainel />;
    }
  }

  if (mod === "seguranca") {
    const goSeg = (p) => navigate("seguranca", p);
    switch (page) {
      case "ltcat":        return <LTCAT />;
      case "ghe":          return <AvaliacaoGHE />;
      case "levantamento": return <Levantamento onNavigate={(m, p) => navigate(m, p)} />;
      case "matriz":       return <Matriz       onNavigate={() => goSeg("plano")} />;
      case "plano":        return <PlanoAcao    onNavigate={() => goSeg("levantamento")} />;
      case "cipa":         return <CIPA />;
      case "mapa":         return <MapaRiscos />;
      case "epi":          return <GestaoEPI />;
      case "epc":          return <GestaoEPC />;
      case "treinamentos": return <Treinamentos />;
      case "os":           return <OrdemServico />;
      case "ocorrencias":  return <Ocorrencias />;
      case "checklist":       return <ChecklistSeg />;
      case "estressetermico": return <EstresseTermico />;
      default:                return <PGR />;
    }
  }

  if (mod === "previdenciario") {
    switch (page) {
      case "afastamentos": return <Afastamentos />;
      case "ppp":          return <PPP />;
      case "atestados":    return <Atestados />;
      case "cat":          return <PainelESocial defaultTab="cat" />;
      case "fap":          return <Indicadores />;
      default:             return <Afastamentos />;
    }
  }

  if (mod === "esocial") {
    switch (page) {
      case "contador": return <PainelContador />;
      default:         return <PainelESocial />;
    }
  }

  if (mod === "psicossociais") {
    switch (page) {
      case "respostas":  return <RespostasPsico />;
      case "resultados": return <ResultadosPsico />;
      default:           return <QuestionarioCOPSOQ />;
    }
  }

  if (mod === "ia") return <AssistenteIA />;

  if (mod === "config") {
    switch (page) {
      case "setores":     return <Setores />;
      case "indicadores": return <Indicadores />;
      case "historico":   return <Historico />;
      case "usuarios":    return <Usuarios />;
      default:            return <Empresa />;
    }
  }

  return <Dashboard />;
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ nav, navigate, modules }) {
  const [expanded, setExpanded] = useState(() =>
    modules.reduce((acc, m) => ({ ...acc, [m.id]: m.id === nav.mod }), {})
  );

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));
  const goTo   = (mod, page = null) => {
    navigate(mod, page);
    setExpanded(p => ({ ...p, [mod]: true }));
  };

  return (
    <div style={{ width:220, flexShrink:0, background:"#0f1f3d", overflowY:"auto", display:"flex", flexDirection:"column", borderRight:"1px solid rgba(255,255,255,0.06)" }}>
      {modules.map(m => {
        if (m.single) {
          const active = nav.mod === m.id;
          return (
            <button key={m.id} onClick={() => goTo(m.id)}
              style={{ display:"flex", alignItems:"center", gap:9, padding:"12px 14px", background:active?"rgba(255,255,255,0.1)":"none", border:"none", borderLeft:active?`3px solid ${m.color}`:"3px solid transparent", cursor:"pointer", width:"100%", textAlign:"left", color:active?"#fff":"rgba(255,255,255,0.6)", fontSize:12, fontWeight:active?700:500 }}>
              <m.icon size={14} color={active ? m.color : "rgba(255,255,255,0.4)"}/>
              {m.label}
            </button>
          );
        }

        const modActive = nav.mod === m.id;
        const open = expanded[m.id];
        return (
          <div key={m.id}>
            <button onClick={() => toggle(m.id)}
              style={{ display:"flex", alignItems:"center", gap:9, padding:"11px 14px", background:modActive&&!open?"rgba(255,255,255,0.06)":"none", border:"none", borderLeft:"3px solid transparent", cursor:"pointer", width:"100%", textAlign:"left", color:modActive?"#fff":"rgba(255,255,255,0.7)", fontSize:12, fontWeight:600 }}>
              <m.icon size={14} color={m.color}/>
              <span style={{ flex:1 }}>{m.label}</span>
              {open ? <ChevronDown size={11} color="rgba(255,255,255,0.3)"/> : <ChevronRight size={11} color="rgba(255,255,255,0.3)"/>}
            </button>
            {open && m.items.map(item => {
              const active = nav.mod === m.id && nav.page === item.id;
              return (
                <button key={item.id} onClick={() => goTo(m.id, item.id)}
                  style={{ display:"flex", alignItems:"center", padding:"7px 14px 7px 34px", background:active?`${m.color}20`:"none", border:"none", borderLeft:active?`3px solid ${m.color}`:"3px solid transparent", cursor:"pointer", width:"100%", textAlign:"left", color:active?"#fff":"rgba(255,255,255,0.45)", fontSize:11, fontWeight:active?600:400 }}>
                  {item.label}
                </button>
              );
            })}
          </div>
        );
      })}
      <div style={{ flex:1 }}/>
      <div style={{ padding:"10px 14px", fontSize:9, color:"rgba(255,255,255,0.2)", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        NEXUS SST · Technogov Soluções
      </div>
    </div>
  );
}

// ── App Shell ──────────────────────────────────────────────────────────────
export default function App() {
  // Rota pública /responder/:id — intercepta ANTES do fluxo de auth
  const m = window.location.pathname.match(/^\/responder\/([^/]+)/);
  if (m) return <RespondentePage questionarioId={m[1]} />;

  return <AppProvider><AppContent /></AppProvider>;
}

function AppContent() {
  const { loading, user, empresaAtiva, userProfile, logout, voltarSeletor, canManageUsers } = useApp();
  const [nav, setNav] = useState({ mod:"dashboard", page:null });

  if (loading) return <LoadingScreen />;
  if (!user)          return <LoginScreen />;
  if (!empresaAtiva)  return <EmpresaSelector />;

  const navigate = (mod, page = null) => setNav({ mod, page });
  const modules  = buildModules(canManageUsers);
  const avatarInicial = (userProfile?.nome || "?").split(" ").map(p => p[0]).slice(0,2).join("").toUpperCase();

  // Breadcrumb
  const currentMod  = modules.find(m => m.id === nav.mod);
  const currentPage = currentMod?.items?.find(i => i.id === nav.page);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", fontFamily:"system-ui,sans-serif", color:C.text }}>

      {/* Header */}
      <div style={{ background:"linear-gradient(90deg,#0d2a5e 0%,#1652a1 100%)", padding:"7px 16px", display:"flex", alignItems:"center", gap:12, flexShrink:0, zIndex:10 }}>
        <NexusLogo size={32}/>
        <div style={{ flex:1 }}>
          <p style={{ color:"#fff", fontWeight:800, fontSize:14, margin:0, letterSpacing:"-0.3px" }}>
            NEX<span style={{ color:"#38b249" }}>US</span>
            <span style={{ fontWeight:400, fontSize:10, color:"rgba(255,255,255,0.5)", marginLeft:8 }}>Sistema de Gestão SST</span>
          </p>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:9, margin:0 }}>
            {currentMod?.label}{currentPage ? ` › ${currentPage.label}` : ""}
          </p>
        </div>

        <button onClick={voltarSeletor}
          style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:6, padding:"4px 10px", cursor:"pointer", maxWidth:200 }}>
          <Building2 size={11} color="#93c5fd" style={{ flexShrink:0 }}/>
          <span style={{ color:"#e2e8f0", fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, textAlign:"left" }}>{empresaAtiva.razao || "Empresa"}</span>
          <ArrowLeft size={10} color="#93c5fd" style={{ flexShrink:0 }}/>
        </button>

        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background:"#3a6aa8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff" }}>{avatarInicial}</div>
          <div style={{ textAlign:"right" }}>
            <p style={{ color:"#fff", fontSize:11, margin:0, fontWeight:500 }}>{userProfile?.nome || user.email}</p>
            <p style={{ color:"#93c5fd", fontSize:9, margin:0 }}>{userProfile?.perfil || "Usuário"}</p>
          </div>
          <button onClick={logout} style={{ background:"none", border:"none", cursor:"pointer", color:"#93c5fd" }}><LogOut size={14}/></button>
        </div>
      </div>

      {/* Nota regulatória compacta */}
      <div style={{ background:"#eff6ff", borderBottom:`1px solid #bfdbfe`, padding:"4px 16px", display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
        <Info size={11} color="#1d4ed8" style={{ flexShrink:0 }}/>
        <p style={{ fontSize:10, color:"#1e40af", margin:0 }}>
          Plataforma NEXUS SST — <strong>Medicina · Segurança · Previdenciário · eSocial · IA · Psicossociais</strong> · NR-01 (2022) · NR-09 · NR-15 · NR-17 · PCMSO · PGR/GRO · FAP/NTEP · ISO 45003:2021
        </p>
      </div>

      {/* Body: sidebar + conteúdo */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        <Sidebar nav={nav} navigate={navigate} modules={modules}/>
        <main style={{ flex:1, overflowY:"auto", padding:20, background:C.bg }}>
          {renderPage(nav, navigate)}
        </main>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#0d2a5e 0%,#1652a1 50%,#0d3d20 100%)", flexDirection:"column", gap:16 }}>
      <NexusLogo size={64}/>
      <div style={{ textAlign:"center" }}>
        <p style={{ color:"#fff", fontWeight:800, fontSize:20, margin:"0 0 4px" }}>NEX<span style={{ color:"#38b249" }}>US</span></p>
        <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
          <Loader size={14} color="rgba(255,255,255,0.7)"/>
          <p style={{ color:"rgba(255,255,255,0.6)", fontSize:12, margin:0 }}>Carregando...</p>
        </div>
      </div>
    </div>
  );
}
