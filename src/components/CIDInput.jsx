import { useState, useRef, useEffect } from "react";
import { buscarCID, descCID, isCodCID } from "../services/cid10";
import { C } from "../constants";

export default function CIDInput({ value = "", onChange, label = "CID-10", required }) {
  const [query,  setQuery]  = useState(value);
  const [itens,  setItens]  = useState([]);
  const [aberto, setAberto] = useState(false);
  const [pos,    setPos]    = useState({ top:0, left:0, width:200 });
  const inputRef = useRef();
  const containerRef = useRef();

  // Quando value muda por fora (ex: editar um registro já salvo), sincroniza
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handle = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false);
      }
    };
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

    // Se está na tabela ou tem formato válido de CID, aceita
    const exato = descCID(puro);
    if (exato || isCodCID(puro)) {
      onChange(puro);
    } else {
      onChange("");
    }

    const res = buscarCID(puro, 10);
    setItens(res);
    if (res.length > 0) {
      calcPos();
      setAberto(true);
    } else {
      setAberto(false);
    }
  }

  function handleFocus() {
    const puro = query.trim();
    if (puro.length >= 2) {
      const res = buscarCID(puro, 10);
      if (res.length > 0) {
        setItens(res);
        calcPos();
        setAberto(true);
      }
    }
  }

  function selecionar(item) {
    onChange(item.cod);
    setQuery(item.cod);
    setItens([]);
    setAberto(false);
  }

  const descAtual = descCID(query.trim()) || descCID(value);
  const formatoValido = isCodCID(query.trim());

  return (
    <div ref={containerRef} style={{ marginBottom:12 }}>
      <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>
        {label}{required && <span style={{ color:C.red }}> *</span>}
      </p>

      <div style={{ position:"relative" }}>
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder="Digite o código (ex: M54.5) ou a descrição..."
          autoComplete="off"
          style={{
            width:"100%",
            padding:"8px 10px",
            borderRadius:6,
            border:`1px solid ${(descAtual || formatoValido) ? C.green : aberto ? C.navyMid : C.border}`,
            fontSize:12,
            fontFamily:"inherit",
            boxSizing:"border-box",
            outline:"none",
          }}
        />
      </div>

      {/* Descrição em tempo real — aparece assim que reconhece o código */}
      {descAtual ? (
        <p style={{ margin:"4px 0 0", fontSize:11, color:C.green, fontWeight:600, lineHeight:1.4 }}>
          ✓ {descAtual}
        </p>
      ) : formatoValido && !descAtual ? (
        <p style={{ margin:"4px 0 0", fontSize:11, color:C.green, fontWeight:600 }}>
          ✓ Código aceito
        </p>
      ) : query.trim().length >= 2 && itens.length === 0 ? (
        <p style={{ margin:"4px 0 0", fontSize:11, color:C.amber }}>
          Código não encontrado na tabela CID-10
        </p>
      ) : null}

      {/* Dropdown com position:fixed para não ser cortado pelo overflow do modal */}
      {aberto && itens.length > 0 && (
        <div style={{
          position:  "fixed",
          zIndex:    9999,
          top:       pos.top,
          left:      pos.left,
          width:     pos.width,
          background:"#fff",
          border:    `1px solid ${C.border}`,
          borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          maxHeight: 220,
          overflowY: "auto",
        }}>
          {itens.map(item => (
            <div
              key={item.cod}
              onMouseDown={() => selecionar(item)}
              onMouseEnter={e => e.currentTarget.style.background = "#f0f9ff"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              style={{
                padding: "8px 12px",
                cursor:  "pointer",
                borderBottom: `1px solid ${C.border}`,
                display: "flex",
                gap:     10,
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontWeight:700, fontFamily:"monospace", color:C.navyMid, fontSize:12, whiteSpace:"nowrap" }}>
                {item.cod}
              </span>
              <span style={{ fontSize:11, color:C.text, lineHeight:1.4 }}>
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
