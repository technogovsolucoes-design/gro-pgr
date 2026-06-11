import { useState } from "react";
import { Building2, Edit2, Save, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Btn, Input, Card, SectionTitle } from "../components/ui";
import { C } from "../constants";

const CAMPOS = [
  { label:"Razão Social",         key:"razao",          required:true },
  { label:"CNPJ",                 key:"cnpj" },
  { label:"CNAE Principal",       key:"cnae" },
  { label:"Grau de Risco (GR 1–4)", key:"grauRisco" },
  { label:"Endereço Completo",    key:"endereco" },
  { label:"Responsável Técnico",  key:"responsavel" },
  { label:"Data da Avaliação",    key:"dataAvaliacao",  type:"date" },
];

export default function Empresa() {
  const { empresaAtiva, salvarEmpresa, canEdit } = useApp();
  const [editando, setEditando] = useState(false);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);

  const iniciarEdicao = () => {
    setForm({
      razao: empresaAtiva?.razao || "", cnpj: empresaAtiva?.cnpj || "",
      cnae: empresaAtiva?.cnae || "", grauRisco: empresaAtiva?.grauRisco || "3",
      endereco: empresaAtiva?.endereco || "", responsavel: empresaAtiva?.responsavel || "",
      dataAvaliacao: empresaAtiva?.dataAvaliacao || "",
    });
    setEditando(true);
  };

  const handleSalvar = async () => {
    setSaving(true);
    await salvarEmpresa(form);
    setEditando(false);
    setSaving(false);
  };

  return (
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <SectionTitle><Building2 size={14} /> Dados da Empresa Avaliada</SectionTitle>
        {!editando
          ? canEdit && <Btn onClick={iniciarEdicao} outline color={C.navyMid} small icon={<Edit2 size={12} />}>Editar</Btn>
          : <div style={{ display:"flex", gap:8 }}>
              <Btn onClick={handleSalvar} color={C.green} small disabled={saving} icon={<Save size={12} />}>{saving ? "Salvando..." : "Salvar"}</Btn>
              <Btn onClick={() => setEditando(false)} outline color={C.gray} small icon={<X size={12} />}>Cancelar</Btn>
            </div>
        }
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {CAMPOS.map(f => (
          editando
            ? <Input key={f.key} label={f.label} type={f.type || "text"} value={form[f.key] || ""} required={f.required} onChange={v => setForm(p => ({ ...p, [f.key]:v }))} />
            : <div key={f.key} style={{ marginBottom:12 }}>
                <p style={{ fontSize:10.5, color:C.muted, margin:"0 0 2px", fontWeight:500 }}>{f.label}</p>
                <p style={{ fontSize:13, fontWeight:500, margin:0 }}>{empresaAtiva?.[f.key] || "—"}</p>
              </div>
        ))}
      </div>
    </Card>
  );
}
