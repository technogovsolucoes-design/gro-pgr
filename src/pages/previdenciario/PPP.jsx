import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Btn, Card, Input } from "../../components/ui";
import { C } from "../../constants";
import { db } from "../../firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:12, padding:24, width:"100%", maxWidth:500, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <p style={{ fontWeight:700, fontSize:15, margin:0 }}>{title}</p>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const VAZIO = {
  funcionarioNome:"", cpf:"", pis:"", matricula:"", cargo:"", setorId:"",
  dataAdmissao:"", dataDemissao:"", cnaeFuncao:"",
  agentesNocivos:"", epcUtilizados:"", epiUtilizados:"",
  examesRealizados:"", medicoResponsavel:"", engResponsavel:"", dataEmissao:"",
};

function gerarPPP(ppp, empresa) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>PPP — ${ppp.funcionarioNome}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #000; }
    h1 { font-size: 14px; text-align: center; margin-bottom: 4px; }
    h2 { font-size: 11px; background: #1652a1; color: #fff; padding: 4px 8px; margin: 14px 0 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    td, th { border: 1px solid #ccc; padding: 4px 6px; vertical-align: top; }
    th { background: #f0f4f8; font-weight: bold; width: 35%; }
    .header { text-align: center; border: 2px solid #1652a1; padding: 10px; margin-bottom: 14px; }
    .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
    .assinatura { border-top: 1px solid #000; padding-top: 6px; text-align: center; }
    pre { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 11px; margin: 0; }
    @media print { body { margin: 10px; } button { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>PERFIL PROFISSIOGRÁFICO PREVIDENCIÁRIO — PPP</h1>
    <p style="margin:2px 0; font-size:10px;">Empresa: <strong>${empresa?.razao || "—"}</strong> &nbsp;|&nbsp; CNPJ: ${empresa?.cnpj || "—"} &nbsp;|&nbsp; CNAE: ${empresa?.cnae || "—"}</p>
    <p style="margin:2px 0; font-size:10px;">Emitido em: ${ppp.dataEmissao ? new Date(ppp.dataEmissao + "T12:00:00").toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR")}</p>
  </div>

  <h2>1. IDENTIFICAÇÃO DO TRABALHADOR</h2>
  <table>
    <tr><th>Nome</th><td>${ppp.funcionarioNome}</td></tr>
    <tr><th>CPF</th><td>${ppp.cpf || "—"}</td></tr>
    <tr><th>PIS/PASEP/NIT</th><td>${ppp.pis || "—"}</td></tr>
    <tr><th>Matrícula</th><td>${ppp.matricula || "—"}</td></tr>
    <tr><th>Cargo / Função</th><td>${ppp.cargo || "—"}</td></tr>
    <tr><th>Data de Admissão</th><td>${ppp.dataAdmissao ? new Date(ppp.dataAdmissao + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td></tr>
    <tr><th>Data de Demissão</th><td>${ppp.dataDemissao ? new Date(ppp.dataDemissao + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td></tr>
    <tr><th>CNAE da Função</th><td>${ppp.cnaeFuncao || "—"}</td></tr>
  </table>

  <h2>2. AGENTES NOCIVOS / EXPOSIÇÃO OCUPACIONAL</h2>
  <table>
    <tr><td><pre>${ppp.agentesNocivos || "Nenhum agente nocivo identificado."}</pre></td></tr>
  </table>

  <h2>3. EQUIPAMENTOS DE PROTEÇÃO COLETIVA (EPC)</h2>
  <table>
    <tr><td><pre>${ppp.epcUtilizados || "—"}</pre></td></tr>
  </table>

  <h2>4. EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (EPI)</h2>
  <table>
    <tr><td><pre>${ppp.epiUtilizados || "—"}</pre></td></tr>
  </table>

  <h2>5. EXAMES REALIZADOS</h2>
  <table>
    <tr><td><pre>${ppp.examesRealizados || "—"}</pre></td></tr>
  </table>

  <h2>6. RESPONSÁVEIS TÉCNICOS</h2>
  <table>
    <tr><th>Médico do Trabalho</th><td>${ppp.medicoResponsavel || "—"}</td></tr>
    <tr><th>Engenheiro de Segurança</th><td>${ppp.engResponsavel || "—"}</td></tr>
  </table>

  <div class="assinaturas">
    <div class="assinatura">
      <p>${ppp.medicoResponsavel || "Médico do Trabalho"}</p>
      <p style="font-size:10px;">CRM / Responsável pelo PCMSO</p>
    </div>
    <div class="assinatura">
      <p>${ppp.engResponsavel || "Engenheiro de Segurança"}</p>
      <p style="font-size:10px;">CREA / Responsável pelo PGR</p>
    </div>
  </div>

  <script>window.print();</script>
</body>
</html>`;

  const janela = window.open("", "_blank");
  janela.document.write(html);
  janela.document.close();
}

export default function PPP() {
  const { empresaAtiva, setores } = useApp();
  const [ppps, setPpps]         = useState([]);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ ...VAZIO });
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (!empresaAtiva) { setPpps([]); return; }
    const q = query(collection(db, "empresas", empresaAtiva.id, "ppp"), orderBy("criadoEm", "desc"));
    const unsub = onSnapshot(q, snap => setPpps(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    return unsub;
  }, [empresaAtiva]);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function abrirModal(p = null) {
    setForm(p ? { ...VAZIO, ...p } : { ...VAZIO });
    setModal(true);
  }

  async function salvar() {
    if (!form.funcionarioNome) return;
    setSaving(true);
    if (form.id) {
      const { id, ...rest } = form;
      await updateDoc(doc(db, "empresas", empresaAtiva.id, "ppp", form.id), rest);
    } else {
      await addDoc(collection(db, "empresas", empresaAtiva.id, "ppp"), { ...form, criadoEm: serverTimestamp() });
    }
    setSaving(false);
    setModal(false);
  }

  async function excluir(id, nome) {
    if (!confirm(`Excluir PPP de "${nome}"?`)) return;
    await deleteDoc(doc(db, "empresas", empresaAtiva.id, "ppp", id));
  }

  const Textarea = ({ label, value, onChange, placeholder, rows = 3 }) => (
    <div style={{ marginBottom:12 }}>
      <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>{label}</p>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
    </div>
  );

  return (
    <div>
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div>
            <p style={{ fontWeight:700, fontSize:14, margin:0 }}>Perfil Profissiográfico Previdenciário (PPP)</p>
            <p style={{ fontSize:11, color:C.muted, margin:"2px 0 0" }}>Documento obrigatório para comprovação de exposição a agentes nocivos</p>
          </div>
          <Btn onClick={() => abrirModal()}>+ Novo PPP</Btn>
        </div>

        {ppps.length === 0 ? (
          <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>Nenhum PPP emitido ainda.</p>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {["Funcionário","CPF","PIS","Cargo","Admissão","Demissão","Emissão","Ações"].map((h, i) => (
                  <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ppps.map(p => (
                <tr key={p.id} style={{ borderTop:`1px solid ${C.border}` }}>
                  <td style={{ padding:"9px 10px", fontWeight:600 }}>{p.funcionarioNome}</td>
                  <td style={{ padding:"9px 10px", color:C.muted }}>{p.cpf || "—"}</td>
                  <td style={{ padding:"9px 10px", color:C.muted }}>{p.pis || "—"}</td>
                  <td style={{ padding:"9px 10px" }}>{p.cargo || "—"}</td>
                  <td style={{ padding:"9px 10px" }}>{p.dataAdmissao ? new Date(p.dataAdmissao + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td style={{ padding:"9px 10px" }}>{p.dataDemissao ? new Date(p.dataDemissao + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td style={{ padding:"9px 10px" }}>{p.dataEmissao ? new Date(p.dataEmissao + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td style={{ padding:"9px 10px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => gerarPPP(p, empresaAtiva)} style={{ background:"#eff6ff", border:`1px solid #bfdbfe`, borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:11, color:C.navyMid, fontWeight:600 }}>Gerar PDF</button>
                      <button onClick={() => abrirModal(p)} style={{ background:"none", border:"none", cursor:"pointer", color:C.navyMid, fontSize:11, fontWeight:600 }}>Editar</button>
                      <button onClick={() => excluir(p.id, p.funcionarioNome)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:11, fontWeight:600 }}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {modal && (
        <Modal title={form.id ? "Editar PPP" : "Novo PPP"} onClose={() => setModal(false)}>
          <Input label="Nome do Funcionário" value={form.funcionarioNome} onChange={v => sf("funcionarioNome", v)} required/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="CPF" value={form.cpf} onChange={v => sf("cpf", v)} placeholder="000.000.000-00"/>
            <Input label="PIS/PASEP/NIT" value={form.pis} onChange={v => sf("pis", v)} placeholder="000.00000.00-0"/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Matrícula" value={form.matricula} onChange={v => sf("matricula", v)}/>
            <Input label="Cargo / Função" value={form.cargo} onChange={v => sf("cargo", v)}/>
          </div>
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>Setor</p>
            <select value={form.setorId} onChange={e => sf("setorId", e.target.value)} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit" }}>
              <option value="">Selecione o setor…</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Data de Admissão" value={form.dataAdmissao} onChange={v => sf("dataAdmissao", v)} type="date"/>
            <Input label="Data de Demissão" value={form.dataDemissao} onChange={v => sf("dataDemissao", v)} type="date"/>
          </div>
          <Input label="CNAE da Função" value={form.cnaeFuncao} onChange={v => sf("cnaeFuncao", v)} placeholder="Ex.: 4120-4/00"/>
          <Textarea label="Agentes Nocivos e Período de Exposição" value={form.agentesNocivos} onChange={v => sf("agentesNocivos", v)} placeholder="Ex.: Ruído (> 85dB) — 2010 a 2023; Calor — 2015 a 2023" rows={4}/>
          <Textarea label="EPC Utilizados" value={form.epcUtilizados} onChange={v => sf("epcUtilizados", v)} placeholder="Ex.: Cabine acústica, Exaustores, Protetores termais"/>
          <Textarea label="EPI Utilizados" value={form.epiUtilizados} onChange={v => sf("epiUtilizados", v)} placeholder="Ex.: Protetor auditivo tipo concha CA 12345 — desde 2015"/>
          <Textarea label="Exames Realizados" value={form.examesRealizados} onChange={v => sf("examesRealizados", v)} placeholder="Ex.: Audiometria 01/01/2023 — Apto; Espirometria 01/01/2023 — Normal"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Médico Responsável (PCMSO)" value={form.medicoResponsavel} onChange={v => sf("medicoResponsavel", v)}/>
            <Input label="Engenheiro de Segurança" value={form.engResponsavel} onChange={v => sf("engResponsavel", v)}/>
          </div>
          <Input label="Data de Emissão" value={form.dataEmissao} onChange={v => sf("dataEmissao", v)} type="date"/>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn outline onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn disabled={!form.funcionarioNome || saving} onClick={salvar}>{saving ? "Salvando…" : "Salvar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
