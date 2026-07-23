import { useState, useEffect, useMemo } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";
import { descCID } from "../../services/cid10";
import CIDInput from "../../components/CIDInput";
import FuncionarioSelect from "../../components/FuncionarioSelect";

// ── Utilitários ───────────────────────────────────────────────────────────────
const fmtDate = s => {
  if (!s) return "—";
  if (typeof s === "object" && s.seconds) return new Date(s.seconds*1000).toLocaleDateString("pt-BR");
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
};

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:12, padding:24, width:"100%", maxWidth: wide ? 900 : 580, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <p style={{ fontWeight:700, fontSize:15, margin:0 }}>{title}</p>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.gray, fontSize:18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Chip({ label, color = C.navyMid, bg = "#eff6ff" }) {
  return <span style={{ fontSize:10, fontWeight:600, color, background:bg, borderRadius:10, padding:"2px 8px", whiteSpace:"nowrap" }}>{label}</span>;
}

function Alerta({ msg, cor = C.amber }) {
  return (
    <div style={{ background: cor === C.red ? "#fee2e2" : "#fef3c7", border:`1px solid ${cor === C.red ? "#fca5a5" : "#fde68a"}`, borderRadius:8, padding:"7px 12px", marginBottom:10, fontSize:11, color: cor === C.red ? "#991b1b" : "#92400e", fontWeight:600 }}>
      ⚠ {msg}
    </div>
  );
}

const VAZIO = {
  funcionarioNome:"", funcionarioId:"", cpf:"", matricula:"",
  dataAdmissao:"", cargo:"", setorId:"",
  queixasPrincipais:"", historicoMedico:"", medicamentos:"", restricoes:"",
  grupoSanguineo:"", alergias:"", contatoEmergencia:"", telEmergencia:"",
};

const GRUPOS = ["A+","A-","B+","B-","AB+","AB-","O+","O-","Não informado"];

// ── Componente de Timeline ─────────────────────────────────────────────────────
function TimelineEvento({ evento }) {
  const [expand, setExpand] = useState(false);
  const cores = {
    atestado:     { border:"#fb923c", bg:"#fff7ed", icon:"📄" },
    afastamento:  { border: C.red,   bg:"#fff0f0", icon:"🏥" },
    exame:        { border: C.green, bg:"#f0fdf4", icon:"🩺" },
    treinamento:  { border: C.amber, bg:"#fffbeb", icon:"📚" },
    epi:          { border:"#2563eb", bg:"#eff6ff", icon:"🦺" },
    prontuario:   { border: C.navyMid, bg:"#f0f4ff", icon:"📋" },
  };
  const c = cores[evento.tipo] || { border:C.border, bg:C.bg, icon:"•" };

  return (
    <div style={{ display:"flex", gap:12, marginBottom:12 }}>
      {/* Eixo */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
        <div style={{ width:32, height:32, borderRadius:"50%", background:c.bg, border:`2px solid ${c.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>{c.icon}</div>
        <div style={{ width:2, flex:1, background:C.border, marginTop:4 }}/>
      </div>
      {/* Conteúdo */}
      <div style={{ flex:1, paddingBottom:8 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontWeight:700, fontSize:12, color:C.text }}>{evento.titulo}</p>
            {evento.subtitulo && <p style={{ margin:"2px 0 0", fontSize:11, color:C.muted }}>{evento.subtitulo}</p>}
          </div>
          <span style={{ fontSize:10, color:C.muted, whiteSpace:"nowrap" }}>{evento.dataStr}</span>
        </div>
        {evento.detalhes && (
          <button onClick={() => setExpand(p => !p)}
            style={{ marginTop:4, background:"none", border:"none", cursor:"pointer", fontSize:10, color:C.navyMid, padding:0, fontWeight:600 }}>
            {expand ? "▲ Menos" : "▼ Detalhes"}
          </button>
        )}
        {expand && evento.detalhes && (
          <div style={{ marginTop:6, background:c.bg, borderRadius:6, padding:"8px 10px", fontSize:11, color:C.text, lineHeight:1.6 }}>
            {evento.detalhes}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Prontuarios() {
  const { empresaAtiva, exames, funcionarios, setores, treinamentos } = useApp();

  const [prontuarios, setProntuarios]     = useState([]);
  const [atestados, setAtestados]         = useState([]);
  const [afastamentos, setAfastamentos]   = useState([]);
  const [entregas, setEntregas]           = useState([]);

  const [busca, setBusca]           = useState("");
  const [prontuarioView, setProntuarioView] = useState(null);
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState({ ...VAZIO });
  const [editId, setEditId]         = useState(null);
  const [saving, setSaving]         = useState(false);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  // ── Subscriptions ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!empresaAtiva?.id) { setProntuarios([]); setAtestados([]); setAfastamentos([]); setEntregas([]); return; }

    const unsubP = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "prontuarios"), orderBy("funcionarioNome")),
      snap => setProntuarios(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    );
    const unsubAt = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "atestados"), orderBy("dataApresentacao", "desc")),
      snap => setAtestados(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    );
    const unsubAf = onSnapshot(
      query(collection(db, "empresas", empresaAtiva.id, "afastamentos"), orderBy("dataInicio", "desc")),
      snap => setAfastamentos(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    );
    const unsubEn = onSnapshot(
      collection(db, "empresas", empresaAtiva.id, "entregas"),
      snap => setEntregas(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    );

    return () => { unsubP(); unsubAt(); unsubAf(); unsubEn(); };
  }, [empresaAtiva?.id]);

  // ── Salvar / excluir ─────────────────────────────────────────────────────
  async function salvar() {
    if (!form.funcionarioNome) return;
    setSaving(true);
    const col = collection(db, "empresas", empresaAtiva.id, "prontuarios");
    if (editId) {
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "prontuarios", editId), { ...form, atualizadoEm: serverTimestamp() });
    } else {
      await addDoc(col, { ...form, criadoEm: serverTimestamp() });
    }
    setSaving(false);
    setModal(false);
  }

  async function excluir(id) {
    if (!confirm("Excluir prontuário?")) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "prontuarios", id));
  }

  function abrirNovo() {
    setForm({ ...VAZIO });
    setEditId(null);
    setModal(true);
  }

  function abrirEditar(p) {
    setForm({ ...VAZIO, ...p });
    setEditId(p.id);
    setModal(true);
  }

  // ── Timeline por funcionário ─────────────────────────────────────────────
  function buildTimeline(nome) {
    const nomeLower = (nome || "").toLowerCase();
    const match = n => (n || "").toLowerCase() === nomeLower;
    const eventos = [];

    atestados.filter(a => match(a.funcionarioNome)).forEach(a => {
      const cid = a.cid ? `CID ${a.cid}${descCID(a.cid) ? " — " + descCID(a.cid) : ""}` : null;
      eventos.push({
        tipo: "atestado",
        data: a.dataApresentacao || a.criadoEm?.seconds ? new Date((a.dataApresentacao || "") + "T12:00:00").getTime() || (a.criadoEm?.seconds * 1000) : 0,
        dataStr: fmtDate(a.dataApresentacao),
        titulo: `Atestado${a.diasAfastados ? ` — ${a.diasAfastados} dia(s)` : ""}`,
        subtitulo: [cid, a.medicoNome ? `Dr(a). ${a.medicoNome}` : null, a.especialidade].filter(Boolean).join(" · "),
        detalhes: [
          a.observacoes,
          `Validado: ${a.validado ? "Sim" : "Não"}`,
        ].filter(Boolean).join("\n"),
      });
    });

    afastamentos.filter(a => match(a.funcionarioNome)).forEach(a => {
      const cid = a.cid ? `CID ${a.cid}${descCID(a.cid) ? " — " + descCID(a.cid) : ""}` : null;
      eventos.push({
        tipo: "afastamento",
        data: a.dataInicio ? new Date(a.dataInicio + "T12:00:00").getTime() : 0,
        dataStr: fmtDate(a.dataInicio),
        titulo: `Afastamento — ${a.tipo || ""}${a.diasAfastados ? ` (${a.diasAfastados} dias)` : ""}`,
        subtitulo: [cid, a.beneficioINSS && a.beneficioINSS !== "Não se aplica" ? `Benefício: ${a.beneficioINSS}` : null, `Status: ${a.status || "—"}`].filter(Boolean).join(" · "),
        detalhes: [
          a.dataPrevisaoRetorno && `Previsão retorno: ${fmtDate(a.dataPrevisaoRetorno)}`,
          a.dataRetornoEfetivo && `Retorno efetivo: ${fmtDate(a.dataRetornoEfetivo)}`,
          a.observacoes,
        ].filter(Boolean).join("\n"),
      });
    });

    exames.filter(e => match(e.funcionarioNome || e.funcionario)).forEach(e => {
      const dt = e.data?.seconds ? new Date(e.data.seconds * 1000) : e.data ? new Date(e.data + "T12:00:00") : null;
      eventos.push({
        tipo: "exame",
        data: dt?.getTime() || 0,
        dataStr: dt ? dt.toLocaleDateString("pt-BR") : "—",
        titulo: `ASO — ${e.tipo || "Exame médico"} (${e.resultado || "—"})`,
        subtitulo: e.dataVencimento ? `Vencimento: ${fmtDate(e.dataVencimento)}` : null,
        detalhes: [e.medicoNome && `Médico: ${e.medicoNome}`, e.medicoCrm && `CRM: ${e.medicoCrm}`, e.statusESocial && `eSocial: ${e.statusESocial}`].filter(Boolean).join("\n"),
      });
    });

    treinamentos?.filter(t => {
      if (!t.participantes) return false;
      return Array.isArray(t.participantes) ? t.participantes.some(p => match(p)) : match(t.participantes);
    }).forEach(t => {
      eventos.push({
        tipo: "treinamento",
        data: t.data ? new Date(t.data + "T12:00:00").getTime() : 0,
        dataStr: fmtDate(t.data),
        titulo: `Treinamento — ${t.nome || ""}`,
        subtitulo: [t.nr, t.cargaHoraria ? `${t.cargaHoraria}h` : null].filter(Boolean).join(" · "),
        detalhes: null,
      });
    });

    entregas.filter(e => match(e.funcionarioNome || e.nomeFuncionario)).forEach(e => {
      const dt = e.dataEntrega?.seconds ? new Date(e.dataEntrega.seconds * 1000) : null;
      if (!dt) return;
      eventos.push({
        tipo: "epi",
        data: dt.getTime(),
        dataStr: dt.toLocaleDateString("pt-BR"),
        titulo: `EPI entregue — ${e.nomeEpi || e.epiNome || "EPI"}`,
        subtitulo: e.ca ? `CA ${e.ca}` : null,
        detalhes: null,
      });
    });

    return eventos.sort((a, b) => b.data - a.data);
  }

  // ── Indicadores e alertas por funcionário ─────────────────────────────────
  function buildIndicadores(nome) {
    const nomeLower = (nome || "").toLowerCase();
    const match = n => (n || "").toLowerCase() === nomeLower;

    const ats     = atestados.filter(a => match(a.funcionarioNome));
    const afs     = afastamentos.filter(a => match(a.funcionarioNome));
    const exs     = exames.filter(e => match(e.funcionarioNome || e.funcionario));
    const ativo   = afs.find(a => a.status === "Afastado" && !a.dataRetornoEfetivo);
    const diasAts = ats.reduce((s, a) => s + (Number(a.diasAfastados) || 0), 0);
    const diasAfs = afs.reduce((s, a) => s + (Number(a.diasAfastados) || 0), 0);

    // CIDs mais recorrentes
    const cidMap = {};
    [...ats, ...afs].forEach(r => { if (r.cid) cidMap[r.cid] = (cidMap[r.cid] || 0) + 1; });
    const cidTop = Object.entries(cidMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

    // Alertas
    const alertas = [];
    if (ativo) alertas.push({ msg:`Atualmente AFASTADO — ${ativo.tipo || ""}${ativo.dataPrevisaoRetorno ? ` · Prev. retorno: ${fmtDate(ativo.dataPrevisaoRetorno)}` : ""}`, cor:C.red });
    if (cidTop.some(([, n]) => n >= 3)) alertas.push({ msg:`CID recorrente (≥3 ocorrências): ${cidTop.filter(([,n]) => n>=3).map(([c]) => c).join(", ")} — avaliar nexo causal`, cor:C.amber });
    if (ats.length >= 4) alertas.push({ msg:`${ats.length} atestados registrados — padrão de absenteísmo recorrente`, cor:C.amber });

    // ASO vencido
    exs.forEach(e => {
      if (e.dataVencimento) {
        const venc = new Date(e.dataVencimento + "T00:00:00");
        if (venc < new Date()) alertas.push({ msg:`ASO ${e.tipo} vencido em ${fmtDate(e.dataVencimento)}`, cor:C.red });
      }
    });

    return { ats, afs, exs, ativo, diasAts, diasAfs, cidTop, alertas };
  }

  // ── Seletor de funcionário no modal ──────────────────────────────────────
  function handleSelectFuncionario(f) {
    setForm(p => ({
      ...p,
      funcionarioNome: f.nome,
      funcionarioId:   f.id   || p.funcionarioId,
      cpf:             f.cpf  || p.cpf,
      matricula:       f.matricula || p.matricula,
      cargo:           f.cargo     || p.cargo,
      setorId:         f.setorId   || p.setorId,
    }));
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const filtrados = prontuarios.filter(p =>
    (p.funcionarioNome || "").toLowerCase().includes(busca.toLowerCase()) ||
    (p.cpf || "").includes(busca) ||
    (p.matricula || "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <p style={{ fontWeight:800, fontSize:16, margin:0, color:C.navy }}>Prontuários do Trabalhador</p>
          <p style={{ fontSize:11, color:C.muted, margin:"2px 0 0" }}>Histórico funcional integrado — atestados, afastamentos, ASOs, treinamentos e EPIs</p>
        </div>
        <Btn onClick={abrirNovo}>+ Novo Prontuário</Btn>
      </div>

      {/* Busca */}
      <div style={{ position:"relative", marginBottom:16, maxWidth:360 }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, CPF ou matrícula..."
          style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px 8px 32px", fontSize:12, boxSizing:"border-box", fontFamily:"inherit" }} />
        <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.muted, fontSize:13 }}>🔍</span>
      </div>

      {/* Lista de prontuários */}
      <Card>
        {filtrados.length === 0 ? (
          <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>
            {prontuarios.length === 0 ? "Nenhum prontuário cadastrado." : "Nenhum resultado para a busca."}
          </p>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {["Funcionário","CPF","Matrícula","Cargo","Admissão","Situação","Ações"].map(h => (
                  <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => {
                const ind = buildIndicadores(p.funcionarioNome);
                return (
                  <tr key={p.id} style={{ borderTop:`1px solid ${C.border}`, background: ind.ativo ? "#fff0f0" : "transparent" }}>
                    <td style={{ padding:"10px 12px", fontWeight:600 }}>
                      {p.funcionarioNome}
                      {ind.alertas.length > 0 && <span style={{ marginLeft:6, color:C.red, fontSize:12 }}>⚠</span>}
                    </td>
                    <td style={{ padding:"10px 12px", color:C.muted, fontFamily:"monospace", fontSize:11 }}>{p.cpf || "—"}</td>
                    <td style={{ padding:"10px 12px", color:C.muted }}>{p.matricula || "—"}</td>
                    <td style={{ padding:"10px 12px" }}>{p.cargo || "—"}</td>
                    <td style={{ padding:"10px 12px", whiteSpace:"nowrap" }}>{fmtDate(p.dataAdmissao)}</td>
                    <td style={{ padding:"10px 12px" }}>
                      {ind.ativo
                        ? <Chip label="Afastado" color={C.red} bg="#fee2e2" />
                        : <Chip label="Ativo" color={C.green} bg="#dcfce7" />}
                    </td>
                    <td style={{ padding:"10px 12px" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => setProntuarioView(p)}
                          style={{ background:"#eff6ff", border:`1px solid #bfdbfe`, borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:11, color:"#1d4ed8", fontWeight:600 }}>
                          Ver Histórico
                        </button>
                        <button onClick={() => abrirEditar(p)}
                          style={{ background:"none", border:"none", cursor:"pointer", color:C.navyMid, fontSize:11, fontWeight:600 }}>Editar</button>
                        <button onClick={() => excluir(p.id)}
                          style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:11, fontWeight:600 }}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Modal: Prontuário completo / Timeline ─────────────────────── */}
      {prontuarioView && (() => {
        const p   = prontuarioView;
        const ind = buildIndicadores(p.funcionarioNome);
        const tl  = buildTimeline(p.funcionarioNome);
        const setor = setores.find(s => s.id === p.setorId);
        return (
          <Modal title={`Prontuário — ${p.funcionarioNome}`} onClose={() => setProntuarioView(null)} wide>

            {/* Alertas */}
            {ind.alertas.map((a, i) => <Alerta key={i} msg={a.msg} cor={a.cor} />)}

            {/* Dados do funcionário */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
              {[
                ["CPF", p.cpf || "—"],
                ["Matrícula", p.matricula || "—"],
                ["Cargo", p.cargo || "—"],
                ["Setor", setor?.nome || "—"],
                ["Admissão", fmtDate(p.dataAdmissao)],
                ["Grupo Sanguíneo", p.grupoSanguineo || "—"],
              ].map(([l,v]) => (
                <div key={l} style={{ background:C.bg, borderRadius:8, padding:"8px 10px" }}>
                  <p style={{ margin:0, fontSize:10, color:C.muted, fontWeight:600 }}>{l}</p>
                  <p style={{ margin:"2px 0 0", fontSize:12, color:C.text, fontWeight:500 }}>{v}</p>
                </div>
              ))}
            </div>

            {/* KPIs */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
              {[
                { label:"Atestados", val:ind.ats.length, color:C.amber, bg:"#fffbeb" },
                { label:"Afastamentos", val:ind.afs.length, color:C.red, bg:"#fee2e2" },
                { label:"Dias afastados (total)", val: ind.diasAts + ind.diasAfs, color:C.red, bg:"#fee2e2" },
                { label:"ASOs realizados", val:ind.exs.length, color:C.green, bg:"#dcfce7" },
              ].map(k => (
                <Card key={k.label} style={{ background:k.bg, border:"none", padding:"10px 12px" }}>
                  <p style={{ fontSize:22, fontWeight:800, margin:0, color:k.color }}>{k.val}</p>
                  <p style={{ fontSize:10, color:C.muted, margin:0 }}>{k.label}</p>
                </Card>
              ))}
            </div>

            {/* CIDs recorrentes */}
            {ind.cidTop.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <p style={{ fontWeight:700, fontSize:12, color:C.navy, margin:"0 0 8px" }}>CIDs mais frequentes</p>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {ind.cidTop.map(([cod, n]) => (
                    <div key={cod} style={{ background:"#eff6ff", borderRadius:8, padding:"6px 12px", fontSize:11 }}>
                      <strong>{cod}</strong> — {descCID(cod) || "—"} <span style={{ color:C.red, fontWeight:700 }}>({n}×)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observações clínicas */}
            {[["Queixas Principais", p.queixasPrincipais], ["Histórico Médico", p.historicoMedico], ["Medicamentos em Uso", p.medicamentos], ["Restrições / Limitações", p.restricoes], ["Alergias", p.alergias]].filter(([,v]) => v).map(([l,v]) => (
              <div key={l} style={{ background:C.bg, borderRadius:8, padding:"8px 12px", marginBottom:8 }}>
                <p style={{ margin:0, fontSize:10, color:C.muted, fontWeight:600 }}>{l}</p>
                <p style={{ margin:"3px 0 0", fontSize:12, color:C.text, whiteSpace:"pre-wrap" }}>{v}</p>
              </div>
            ))}

            {/* Timeline */}
            <p style={{ fontWeight:700, fontSize:13, color:C.navy, margin:"16px 0 12px" }}>
              Histórico Funcional ({tl.length} evento{tl.length !== 1 ? "s" : ""})
            </p>
            {tl.length === 0 ? (
              <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"16px 0" }}>Nenhum evento registrado neste prontuário.</p>
            ) : (
              <div style={{ paddingLeft:4 }}>
                {tl.map((ev, i) => <TimelineEvento key={i} evento={ev} />)}
                <div style={{ height:1, background:C.border, margin:"4px 0 0" }} />
              </div>
            )}

            {/* Contato de emergência */}
            {(p.contatoEmergencia || p.telEmergencia) && (
              <div style={{ marginTop:14, background:"#f0fdf4", borderRadius:8, padding:"8px 12px", fontSize:11, color:C.text }}>
                <strong>Contato de emergência:</strong> {p.contatoEmergencia} {p.telEmergencia ? `· ${p.telEmergencia}` : ""}
              </div>
            )}

            <div style={{ display:"flex", gap:8, marginTop:16, justifyContent:"flex-end" }}>
              <Btn outline onClick={() => { abrirEditar(p); setProntuarioView(null); }}>Editar Prontuário</Btn>
              <Btn outline onClick={() => setProntuarioView(null)}>Fechar</Btn>
            </div>
          </Modal>
        );
      })()}

      {/* ── Modal: Formulário ─────────────────────────────────────────── */}
      {modal && (
        <Modal title={editId ? "Editar Prontuário" : "Novo Prontuário"} onClose={() => setModal(false)}>
          <FuncionarioSelect
            label="Funcionário"
            required
            value={form.funcionarioNome}
            allowFree
            onChange={handleSelectFuncionario}
          />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="CPF" value={form.cpf} onChange={set("cpf")} placeholder="000.000.000-00" />
            <Input label="Matrícula" value={form.matricula} onChange={set("matricula")} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Cargo" value={form.cargo} onChange={set("cargo")} />
            <Input label="Data de Admissão" value={form.dataAdmissao} onChange={set("dataAdmissao")} type="date" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div style={{ marginBottom:12 }}>
              <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Grupo Sanguíneo</p>
              <select value={form.grupoSanguineo} onChange={e => set("grupoSanguineo")(e.target.value)}
                style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
                <option value="">Não informado</option>
                {GRUPOS.filter(g => g !== "Não informado").map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <Input label="Alergias" value={form.alergias} onChange={set("alergias")} placeholder="Ex.: Penicilina, látex" />
          </div>

          {[["queixasPrincipais","Queixas Principais"], ["historicoMedico","Histórico Médico"],
            ["medicamentos","Medicamentos em Uso"], ["restricoes","Restrições / Limitações"]].map(([k,l]) => (
            <div key={k} style={{ marginBottom:10 }}>
              <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>{l}</p>
              <textarea value={form[k]} onChange={e => set(k)(e.target.value)} rows={2}
                style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }} />
            </div>
          ))}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Contato de Emergência" value={form.contatoEmergencia} onChange={set("contatoEmergencia")} placeholder="Nome" />
            <Input label="Telefone Emergência" value={form.telEmergencia} onChange={set("telEmergencia")} placeholder="(00) 00000-0000" />
          </div>

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn outline onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={!form.funcionarioNome || saving}>{saving ? "Salvando…" : "Salvar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
