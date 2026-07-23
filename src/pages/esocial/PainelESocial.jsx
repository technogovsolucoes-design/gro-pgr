import { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C, ESOCIAL_EVENTOS } from "../../constants";
import { db } from "../../firebase";
import {
  collection, onSnapshot, addDoc, updateDoc,
  doc, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import {
  gerarS2240, gerarS2220, MAPA_AGENTES, CATS_S2240,
} from "../../services/esocialXml";

// ── Componentes auxiliares ────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:12, padding:24, width:"100%", maxWidth: wide ? 760 : 500, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <p style={{ fontWeight:700, fontSize:15, margin:0 }}>{title}</p>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Badge({ label, color, bg }) {
  return <span style={{ fontSize:10, fontWeight:600, color, background:bg, borderRadius:12, padding:"2px 8px", whiteSpace:"nowrap" }}>{label}</span>;
}

function StatusBadge({ status }) {
  const map = {
    "Aprovado":    { color:C.green,   bg:"#dcfce7" },
    "Enviado":     { color:"#1d4ed8", bg:"#eff6ff" },
    "Processando": { color:"#7c3aed", bg:"#f5f3ff" },
    "Rejeitado":   { color:C.red,     bg:"#fee2e2" },
    "Erro":        { color:C.red,     bg:"#fee2e2" },
  };
  const s = map[status] || { color:C.amber, bg:"#fef3c7" };
  return <Badge label={status || "Pendente"} {...s} />;
}

function Alerta({ msg }) {
  return (
    <div style={{ background:"#fef3c7", border:`1px solid #fde68a`, borderRadius:8, padding:"8px 12px", marginBottom:14, fontSize:11, color:"#92400e", fontWeight:600 }}>
      ⚠ {msg}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { key:"cert",    label:"🔐 Certificado" },
  { key:"eventos", label:"Visão Geral" },
  { key:"s2240",   label:"S-2240 Cond.Ambientais" },
  { key:"s2220",   label:"S-2220 ASO/Saúde" },
  { key:"cat",     label:"CAT (S-2210)" },
  { key:"s2245",   label:"S-2245 Treinamentos" },
  { key:"hist",    label:"Histórico" },
];

const CAT_VAZIO  = { funcionario:"", tipo:"Acidente Típico", dataAcidente:"", descricao:"", parteAtingida:"" };
const CAT_TIPOS  = ["Acidente Típico","Acidente de Trajeto","Doença Ocupacional"];
const STATUS_OPT = ["Não enviado","Enviado","Aprovado"];

// Lista de todos os agentes eSocial disponíveis para seleção manual
const AGENTES_LISTA = Object.entries(MAPA_AGENTES).map(([nome, meta]) => ({
  nome, cod: meta.cod, unMed: meta.unMed || "", tecMed: meta.tecMed || "",
}));

// ── Componente principal ──────────────────────────────────────────────────────
export default function PainelESocial({ defaultTab }) {
  const {
    cats, exames, treinamentos,
    atualizarStatusCAT, excluirCAT, registrarCAT,
    funcionarios, setores, empresaAtiva,
  } = useApp();

  const initIdx = Math.max(TABS.findIndex(t => t.key === defaultTab), 0);
  const [abaIdx, setAbaIdx] = useState(initIdx);
  const aba = TABS[abaIdx].key;

  // Certificado A1 (sessão apenas — nunca persiste)
  const [cert, setCert]       = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [certSenha, setCertSenha] = useState("");
  const [certLoading, setCertLoading] = useState(false);
  const [certErro, setCertErro] = useState("");
  const fileRef = useRef();

  // Ambiente eSocial
  const [tpAmb, setTpAmb] = useState("2");

  // Histórico de eventos eSocial (Firestore)
  const [eventosHist, setEventosHist] = useState([]);

  // GHEs cadastrados (para sugestão de agentes no S-2240)
  const [ghes, setGhes] = useState([]);

  // S-2240 state
  const [s2240SetorId, setS2240SetorId]     = useState("");
  const [s2240FuncId,  setS2240FuncId]      = useState("");
  const [s2240Agentes, setS2240Agentes]     = useState([]);  // agentes selecionados
  const [s2240AgSel,   setS2240AgSel]       = useState("");  // nome do agente a adicionar
  const [s2240XmlModal, setS2240XmlModal]   = useState("");
  const [s2240Sending,  setS2240Sending]    = useState(false);

  // S-2220 state
  const [s2220Extras, setS2220Extras] = useState({});
  const [s2220Sending, setS2220Sending] = useState(null);
  const [s2220XmlModal, setS2220XmlModal] = useState("");

  // CAT state
  const [catModal, setCatModal]   = useState(false);
  const [catForm,  setCatForm]    = useState({ ...CAT_VAZIO });
  const [protModal, setProtModal] = useState(false);
  const [prot, setProt]           = useState({ id:"", value:"" });
  const [saving, setSaving]       = useState(false);

  // ── Carregar histórico eSocial ───────────────────────────────────────────
  useEffect(() => {
    if (!empresaAtiva) { setEventosHist([]); return; }
    const q = query(
      collection(db, "empresas", empresaAtiva.id, "esocial_eventos"),
      orderBy("criadoEm", "desc")
    );
    const unsub = onSnapshot(q, snap =>
      setEventosHist(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    );
    return unsub;
  }, [empresaAtiva]);

  // ── Carregar GHEs para sugestão de agentes ──────────────────────────────
  useEffect(() => {
    if (!empresaAtiva) { setGhes([]); return; }
    const q = query(collection(db, "empresas", empresaAtiva.id, "ghe"), orderBy("nome"));
    const unsub = onSnapshot(q, snap =>
      setGhes(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    );
    return unsub;
  }, [empresaAtiva]);

  // ── Ações certificado ───────────────────────────────────────────────────
  async function carregarCert() {
    if (!certFile || !certSenha) { setCertErro("Selecione o arquivo e informe a senha."); return; }
    setCertLoading(true); setCertErro("");
    try {
      const buf  = await certFile.arrayBuffer();
      const b64  = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const resp = await fetch("/api/esocial-operacoes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ acao:"validarCert", pfxBase64:b64, pfxSenha:certSenha }),
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.erro || "Falha ao validar certificado");
      setCert({ ...data, pfxBase64:b64, pfxSenha:certSenha });
    } catch (e) {
      setCertErro(e.message);
    }
    setCertLoading(false);
  }

  // ── S-2240: adicionar / remover agente ──────────────────────────────────
  function adicionarAgente() {
    if (!s2240AgSel) return;
    if (s2240Agentes.find(a => a.nome === s2240AgSel)) return;
    const meta = MAPA_AGENTES[s2240AgSel] || {};
    setS2240Agentes(p => [...p, {
      nome:         s2240AgSel,
      codEsocial:   meta.cod || "",
      intensidade:  "",
      unidade:      meta.unMed  || "",
      tecMed:       meta.tecMed || "",
      limTol:       "",
      epcEficaz:    false,
      epiEficaz:    true,
      causaAposent: false,
    }]);
    setS2240AgSel("");
  }

  function removerAgente(nome) {
    setS2240Agentes(p => p.filter(a => a.nome !== nome));
  }

  function editAgente(nome, field, value) {
    setS2240Agentes(p => p.map(a => a.nome === nome ? { ...a, [field]: value } : a));
  }

  // ── S-2240: gerar XML / enviar ───────────────────────────────────────────
  function gerarXmlS2240() {
    if (!empresaAtiva || !s2240SetorId || !s2240FuncId || !s2240Agentes.length) return;
    const func = funcionarios.find(f => f.id === s2240FuncId);
    const set  = setores.find(s => s.id === s2240SetorId);
    const xml  = gerarS2240({ empresa:empresaAtiva, funcionario:func, setor:set, agentes:s2240Agentes, tpAmb });
    setS2240XmlModal(xml);
  }

  async function enviarS2240() {
    if (!cert) { alert("Carregue o certificado digital antes de enviar."); setAbaIdx(0); return; }
    if (!empresaAtiva || !s2240SetorId || !s2240FuncId || !s2240Agentes.length) return;
    setS2240Sending(true);
    const func = funcionarios.find(f => f.id === s2240FuncId);
    const set  = setores.find(s => s.id === s2240SetorId);
    const xml  = gerarS2240({ empresa:empresaAtiva, funcionario:func, setor:set, agentes:s2240Agentes, tpAmb });
    try {
      const resp = await fetch("/api/esocial-operacoes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ acao:"enviar", xmlString:xml, pfxBase64:cert.pfxBase64, pfxSenha:cert.pfxSenha, tpAmb, cnpj:empresaAtiva.cnpj }),
      });
      const data = await resp.json();
      await salvarEvento({ tipo:"S-2240", status: data.ok ? "Enviado" : "Rejeitado", protocolo:data.protocolo, cdResposta:data.cdResposta, descResposta:data.descResposta, tpAmb, funcionario:func.nome, setor:set.nome });
      alert(data.ok ? `S-2240 enviado! Protocolo: ${data.protocolo}` : `Erro: ${data.descResposta || data.erro}`);
    } catch (e) {
      await salvarEvento({ tipo:"S-2240", status:"Erro", descResposta:e.message, tpAmb, funcionario:func?.nome });
      alert("Erro ao enviar: " + e.message);
    }
    setS2240Sending(false);
  }

  // ── S-2220: enviar ──────────────────────────────────────────────────────
  async function enviarS2220(exame) {
    if (!cert) { alert("Carregue o certificado digital antes de enviar."); setAbaIdx(0); return; }
    const extras = s2220Extras[exame.id] || {};
    const func   = funcionarios.find(f => f.nome === (exame.funcionario || exame.funcionarioNome)) || {};
    const cpf    = extras.cpf || func.cpf || "";
    if (!cpf) { alert("CPF do funcionário é obrigatório para S-2220. Preencha o campo CPF."); return; }
    setS2220Sending(exame.id);
    const funcData  = { ...func, cpf, matricula: extras.matricula || func.matricula || "" };
    const exameData = { ...exame, ...extras };
    const xml = gerarS2220({ empresa:empresaAtiva, funcionario:funcData, exame:exameData, tpAmb });
    try {
      const resp = await fetch("/api/esocial-operacoes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ acao:"enviar", xmlString:xml, pfxBase64:cert.pfxBase64, pfxSenha:cert.pfxSenha, tpAmb, cnpj:empresaAtiva.cnpj }),
      });
      const data = await resp.json();
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "exames", exame.id), {
        statusESocial:   data.ok ? "Enviado" : "Não enviado",
        protocoloESocial: data.protocolo || "",
      });
      await salvarEvento({ tipo:"S-2220", status: data.ok ? "Enviado" : "Rejeitado", protocolo:data.protocolo, cdResposta:data.cdResposta, descResposta:data.descResposta, tpAmb, funcionario: funcData.nome });
      alert(data.ok ? `S-2220 enviado! Protocolo: ${data.protocolo}` : `Erro: ${data.descResposta || data.erro}`);
    } catch (e) {
      await salvarEvento({ tipo:"S-2220", status:"Erro", descResposta:e.message, tpAmb, funcionario: func.nome });
      alert("Erro ao enviar: " + e.message);
    }
    setS2220Sending(null);
  }

  // ── Consultar status de lote ────────────────────────────────────────────
  async function consultarStatus(evento) {
    if (!cert) { alert("Carregue o certificado digital para consultar."); return; }
    if (!evento.protocolo) { alert("Evento sem protocolo."); return; }
    try {
      const resp = await fetch("/api/esocial-operacoes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ acao:"consultar", protocolo:evento.protocolo, pfxBase64:cert.pfxBase64, pfxSenha:cert.pfxSenha, tpAmb }),
      });
      const data = await resp.json();
      const cdOcorr   = data.data?.match(/<cdOcorr>(\d+)<\/cdOcorr>/)?.[1];
      const novoStatus = cdOcorr === "0" ? "Aprovado" : cdOcorr ? "Rejeitado" : "Processando";
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "esocial_eventos", evento.id), {
        status: novoStatus, atualizadoEm: serverTimestamp(),
      });
    } catch (e) {
      alert("Erro ao consultar: " + e.message);
    }
  }

  async function salvarEvento(dados) {
    if (!empresaAtiva) return;
    await addDoc(collection(db, "empresas", empresaAtiva.id, "esocial_eventos"), {
      ...dados, criadoEm: serverTimestamp(),
    });
  }

  // ── Ações CAT ───────────────────────────────────────────────────────────
  const sf = (k, v) => setCatForm(p => ({ ...p, [k]:v }));

  async function salvarCAT() {
    if (!catForm.funcionario || !catForm.dataAcidente) return;
    setSaving(true);
    await registrarCAT(catForm);
    setSaving(false); setCatModal(false); setCatForm({ ...CAT_VAZIO });
  }

  async function confirmarEnvioCAT() {
    await atualizarStatusCAT(prot.id, "Enviado", prot.value);
    setProtModal(false);
  }

  async function atualizarStatusItem(colecao, itemId, status) {
    if (!empresaAtiva) return;
    await updateDoc(doc(db, "empresas", empresaAtiva.id, colecao, itemId), { statusESocial:status });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  const examesPendentes = exames.filter(e => !e.statusESocial || e.statusESocial === "Não enviado");
  const pendTotal = examesPendentes.length + cats.filter(c => !c.status || c.status === "Pendente").length;

  // GHEs do setor selecionado — para sugestão de agentes
  const ghesDoSetor = s2240SetorId
    ? ghes.filter(g => !g.setorId || g.setorId === s2240SetorId)
    : [];

  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div>
      {/* ── Barra de ambiente ────────────────────────────────────── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {cert
            ? <span style={{ fontSize:11, fontWeight:600, color:C.green }}>🔐 {cert.nome} · val. {cert.validade}</span>
            : <span style={{ fontSize:11, color:C.muted }}>Sem certificado carregado</span>}
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <span style={{ fontSize:11, color:C.muted }}>Ambiente:</span>
          <select value={tpAmb} onChange={e => setTpAmb(e.target.value)}
            style={{ padding:"3px 8px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:11, fontFamily:"inherit" }}>
            <option value="2">Homologação (testes)</option>
            <option value="1">Produção</option>
          </select>
          {pendTotal > 0 && (
            <span style={{ background:C.red, color:"#fff", borderRadius:12, padding:"2px 8px", fontSize:10, fontWeight:700 }}>
              {pendTotal} pendente{pendTotal>1?"s":""}
            </span>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:20, overflowX:"auto", gap:2 }}>
        {TABS.map((t, i) => (
          <button key={t.key} onClick={() => setAbaIdx(i)}
            style={{ padding:"9px 14px", border:"none", background:"none", cursor:"pointer", fontSize:11.5, fontWeight:600,
              color: abaIdx===i ? C.navyMid : C.gray, borderBottom: abaIdx===i ? `2px solid ${C.navyMid}` : "2px solid transparent",
              whiteSpace:"nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════ Tab: CERTIFICADO ═════════════════════════ */}
      {aba === "cert" && (
        <div style={{ maxWidth:520 }}>
          <Card>
            <p style={{ fontWeight:700, fontSize:14, margin:"0 0 6px" }}>Certificado Digital A1</p>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 16px", lineHeight:1.6 }}>
              Carregue o arquivo <strong>.pfx / .p12</strong> da empresa. O certificado fica na memória desta sessão e <strong>nunca é gravado no servidor</strong>.
            </p>

            {cert && (
              <div style={{ background:"#dcfce7", border:`1px solid #86efac`, borderRadius:8, padding:"10px 14px", marginBottom:14 }}>
                <p style={{ margin:0, fontSize:12, fontWeight:600, color:C.green }}>✅ Certificado carregado</p>
                <p style={{ margin:"4px 0 0", fontSize:11, color:C.muted }}>{cert.nome} · CNPJ: {cert.cnpj} · Validade: {cert.validade}</p>
                {cert.expirado && <p style={{ margin:"4px 0 0", fontSize:11, color:C.red, fontWeight:600 }}>⚠ CERTIFICADO VENCIDO</p>}
              </div>
            )}

            <div style={{ marginBottom:12 }}>
              <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Arquivo .pfx / .p12</p>
              <input ref={fileRef} type="file" accept=".pfx,.p12"
                onChange={e => { setCertFile(e.target.files[0]); setCert(null); setCertErro(""); }}
                style={{ fontSize:12 }} />
            </div>

            <Input label="Senha do certificado" type="password" value={certSenha}
              onChange={v => { setCertSenha(v); setCertErro(""); }} placeholder="Senha do arquivo PFX" />

            {certErro && <p style={{ color:C.red, fontSize:11, margin:"0 0 10px" }}>❌ {certErro}</p>}

            <div style={{ display:"flex", gap:8 }}>
              <Btn disabled={!certFile || !certSenha || certLoading} onClick={carregarCert}>
                {certLoading ? "Validando…" : "Carregar Certificado"}
              </Btn>
              {cert && (
                <Btn outline color={C.gray} onClick={() => { setCert(null); setCertSenha(""); setCertFile(null); if(fileRef.current) fileRef.current.value=""; }}>
                  Remover
                </Btn>
              )}
            </div>
          </Card>

          <Card style={{ marginTop:12, background:"#f8fafc" }}>
            <p style={{ fontWeight:700, fontSize:12, margin:"0 0 8px" }}>Sobre certificado A3</p>
            <p style={{ fontSize:11, color:C.muted, margin:0, lineHeight:1.7 }}>
              Certificados A3 (token/smartcard) exigem software local e não podem ser usados via browser diretamente.
              Para A3, use os botões <em>Ver XML</em> nas abas S-2240/S-2220 para baixar o arquivo e enviar manualmente no{" "}
              <a href="https://portal.esocial.gov.br" target="_blank" rel="noreferrer" style={{ color:C.navyMid }}>portal.esocial.gov.br</a>.
            </p>
          </Card>
        </div>
      )}

      {/* ══════════════════════ Tab: VISÃO GERAL ═════════════════════════ */}
      {aba === "eventos" && (
        <div>
          <p style={{ fontWeight:700, fontSize:14, margin:"0 0 16px" }}>Painel eSocial SST</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {[
              { ev:ESOCIAL_EVENTOS[0], count:cats.length,      tabKey:"cat",   cor:C.red    },
              { ev:ESOCIAL_EVENTOS[1], count:exames.length,    tabKey:"s2220", cor:C.green  },
              { ev:ESOCIAL_EVENTOS[2], count:ghes.length,      tabKey:"s2240", cor:"#2563eb" },
              { ev:ESOCIAL_EVENTOS[3], count:treinamentos.length, tabKey:"s2245", cor:C.amber },
            ].map(({ ev, count, tabKey, cor }) => (
              <Card key={ev.id} style={{ borderLeft:`4px solid ${cor}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <div>
                    <p style={{ fontWeight:700, fontSize:13, margin:0 }}>{ev.id}</p>
                    <p style={{ fontSize:10, color:C.muted, margin:"2px 0 0" }}>{ev.nome.split("—")[1]?.trim()}</p>
                  </div>
                  <span style={{ fontSize:22, fontWeight:800, color:cor }}>{count}</span>
                </div>
                <p style={{ fontSize:10, color:C.muted, margin:"0 0 10px", background:C.bg, padding:"3px 8px", borderRadius:6 }}>
                  Prazo: {ev.prazo}
                </p>
                <Btn small onClick={() => setAbaIdx(TABS.findIndex(t => t.key === tabKey))}>Ver</Btn>
              </Card>
            ))}
          </div>

          {pendTotal > 0 && (
            <Card style={{ marginTop:16, borderLeft:`4px solid ${C.red}`, background:"#fff5f5" }}>
              <p style={{ fontWeight:700, fontSize:13, color:C.red, margin:"0 0 8px" }}>⚠ Pendências</p>
              {examesPendentes.length > 0 && (
                <p style={{ fontSize:12, margin:"0 0 4px" }}>• {examesPendentes.length} ASO(s) sem S-2220 enviado</p>
              )}
              {cats.filter(c => !c.status || c.status==="Pendente").length > 0 && (
                <p style={{ fontSize:12, margin:0 }}>• {cats.filter(c => !c.status || c.status==="Pendente").length} CAT(s) sem envio</p>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ══════════════════════ Tab: S-2240 ══════════════════════════════ */}
      {aba === "s2240" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card style={{ borderLeft:`4px solid #2563eb`, background:"#eff6ff" }}>
            <p style={{ fontWeight:700, fontSize:12, margin:"0 0 4px", color:"#1d4ed8" }}>S-2240 — Condições Ambientais do Trabalho (Agentes Nocivos)</p>
            <p style={{ fontSize:11, color:C.text, margin:0 }}>
              Reporta exposição a agentes <strong>físicos</strong> (ruído, calor, vibração…), <strong>químicos</strong> (benzeno, poeiras…) e <strong>biológicos</strong> (bactérias, vírus…).
              Selecione os agentes do catálogo eSocial abaixo.
            </p>
          </Card>

          {!cert && <Alerta msg="Carregue o certificado (aba Certificado) para envio direto. Ou use 'Ver XML' para download manual." />}

          <Card>
            <p style={{ fontWeight:700, fontSize:14, margin:"0 0 14px" }}>Configurar evento S-2240</p>

            {/* Seletor de setor */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Setor / GHE</p>
                <select value={s2240SetorId} onChange={e => { setS2240SetorId(e.target.value); setS2240Agentes([]); }}
                  style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
                  <option value="">Selecione o setor...</option>
                  {setores.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Funcionário</p>
                <select value={s2240FuncId} onChange={e => setS2240FuncId(e.target.value)}
                  style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
                  <option value="">Selecione o funcionário...</option>
                  {funcionarios.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nome}{f.cpf ? "" : " ⚠ sem CPF"}
                    </option>
                  ))}
                </select>
                {s2240FuncId && !funcionarios.find(f => f.id === s2240FuncId)?.cpf && (
                  <p style={{ fontSize:10, color:C.red, margin:"2px 0 0" }}>⚠ Funcionário sem CPF — preencha no cadastro</p>
                )}
              </div>
            </div>

            {/* GHEs do setor — sugestão de agentes */}
            {s2240SetorId && ghesDoSetor.length > 0 && (
              <div style={{ marginBottom:12, background:"#f0f9ff", borderRadius:8, padding:"8px 12px", border:`1px solid #bae6fd` }}>
                <p style={{ fontSize:11, fontWeight:600, color:"#0369a1", margin:"0 0 4px" }}>GHEs cadastrados neste setor:</p>
                {ghesDoSetor.map(g => (
                  <p key={g.id} style={{ fontSize:11, color:C.text, margin:"2px 0 0" }}>
                    <strong>{g.nome}:</strong> {g.agentes || "sem agentes descritos"}
                  </p>
                ))}
                <p style={{ fontSize:10, color:C.muted, margin:"6px 0 0" }}>Use como referência para selecionar os agentes abaixo.</p>
              </div>
            )}

            {/* Seletor de agente */}
            <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"flex-end" }}>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Adicionar agente nocivo</p>
                <select value={s2240AgSel} onChange={e => setS2240AgSel(e.target.value)}
                  style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
                  <option value="">Selecione o agente...</option>
                  {AGENTES_LISTA.filter(a => !s2240Agentes.find(x => x.nome === a.nome)).map(a => (
                    <option key={a.nome} value={a.nome}>{a.nome} ({a.cod})</option>
                  ))}
                </select>
              </div>
              <Btn onClick={adicionarAgente} disabled={!s2240AgSel}>Adicionar</Btn>
            </div>

            {/* Tabela de agentes selecionados */}
            {s2240Agentes.length > 0 && (
              <div style={{ marginBottom:14, overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <thead>
                    <tr style={{ background:C.bg }}>
                      {["Agente","Código","Intensidade","Unidade","EPC eficaz","EPI eficaz","Causa aposent.",""].map((h,i) => (
                        <th key={i} style={{ padding:"6px 8px", textAlign:"left", fontWeight:600, color:C.muted, whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s2240Agentes.map(ag => (
                      <tr key={ag.nome} style={{ borderTop:`1px solid ${C.border}` }}>
                        <td style={{ padding:"6px 8px", fontWeight:600 }}>{ag.nome}</td>
                        <td style={{ padding:"6px 8px", fontFamily:"monospace" }}>{ag.codEsocial || <span style={{ color:C.red }}>sem código</span>}</td>
                        <td style={{ padding:"4px 6px" }}>
                          <input value={ag.intensidade} onChange={e => editAgente(ag.nome, "intensidade", e.target.value)}
                            style={{ width:70, padding:"3px 6px", border:`1px solid ${C.border}`, borderRadius:4, fontSize:11 }} placeholder="ex: 87" />
                        </td>
                        <td style={{ padding:"6px 8px", color:C.muted }}>{ag.unidade}</td>
                        {["epcEficaz","epiEficaz","causaAposent"].map(field => (
                          <td key={field} style={{ padding:"4px 6px" }}>
                            <select value={ag[field] ? "S" : "N"} onChange={e => editAgente(ag.nome, field, e.target.value === "S")}
                              style={{ padding:"3px 6px", border:`1px solid ${C.border}`, borderRadius:4, fontSize:11, fontFamily:"inherit" }}>
                              <option value="N">Não</option>
                              <option value="S">Sim</option>
                            </select>
                          </td>
                        ))}
                        <td style={{ padding:"4px 6px" }}>
                          <button onClick={() => removerAgente(ag.nome)}
                            style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:13, fontWeight:700 }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Btn outline disabled={!s2240SetorId || !s2240FuncId || !s2240Agentes.length} onClick={gerarXmlS2240}>
                Ver XML
              </Btn>
              <Btn disabled={!s2240SetorId || !s2240FuncId || !s2240Agentes.length || s2240Sending} onClick={enviarS2240}>
                {s2240Sending ? "Enviando…" : "Enviar ao eSocial"}
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════ Tab: S-2220 ══════════════════════════════ */}
      {aba === "s2220" && (
        <Card>
          <div style={{ marginBottom:14 }}>
            <p style={{ fontWeight:700, fontSize:14, margin:0 }}>S-2220 — Monitoramento da Saúde do Trabalhador (ASO)</p>
            <p style={{ fontSize:11, color:C.muted, margin:"2px 0 0" }}>Prazo: até dia 15 do mês seguinte</p>
          </div>

          {!cert && <Alerta msg="Carregue o certificado para envio automático. Ou use 'Ver XML' para download." />}

          {exames.length === 0 ? (
            <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>
              Nenhum exame registrado. Cadastre no módulo PCMSO / Medicina.
            </p>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr style={{ background:C.bg }}>
                    {["Funcionário","Tipo","Data","Resultado","CPF","Status eSocial","Ação"].map((h,i) => (
                      <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exames.map(ex => {
                    const func   = funcionarios.find(f => f.nome === (ex.funcionario || ex.funcionarioNome)) || {};
                    const extras = s2220Extras[ex.id] || {};
                    const cpf    = extras.cpf || func.cpf || "";
                    const dtStr  = ex.data?.seconds
                      ? new Date(ex.data.seconds*1000).toLocaleDateString("pt-BR")
                      : ex.data ? new Date(ex.data+"T12:00:00").toLocaleDateString("pt-BR") : "—";
                    return (
                      <tr key={ex.id} style={{ borderTop:`1px solid ${C.border}` }}>
                        <td style={{ padding:"8px 10px", fontWeight:600 }}>{ex.funcionario || ex.funcionarioNome || "—"}</td>
                        <td style={{ padding:"8px 10px" }}>{ex.tipo || "—"}</td>
                        <td style={{ padding:"8px 10px", whiteSpace:"nowrap" }}>{dtStr}</td>
                        <td style={{ padding:"8px 10px" }}>{ex.resultado || "—"}</td>
                        <td style={{ padding:"6px 8px" }}>
                          {cpf
                            ? <span style={{ fontFamily:"monospace", fontSize:10 }}>{cpf}</span>
                            : <input placeholder="000.000.000-00"
                                value={extras.cpf || ""}
                                onChange={e => setS2220Extras(p => ({ ...p, [ex.id]: { ...p[ex.id], cpf:e.target.value } }))}
                                style={{ width:110, padding:"3px 6px", border:`1px solid ${C.red}`, borderRadius:4, fontSize:10 }} />
                          }
                        </td>
                        <td style={{ padding:"8px 10px" }}>
                          <StatusBadge status={ex.statusESocial || "Não enviado"} />
                        </td>
                        <td style={{ padding:"6px 8px" }}>
                          <div style={{ display:"flex", gap:4 }}>
                            <button onClick={() => {
                              const fn = { ...func, cpf: extras.cpf || func.cpf || "", matricula: extras.matricula || func.matricula || "" };
                              const xml = gerarS2220({ empresa:empresaAtiva, funcionario:fn, exame:{ ...ex, ...extras }, tpAmb });
                              setS2220XmlModal(xml);
                            }} style={{ background:"#eff6ff", border:`1px solid #bfdbfe`, borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:10, color:"#1d4ed8", fontWeight:600 }}>
                              Ver XML
                            </button>
                            <button disabled={s2220Sending === ex.id} onClick={() => enviarS2220(ex)}
                              style={{ background: s2220Sending===ex.id ? C.bg : "#dcfce7", border:`1px solid #86efac`, borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:10, color:C.green, fontWeight:600 }}>
                              {s2220Sending===ex.id ? "…" : "Enviar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ══════════════════════ Tab: CAT (S-2210) ════════════════════════ */}
      {aba === "cat" && (
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <p style={{ fontWeight:700, fontSize:14, margin:0 }}>CAT — S-2210</p>
              <p style={{ fontSize:11, color:C.muted, margin:"2px 0 0" }}>Prazo: até o 1º dia útil seguinte ao acidente</p>
            </div>
            <Btn onClick={() => setCatModal(true)}>+ Nova CAT</Btn>
          </div>

          {cats.length === 0 ? (
            <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>Nenhuma CAT registrada.</p>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:C.bg }}>
                  {["Funcionário","Tipo","Data","Status","Protocolo","Ações"].map((h,i) => (
                    <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cats.map(cat => (
                  <tr key={cat.id} style={{ borderTop:`1px solid ${C.border}` }}>
                    <td style={{ padding:"9px 10px", fontWeight:600 }}>{cat.funcionario}</td>
                    <td style={{ padding:"9px 10px" }}>{cat.tipo}</td>
                    <td style={{ padding:"9px 10px", whiteSpace:"nowrap" }}>
                      {cat.dataAcidente ? new Date(cat.dataAcidente+"T12:00:00").toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td style={{ padding:"9px 10px" }}>
                      <StatusBadge status={cat.status === "Enviado" ? "Enviado" : "Pendente"} />
                    </td>
                    <td style={{ padding:"9px 10px", color:C.muted, fontSize:11 }}>{cat.protocolo || "—"}</td>
                    <td style={{ padding:"9px 10px" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        {cat.status !== "Enviado" && (
                          <button onClick={() => { setProt({ id:cat.id, value:cat.protocolo||"" }); setProtModal(true); }}
                            style={{ background:"#eff6ff", border:`1px solid #bfdbfe`, borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:11, color:"#1d4ed8", fontWeight:600 }}>
                            Marcar enviado
                          </button>
                        )}
                        <button onClick={() => { if (confirm("Excluir esta CAT?")) excluirCAT(cat.id); }}
                          style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:11, fontWeight:600 }}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ══════════════════════ Tab: S-2245 ══════════════════════════════ */}
      {aba === "s2245" && (
        <Card>
          <div style={{ marginBottom:14 }}>
            <p style={{ fontWeight:700, fontSize:14, margin:0 }}>S-2245 — Treinamentos e Capacitações</p>
            <p style={{ fontSize:11, color:C.muted, margin:"2px 0 0" }}>Prazo: até dia 15 do mês seguinte</p>
          </div>

          {treinamentos.length === 0 ? (
            <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>Nenhum treinamento cadastrado.</p>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:C.bg }}>
                  {["Treinamento","NR/Tema","Data","C/H","Status eSocial","Ação"].map((h,i) => (
                    <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {treinamentos.map(tr => (
                  <tr key={tr.id} style={{ borderTop:`1px solid ${C.border}` }}>
                    <td style={{ padding:"9px 10px", fontWeight:600 }}>{tr.nome}</td>
                    <td style={{ padding:"9px 10px" }}>{tr.nr || "—"}</td>
                    <td style={{ padding:"9px 10px", whiteSpace:"nowrap" }}>
                      {tr.data ? new Date(tr.data+"T12:00:00").toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td style={{ padding:"9px 10px" }}>{tr.cargaHoraria ? `${tr.cargaHoraria}h` : "—"}</td>
                    <td style={{ padding:"9px 10px" }}>
                      <StatusBadge status={tr.statusESocial || "Não enviado"} />
                    </td>
                    <td style={{ padding:"9px 10px" }}>
                      <select value={tr.statusESocial || "Não enviado"}
                        onChange={e => atualizarStatusItem("treinamentos", tr.id, e.target.value)}
                        style={{ padding:"5px 8px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:11, fontFamily:"inherit" }}>
                        {STATUS_OPT.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ══════════════════════ Tab: HISTÓRICO ═══════════════════════════ */}
      {aba === "hist" && (
        <Card>
          <p style={{ fontWeight:700, fontSize:14, margin:"0 0 14px" }}>Histórico de Eventos eSocial</p>

          {eventosHist.length === 0 ? (
            <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>Nenhum evento enviado ainda.</p>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:C.bg }}>
                    {["Tipo","Funcionário","Setor","Protocolo","Status","Ambiente","Data","Ação"].map((h,i) => (
                      <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eventosHist.map(ev => (
                    <tr key={ev.id} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"8px 10px", fontWeight:700, fontFamily:"monospace", color:C.navyMid }}>{ev.tipo}</td>
                      <td style={{ padding:"8px 10px" }}>{ev.funcionario || "—"}</td>
                      <td style={{ padding:"8px 10px" }}>{ev.setor || "—"}</td>
                      <td style={{ padding:"8px 10px", fontFamily:"monospace", fontSize:10, color:C.muted }}>{ev.protocolo || "—"}</td>
                      <td style={{ padding:"8px 10px" }}><StatusBadge status={ev.status} /></td>
                      <td style={{ padding:"8px 10px" }}>
                        <Badge label={ev.tpAmb==="1" ? "Produção" : "Hom."} color={ev.tpAmb==="1" ? C.green : C.amber} bg={ev.tpAmb==="1" ? "#dcfce7" : "#fef3c7"} />
                      </td>
                      <td style={{ padding:"8px 10px", whiteSpace:"nowrap", fontSize:10, color:C.muted }}>
                        {ev.criadoEm?.seconds ? new Date(ev.criadoEm.seconds*1000).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td style={{ padding:"8px 10px" }}>
                        {ev.protocolo && (
                          <button onClick={() => consultarStatus(ev)}
                            style={{ background:"#eff6ff", border:`1px solid #bfdbfe`, borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:10, color:"#1d4ed8", fontWeight:600 }}>
                            Atualizar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ══════════════════════ Modais ═══════════════════════════════════ */}

      {/* Modal: Nova CAT */}
      {catModal && (
        <Modal title="Nova CAT — S-2210" onClose={() => setCatModal(false)}>
          <Alerta msg="Prazo: até o 1º dia útil após o acidente." />
          <Input label="Funcionário *" value={catForm.funcionario} onChange={v => sf("funcionario",v)} />
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Tipo de Acidente</p>
            <select value={catForm.tipo} onChange={e => sf("tipo",e.target.value)}
              style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
              {CAT_TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <Input label="Data do Acidente *" value={catForm.dataAcidente} onChange={v => sf("dataAcidente",v)} type="date" />
          <Input label="Parte do Corpo Atingida" value={catForm.parteAtingida} onChange={v => sf("parteAtingida",v)} />
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Descrição</p>
            <textarea value={catForm.descricao} onChange={e => sf("descricao",e.target.value)} rows={3}
              style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }} />
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn outline onClick={() => setCatModal(false)}>Cancelar</Btn>
            <Btn disabled={!catForm.funcionario || !catForm.dataAcidente || saving} onClick={salvarCAT}>
              {saving ? "Salvando…" : "Registrar CAT"}
            </Btn>
          </div>
        </Modal>
      )}

      {/* Modal: Protocolo CAT */}
      {protModal && (
        <Modal title="Marcar CAT como Enviada" onClose={() => setProtModal(false)}>
          <p style={{ fontSize:12, color:C.muted, marginBottom:14 }}>Informe o número de protocolo do eSocial.</p>
          <Input label="Protocolo eSocial" value={prot.value} onChange={v => setProt(p => ({ ...p, value:v }))} placeholder="1.2.202401.0000001" />
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn outline onClick={() => setProtModal(false)}>Cancelar</Btn>
            <Btn onClick={confirmarEnvioCAT}>Confirmar</Btn>
          </div>
        </Modal>
      )}

      {/* Modal: XML preview */}
      {(s2240XmlModal || s2220XmlModal) && (
        <Modal title={s2240XmlModal ? "XML — S-2240" : "XML — S-2220"} onClose={() => { setS2240XmlModal(""); setS2220XmlModal(""); }} wide>
          <p style={{ fontSize:11, color:C.muted, marginBottom:8 }}>
            Copie ou baixe o XML para envio no <a href="https://portal.esocial.gov.br" target="_blank" rel="noreferrer" style={{ color:C.navyMid }}>portal.esocial.gov.br</a>.
          </p>
          <pre style={{ background:C.bg, borderRadius:8, padding:12, fontSize:10, overflowX:"auto", maxHeight:380, margin:"0 0 12px", whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
            {s2240XmlModal || s2220XmlModal}
          </pre>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={() => {
              const xml  = s2240XmlModal || s2220XmlModal;
              const tipo = s2240XmlModal ? "S-2240" : "S-2220";
              const a    = document.createElement("a");
              a.href     = URL.createObjectURL(new Blob([xml], { type:"application/xml" }));
              a.download = `${tipo}_${new Date().toISOString().slice(0,10)}.xml`;
              a.click();
            }}>Baixar XML</Btn>
            <Btn outline onClick={() => navigator.clipboard.writeText(s2240XmlModal || s2220XmlModal)}>Copiar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
