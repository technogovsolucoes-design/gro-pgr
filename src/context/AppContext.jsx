import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";
import { initializeApp, deleteApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  doc, getDoc, setDoc, collection,
  addDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, documentId, arrayUnion,
  serverTimestamp, orderBy,
} from "firebase/firestore";
import { auth, db, firebaseConfig } from "../firebase";
import { FATORES, EMP_FORM_VAZIO } from "../constants";
import { getRiskScore, getRiskLabel } from "../utils";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  // ── Auth ──
  const [user, setUser]               = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [loginLoading, setLL]         = useState(false);
  const [loginErr, setLoginErr]       = useState("");

  // ── Empresas ──
  const [empresas, setEmpresas]             = useState([]);
  const [empresaAtiva, setEmpresaAtiva]     = useState(null);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);

  // ── Setores ──
  const [setores, setSetores] = useState([]);

  // ── Checklist ──
  const [checklist, setChecklist]     = useState({});
  const [savingCheck, setSavingCheck] = useState(false);

  // ── Usuários (Admin only) ──
  const [usuarios, setUsuarios] = useState([]);

  // ── Indicadores ──
  const [absenteismo, setAbsenteismo] = useState([]);
  const [fap, setFap]                 = useState(null);

  // ── Histórico de avaliações ──
  const [historico, setHistorico]     = useState([]);
  const [savingSnap, setSavingSnap]   = useState(false);

  // ── EPI ──
  const [epis, setEpis]                   = useState([]);
  const [funcionarios, setFuncionarios]   = useState([]);
  const [entregas, setEntregas]           = useState([]);

  // ── Treinamentos ──
  const [treinamentos, setTreinamentos] = useState([]);

  // ── PCMSO / eSocial ──
  const [exames, setExames] = useState([]);
  const [cats, setCats]     = useState([]);

  // ── Auth listener ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "usuarios", u.uid));
        if (snap.exists()) {
          setUserProfile(snap.data());
        } else {
          const defaultProfile = { nome: u.email, email: u.email, perfil: "Gestor", empresas: [] };
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

  // ── Carregar empresas do usuário ──
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

  // ── Sincronizar empresaAtiva quando a lista atualiza ──
  useEffect(() => {
    if (!empresaAtiva) return;
    const atualizada = empresas.find(e => e.id === empresaAtiva.id);
    if (atualizada) setEmpresaAtiva(atualizada);
  }, [empresas]);

  // ── Setores da empresa ativa ──
  useEffect(() => {
    if (!user || !empresaAtiva) { setSetores([]); return; }
    const unsub = onSnapshot(
      collection(db, "empresas", empresaAtiva.id, "setores"),
      snap => setSetores(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [user, empresaAtiva]);

  // ── Checklist da empresa ativa ──
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

  // ── Indicadores da empresa ativa ──
  useEffect(() => {
    if (!user || !empresaAtiva) { setAbsenteismo([]); setFap(null); return; }

    const unsubAbs = onSnapshot(
      collection(db, "empresas", empresaAtiva.id, "absenteismo"),
      snap => setAbsenteismo(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubFap = onSnapshot(
      doc(db, "empresas", empresaAtiva.id, "fap", "atual"),
      snap => setFap(snap.exists() ? snap.data() : null)
    );

    return () => { unsubAbs(); unsubFap(); };
  }, [user, empresaAtiva]);

  // ── Histórico da empresa ativa ──
  useEffect(() => {
    if (!user || !empresaAtiva) { setHistorico([]); return; }
    const unsub = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "historico"), orderBy("data", "desc")),
      snap => setHistorico(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [user, empresaAtiva]);

  // ── Usuários (Admin only) ──
  useEffect(() => {
    if (!user || userProfile?.perfil !== "Admin") { setUsuarios([]); return; }
    const unsub = onSnapshot(collection(db, "usuarios"), snap => {
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user, userProfile?.perfil]);

  // ── EPI: epis + funcionarios + entregas ──
  useEffect(() => {
    if (!user || !empresaAtiva) {
      setEpis([]); setFuncionarios([]); setEntregas([]); return;
    }
    const unsubEpis = onSnapshot(
      collection(db, "empresas", empresaAtiva.id, "epis"),
      snap => setEpis(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubFuncs = onSnapshot(
      collection(db, "empresas", empresaAtiva.id, "funcionarios"),
      snap => setFuncionarios(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubEnt = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "entregas"), orderBy("data", "desc")),
      snap => setEntregas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubEpis(); unsubFuncs(); unsubEnt(); };
  }, [user, empresaAtiva]);

  // ── Treinamentos ──
  useEffect(() => {
    if (!user || !empresaAtiva) { setTreinamentos([]); return; }
    const unsub = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "treinamentos"), orderBy("data", "desc")),
      snap => setTreinamentos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [user, empresaAtiva]);

  // ── PCMSO / eSocial ──
  useEffect(() => {
    if (!user || !empresaAtiva) { setExames([]); setCats([]); return; }
    const unsubEx = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "exames"), orderBy("data", "desc")),
      snap => setExames(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubCats = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "cats"), orderBy("data", "desc")),
      snap => setCats(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubEx(); unsubCats(); };
  }, [user, empresaAtiva]);

  // ── Auth actions ──
  const login = async (email, senha) => {
    setLL(true);
    setLoginErr("");
    try {
      await signInWithEmailAndPassword(auth, email, senha);
    } catch {
      setLoginErr("E-mail ou senha incorretos.");
    }
    setLL(false);
  };

  const logout = () => {
    setEmpresaAtiva(null);
    setSetores([]);
    setChecklist({});
    signOut(auth);
  };

  // ── Empresa actions ──
  const selecionarEmpresa = (emp) => {
    setEmpresaAtiva(emp);
  };

  const voltarSeletor = () => {
    setEmpresaAtiva(null);
    setSetores([]);
    setChecklist({});
  };

  const criarEmpresa = async (novaEmpForm, onSuccess) => {
    const docRef = await addDoc(collection(db, "empresas"), novaEmpForm);
    await updateDoc(doc(db, "usuarios", user.uid), { empresas: arrayUnion(docRef.id) });
    setUserProfile(p => ({ ...p, empresas: [...(p.empresas || []), docRef.id] }));
    const nova = { id: docRef.id, ...novaEmpForm };
    setEmpresaAtiva(nova);
    if (onSuccess) onSuccess();
  };

  const salvarEmpresa = async (empForm) => {
    if (!empresaAtiva) return;
    await setDoc(doc(db, "empresas", empresaAtiva.id), empForm);
  };

  // ── Setor actions ──
  const salvarSetor = async (newSetor) => {
    if (!empresaAtiva) return;
    await addDoc(collection(db, "empresas", empresaAtiva.id, "setores"), newSetor);
  };

  const atualizarSetor = async (editSetor) => {
    if (!empresaAtiva) return;
    const { id, ...data } = editSetor;
    await updateDoc(doc(db, "empresas", empresaAtiva.id, "setores", id), data);
  };

  const excluirSetor = async (id) => {
    if (!empresaAtiva) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "setores", id));
  };

  // ── Checklist actions ──
  const setCheckField = (fatorId, setorId, field, val) => {
    const key = `${fatorId}__${setorId}`;
    const current = checklist[key] || {};
    const updated = { ...current, [field]: val };
    // Auto-default severity to "Moderado" when freq is set (and not "Nunca") and sev was never chosen
    if (field === "freq" && val !== "Nunca" && !current.sev) {
      updated.sev = "Moderado";
    }
    setChecklist(p => ({ ...p, [key]: updated }));
    setSavingCheck(true);
    setDoc(doc(db, "empresas", empresaAtiva.id, "checklist", key), updated)
      .finally(() => setSavingCheck(false));
  };

  // ── Indicadores actions ──
  const salvarAbsenteismo = async (dados) => {
    if (!empresaAtiva || !dados.periodo) return;
    await setDoc(doc(db, "empresas", empresaAtiva.id, "absenteismo", dados.periodo), dados);
  };

  const excluirAbsenteismo = async (periodo) => {
    if (!empresaAtiva) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "absenteismo", periodo));
  };

  const salvarFAP = async (dados) => {
    if (!empresaAtiva) return;
    await setDoc(doc(db, "empresas", empresaAtiva.id, "fap", "atual"), dados);
  };

  const criarSnapshot = async (riscos, autor) => {
    if (!empresaAtiva) return;
    setSavingSnap(true);
    const snap = {
      data: serverTimestamp(),
      autor: autor || "—",
      totalRiscos: riscos.length,
      criticos: riscos.filter(r => r.score >= 13).length,
      altos: riscos.filter(r => r.score >= 8 && r.score < 13).length,
      setoresAfetados: [...new Set(riscos.map(r => r.setor))].length,
      riscos: riscos.map(({ fator, cat, setor, score, label, color, bg, aet }) => ({ fator, cat, setor, score, label, color, bg, aet })),
    };
    await addDoc(collection(db, "empresas", empresaAtiva.id, "historico"), snap);
    setSavingSnap(false);
  };

  // ── Usuário actions ──
  const salvarUsuario = async (editUsuario) => {
    const { id, ...data } = editUsuario;
    await updateDoc(doc(db, "usuarios", id), data);
  };

  const criarUsuario = async ({ email, senha, nome, perfil, empresasIds }) => {
    const appName = `secondary-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, appName);
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, senha);
      const uid = cred.user.uid;
      const perfil_ = perfil || "Gestor";
      await setDoc(doc(db, "usuarios", uid), {
        nome: nome || email,
        email,
        perfil: perfil_,
        empresas: empresasIds || [],
      });
      return { ok: true };
    } catch (e) {
      const msg = e.code === "auth/email-already-in-use"
        ? "E-mail já cadastrado."
        : e.code === "auth/weak-password"
        ? "Senha deve ter no mínimo 6 caracteres."
        : "Erro ao criar usuário.";
      return { ok: false, msg };
    } finally {
      await deleteApp(secondaryApp);
    }
  };

  const excluirUsuario = async (uid) => {
    await deleteDoc(doc(db, "usuarios", uid));
  };

  // ── EPI actions ──
  const salvarEpi = async (epi) => {
    if (!empresaAtiva) return;
    if (epi.id) {
      const { id, ...data } = epi;
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "epis", id), data);
    } else {
      await addDoc(collection(db, "empresas", empresaAtiva.id, "epis"), epi);
    }
  };
  const excluirEpi = (id) => deleteDoc(doc(db, "empresas", empresaAtiva.id, "epis", id));

  // ── Funcionário actions ──
  const salvarFuncionario = async (func) => {
    if (!empresaAtiva) return;
    if (func.id) {
      const { id, ...data } = func;
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "funcionarios", id), data);
    } else {
      await addDoc(collection(db, "empresas", empresaAtiva.id, "funcionarios"), func);
    }
  };
  const excluirFuncionario = (id) => deleteDoc(doc(db, "empresas", empresaAtiva.id, "funcionarios", id));
  const atualizarCredencialFuncionario = async (id, credentialId) => {
    await updateDoc(doc(db, "empresas", empresaAtiva.id, "funcionarios", id), { credentialId });
  };

  // ── Entrega actions ──
  const registrarEntrega = async (entrega) => {
    if (!empresaAtiva) return;
    await addDoc(collection(db, "empresas", empresaAtiva.id, "entregas"), {
      ...entrega, data: serverTimestamp(),
    });
  };
  const excluirEntrega = (id) => deleteDoc(doc(db, "empresas", empresaAtiva.id, "entregas", id));

  // ── Treinamento actions ──
  const salvarTreinamento = async (treino) => {
    if (!empresaAtiva) return;
    if (treino.id) {
      const { id, ...data } = treino;
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "treinamentos", id), data);
    } else {
      await addDoc(collection(db, "empresas", empresaAtiva.id, "treinamentos"), treino);
    }
  };
  const excluirTreinamento = (id) => deleteDoc(doc(db, "empresas", empresaAtiva.id, "treinamentos", id));

  // ── Exame actions ──
  const salvarExame = async (exame) => {
    if (!empresaAtiva) return;
    if (exame.id) {
      const { id, ...data } = exame;
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "exames", id), data);
    } else {
      await addDoc(collection(db, "empresas", empresaAtiva.id, "exames"), exame);
    }
  };
  const excluirExame = (id) => deleteDoc(doc(db, "empresas", empresaAtiva.id, "exames", id));

  // ── CAT actions ──
  const registrarCAT = async (cat) => {
    if (!empresaAtiva) return;
    await addDoc(collection(db, "empresas", empresaAtiva.id, "cats"), {
      ...cat, data: serverTimestamp(), status: "Pendente",
    });
  };
  const excluirCAT = (id) => deleteDoc(doc(db, "empresas", empresaAtiva.id, "cats", id));
  const atualizarStatusCAT = async (id, status, protocolo) => {
    await updateDoc(doc(db, "empresas", empresaAtiva.id, "cats", id), { status, protocolo: protocolo || "" });
  };

  // ── Riscos computados ──
  const riscos = useMemo(() => {
    const r = [];
    Object.entries(checklist).forEach(([key, val]) => {
      const [fid, sid] = key.split("__");
      if (!val?.freq || val.freq === "Nunca") return;
      const fator = FATORES.find(f => f.id === fid);
      const setor = setores.find(s => s.id === sid);
      if (!fator || !setor) return;
      const sev = val.sev || "Moderado"; // padrão se não preenchido
      const score = getRiskScore(val.freq, sev);
      const rk = getRiskLabel(score);
      r.push({
        fator: fator.label, cat: fator.cat,
        setor: setor.nome, setorId: sid,
        freq: val.freq, sev,
        score, ...rk, aet: score >= 13,
      });
    });
    return r.sort((a, b) => b.score - a.score);
  }, [checklist, setores]);

  // ── Permissões ──
  const isAdmin   = userProfile?.perfil === "Admin";
  const isGestor  = userProfile?.perfil === "Gestor";
  const isSESMT   = userProfile?.perfil === "SESMT";
  const canEdit          = isAdmin || isGestor || isSESMT; // avaliações/levantamento/setores
  const canCreateEmpresa = isAdmin || isGestor;            // criar empresa
  const canManageUsers   = isAdmin || isGestor;            // painel de usuários

  const value = {
    // Auth
    user, userProfile, loading, loginLoading, loginErr,
    login, logout,
    // Empresas
    empresas, empresaAtiva, loadingEmpresas,
    selecionarEmpresa, voltarSeletor, criarEmpresa, salvarEmpresa,
    // Setores
    setores, salvarSetor, atualizarSetor, excluirSetor,
    // Checklist
    checklist, savingCheck, setCheckField,
    // Usuários
    usuarios, salvarUsuario, criarUsuario, excluirUsuario,
    // Computed
    riscos,
    // Indicadores
    absenteismo, fap, salvarAbsenteismo, excluirAbsenteismo, salvarFAP,
    // Histórico
    historico, savingSnap, criarSnapshot,
    // Permissões
    isAdmin, isGestor, isSESMT, canEdit, canCreateEmpresa, canManageUsers,
    // EPI
    epis, funcionarios, entregas,
    salvarEpi, excluirEpi,
    salvarFuncionario, excluirFuncionario, atualizarCredencialFuncionario,
    registrarEntrega, excluirEntrega,
    // Treinamentos
    treinamentos, salvarTreinamento, excluirTreinamento,
    // PCMSO / eSocial
    exames, cats,
    salvarExame, excluirExame,
    registrarCAT, excluirCAT, atualizarStatusCAT,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
