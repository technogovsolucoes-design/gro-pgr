import { C } from "../constants";

export const Btn = ({ children, onClick, color = C.navyMid, outline = false, small = false, icon, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display:"flex", alignItems:"center", gap:6,
      padding: small ? "6px 12px" : "9px 16px",
      borderRadius:8,
      border: `1px solid ${outline ? color : "transparent"}`,
      background: outline ? "transparent" : color,
      color: outline ? color : C.white,
      cursor: disabled ? "not-allowed" : "pointer",
      fontWeight:600, fontSize: small ? 11 : 12,
      opacity: disabled ? 0.6 : 1,
      fontFamily:"inherit",
    }}
  >
    {icon}{children}
  </button>
);

export const Input = ({ label, value, onChange, placeholder, type = "text", required = false }) => (
  <div style={{ marginBottom:12 }}>
    {label && (
      <p style={{ fontSize:11, color:C.muted, margin:"0 0 4px", fontWeight:500 }}>
        {label}{required && <span style={{ color:C.red }}> *</span>}
      </p>
    )}
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      style={{
        width:"100%", padding:"8px 10px", borderRadius:6,
        border:`1px solid ${C.border}`, fontSize:12,
        fontFamily:"inherit", boxSizing:"border-box",
        color:C.text, background:C.white,
      }}
    />
  </div>
);

export const Card = ({ children, style = {} }) => (
  <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:16, ...style }}>
    {children}
  </div>
);

export const SectionTitle = ({ children }) => (
  <p style={{ fontWeight:600, fontSize:13, color:C.navy, margin:"0 0 12px", display:"flex", alignItems:"center", gap:6 }}>
    {children}
  </p>
);

export const Badge = ({ label, color, bg }) => (
  <span style={{ background:bg, color, fontSize:10, padding:"2px 7px", borderRadius:4, fontWeight:600 }}>
    {label}
  </span>
);
