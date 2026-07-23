import { useState, useRef, useEffect } from "react";
import { buscarCID, descCID } from "../services/cid10";
import { C } from "../constants";

/**
 * Campo CID-10 com autocomplete.
 * Props: value, onChange(codigo), label, required
 */
export default function CIDInput({ value = "", onChange, label = "CID-10", required }) {
  const [query, setQuery]   = useState(value);
  const [itens, setItens]   = useState([]);
  const [aberto, setAberto] = useState(false);
  const ref = useRef();

  // Sincroniza exibição quando value muda externamente
  useEffect(() => {
    const desc = descCID(value);
    setQuery(value ? `${value}${desc ? " — " + desc : ""}` : "");
  }, [value]);

  // Fecha o dropdown ao clicar fora
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
    // Se apagou o código, limpa o valor
    const puro = t.split("—")[0].trim();
    if (!puro) { onChange(""); setItens([]); setAberto(false); return; }
    const res = buscarCID(puro, 10);
    setItens(res);
    setAberto(res.length > 0);
    // Se o que foi digitado é exatamente um código válido, seleciona
    const exato = res.find(r => r.cod.toUpperCase() === puro.toUpperCase());
    if (exato) onChange(exato.cod);
  }

  function selecionar(item) {
    onChange(item.cod);
    setQuery(`${item.cod} — ${item.desc}`);
    setItens([]);
    setAberto(false);
  }

  return (
    <div ref={ref} style={{ position:"relative", marginBottom:12 }}>
      <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>
        {label}{required && <span style={{ color:C.red }}> *</span>}
      </p>
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => { if (itens.length > 0) setAberto(true); }}
        placeholder="Digite o código (ex: M54.5) ou descrição..."
        autoComplete="off"
        style={{
          width:"100%", padding:"8px 10px", borderRadius:6,
          border:`1px solid ${aberto ? C.navyMid : C.border}`,
          fontSize:12, fontFamily:"inherit", boxSizing:"border-box",
          outline:"none",
        }}
      />
      {value && (
        <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-10%)", fontSize:10, color:C.green, fontWeight:700 }}>✓</span>
      )}
      {aberto && itens.length > 0 && (
        <div style={{
          position:"absolute", zIndex:200, top:"100%", left:0, right:0,
          background:"#fff", border:`1px solid ${C.border}`, borderRadius:8,
          boxShadow:"0 8px 24px rgba(0,0,0,0.12)", maxHeight:240, overflowY:"auto",
        }}>
          {itens.map(item => (
            <div key={item.cod} onMouseDown={() => selecionar(item)}
              style={{ padding:"8px 12px", cursor:"pointer", borderBottom:`1px solid ${C.border}`, display:"flex", gap:10, alignItems:"flex-start" }}
              onMouseEnter={e => e.currentTarget.style.background="#f0f9ff"}
              onMouseLeave={e => e.currentTarget.style.background="#fff"}>
              <span style={{ fontWeight:700, fontFamily:"monospace", color:C.navyMid, fontSize:12, whiteSpace:"nowrap" }}>{item.cod}</span>
              <span style={{ fontSize:11, color:C.text, lineHeight:1.4 }}>{item.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
