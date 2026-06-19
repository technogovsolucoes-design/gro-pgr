import { useState } from "react";
import {
  HardHat, Package, Users, Plus, Trash2, Edit2, CheckCircle,
  AlertTriangle, Fingerprint, X, ShieldCheck, ClipboardList,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { Btn, Card, Input } from "../components/ui";
import { C, EPI_TIPOS, EPI_MOTIVOS } from "../constants";

// ── WebAuthn helpers ────────────────────────────────────────────────────────
const buf2b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const b64toBuf = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;

async function registrarBiometria(funcId, nome, cpf) {
  if (!navigator.credentials?.create) throw new Error("WebAuthn não suportado neste dispositivo.");
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "NEXUS SST", id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(funcId),
        name: cpf || funcId,
        displayName: nome,
      },
      pubKeyCredParams: [
        { alg: -7,   type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      authenticatorSelection: { userVerification: "required", residentKey: "preferred" },
      timeout: 60000,
    },
  });
  return buf2b64(credential.rawId);
}

async function autenticarBiometria(credentialId) {
  if (!navigator.credentials?.get) throw new Error("WebAuthn não suportado.");
  await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: "public-key", id: b64toBuf(credentialId) }],
      userVerification: "required",
      timeout: 60000,
    },
  });
}

// ── CA validity ─────────────────────────────────────────────────────────────
function caStatus(validadeCa) {
  if (!validadeCa) return { label: "Sem data", color: C.gray, bg: "#f1f5f9" };
  const dias = Math.floor((new Date(validadeCa + "T12:00:00") - new Date()) / 86400000);
  if (dias < 0)   return { label: "CA Vencido",         color: C.red,   bg: "#fee2e2" };
  if (dias <= 90) return { label: `Vence em ${dias}d`,  color: C.amber, bg: "#fef3c7" };
  return             { label: "CA Válido",              color: C.green, bg: "#dcfce7" };
}

const VAZIO_EPI  = { nome:"", tipo:"", ca:"", fabricante:"", validadeCa:"", descricao:"" };
const VAZIO_FUNC = { nome:"", cpf:"", matricula:"", cargo:"", setorId:"", ativo:true };
const VAZIO_ENT  = { funcionarioId:"", epiId:"", quantidade:1, motivo:"1ª via", observacoes:"" };

// ── Modal genérico ───────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:12, padding:24, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <p style={{ fontWeight:700, fontSize:15, margin:0 }}>{title}</p>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.gray }}><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Badge({ label, color, bg }) {
  return <span style={{ fontSize:10, fontWeight:600, color, background:bg, borderRadius:12, padding:"2px 8px", whiteSpace:"nowrap" }}>{label}</span>;
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function GestaoEPI() {
  const {
    setores, epis, funcionarios, entregas,
    salvarEpi, excluirEpi,
    salvarFuncionario, excluirFuncionario, atualizarCredencialFuncionario,
    registrarEntrega, excluirEntrega,
  } = useApp();

  const [aba, setAba] = useState(0);

  // EPI modal
  const [epiModal, setEpiModal]   = useState(false);
  const [epiForm, setEpiForm]     = useState(VAZIO_EPI);
  const [epiSaving, setEpiSaving] = useState(false);

  // Funcionário modal
  const [funcModal, setFuncModal]   = useState(false);
  const [funcForm, setFuncForm]     = useState(VAZIO_FUNC);
  const [funcSaving, setFuncSaving] = useState(false);

  // Entrega
  const [entForm, setEntForm]         = useState(VAZIO_ENT);
  const [autenticado, setAutenticado] = useState(false);
  const [bioStatus, setBioStatus]     = useState("");
  const [entSaving, setEntSaving]     = useState(false);

  // KPIs
  const hoje = new Date();
  const caVencendo = epis.filter(e => {
    if (!e.validadeCa) return false;
    const dias = Math.floor((new Date(e.validadeCa + "T12:00:00") - hoje) / 86400000);
    return dias >= 0 && dias <= 90;
  }).length;
  const caVencidos = epis.filter(e => {
    if (!e.validadeCa) return false;
    return new Date(e.validadeCa + "T12:00:00") < hoje;
  }).length;
  const bioRegistrados = funcionarios.filter(f => f.credentialId).length;
  const mesAtual = hoje.toISOString().slice(0, 7);
  const entregasHoje = entregas.filter(e => e.data?.toDate?.()?.toISOString?.()?.startsWith(mesAtual) ?? false).length;

  // ── Handlers EPI ──
  function abrirEpiModal(epi = null) {
    setEpiForm(epi ? { ...epi } : { ...VAZIO_EPI });
    setEpiModal(true);
  }
  async function salvarEpiForm() {
    if (!epiForm.nome || !epiForm.ca) return;
    setEpiSaving(true);
    await salvarEpi(epiForm);
    setEpiSaving(false);
    setEpiModal(false);
  }

  // ── Handlers Funcionário ──
  function abrirFuncModal(func = null) {
    setFuncForm(func ? { ...func } : { ...VAZIO_FUNC });
    setFuncModal(true);
  }
  async function salvarFuncForm() {
    if (!funcForm.nome) return;
    setFuncSaving(true);
    await salvarFuncionario(funcForm);
    setFuncSaving(false);
    setFuncModal(false);
  }
  async function registrarBio(func) {
    setBioStatus("loading");
    try {
      const credId = await registrarBiometria(func.id, func.nome, func.cpf);
      await atualizarCredencialFuncionario(func.id, credId);
      setBioStatus("ok");
      setTimeout(() => setBioStatus(""), 3000);
    } catch (e) {
      setBioStatus("err:" + e.message);
    }
  }

  // ── Handlers Entrega ──
  async function autenticar() {
    const func = funcionarios.find(f => f.id === entForm.funcionarioId);
    if (!func?.credentialId) {
      setBioStatus("err:Funcionário sem biometria registrada.");
      return;
    }
    setBioStatus("loading");
    try {
      await autenticarBiometria(func.credentialId);
      setAutenticado(true);
      setBioStatus("ok");
    } catch (e) {
      setBioStatus("err:" + (e.name === "NotAllowedError" ? "Biometria cancelada ou não reconhecida." : e.message));
    }
  }
  async function salvarEntrega() {
    if (!entForm.funcionarioId || !entForm.epiId || !autenticado) return;
    setEntSaving(true);
    const func = funcionarios.find(f => f.id === entForm.funcionarioId);
    const epi  = epis.find(e => e.id === entForm.epiId);
    await registrarEntrega({
      ...entForm,
      nomeFunc: func?.nome || "",
      nomeEpi:  epi?.nome  || "",
      ca:       epi?.ca    || "",
      autenticado: true,
    });
    setEntForm({ ...VAZIO_ENT });
    setAutenticado(false);
    setBioStatus("");
    setEntSaving(false);
  }

  const setEF = (k, v) => setEpiForm(p => ({ ...p, [k]: v }));
  const setFF = (k, v) => setFuncForm(p => ({ ...p, [k]: v }));
  const setEnt = (k, v) => { setEntForm(p => ({ ...p, [k]: v })); setAutenticado(false); setBioStatus(""); };

  const TAB = ["Equipamentos", "Funcionários", "Registro de Entrega"];

  return (
    <div>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"EPIs Cadastrados", val:epis.length,       icon:<HardHat size={18} color={C.navyMid}/>,      bg:"#eff6ff" },
          { label:"CA Vencendo (90d)", val:caVencendo,        icon:<AlertTriangle size={18} color={C.amber}/>,   bg:"#fffbeb" },
          { label:"CA Vencidos",       val:caVencidos,         icon:<AlertTriangle size={18} color={C.red}/>,     bg:"#fef2f2" },
          { label:"Entregas (mês)",    val:entregasHoje,       icon:<ClipboardList size={18} color={C.green}/>,   bg:"#f0fdf4" },
        ].map((k, i) => (
          <Card key={i} style={{ background:k.bg, border:"none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {k.icon}
              <div>
                <p style={{ fontSize:20, fontWeight:800, margin:0 }}>{k.val}</p>
                <p style={{ fontSize:10, color:C.muted, margin:0 }}>{k.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:16 }}>
        {TAB.map((t, i) => (
          <button key={i} onClick={() => setAba(i)} style={{ padding:"10px 16px", border:"none", background:"none", cursor:"pointer", fontSize:12, fontWeight:600, color:aba===i ? C.navyMid : C.gray, borderBottom:aba===i ? `2px solid ${C.navyMid}` : "2px solid transparent" }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab 0: Equipamentos ── */}
      {aba === 0 && (
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <p style={{ fontWeight:700, fontSize:14, margin:0 }}>Equipamentos de Proteção Individual (NR-06)</p>
            <Btn icon={<Plus size={13}/>} onClick={() => abrirEpiModal()}>Novo EPI</Btn>
          </div>
          {epis.length === 0 ? (
            <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>Nenhum EPI cadastrado. Clique em "Novo EPI" para começar.</p>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:C.bg }}>
                  {["Nome / Tipo","CA","Fabricante","Validade CA","Status",""].map((h, i) => (
                    <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {epis.map(e => {
                  const st = caStatus(e.validadeCa);
                  return (
                    <tr key={e.id} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"9px 10px" }}>
                        <p style={{ margin:0, fontWeight:600 }}>{e.nome}</p>
                        <p style={{ margin:0, fontSize:10, color:C.muted }}>{e.tipo}</p>
                      </td>
                      <td style={{ padding:"9px 10px" }}>{e.ca || "—"}</td>
                      <td style={{ padding:"9px 10px" }}>{e.fabricante || "—"}</td>
                      <td style={{ padding:"9px 10px" }}>{e.validadeCa ? new Date(e.validadeCa + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                      <td style={{ padding:"9px 10px" }}><Badge {...st}/></td>
                      <td style={{ padding:"9px 10px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => abrirEpiModal(e)} style={{ background:"none", border:"none", cursor:"pointer", color:C.navyMid }}><Edit2 size={14}/></button>
                          <button onClick={() => { if (confirm(`Excluir "${e.nome}"?`)) excluirEpi(e.id); }} style={{ background:"none", border:"none", cursor:"pointer", color:C.red }}><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ── Tab 1: Funcionários ── */}
      {aba === 1 && (
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <p style={{ fontWeight:700, fontSize:14, margin:0 }}>Funcionários</p>
              <p style={{ fontSize:11, color:C.muted, margin:"2px 0 0" }}>{bioRegistrados} de {funcionarios.length} com biometria registrada</p>
            </div>
            <Btn icon={<Plus size={13}/>} onClick={() => abrirFuncModal()}>Novo Funcionário</Btn>
          </div>
          {funcionarios.length === 0 ? (
            <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>Nenhum funcionário cadastrado.</p>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:C.bg }}>
                  {["Nome","CPF","Matrícula","Setor / Cargo","Biometria",""].map((h, i) => (
                    <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {funcionarios.map(f => {
                  const setor = setores.find(s => s.id === f.setorId);
                  const temBio = !!f.credentialId;
                  return (
                    <tr key={f.id} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"9px 10px", fontWeight:600 }}>{f.nome}</td>
                      <td style={{ padding:"9px 10px", color:C.muted }}>{f.cpf || "—"}</td>
                      <td style={{ padding:"9px 10px", color:C.muted }}>{f.matricula || "—"}</td>
                      <td style={{ padding:"9px 10px" }}>
                        <p style={{ margin:0 }}>{setor?.nome || "—"}</p>
                        <p style={{ margin:0, fontSize:10, color:C.muted }}>{f.cargo || ""}</p>
                      </td>
                      <td style={{ padding:"9px 10px" }}>
                        {temBio ? (
                          <Badge label="Registrada" color={C.green} bg="#dcfce7"/>
                        ) : (
                          <button
                            onClick={() => registrarBio(f)}
                            style={{ display:"flex", alignItems:"center", gap:5, background:"#eff6ff", border:`1px solid #bfdbfe`, borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:11, color:C.navyMid, fontWeight:600 }}
                          >
                            <Fingerprint size={13}/> Registrar
                          </button>
                        )}
                      </td>
                      <td style={{ padding:"9px 10px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => abrirFuncModal(f)} style={{ background:"none", border:"none", cursor:"pointer", color:C.navyMid }}><Edit2 size={14}/></button>
                          <button onClick={() => { if (confirm(`Excluir "${f.nome}"?`)) excluirFuncionario(f.id); }} style={{ background:"none", border:"none", cursor:"pointer", color:C.red }}><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {bioStatus && (
            <div style={{ marginTop:12, padding:"10px 14px", borderRadius:8, background: bioStatus === "ok" ? "#dcfce7" : bioStatus === "loading" ? "#eff6ff" : "#fee2e2", fontSize:12, color: bioStatus === "ok" ? C.green : bioStatus === "loading" ? C.navyMid : C.red }}>
              {bioStatus === "loading" ? "Aguardando biometria…" : bioStatus === "ok" ? "✓ Biometria registrada com sucesso!" : bioStatus.replace("err:", "")}
            </div>
          )}
        </Card>
      )}

      {/* ── Tab 2: Registro de Entrega ── */}
      {aba === 2 && (
        <div style={{ display:"grid", gridTemplateColumns:"360px 1fr", gap:16, alignItems:"start" }}>
          {/* Formulário */}
          <Card>
            <p style={{ fontWeight:700, fontSize:14, margin:"0 0 14px" }}>Registrar Entrega de EPI</p>

            <div style={{ marginBottom:12 }}>
              <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Funcionário <span style={{ color:C.red }}>*</span></p>
              <select value={entForm.funcionarioId} onChange={e => setEnt("funcionarioId", e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
                <option value="">Selecione…</option>
                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}{f.matricula ? ` (${f.matricula})` : ""}</option>)}
              </select>
            </div>

            <div style={{ marginBottom:12 }}>
              <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>EPI <span style={{ color:C.red }}>*</span></p>
              <select value={entForm.epiId} onChange={e => setEnt("epiId", e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
                <option value="">Selecione…</option>
                {epis.map(e => <option key={e.id} value={e.id}>{e.nome} — CA {e.ca || "s/CA"}</option>)}
              </select>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <div>
                <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Quantidade</p>
                <input type="number" min={1} value={entForm.quantidade} onChange={e => setEnt("quantidade", Number(e.target.value))} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, boxSizing:"border-box" }}/>
              </div>
              <div>
                <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Motivo</p>
                <select value={entForm.motivo} onChange={e => setEnt("motivo", e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
                  {EPI_MOTIVOS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <Input label="Observações" value={entForm.observacoes} onChange={v => setEnt("observacoes", v)} placeholder="Opcional"/>

            {/* Biometric */}
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:14, marginTop:4 }}>
              {!autenticado ? (
                <button
                  onClick={autenticar}
                  disabled={!entForm.funcionarioId || bioStatus === "loading"}
                  style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px", borderRadius:8, border:`2px dashed ${entForm.funcionarioId ? C.navyMid : C.border}`, background: entForm.funcionarioId ? "#eff6ff" : C.bg, color: entForm.funcionarioId ? C.navyMid : C.muted, cursor: entForm.funcionarioId ? "pointer" : "not-allowed", fontWeight:700, fontSize:12 }}
                >
                  <Fingerprint size={18}/>
                  {bioStatus === "loading" ? "Aguardando biometria…" : "Autenticar com Biometria"}
                </button>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:8, background:"#dcfce7", padding:"10px 14px", borderRadius:8 }}>
                  <ShieldCheck size={18} color={C.green}/>
                  <p style={{ margin:0, fontSize:12, fontWeight:700, color:C.green }}>Biometria confirmada</p>
                </div>
              )}
              {bioStatus.startsWith("err:") && (
                <p style={{ fontSize:11, color:C.red, marginTop:6 }}>{bioStatus.replace("err:", "")}</p>
              )}
            </div>

            <div style={{ marginTop:14 }}>
              <Btn disabled={!autenticado || !entForm.funcionarioId || !entForm.epiId || entSaving} onClick={salvarEntrega}>
                {entSaving ? "Salvando…" : "Registrar Entrega"}
              </Btn>
            </div>
          </Card>

          {/* Histórico */}
          <Card>
            <p style={{ fontWeight:700, fontSize:14, margin:"0 0 14px" }}>Histórico de Entregas</p>
            {entregas.length === 0 ? (
              <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>Nenhuma entrega registrada.</p>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:C.bg }}>
                    {["Data","Funcionário","EPI","CA","Qtd","Motivo","Bio",""].map((h, i) => (
                      <th key={i} style={{ padding:"7px 8px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entregas.map(e => (
                    <tr key={e.id} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"8px" }}>{e.data?.toDate ? e.data.toDate().toLocaleDateString("pt-BR") : "—"}</td>
                      <td style={{ padding:"8px", fontWeight:500 }}>{e.nomeFunc}</td>
                      <td style={{ padding:"8px" }}>{e.nomeEpi}</td>
                      <td style={{ padding:"8px", color:C.muted }}>{e.ca || "—"}</td>
                      <td style={{ padding:"8px" }}>{e.quantidade}</td>
                      <td style={{ padding:"8px", color:C.muted }}>{e.motivo}</td>
                      <td style={{ padding:"8px" }}>
                        {e.autenticado
                          ? <CheckCircle size={14} color={C.green}/>
                          : <AlertTriangle size={14} color={C.amber}/>}
                      </td>
                      <td style={{ padding:"8px" }}>
                        <button onClick={() => { if (confirm("Excluir este registro?")) excluirEntrega(e.id); }} style={{ background:"none", border:"none", cursor:"pointer", color:C.red }}><Trash2 size={13}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* ── Modal EPI ── */}
      {epiModal && (
        <Modal title={epiForm.id ? "Editar EPI" : "Novo EPI"} onClose={() => setEpiModal(false)}>
          <Input label="Nome do EPI" value={epiForm.nome} onChange={v => setEF("nome", v)} required placeholder="Ex.: Capacete de Segurança"/>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Tipo <span style={{ color:C.red }}>*</span></p>
            <select value={epiForm.tipo} onChange={e => setEF("tipo", e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
              <option value="">Selecione…</option>
              {EPI_TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <Input label="Nº CA (Certificado de Aprovação)" value={epiForm.ca} onChange={v => setEF("ca", v)} required placeholder="Ex.: 12345"/>
          <Input label="Fabricante" value={epiForm.fabricante} onChange={v => setEF("fabricante", v)} placeholder="Ex.: 3M"/>
          <Input label="Validade do CA" value={epiForm.validadeCa} onChange={v => setEF("validadeCa", v)} type="date"/>
          <Input label="Descrição" value={epiForm.descricao} onChange={v => setEF("descricao", v)} placeholder="Opcional"/>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn outline onClick={() => setEpiModal(false)}>Cancelar</Btn>
            <Btn disabled={!epiForm.nome || !epiForm.ca || epiSaving} onClick={salvarEpiForm}>{epiSaving ? "Salvando…" : "Salvar"}</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal Funcionário ── */}
      {funcModal && (
        <Modal title={funcForm.id ? "Editar Funcionário" : "Novo Funcionário"} onClose={() => setFuncModal(false)}>
          <Input label="Nome completo" value={funcForm.nome} onChange={v => setFF("nome", v)} required/>
          <Input label="CPF" value={funcForm.cpf} onChange={v => setFF("cpf", v)} placeholder="000.000.000-00"/>
          <Input label="Matrícula" value={funcForm.matricula} onChange={v => setFF("matricula", v)}/>
          <Input label="Cargo / Função" value={funcForm.cargo} onChange={v => setFF("cargo", v)}/>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Setor</p>
            <select value={funcForm.setorId} onChange={e => setFF("setorId", e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
              <option value="">Selecione…</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn outline onClick={() => setFuncModal(false)}>Cancelar</Btn>
            <Btn disabled={!funcForm.nome || funcSaving} onClick={salvarFuncForm}>{funcSaving ? "Salvando…" : "Salvar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
