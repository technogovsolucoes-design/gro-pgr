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
    const updated = { ...(checklist[key] || {}), [field]: val };
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
      r.push({
        fator: fator.label, cat: fator.cat,
        setor: setor.nome, setorId: sid,
        freq: val.freq, sev: val.sev,
        score, ...rk, aet: score >= 13,
      });
    });
    return r.sort((a, b) => b.score - a.score);
  }, [checklist, setores]);

  // ── Permissões ──
  const isAdmin = userProfile?.perfil === "Admin";
  const canEdit = isAdmin || userProfile?.perfil === "SESMT";

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
    isAdmin, canEdit,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
