import { useState, useRef, useEffect } from "react";
import { buscarCID, descCID } from "../services/cid10";
import { C } from "../constants";

/**
 * Campo CID-10 com autocomplete.
 * Usa position:fixed no dropdown para não ser cortado por overflow:auto do modal.
 * Props: value, onChange(codigo), label, required
 */
export default function CIDInput({ value = "", onChange, label = "CID-10", required }) {
  const [query,  setQuery]  = useState("");
  const [itens,  setItens]  = useState([]);
  const [aberto, setAberto] = useState(false);
  const [pos,    setPos]    = useState({ top:0, left:0, width:200 });
  const inputRef = useRef();
  const ref      = useRef();

  // Sincroniza exibição quando value muda externamente
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Fecha ao clicar fora
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function calcPos() {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 2, left: r.left, width: r.width });
    }
  }

  function handleChange(e) {
    const t = e.target.value;
    setQuery(t);
    const puro = t.trim();
    if (!puro) {
      onChange("");
      setItens([]);
      setAberto(false);
      return;
    }
    const res = buscarCID(puro, 10);
    setItens(res);
    if (res.length > 0) { calcPos(); setAberto(true); } else setAberto(false);
  }

  function handleFocus() {
    if (query.trim().length >= 2) {
      const res = buscarCID(query.trim(), 10);
      if (res.length > 0) { calcPos(); setAberto(true); }
    }
  }

  function selecionar(item) {
    onChange(item.cod);
    setQuery(item.cod);
    setItens([]);
    setAberto(false);
  }

  const desc = descCID(value);

  return (
    <div ref={ref} style={{ position:"relative", marginBottom:12 }}>
      <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>
        {label}{required && <span style={{ color:C.red }}> *</span>}
      </p>
      <input
        ref={inputRef}
        value={query}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder="Código (ex: M54.5) ou descrição..."
        autoComplete="off"
        style={{
          width:"100%", padding:"8px 10px", borderRadius:6,
          border:`1px solid ${aberto ? C.navyMid : value ? C.green : C.border}`,
          fontSize:12, fontFamily:"inherit", boxSizing:"border-box", outline:"none",
        }}
      />
      {/* Descrição do código selecionado */}
      {value && desc && (
        <p style={{ margin:"3px 0 0", fontSize:10, color:C.green, fontWeight:600 }}>
          ✓ {desc}
        </p>
      )}
      {/* Dropdown — position:fixed para não ser cortado pelo overflow do modal */}
      {aberto && itens.length > 0 && (
        <div style={{
          position:"fixed",
          zIndex:9999,
          top:   pos.top,
          left:  pos.left,
          width: pos.width,
          background:"#fff",
          border:`1px solid ${C.border}`,
          borderRadius:8,
          boxShadow:"0 8px 24px rgba(0,0,0,0.15)",
          maxHeight:220,
          overflowY:"auto",
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
