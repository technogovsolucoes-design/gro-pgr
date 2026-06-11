import { useState, useEffect, useMemo } from "react";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, collection,
  addDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, documentId, arrayUnion,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Shield, AlertTriangle, FileText, BarChart2, Clipboard, Users,
  LogOut, Plus, Trash2, Edit2, Save, X, AlertCircle, Info,
  Printer, Activity, TrendingUp, Clock, CheckSquare,
  Building2, Eye, EyeOff, Loader, ArrowLeft,
} from "lucide-react";

// ─── FATORES PSICOSSOCIAIS ────────────────────────────────────
const FATORES = [
  { id:"f01", cat:"Demanda e Carga de Trabalho", label:"Ritmo de trabalho excessivo / pressão por produtividade", ref:"COPSOQ III — D1.1" },
  { id:"f02", cat:"Demanda e Carga de Trabalho", label:"Sobrecarga quantitativa (volume de tarefas acima da capacidade)", ref:"JSS — Demanda" },
  { id:"f03", cat:"Demanda e Carga de Trabalho", label:"Sobrecarga cognitiva / complexidade das tarefas", ref:"COPSOQ III — D1.3" },
  { id:"f04", cat:"Demanda e Carga de Trabalho", label:"Exigências emocionais (lidar com sofrimento alheio)", ref:"COPSOQ III — D1.4" },
  { id:"f05", cat:"Demanda e Carga de Trabalho", label:"Exigências de esconder emoções (dissonância emocional)", ref:"COPSOQ III — D1.5" },
  { id:"f06", cat:"Demanda e Carga de Trabalho", label:"Conflito de papéis / ambiguidade de função", ref:"COPSOQ III — D2.1" },
  { id:"f07", cat:"Demanda e Carga de Trabalho", label:"Interrupções frequentes e multitarefas forçadas", ref:"ISO 45003 — 6.1.2" },
  { id:"f08", cat:"Controle e Autonomia", label:"Falta de controle sobre o ritmo e métodos de trabalho", ref:"JSS — Latitude de Decisão" },
  { id:"f09", cat:"Controle e Autonomia", label:"Ausência de participação nas decisões que afetam o trabalho", ref:"COPSOQ III — D3.1" },
  { id:"f10", cat:"Controle e Autonomia", label:"Monitoramento eletrônico excessivo / vigilância constante", ref:"ISO 45003 — 6.1.3" },
  { id:"f11", cat:"Controle e Autonomia", label:"Falta de previsibilidade / mudanças organizacionais abruptas", ref:"COPSOQ III — D3.3" },
  { id:"f12", cat:"Suporte Social e Relações", label:"Suporte social insuficiente de colegas", ref:"ERI — Suporte Social" },
  { id:"f13", cat:"Suporte Social e Relações", label:"Suporte social insuficiente de liderança / chefia", ref:"ERI — Suporte Social" },
  { id:"f14", cat:"Suporte Social e Relações", label:"Assédio moral (humilhações, ameaças, isolamento)", ref:"NR-01 / CIPA+A" },
  { id:"f15", cat:"Suporte Social e Relações", label:"Assédio sexual no ambiente de trabalho", ref:"NR-01 / Lei 14.457/2022" },
  { id:"f16", cat:"Suporte Social e Relações", label:"Violência física ou verbal de clientes / usuários", ref:"COPSOQ III — D4.3" },
  { id:"f17", cat:"Suporte Social e Relações", label:"Conflitos interpessoais entre colegas / equipe", ref:"COPSOQ III — D4.1" },
  { id:"f18", cat:"Suporte Social e Relações", label:"Clima organizacional negativo / falta de confiança", ref:"ISO 45003 — 6.2" },
  { id:"f19", cat:"Reconhecimento e Recompensa", label:"Ausência de reconhecimento pelo trabalho realizado", ref:"ERI — Recompensa" },
  { id:"f20", cat:"Reconhecimento e Recompensa", label:"Remuneração percebida como injusta / inadequada", ref:"ERI — Recompensa" },
  { id:"f21", cat:"Reconhecimento e Recompensa", label:"Falta de perspectiva de crescimento / desenvolvimento", ref:"COPSOQ III — D5.2" },
  { id:"f22", cat:"Reconhecimento e Recompensa", label:"Insegurança no emprego / ameaça de demissão", ref:"COPSOQ III — D5.3" },
  { id:"f23", cat:"Interface Trabalho-Vida Privada", label:"Violação do direito à desconexão digital", ref:"ISO 45003 / CLT art. 6º" },
  { id:"f24", cat:"Interface Trabalho-Vida Privada", label:"Jornadas atípicas / turnos noturnos prejudicando vida pessoal", ref:"NR-17 / eSocial S-2230" },
  { id:"f25", cat:"Interface Trabalho-Vida Privada", label:"Horas extras habituais e excessivas", ref:"CLT art. 59 / NR-17" },
  { id:"f26", cat:"Interface Trabalho-Vida Privada", label:"Dificuldade de conciliar trabalho e responsabilidades familiares", ref:"COPSOQ III — D6.2" },
  { id:"f27", cat:"Organização e Cultura", label:"Liderança autoritária / estilo gerencial opressivo", ref:"ISO 45003 — 6.2.1" },
  { id:"f28", cat:"Organização e Cultura", label:"Metas inatingíveis / sistema de pressão por resultados", ref:"NR-17 / COPSOQ III" },
  { id:"f29", cat:"Organização e Cultura", label:"Ausência de política de saúde mental / bem-estar", ref:"ISO 45003 — 5.2" },
  { id:"f30", cat:"Organização e Cultura", label:"Discriminação por gênero, raça, idade ou deficiência", ref:"Lei 9.029/95 / ISO 45003" },
  { id:"f31", cat:"Organização e Cultura", label:"Comunicação organizacional deficiente / desinformação", ref:"COPSOQ III — D7.1" },
  { id:"f32", cat:"Conteúdo e Significado do Trabalho", label:"Trabalho repetitivo / monótono sem variação de tarefas", ref:"NR-17 — 17.6" },
  { id:"f33", cat:"Conteúdo e Significado do Trabalho", label:"Falta de significado / propósito percebido no trabalho", ref:"COPSOQ III — D8.1" },
  { id:"f34", cat:"Conteúdo e Significado do Trabalho", label:"Exposição a conteúdo traumático / perturbador", ref:"COPSOQ III — D1.4" },
  { id:"f35", cat:"Conteúdo e Significado do Trabalho", label:"Trabalho emocional intenso sem suporte psicológico", ref:"ISO 45003 — 6.1.4" },
];

const FREQ_OPT = ["Nunca","Raramente","Às vezes","Frequentemente","Sempre"];
const SEV_OPT  = ["Insignificante","Menor","Moderado","Crítico","Catastrófico"];
const FREQ_VAL = { "Nunca":0,"Raramente":1,"Às vezes":2,"Frequentemente":3,"Sempre":4 };
const SEV_VAL  = { "Insignificante":0,"Menor":1,"Moderado":2,"Crítico":3,"Catastrófico":4 };
const getRiskScore = (f,s) => ((FREQ_VAL[f]||0)+1)*((SEV_VAL[s]||0)+1);
const getRiskLabel = (score) => {
  if (score<=3)  return { label:"Aceitável",    color:"#16a34a", bg:"#dcfce7" };
  if (score<=6)  return { label:"Tolerável",    color:"#ca8a04", bg:"#fef9c3" };
  if (score<=12) return { label:"Relevante",    color:"#d97706", bg:"#fed7aa" };
  if (score<=16) return { label:"Crítico",      color:"#dc2626", bg:"#fee2e2" };
  return               { label:"Catastrófico", color:"#991b1b", bg:"#fecaca" };
};

const C = { navy:"#1e3a5f", navyMid:"#2d5382", blue:"#4a90d9", gray:"#64748b", border:"#e2e8f0", white:"#ffffff", bg:"#f8fafc", red:"#dc2626", amber:"#d97706", green:"#16a34a", text:"#0f172a", muted:"#64748b" };
const PIE_COLORS = ["#2d5382","#4a90d9","#d97706","#dc2626","#7c3aed","#0f766e","#b45309"];

const EMP_FORM_VAZIO = {razao:"",cnpj:"",cnae:"",endereco:"",responsavel:"",dataAvaliacao:"",grauRisco:"3"};

// ─── UI HELPERS ───────────────────────────────────────────────
const Btn = ({children,onClick,color=C.navyMid,outline=false,small=false,icon,disabled=false}) => (
  <button onClick={onClick} disabled={disabled} style={{display:"flex",alignItems:"center",gap:6,padding:small?"6px 12px":"9px 16px",borderRadius:8,border:`1px solid ${outline?color:"transparent"}`,background:outline?"transparent":color,color:outline?color:C.white,cursor:disabled?"not-allowed":"pointer",fontWeight:600,fontSize:small?11:12,opacity:disabled?0.6:1,fontFamily:"inherit"}}>
    {icon}{children}
  </button>
);

const Input = ({label,value,onChange,placeholder,type="text",required=false}) => (
  <div style={{marginBottom:12}}>
    {label && <p style={{fontSize:11,color:C.muted,margin:"0 0 4px",fontWeight:500}}>{label}{required&&<span style={{color:C.red}}> *</span>}</p>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required} style={{width:"100%",padding:"8px 10px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,fontFamily:"inherit",boxSizing:"border-box",color:C.text,background:C.white}} />
  </div>
);

const Card = ({children,style={}}) => <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:16,...style}}>{children}</div>;
const SectionTitle = ({children}) => <p style={{fontWeight:600,fontSize:13,color:C.navy,margin:"0 0 12px",display:"flex",alignItems:"center",gap:6}}>{children}</p>;
const Badge = ({label,color,bg}) => <span style={{background:bg,color,fontSize:10,padding:"2px 7px",borderRadius:4,fontWeight:600}}>{label}</span>;

// ─── EXPORTAÇÃO PDF ───────────────────────────────────────────
const exportarRelatorio = (tipo, empresa, riscos, userName, userPerfil) => {
  const w = window.open("","_blank");
  const rows = riscos.map(r=>`
    <tr>
      <td>${r.fator}</td><td>${r.setor}</td><td>${r.cat}</td>
      <td>${r.freq}</td><td>${r.sev}</td>
      <td style="color:${r.color};font-weight:700">${r.label} (${r.score})</td>
      <td>${r.aet?"✔ AET Obrigatória":"PGR Comum"}</td>
      <td>${r.aet?"Imediato":r.score>=7?"60 dias":"90 dias"}</td>
    </tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>${tipo} — ${empresa?.razao||""}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:30px}
    h1{color:#1e3a5f;font-size:18px;margin-bottom:4px} h2{color:#2d5382;font-size:14px;margin:20px 0 8px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#1e3a5f;color:#fff;padding:8px;text-align:left;font-size:11px}
    td{padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px}
    tr:nth-child(even) td{background:#f8fafc}
    .alerta{background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:10px 14px;margin:16px 0;font-size:11px;color:#991b1b}
    .info{background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px 14px;margin:16px 0;font-size:11px;color:#1e40af}
    @media print{.noprint{display:none}}
  </style></head><body>
  <button class="noprint" onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;margin-bottom:16px">Imprimir / Salvar PDF</button>
  <h1>GRO/PGR — ${tipo}</h1>
  <p style="color:#64748b;margin:0 0 4px">Gerado em: ${new Date().toLocaleDateString("pt-BR")} | Responsável: ${userName} (${userPerfil})</p>
  <div class="info"><strong>Nota Regulatória:</strong> Riscos psicossociais não geram aposentadoria especial (Anexo IV Dec. 3.048/99) e não devem ser enviados na Tabela 24 do eSocial (S-2240). São essenciais para contestação de NTEP.</div>
  <h2>Dados da Empresa</h2>
  <table><tr><th>Campo</th><th>Valor</th></tr>
    <tr><td>Razão Social</td><td>${empresa?.razao||"—"}</td></tr>
    <tr><td>CNPJ</td><td>${empresa?.cnpj||"—"}</td></tr>
    <tr><td>CNAE</td><td>${empresa?.cnae||"—"}</td></tr>
    <tr><td>Endereço</td><td>${empresa?.endereco||"—"}</td></tr>
    <tr><td>Responsável Técnico</td><td>${empresa?.responsavel||"—"}</td></tr>
    <tr><td>Grau de Risco</td><td>GR ${empresa?.grauRisco||"—"}</td></tr>
    <tr><td>Data da Avaliação</td><td>${empresa?.dataAvaliacao||"—"}</td></tr>
  </table>
  <h2>Riscos Identificados — Plano de Ação</h2>
  ${riscos.length===0
    ? `<p style="color:#dc2626">Nenhum risco registrado. Preencha o checklist antes de exportar.</p>`
    : `<table><thead><tr><th>Fator de Risco</th><th>Setor</th><th>Categoria</th><th>Frequência</th><th>Severidade</th><th>Classificação</th><th>Recomendação</th><th>Prazo</th></tr></thead><tbody>${rows}</tbody></table>`
  }
  ${tipo.includes("NTEP")?`<div class="alerta"><strong>Subsídios para Defesa NTEP:</strong> Os riscos classificados como Crítico ou Catastrófico configuram exposição habitual documentada, podendo ser utilizados como contra-prova em processos de nexo técnico epidemiológico previdenciário (NTEP) perante o INSS, conforme IN INSS 77/2015 e Resolução CNPS 1.316/2010.</div>`:""}
  <h2>Base Normativa</h2>
  <p>NR-01 (2022) | NR-17 | ISO 45003:2021 | eSocial S-2220 | Dec. 3.048/99 | IN INSS 77/2015 | Lei 14.457/2022 (CIPA+A)</p>
  </body></html>`;
  w.document.write(html); w.document.close();
};

// ─── APP PRINCIPAL ────────────────────────────────────────────
export default function App() {
  // Auth
  const [user, setUser]               = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [loginEmail, setLE]           = useState("");
  const [loginSenha, setLS]           = useState("");
  const [showPwd, setShowPwd]         = useState(false);
  const [loginErr, setLoginErr]       = useState("");
  const [loginLoading, setLL]         = useState(false);

  // Seletor de empresas
  const [empresas, setEmpresas]           = useState([]);
  const [empresaAtiva, setEmpresaAtiva]   = useState(null);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [criandoEmpresa, setCriandoEmpresa]   = useState(false);
  const [novaEmpForm, setNovaEmpForm]     = useState(EMP_FORM_VAZIO);
  const [savingNovaEmp, setSavingNovaEmp] = useState(false);

  // Empresa ativa — edição
  const [editEmp, setEditEmp]     = useState(false);
  const [empForm, setEmpForm]     = useState(EMP_FORM_VAZIO);
  const [savingEmp, setSavingEmp] = useState(false);

  // Setores
  const [setores, setSetores]         = useState([]);
  const [editSetor, setEditSetor]     = useState(null);
  const [addingSetor, setAddingSetor] = useState(false);
  const [newSetor, setNewSetor]       = useState({nome:"",responsavel:"",servidores:[],nFunc:0});
  const [newServidor, setNewServidor] = useState("");
  const [savingSetor, setSavingSetor] = useState(false);

  // Checklist
  const [checklist, setChecklist]   = useState({});
  const [setorSel, setSetorSel]     = useState("");
  const [catFiltro, setCatFiltro]   = useState("Todas");
  const [savingCheck, setSavingCheck] = useState(false);

  const [aba, setAba] = useState(0);

  // ── Auth listener ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "usuarios", u.uid));
        if (snap.exists()) {
          setUserProfile(snap.data());
        } else {
          const defaultProfile = { nome: u.email, perfil: "Usuário", empresas: [] };
          await setDoc(doc(db, "usuarios", u.uid), defaultProfile);
          setUserProfile(defaultProfile);
        }
      } else {
        setUserProfile(null);
        setEmpresaAtiva(null);
        setEmpresas([]);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Carregar lista de empresas do usuário ──
  useEffect(() => {
    if (!user || !userProfile) return;
    setLoadingEmpresas(true);

    if (userProfile.perfil === "Admin") {
      const unsub = onSnapshot(collection(db, "empresas"), snap => {
        setEmpresas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoadingEmpresas(false);
      });
      return unsub;
    }

    const ids = userProfile.empresas || [];
    if (ids.length === 0) {
      setEmpresas([]);
      setLoadingEmpresas(false);
      return;
    }

    const q = query(collection(db, "empresas"), where(documentId(), "in", ids));
    const unsub = onSnapshot(q, snap => {
      setEmpresas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingEmpresas(false);
    });
    return unsub;
  }, [user, userProfile]);

  // ── Manter empresaAtiva sincronizada quando a lista atualiza ──
  useEffect(() => {
    if (!empresaAtiva) return;
    const atualizada = empresas.find(e => e.id === empresaAtiva.id);
    if (atualizada) setEmpresaAtiva(atualizada);
  }, [empresas]);

  // ── Carregar setores da empresa ativa ──
  useEffect(() => {
    if (!user || !empresaAtiva) { setSetores([]); return; }
    const unsub = onSnapshot(
      collection(db, "empresas", empresaAtiva.id, "setores"),
      snap => setSetores(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [user, empresaAtiva]);

  // ── Carregar checklist da empresa ativa ──
  useEffect(() => {
    if (!user || !empresaAtiva) { setChecklist({}); return; }
    const unsub = onSnapshot(
      collection(db, "empresas", empresaAtiva.id, "checklist"),
      snap => {
        const data = {};
        snap.docs.forEach(d => { data[d.id] = d.data(); });
        setChecklist(data);
      }
    );
    return unsub;
  }, [user, empresaAtiva]);

  // ── Auth ──
  const login = async () => {
    setLL(true); setLoginErr("");
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginSenha);
    } catch {
      setLoginErr("E-mail ou senha incorretos.");
    }
    setLL(false);
  };

  const logout = () => {
    setEmpresaAtiva(null);
    setEmpresas([]);
    setSetores([]);
    setChecklist({});
    signOut(auth);
  };

  // ── Empresas ──
  const selecionarEmpresa = (emp) => {
    setEmpresaAtiva(emp);
    setEmpForm({ razao:emp.razao||"", cnpj:emp.cnpj||"", cnae:emp.cnae||"", endereco:emp.endereco||"", responsavel:emp.responsavel||"", dataAvaliacao:emp.dataAvaliacao||"", grauRisco:emp.grauRisco||"3" });
    setSetorSel("");
    setAba(0);
  };

  const voltarSeletor = () => {
    setEmpresaAtiva(null);
    setSetores([]);
    setChecklist({});
    setSetorSel("");
    setEditEmp(false);
    setCriandoEmpresa(false);
  };

  const criarEmpresa = async () => {
    if (!novaEmpForm.razao) return;
    setSavingNovaEmp(true);
    try {
      const docRef = await addDoc(collection(db, "empresas"), novaEmpForm);
      await updateDoc(doc(db, "usuarios", user.uid), {
        empresas: arrayUnion(docRef.id),
      });
      setUserProfile(p => ({ ...p, empresas: [...(p.empresas || []), docRef.id] }));
      setNovaEmpForm(EMP_FORM_VAZIO);
      setCriandoEmpresa(false);
      selecionarEmpresa({ id: docRef.id, ...novaEmpForm });
    } finally {
      setSavingNovaEmp(false);
    }
  };

  const salvarEmpresa = async () => {
    if (!empresaAtiva) return;
    setSavingEmp(true);
    await setDoc(doc(db, "empresas", empresaAtiva.id), empForm);
    setEditEmp(false);
    setSavingEmp(false);
  };

  // ── Setores ──
  const salvarSetor = async () => {
    if (!newSetor.nome || !empresaAtiva) return;
    setSavingSetor(true);
    await addDoc(collection(db, "empresas", empresaAtiva.id, "setores"), { ...newSetor });
    setNewSetor({ nome:"",responsavel:"",servidores:[],nFunc:0 });
    setAddingSetor(false);
    setSavingSetor(false);
  };

  const atualizarSetor = async () => {
    if (!editSetor || !empresaAtiva) return;
    setSavingSetor(true);
    const { id, ...data } = editSetor;
    await updateDoc(doc(db, "empresas", empresaAtiva.id, "setores", id), data);
    setEditSetor(null);
    setSavingSetor(false);
  };

  const excluirSetor = async (id) => {
    if (!window.confirm("Excluir este setor?") || !empresaAtiva) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "setores", id));
  };

  // ── Checklist ──
  const salvarItemChecklist = async (key, val) => {
    if (!empresaAtiva) return;
    setSavingCheck(true);
    await setDoc(doc(db, "empresas", empresaAtiva.id, "checklist", key), val);
    setSavingCheck(false);
  };

  const setCheckField = (id, sid, field, val) => {
    const key = `${id}__${sid}`;
    const updated = { ...(checklist[key] || {}), [field]: val };
    setChecklist(p => ({ ...p, [key]: updated }));
    salvarItemChecklist(key, updated);
  };

  // ── Riscos computados ──
  const riscos = useMemo(() => {
    const r = [];
    Object.entries(checklist).forEach(([key, val]) => {
      const [fid, sid] = key.split("__");
      if (!val?.freq || !val?.sev) return;
      const fator = FATORES.find(f => f.id === fid);
      const setor = setores.find(s => s.id === sid);
      if (!fator || !setor) return;
      const score = getRiskScore(val.freq, val.sev);
      const rk = getRiskLabel(score);
      r.push({ fator: fator.label, cat: fator.cat, setor: setor.nome, setorId: sid, freq: val.freq, sev: val.sev, score, ...rk, aet: score >= 13 });
    });
    return r.sort((a, b) => b.score - a.score);
  }, [checklist, setores]);

  const cats = ["Todas", ...[...new Set(FATORES.map(f => f.cat))]];
  const fatoresFiltrados = catFiltro === "Todas" ? FATORES : FATORES.filter(f => f.cat === catFiltro);

  const dadosSetor = setores.map(s => {
    const rs = riscos.filter(r => r.setorId === s.id);
    const avg = rs.length ? Math.round(rs.reduce((a, r) => a + r.score, 0) / rs.length * 4) : 0;
    return { setor: s.nome, nivel: avg };
  });

  const dadosCat = [...new Set(FATORES.map(f => f.cat))].map(cat => ({
    name: cat.split(" ")[0],
    value: riscos.filter(r => r.cat === cat).length || 0,
  }));

  const kpiCriticos = riscos.filter(r => r.score >= 13).length;
  const kpiAssedio  = riscos.filter(r => r.cat === "Suporte Social e Relações" && r.score >= 8).length;

  // ── Loading ──
  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg}}>
      <div style={{textAlign:"center"}}>
        <Loader size={32} color={C.navyMid} style={{animation:"spin 1s linear infinite"}}/>
        <p style={{color:C.muted,marginTop:12,fontSize:13}}>Carregando sistema...</p>
      </div>
    </div>
  );

  // ── Login ──
  if (!user) return (
    <div style={{minHeight:"100vh",background:"#f0f4f8",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:36,width:360}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24}}>
          <Shield size={26} color={C.navyMid}/>
          <div>
            <p style={{fontWeight:700,fontSize:15,margin:0,color:C.navy}}>GRO/PGR — SST</p>
            <p style={{fontSize:11,color:C.muted,margin:0}}>Gestão de Riscos Psicossociais</p>
          </div>
        </div>
        <Input label="E-mail" value={loginEmail} onChange={setLE} placeholder="seu@email.com" type="email"/>
        <div style={{marginBottom:12,position:"relative"}}>
          <p style={{fontSize:11,color:C.muted,margin:"0 0 4px",fontWeight:500}}>Senha</p>
          <input type={showPwd?"text":"password"} value={loginSenha} onChange={e=>setLS(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&login()}
            placeholder="••••••" style={{width:"100%",padding:"8px 36px 8px 10px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
          <button onClick={()=>setShowPwd(p=>!p)} style={{position:"absolute",right:8,top:24,background:"none",border:"none",cursor:"pointer",color:C.muted}}>
            {showPwd?<EyeOff size={14}/>:<Eye size={14}/>}
          </button>
        </div>
        {loginErr && <p style={{color:C.red,fontSize:12,margin:"0 0 10px"}}>{loginErr}</p>}
        <Btn onClick={login} color={C.navyMid} disabled={loginLoading} icon={loginLoading?<Loader size={13}/>:null}>
          {loginLoading?"Entrando...":"Entrar no Sistema"}
        </Btn>
        <p style={{marginTop:16,fontSize:11,color:C.muted}}>
          Usuários são cadastrados pelo administrador no Firebase Authentication.
        </p>
      </div>
    </div>
  );

  const avatarInicial = (userProfile?.nome||"?").split(" ").map(p=>p[0]).slice(0,2).join("").toUpperCase();

  // ── Seletor de Empresas ──
  if (!empresaAtiva) return (
    <div style={{fontFamily:"system-ui,sans-serif",background:C.bg,minHeight:"100vh",color:C.text}}>
      {/* Header */}
      <div style={{background:C.navy,padding:"12px 20px",display:"flex",alignItems:"center",gap:12}}>
        <Shield size={20} color="#93c5fd"/>
        <div style={{flex:1}}>
          <p style={{color:"#fff",fontWeight:600,fontSize:14,margin:0}}>GRO/PGR — SST</p>
          <p style={{color:"#93c5fd",fontSize:10,margin:0}}>Gestão de Riscos Psicossociais · NR-01</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:"50%",background:"#3a6aa8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{avatarInicial}</div>
          <div style={{textAlign:"right"}}>
            <p style={{color:"#fff",fontSize:12,margin:0,fontWeight:500}}>{userProfile?.nome||user.email}</p>
            <p style={{color:"#93c5fd",fontSize:10,margin:0}}>{userProfile?.perfil||"Usuário"}</p>
          </div>
          <button onClick={logout} style={{background:"none",border:"none",cursor:"pointer",color:"#93c5fd",marginLeft:4}}><LogOut size={15}/></button>
        </div>
      </div>

      <div style={{padding:"32px 20px",maxWidth:960,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:28}}>
          <div>
            <p style={{fontSize:20,fontWeight:700,color:C.navy,margin:"0 0 4px"}}>Selecionar Empresa</p>
            <p style={{fontSize:13,color:C.muted,margin:0}}>Olá, <strong>{userProfile?.nome}</strong> — escolha a empresa para continuar ou cadastre uma nova.</p>
          </div>
          <Btn onClick={()=>setCriandoEmpresa(p=>!p)} color={C.navyMid} icon={<Plus size={13}/>}>Nova Empresa</Btn>
        </div>

        {/* Formulário Nova Empresa */}
        {criandoEmpresa && (
          <Card style={{marginBottom:24,border:`1px solid ${C.navyMid}`}}>
            <SectionTitle><Building2 size={14}/> Cadastrar Nova Empresa</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Input label="Razão Social" value={novaEmpForm.razao} onChange={v=>setNovaEmpForm(p=>({...p,razao:v}))} required/>
              <Input label="CNPJ" value={novaEmpForm.cnpj} onChange={v=>setNovaEmpForm(p=>({...p,cnpj:v}))}/>
              <Input label="CNAE Principal" value={novaEmpForm.cnae} onChange={v=>setNovaEmpForm(p=>({...p,cnae:v}))}/>
              <Input label="Grau de Risco (GR 1–4)" value={novaEmpForm.grauRisco} onChange={v=>setNovaEmpForm(p=>({...p,grauRisco:v}))}/>
              <Input label="Endereço Completo" value={novaEmpForm.endereco} onChange={v=>setNovaEmpForm(p=>({...p,endereco:v}))}/>
              <Input label="Responsável Técnico" value={novaEmpForm.responsavel} onChange={v=>setNovaEmpForm(p=>({...p,responsavel:v}))}/>
              <Input label="Data da Avaliação" type="date" value={novaEmpForm.dataAvaliacao} onChange={v=>setNovaEmpForm(p=>({...p,dataAvaliacao:v}))}/>
            </div>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <Btn onClick={criarEmpresa} color={C.green} disabled={savingNovaEmp||!novaEmpForm.razao} icon={savingNovaEmp?<Loader size={12}/>:<Save size={12}/>}>
                {savingNovaEmp?"Criando...":"Criar e Entrar"}
              </Btn>
              <Btn onClick={()=>{setCriandoEmpresa(false);setNovaEmpForm(EMP_FORM_VAZIO);}} outline color={C.gray} icon={<X size={12}/>}>Cancelar</Btn>
            </div>
          </Card>
        )}

        {/* Lista de Empresas */}
        {loadingEmpresas ? (
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <Loader size={24} color={C.navyMid}/>
            <p style={{color:C.muted,fontSize:13,marginTop:10}}>Carregando empresas...</p>
          </div>
        ) : empresas.length === 0 ? (
          <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:10,padding:"32px",textAlign:"center"}}>
            <Building2 size={32} color="#ca8a04" style={{marginBottom:10}}/>
            <p style={{fontSize:14,fontWeight:600,color:"#92400e",margin:"0 0 6px"}}>Nenhuma empresa cadastrada</p>
            <p style={{fontSize:12,color:"#a16207",margin:0}}>Clique em <strong>Nova Empresa</strong> para começar.</p>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
            {empresas.map(e => (
              <div key={e.id} onClick={()=>selecionarEmpresa(e)}
                style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:18,cursor:"pointer",transition:"border-color 0.15s",position:"relative"}}
                onMouseEnter={ev=>ev.currentTarget.style.borderColor=C.navyMid}
                onMouseLeave={ev=>ev.currentTarget.style.borderColor=C.border}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12}}>
                  <div style={{width:38,height:38,borderRadius:8,background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Building2 size={18} color={C.navyMid}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontWeight:700,fontSize:13,color:C.navy,margin:"0 0 2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.razao||"—"}</p>
                    <p style={{fontSize:11,color:C.muted,margin:0}}>CNPJ: {e.cnpj||"—"}</p>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {e.cnae && <span style={{background:"#f0f9ff",color:"#0369a1",fontSize:10,padding:"2px 8px",borderRadius:4,fontWeight:500}}>CNAE {e.cnae}</span>}
                  {e.grauRisco && <span style={{background:"#f0fdf4",color:"#15803d",fontSize:10,padding:"2px 8px",borderRadius:4,fontWeight:500}}>GR {e.grauRisco}</span>}
                  {e.responsavel && <span style={{background:C.bg,color:C.muted,fontSize:10,padding:"2px 8px",borderRadius:4}}>{e.responsavel}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── App Principal (com empresa ativa) ──
  const ABAS = [
    {label:"Dashboard",   icon:<BarChart2 size={14}/>},
    {label:"Empresa",     icon:<Building2 size={14}/>},
    {label:"Setores",     icon:<Users size={14}/>},
    {label:"Levantamento",icon:<Clipboard size={14}/>},
    {label:"Matriz",      icon:<Shield size={14}/>},
    {label:"Plano de Ação",icon:<FileText size={14}/>},
  ];

  return (
    <div style={{fontFamily:"system-ui,sans-serif",background:C.bg,minHeight:"100vh",color:C.text}}>

      {/* Header */}
      <div style={{background:C.navy,padding:"10px 20px",display:"flex",alignItems:"center",gap:12}}>
        <Shield size={20} color="#93c5fd"/>
        <div style={{flex:1}}>
          <p style={{color:"#fff",fontWeight:600,fontSize:14,margin:0}}>GRO/PGR — Riscos Psicossociais</p>
          <p style={{color:"#93c5fd",fontSize:10,margin:0}}>NR-01 | NR-17 | ISO 45003 | eSocial | FAP/NTEP</p>
        </div>

        {/* Empresa ativa + troca */}
        <button onClick={voltarSeletor} style={{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,padding:"5px 10px",cursor:"pointer",maxWidth:220}}>
          <Building2 size={12} color="#93c5fd" style={{flexShrink:0}}/>
          <span style={{color:"#e2e8f0",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,textAlign:"left"}}>{empresaAtiva.razao||"Empresa"}</span>
          <ArrowLeft size={11} color="#93c5fd" style={{flexShrink:0}}/>
        </button>

        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:"50%",background:"#3a6aa8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{avatarInicial}</div>
          <div style={{textAlign:"right"}}>
            <p style={{color:"#fff",fontSize:12,margin:0,fontWeight:500}}>{userProfile?.nome||user.email}</p>
            <p style={{color:"#93c5fd",fontSize:10,margin:0}}>{userProfile?.perfil||"Usuário"}</p>
          </div>
          <button onClick={logout} style={{background:"none",border:"none",cursor:"pointer",color:"#93c5fd",marginLeft:4}}><LogOut size={15}/></button>
        </div>
      </div>

      {/* Alerta regulatório */}
      <div style={{background:"#eff6ff",borderBottom:`1px solid #bfdbfe`,padding:"7px 20px",display:"flex",alignItems:"center",gap:8}}>
        <Info size={13} color="#1d4ed8" style={{flexShrink:0}}/>
        <p style={{fontSize:11,color:"#1e40af",margin:0}}>
          <strong>Nota Regulatória:</strong> Riscos psicossociais <strong>não geram aposentadoria especial</strong> (Anexo IV Dec. 3.048/99) e <strong>não devem ser enviados na Tabela 24 do eSocial</strong> (S-2240). São essenciais para <strong>contestação de NTEP</strong>.
        </p>
      </div>

      {/* Tabs */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,display:"flex",padding:"0 20px",overflowX:"auto"}}>
        {ABAS.map((a,i)=>(
          <button key={i} onClick={()=>setAba(i)} style={{display:"flex",alignItems:"center",gap:6,padding:"11px 14px",border:"none",background:"none",cursor:"pointer",fontSize:12,fontWeight:500,whiteSpace:"nowrap",color:aba===i?C.navyMid:C.gray,borderBottom:aba===i?`2px solid ${C.navyMid}`:"2px solid transparent"}}>
            {a.icon}{a.label}
          </button>
        ))}
      </div>

      <div style={{padding:20,maxWidth:1100,margin:"0 auto"}}>

        {/* ═══ ABA 0: DASHBOARD ═══ */}
        {aba===0 && (
          <div>
            <p style={{fontSize:12,color:C.muted,marginBottom:14}}>
              Empresa: <strong>{empresaAtiva.razao||"—"}</strong> | CNAE: {empresaAtiva.cnae||"—"} | Responsável: {empresaAtiva.responsavel||"—"}
            </p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
              {[
                {label:"Absenteísmo CID-F (mock)",value:"8,4%",sub:"Meta ≤ 3,5% | +2,1pp YTD",icon:<Activity size={16}/>,bg:"#fef2f2",bc:"#fca5a5",ic:C.red},
                {label:"Riscos Críticos / Catastróficos",value:kpiCriticos,sub:"Requerem AET imediata",icon:<AlertTriangle size={16}/>,bg:kpiCriticos>0?"#fef2f2":"#f0fdf4",bc:kpiCriticos>0?"#fca5a5":"#86efac",ic:kpiCriticos>0?C.red:C.green},
                {label:"Alerta FAP (mock)",value:"1,47",sub:"FAP > 1 → Majoração RAT",icon:<TrendingUp size={16}/>,bg:"#fffbeb",bc:"#fcd34d",ic:C.amber},
                {label:"Ocorrências CIPA+A",value:kpiAssedio,sub:"Assédio / Violência mapeados",icon:<Users size={16}/>,bg:kpiAssedio>0?"#fffbeb":"#f0fdf4",bc:kpiAssedio>0?"#fcd34d":"#86efac",ic:kpiAssedio>0?C.amber:C.green},
              ].map((k,i)=>(
                <div key={i} style={{background:k.bg,border:`1px solid ${k.bc}`,borderRadius:10,padding:"13px 15px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                    <p style={{fontSize:10.5,color:C.muted,margin:0,lineHeight:1.3}}>{k.label}</p>
                    <span style={{color:k.ic}}>{k.icon}</span>
                  </div>
                  <p style={{fontSize:22,fontWeight:700,margin:"0 0 3px"}}>{k.value}</p>
                  <p style={{fontSize:10,color:C.muted,margin:0}}>{k.sub}</p>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:14}}>
              <Card>
                <SectionTitle>Nível de Risco por Setor</SectionTitle>
                {dadosSetor.length===0
                  ? <p style={{fontSize:12,color:C.muted,textAlign:"center",padding:"30px 0"}}>Cadastre setores e preencha o levantamento para visualizar.</p>
                  : <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={dadosSetor} layout="vertical" margin={{left:8,right:20}}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"/>
                        <XAxis type="number" domain={[0,100]} tick={{fontSize:10}}/>
                        <YAxis type="category" dataKey="setor" tick={{fontSize:11}} width={100}/>
                        <Tooltip formatter={v=>[v+" pts","Risco"]}/>
                        <Bar dataKey="nivel" radius={[0,4,4,0]}>
                          {dadosSetor.map((e,i)=><Cell key={i} fill={e.nivel>=70?"#dc2626":e.nivel>=50?"#d97706":"#2d5382"}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                }
              </Card>
              <Card>
                <SectionTitle>Fatores por Categoria</SectionTitle>
                {riscos.length===0
                  ? <p style={{fontSize:12,color:C.muted,textAlign:"center",padding:"30px 0"}}>Sem dados ainda.</p>
                  : <>
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie data={dadosCat.filter(d=>d.value>0)} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value" paddingAngle={2}>
                            {dadosCat.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                          </Pie>
                          <Tooltip/>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:4}}>
                        {dadosCat.filter(d=>d.value>0).map((d,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:10.5}}>
                            <span style={{display:"flex",alignItems:"center",gap:5,color:C.muted}}>
                              <span style={{width:8,height:8,borderRadius:2,background:PIE_COLORS[i%PIE_COLORS.length],display:"inline-block"}}/>
                              {d.name}
                            </span>
                            <strong>{d.value}</strong>
                          </div>
                        ))}
                      </div>
                    </>
                }
              </Card>
            </div>
          </div>
        )}

        {/* ═══ ABA 1: EMPRESA ═══ */}
        {aba===1 && (
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <SectionTitle><Building2 size={14}/> Dados da Empresa Avaliada</SectionTitle>
              {!editEmp
                ? <Btn onClick={()=>{setEmpForm({razao:empresaAtiva.razao||"",cnpj:empresaAtiva.cnpj||"",cnae:empresaAtiva.cnae||"",endereco:empresaAtiva.endereco||"",responsavel:empresaAtiva.responsavel||"",dataAvaliacao:empresaAtiva.dataAvaliacao||"",grauRisco:empresaAtiva.grauRisco||"3"});setEditEmp(true);}} outline color={C.navyMid} small icon={<Edit2 size={12}/>}>Editar</Btn>
                : <div style={{display:"flex",gap:8}}>
                    <Btn onClick={salvarEmpresa} color={C.green} small disabled={savingEmp} icon={<Save size={12}/>}>{savingEmp?"Salvando...":"Salvar"}</Btn>
                    <Btn onClick={()=>setEditEmp(false)} outline color={C.gray} small icon={<X size={12}/>}>Cancelar</Btn>
                  </div>
              }
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[
                {label:"Razão Social",key:"razao",required:true},
                {label:"CNPJ",key:"cnpj"},
                {label:"CNAE Principal",key:"cnae"},
                {label:"Grau de Risco (GR 1–4)",key:"grauRisco"},
                {label:"Endereço Completo",key:"endereco"},
                {label:"Responsável Técnico",key:"responsavel"},
                {label:"Data da Avaliação",key:"dataAvaliacao",type:"date"},
              ].map(f=>(
                editEmp
                  ? <Input key={f.key} label={f.label} type={f.type||"text"} value={empForm[f.key]||""} required={f.required} onChange={v=>setEmpForm(p=>({...p,[f.key]:v}))}/>
                  : <div key={f.key} style={{marginBottom:12}}>
                      <p style={{fontSize:10.5,color:C.muted,margin:"0 0 2px",fontWeight:500}}>{f.label}</p>
                      <p style={{fontSize:13,fontWeight:500,margin:0}}>{empresaAtiva[f.key]||"—"}</p>
                    </div>
              ))}
            </div>
          </Card>
        )}

        {/* ═══ ABA 2: SETORES ═══ */}
        {aba===2 && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <SectionTitle><Users size={14}/> Setores Cadastrados ({setores.length})</SectionTitle>
              <Btn onClick={()=>setAddingSetor(true)} color={C.navyMid} small icon={<Plus size={12}/>}>Novo Setor</Btn>
            </div>

            {addingSetor && (
              <Card style={{marginBottom:14,border:`1px solid ${C.navyMid}`}}>
                <p style={{fontWeight:600,fontSize:13,margin:"0 0 12px",color:C.navy}}>Cadastrar Novo Setor</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  <Input label="Nome do Setor *" value={newSetor.nome} onChange={v=>setNewSetor(p=>({...p,nome:v}))}/>
                  <Input label="Responsável" value={newSetor.responsavel} onChange={v=>setNewSetor(p=>({...p,responsavel:v}))}/>
                  <Input label="Nº de Funcionários" type="number" value={newSetor.nFunc||""} onChange={v=>setNewSetor(p=>({...p,nFunc:parseInt(v)||0}))}/>
                </div>
                <p style={{fontSize:11,color:C.muted,margin:"0 0 6px",fontWeight:500}}>Servidores / Trabalhadores</p>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <input value={newServidor} onChange={e=>setNewServidor(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&newServidor.trim()){setNewSetor(p=>({...p,servidores:[...p.servidores,newServidor.trim()]}));setNewServidor("");}}}
                    placeholder="Nome do servidor — Enter para adicionar"
                    style={{flex:1,padding:"7px 10px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,fontFamily:"inherit"}}/>
                  <Btn onClick={()=>{if(newServidor.trim()){setNewSetor(p=>({...p,servidores:[...p.servidores,newServidor.trim()]}));setNewServidor("");}}} color={C.blue} small icon={<Plus size={12}/>}>Add</Btn>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                  {newSetor.servidores.map((s,i)=>(
                    <span key={i} style={{background:"#e0e7ff",color:"#3730a3",fontSize:11,padding:"3px 10px",borderRadius:20,display:"flex",alignItems:"center",gap:4}}>
                      {s}
                      <button onClick={()=>setNewSetor(p=>({...p,servidores:p.servidores.filter((_,j)=>j!==i)}))} style={{background:"none",border:"none",cursor:"pointer",color:"#6366f1",padding:0}}><X size={10}/></button>
                    </span>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <Btn onClick={salvarSetor} color={C.green} small disabled={savingSetor} icon={<Save size={12}/>}>{savingSetor?"Salvando...":"Salvar Setor"}</Btn>
                  <Btn onClick={()=>setAddingSetor(false)} outline color={C.gray} small icon={<X size={12}/>}>Cancelar</Btn>
                </div>
              </Card>
            )}

            {setores.length===0 && !addingSetor && (
              <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:"16px 20px",fontSize:12,color:"#92400e",textAlign:"center"}}>
                Nenhum setor cadastrado. Clique em <strong>Novo Setor</strong> para começar.
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {setores.map(s=>(
                editSetor?.id===s.id
                ? <Card key={s.id} style={{border:`1px solid ${C.navyMid}`}}>
                    <Input label="Nome" value={editSetor.nome} onChange={v=>setEditSetor(p=>({...p,nome:v}))}/>
                    <Input label="Responsável" value={editSetor.responsavel||""} onChange={v=>setEditSetor(p=>({...p,responsavel:v}))}/>
                    <Input label="Nº Funcionários" type="number" value={editSetor.nFunc||""} onChange={v=>setEditSetor(p=>({...p,nFunc:parseInt(v)||0}))}/>
                    <div style={{display:"flex",gap:8,marginTop:4}}>
                      <Btn onClick={atualizarSetor} color={C.green} small disabled={savingSetor} icon={<Save size={12}/>}>{savingSetor?"Salvando...":"Salvar"}</Btn>
                      <Btn onClick={()=>setEditSetor(null)} outline color={C.gray} small icon={<X size={12}/>}>Cancelar</Btn>
                    </div>
                  </Card>
                : <Card key={s.id}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div>
                        <p style={{fontWeight:600,fontSize:14,margin:"0 0 2px",color:C.navy}}>{s.nome}</p>
                        <p style={{fontSize:11,color:C.muted,margin:0}}>Responsável: {s.responsavel||"—"} | {s.nFunc||0} funcionários</p>
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>setEditSetor({...s})} style={{background:"none",border:"none",cursor:"pointer",color:C.blue}}><Edit2 size={13}/></button>
                        <button onClick={()=>excluirSetor(s.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.red}}><Trash2 size={13}/></button>
                      </div>
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                      {(s.servidores||[]).length===0
                        ? <span style={{fontSize:11,color:C.muted}}>Nenhum servidor cadastrado</span>
                        : (s.servidores||[]).map((sv,i)=>(
                            <span key={i} style={{background:"#f0f9ff",color:"#0369a1",fontSize:11,padding:"3px 9px",borderRadius:20}}>{sv}</span>
                          ))
                      }
                    </div>
                    <div style={{padding:"6px 10px",background:C.bg,borderRadius:6,fontSize:11,color:C.muted,display:"flex",gap:16}}>
                      <span>Riscos mapeados: <strong style={{color:C.text}}>{riscos.filter(r=>r.setorId===s.id).length}</strong></span>
                      <span>Críticos/Catastróficos: <strong style={{color:C.red}}>{riscos.filter(r=>r.setorId===s.id&&r.score>=13).length}</strong></span>
                    </div>
                  </Card>
              ))}
            </div>
          </div>
        )}

        {/* ═══ ABA 3: LEVANTAMENTO ═══ */}
        {aba===3 && (
          <div>
            <div style={{display:"flex",gap:12,alignItems:"flex-end",marginBottom:14,flexWrap:"wrap"}}>
              <div>
                <p style={{fontSize:11,color:C.muted,margin:"0 0 4px",fontWeight:500}}>Setor avaliado *</p>
                <select value={setorSel} onChange={e=>setSetorSel(e.target.value)} style={{padding:"7px 10px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,fontFamily:"inherit",color:C.text,background:C.white,minWidth:180}}>
                  <option value="">— Selecione —</option>
                  {setores.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div>
                <p style={{fontSize:11,color:C.muted,margin:"0 0 4px",fontWeight:500}}>Filtrar categoria</p>
                <select value={catFiltro} onChange={e=>setCatFiltro(e.target.value)} style={{padding:"7px 10px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,fontFamily:"inherit",color:C.text,background:C.white}}>
                  {cats.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {savingCheck && <span style={{fontSize:11,color:C.muted,display:"flex",alignItems:"center",gap:4}}><Loader size={11}/> Salvando...</span>}
              {setorSel && (
                <span style={{fontSize:11,color:C.muted,marginLeft:"auto"}}>
                  {fatoresFiltrados.filter(f=>checklist[`${f.id}__${setorSel}`]?.freq).length}/{fatoresFiltrados.length} avaliados
                </span>
              )}
            </div>

            {!setorSel && (
              <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:"12px 16px",fontSize:12,color:"#92400e"}}>
                {setores.length===0
                  ? <>Nenhum setor cadastrado. <button onClick={()=>setAba(2)} style={{background:"none",border:"none",color:C.navyMid,cursor:"pointer",fontWeight:600,fontFamily:"inherit",fontSize:12}}>Cadastre setores primeiro.</button></>
                  : "Selecione um setor acima para iniciar o levantamento epidemiológico."
                }
              </div>
            )}

            {[...new Set(fatoresFiltrados.map(f=>f.cat))].map(cat=>(
              <div key={cat} style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <div style={{width:3,height:16,background:C.navyMid,borderRadius:2}}/>
                  <p style={{fontWeight:600,fontSize:13,color:C.navy,margin:0}}>{cat}</p>
                </div>
                {fatoresFiltrados.filter(f=>f.cat===cat).map(item=>{
                  const key = `${item.id}__${setorSel}`;
                  const val = checklist[key]||{};
                  const score = val.freq&&val.sev ? getRiskScore(val.freq,val.sev) : null;
                  const rk = score!==null ? getRiskLabel(score) : null;
                  return (
                    <div key={item.id} style={{background:C.white,border:`1px solid ${rk?rk.color:C.border}`,borderLeft:`3px solid ${rk?rk.color:C.border}`,borderRadius:8,padding:"12px 14px",marginBottom:8,opacity:setorSel?1:0.5}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <div style={{flex:1}}>
                          <p style={{fontWeight:500,fontSize:12,margin:"0 0 2px"}}>{item.label}</p>
                          <p style={{fontSize:10,color:C.muted,margin:0}}>Ref.: {item.ref}</p>
                        </div>
                        {rk && <Badge label={`${rk.label} (${score})`} color={rk.color} bg={rk.bg}/>}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                        <div>
                          <p style={{fontSize:10,color:C.muted,margin:"0 0 5px",fontWeight:500}}>Frequência de Exposição</p>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                            {FREQ_OPT.map(o=>{
                              const sel=val.freq===o;
                              return <button key={o} disabled={!setorSel} onClick={()=>setCheckField(item.id,setorSel,"freq",o)} style={{fontSize:10,padding:"3px 9px",borderRadius:20,border:`1px solid ${sel?C.navyMid:C.border}`,background:sel?C.navyMid:C.white,color:sel?C.white:C.gray,cursor:setorSel?"pointer":"not-allowed",fontWeight:sel?600:400,fontFamily:"inherit"}}>{o}</button>;
                            })}
                          </div>
                        </div>
                        <div>
                          <p style={{fontSize:10,color:C.muted,margin:"0 0 5px",fontWeight:500}}>Severidade do Dano Esperado</p>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                            {SEV_OPT.map((o,oi)=>{
                              const sevColors=["#16a34a","#65a30d","#d97706","#ea580c","#dc2626"];
                              const sel=val.sev===o;
                              return <button key={o} disabled={!setorSel} onClick={()=>setCheckField(item.id,setorSel,"sev",o)} style={{fontSize:10,padding:"3px 9px",borderRadius:20,border:`1px solid ${sel?sevColors[oi]:C.border}`,background:sel?sevColors[oi]:C.white,color:sel?C.white:C.gray,cursor:setorSel?"pointer":"not-allowed",fontWeight:sel?600:400,fontFamily:"inherit"}}>{o}</button>;
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* ═══ ABA 4: MATRIZ ═══ */}
        {aba===4 && (
          <div>
            <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"10px 14px",marginBottom:16,display:"flex",gap:8,alignItems:"flex-start"}}>
              <AlertCircle size={13} color={C.red} style={{flexShrink:0,marginTop:2}}/>
              <p style={{fontSize:11,color:"#991b1b",margin:0}}><strong>Critério AET:</strong> Pontuação ≥ 13 (Crítico/Catastrófico) exige Análise Ergonômica do Trabalho imediata — NR-17 / Nota Técnica FUNDACENTRO.</p>
            </div>
            {riscos.length===0
              ? <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:"20px",fontSize:12,color:"#92400e",textAlign:"center"}}>
                  Sem dados de risco. Preencha o <button onClick={()=>setAba(3)} style={{background:"none",border:"none",color:C.navyMid,cursor:"pointer",fontWeight:600,fontFamily:"inherit",fontSize:12}}>Levantamento</button> primeiro.
                </div>
              : <div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:20}}>
                    {[["Aceitável","1–3","#dcfce7","#15803d",[1,3]],["Tolerável","4–6","#fef9c3","#854d0e",[4,6]],["Relevante","7–12","#fed7aa","#92400e",[7,12]],["Crítico","13–16","#fee2e2","#991b1b",[13,16]],["Catastrófico","17–25","#fecaca","#7f1d1d",[17,25]]].map(([z,rng,bg,cl,lim])=>{
                      const n=riscos.filter(r=>r.score>=lim[0]&&r.score<=lim[1]).length;
                      return <div key={z} style={{background:bg,borderRadius:8,padding:"12px",textAlign:"center"}}>
                        <p style={{fontSize:11,fontWeight:600,color:cl,margin:"0 0 2px"}}>{z}</p>
                        <p style={{fontSize:10,color:cl,margin:"0 0 6px",opacity:0.8}}>{rng}</p>
                        <p style={{fontSize:24,fontWeight:700,color:cl,margin:0}}>{n}</p>
                      </div>;
                    })}
                  </div>
                  <Card>
                    <SectionTitle>Todos os Riscos — Ordenados por Pontuação</SectionTitle>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,tableLayout:"fixed"}}>
                        <thead>
                          <tr style={{background:C.navy}}>
                            {["Fator de Risco","Categoria","Setor","Frequência","Severidade","Pontuação","Classificação","AET?"].map(h=>(
                              <th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#e2e8f0",fontWeight:500,fontSize:10}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {riscos.map((r,i)=>(
                            <tr key={i} style={{background:i%2===0?C.white:C.bg,borderBottom:`1px solid ${C.border}`}}>
                              <td style={{padding:"8px 10px",fontWeight:500}}>{r.fator}</td>
                              <td style={{padding:"8px 10px",color:C.muted,fontSize:10}}>{r.cat}</td>
                              <td style={{padding:"8px 10px"}}>{r.setor}</td>
                              <td style={{padding:"8px 10px",color:C.muted}}>{r.freq}</td>
                              <td style={{padding:"8px 10px",color:C.muted}}>{r.sev}</td>
                              <td style={{padding:"8px 10px",fontWeight:700,fontSize:14}}>{r.score}</td>
                              <td style={{padding:"8px 10px"}}><Badge label={r.label} color={r.color} bg={r.bg}/></td>
                              <td style={{padding:"8px 10px"}}>{r.aet?<span style={{color:C.red,fontWeight:700,fontSize:10}}>✔ SIM</span>:<span style={{color:C.muted,fontSize:10}}>Não</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
            }
          </div>
        )}

        {/* ═══ ABA 5: PLANO DE AÇÃO ═══ */}
        {aba===5 && (
          <div>
            <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
              <Btn onClick={()=>exportarRelatorio("Anexo GRO — Plano de Ação PGR",empresaAtiva,riscos,userProfile?.nome||user.email,userProfile?.perfil||"")} color={C.navyMid} icon={<Printer size={13}/>}>Gerar Anexo GRO / PGR</Btn>
              <Btn onClick={()=>exportarRelatorio("Subsídios de Defesa — Nexo Técnico (NTEP)",empresaAtiva,riscos,userProfile?.nome||user.email,userProfile?.perfil||"")} color="#7c3aed" icon={<Shield size={13}/>}>Subsídios Defesa NTEP</Btn>
              <Btn onClick={()=>exportarRelatorio("Encaminhamento ao PCMSO — Riscos Psicossociais",empresaAtiva,riscos,userProfile?.nome||user.email,userProfile?.perfil||"")} color="#0f766e" icon={<FileText size={13}/>}>Encaminhar ao PCMSO</Btn>
            </div>

            {riscos.length===0
              ? <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:"20px",fontSize:12,color:"#92400e",textAlign:"center"}}>
                  Sem riscos mapeados. Preencha o <button onClick={()=>setAba(3)} style={{background:"none",border:"none",color:C.navyMid,cursor:"pointer",fontWeight:600,fontFamily:"inherit",fontSize:12}}>Levantamento</button> para gerar o plano automaticamente.
                </div>
              : <Card>
                  <SectionTitle><FileText size={14}/> Plano de Ação — Gerado Automaticamente</SectionTitle>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                      <thead>
                        <tr style={{background:C.navy}}>
                          {["Fator de Risco","Setor","Classificação","Medida de Controle Recomendada","Responsável","Prazo","AET"].map(h=>(
                            <th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#e2e8f0",fontWeight:500,fontSize:10}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {riscos.map((r,i)=>{
                          const acoes = {
                            "Demanda e Carga de Trabalho":"Revisão de carga horária + rodízio de funções + monitoramento eSocial S-2220",
                            "Controle e Autonomia":"Gestão participativa + metodologias ágeis + autonomia de processos",
                            "Suporte Social e Relações":"Canal CIPA+A + treinamento de liderança + política anti-assédio",
                            "Reconhecimento e Recompensa":"Programa de reconhecimento + revisão salarial + plano de carreira",
                            "Interface Trabalho-Vida Privada":"Política de desconexão digital + controle de jornada via ERP",
                            "Organização e Cultura":"Diagnóstico organizacional + coaching + política de saúde mental",
                            "Conteúdo e Significado do Trabalho":"Redesenho de tarefas + suporte psicológico + rotação de funções",
                          };
                          const resp = setores.find(s=>s.nome===r.setor)?.responsavel||"SESMT";
                          return (
                            <tr key={i} style={{background:i%2===0?C.white:C.bg,borderBottom:`1px solid ${C.border}`}}>
                              <td style={{padding:"8px 10px",fontWeight:500,maxWidth:200}}>{r.fator}</td>
                              <td style={{padding:"8px 10px"}}>{r.setor}</td>
                              <td style={{padding:"8px 10px"}}><Badge label={r.label} color={r.color} bg={r.bg}/></td>
                              <td style={{padding:"8px 10px",lineHeight:1.4,maxWidth:220}}>{acoes[r.cat]||"Avaliação ergonômica + medidas administrativas"}</td>
                              <td style={{padding:"8px 10px",color:C.muted}}>{resp}</td>
                              <td style={{padding:"8px 10px"}}>
                                <span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:r.aet?C.red:C.text,fontWeight:r.aet?700:400}}>
                                  <Clock size={10}/>{r.aet?"Imediato":r.score>=7?"60 dias":"90 dias"}
                                </span>
                              </td>
                              <td style={{padding:"8px 10px"}}>{r.aet?<span style={{color:C.red,fontWeight:700,fontSize:10}}>✔ AET</span>:<span style={{color:C.muted,fontSize:10}}>PGR</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
            }

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:16}}>
              {[
                {title:"Base Normativa — PGR/GRO",items:["NR-01 (2022) — Inventário de Riscos Ocupacionais","NR-17 — Ergonomia (AET)","ISO 45003:2021 — Saúde Psicológica no Trabalho","eSocial S-2220 — Monitoramento da Saúde","Lei 14.457/2022 — CIPA+A"]},
                {title:"Base Normativa — NTEP / FAP",items:["Decreto 3.048/99 — Regulamento Previdenciário","IN INSS 77/2015 — Nexo Técnico Epidemiológico","Resolução CNPS 1.316/2010 — FAP","CID-10 Grupos F41, F43, F48","Súmula 736 STF — Responsabilidade do empregador"]},
              ].map(c=>(
                <Card key={c.title}>
                  <SectionTitle>{c.title}</SectionTitle>
                  {c.items.map(it=>(
                    <div key={it} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:7}}>
                      <CheckSquare size={11} color={C.navyMid} style={{flexShrink:0,marginTop:2}}/>
                      <span style={{fontSize:11.5,color:C.muted}}>{it}</span>
                    </div>
                  ))}
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
