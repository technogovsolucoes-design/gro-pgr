import { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { C } from "../constants";

/**
 * Seletor de funcionário com autocomplete.
 * Busca na lista de funcionários cadastrados da empresa ativa.
 *
 * Props:
 *   value      — nome do funcionário selecionado (string)
 *   onChange   — function({ nome, cpf, matricula, cargo, setorId, id })
 *   label      — string (default "Funcionário")
 *   required   — bool
 *   allowFree  — bool: permite digitar nome livre (sem estar no cadastro)
 */
export default function FuncionarioSelect({ value = "", onChange, label = "Funcionário", required, allowFree }) {
  const { funcionarios = [] } = useApp();
  const [query, setQuery]     = useState(value);
  const [itens, setItens]     = useState([]);
  const [aberto, setAberto]   = useState(false);
  const ref = useRef();

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function handleChange(e) {
    const t = e.target.value;
    setQuery(t);
    if (!t.trim()) {
      onChange({ nome:"", cpf:"", matricula:"", cargo:"", setorId:"", id:"" });
      setItens([]); setAberto(false); return;
    }
    const res = funcionarios
      .filter(f => (f.nome || "").toLowerCase().includes(t.toLowerCase()))
      .slice(0, 8);
    setItens(res);
    setAberto(res.length > 0);
    if (allowFree) onChange({ nome:t, cpf:"", matricula:"", cargo:"", setorId:"", id:"" });
  }

  function selecionar(f) {
    setQuery(f.nome);
    setItens([]);
    setAberto(false);
    onChange({ nome:f.nome, cpf:f.cpf||"", matricula:f.matricula||"", cargo:f.cargo||"", setorId:f.setorId||"", id:f.id });
  }

  const selecionado = !!funcionarios.find(f => f.nome === query);

  return (
    <div ref={ref} style={{ position:"relative", marginBottom:12 }}>
      <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>
        {label}{required && <span style={{ color:C.red }}> *</span>}
      </p>
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => {
          if (!query) {
            setItens(funcionarios.slice(0, 8));
            setAberto(funcionarios.length > 0);
          } else if (itens.length > 0) setAberto(true);
        }}
        placeholder="Buscar funcionário por nome..."
        autoComplete="off"
        style={{
          width:"100%", padding:"8px 10px", borderRadius:6,
          border:`1px solid ${aberto ? C.navyMid : selecionado ? C.green : C.border}`,
          fontSize:12, fontFamily:"inherit", boxSizing:"border-box", outline:"none",
        }}
      />
      {selecionado && (
        <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-10%)", fontSize:10, color:C.green, fontWeight:700 }}>✓</span>
      )}
      {funcionarios.length === 0 && (
        <p style={{ fontSize:10, color:C.muted, margin:"2px 0 0" }}>Nenhum funcionário cadastrado. Cadastre em Gestão EPI → Funcionários.</p>
      )}
      {aberto && itens.length > 0 && (
        <div style={{
          position:"absolute", zIndex:200, top:"100%", left:0, right:0,
          background:"#fff", border:`1px solid ${C.border}`, borderRadius:8,
          boxShadow:"0 8px 24px rgba(0,0,0,0.12)", maxHeight:240, overflowY:"auto",
        }}>
          {itens.map(f => (
            <div key={f.id} onMouseDown={() => selecionar(f)}
              style={{ padding:"8px 12px", cursor:"pointer", borderBottom:`1px solid ${C.border}` }}
              onMouseEnter={e => e.currentTarget.style.background="#f0f9ff"}
              onMouseLeave={e => e.currentTarget.style.background="#fff"}>
              <p style={{ margin:0, fontWeight:600, fontSize:12, color:C.text }}>{f.nome}</p>
              <p style={{ margin:0, fontSize:10, color:C.muted }}>
                {[f.cargo, f.cpf ? `CPF: ${f.cpf}` : null, f.matricula ? `Mat.: ${f.matricula}` : null].filter(Boolean).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
