export function NexusLogo({ size = 40 }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 50 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Arc superior */}
      <path d="M5 20 Q25 4 45 20" stroke="#1652a1" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      {/* Escudo — metade azul */}
      <path d="M5 20 L5 38 Q15 52 25 56 L25 20 Z" fill="#1652a1"/>
      {/* Escudo — metade verde */}
      <path d="M45 20 L45 38 Q35 52 25 56 L25 20 Z" fill="#38b249"/>
      {/* Borda escudo */}
      <path d="M5 20 L5 38 Q15 52 25 56 Q35 52 45 38 L45 20 Z" stroke="#0d2040" strokeWidth="1" fill="none" opacity="0.3"/>
      {/* Letra N */}
      <text x="11" y="47" fontSize="26" fontWeight="900" fill="white" fontFamily="system-ui,Arial,sans-serif" letterSpacing="-1">N</text>
      {/* Capacete */}
      <path d="M19 19 Q25 13 31 19" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.9"/>
      <rect x="17" y="19" width="16" height="3" rx="1.5" fill="white" opacity="0.75"/>
    </svg>
  );
}
