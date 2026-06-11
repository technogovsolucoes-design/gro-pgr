export const FATORES = [
  { id:"f01", cat:"Demanda e Carga de Trabalho", label:"Ritmo de trabalho excessivo / pressão por produtividade", ref:"COPSOQ III — D1.1" },
  { id:"f02", cat:"Demanda e Carga de Trabalho", label:"Sobrecarga quantitativa (volume de tarefas acima da capacidade)", ref:"JSS — Demanda" },
  { id:"f03", cat:"Demanda e Carga de Trabalho", label:"Sobrecarga cognitiva / complexidade das tarefas", ref:"COPSOQ III — D1.3" },
  { id:"f04", cat:"Demanda e Carga de Trabalho", label:"Exigências emocionais (lidar com sofrimento alheio)", ref:"COPSOQ III — D1.4" },
  { id:"f05", cat:"Demanda e Carga de Trabalho", label:"Exigências de esconder emoções (dissonância emocional)", ref:"COPSOQ III — D1.5" },
  { id:"f06", cat:"Demanda e Carga de Trabalho", label:"Conflito de papéis / ambiguidade de função", ref:"COPSOQ III — D2.1" },
  { id:"f07", cat:"Demanda e Carga de Trabalho", label:"Interrupções frequentes e multitarefas forçadas", ref:"ISO 45003 — 6.1.2" },
  { id:"f08", cat:"Controle e Autonomia", label:"Falta de controle sobre o ritmo e métodos de trabalho", ref:"JSS — Latitude de Decisão" },
  { id:"f09", cat:"Controle e Autonomia", label:"Ausência de participação nas decisões que afetam o trabalho", ref:"COPSOQ III — D3.1" },
  { id:"f10", cat:"Controle e Autonomia", label:"Monitoramento eletrônico excessivo / vigilância constante", ref:"ISO 45003 — 6.1.3" },
  { id:"f11", cat:"Controle e Autonomia", label:"Falta de previsibilidade / mudanças organizacionais abruptas", ref:"COPSOQ III — D3.3" },
  { id:"f12", cat:"Suporte Social e Relações", label:"Suporte social insuficiente de colegas", ref:"ERI — Suporte Social" },
  { id:"f13", cat:"Suporte Social e Relações", label:"Suporte social insuficiente de liderança / chefia", ref:"ERI — Suporte Social" },
  { id:"f14", cat:"Suporte Social e Relações", label:"Assédio moral (humilhações, ameaças, isolamento)", ref:"NR-01 / CIPA+A" },
  { id:"f15", cat:"Suporte Social e Relações", label:"Assédio sexual no ambiente de trabalho", ref:"NR-01 / Lei 14.457/2022" },
  { id:"f16", cat:"Suporte Social e Relações", label:"Violência física ou verbal de clientes / usuários", ref:"COPSOQ III — D4.3" },
  { id:"f17", cat:"Suporte Social e Relações", label:"Conflitos interpessoais entre colegas / equipe", ref:"COPSOQ III — D4.1" },
  { id:"f18", cat:"Suporte Social e Relações", label:"Clima organizacional negativo / falta de confiança", ref:"ISO 45003 — 6.2" },
  { id:"f19", cat:"Reconhecimento e Recompensa", label:"Ausência de reconhecimento pelo trabalho realizado", ref:"ERI — Recompensa" },
  { id:"f20", cat:"Reconhecimento e Recompensa", label:"Remuneração percebida como injusta / inadequada", ref:"ERI — Recompensa" },
  { id:"f21", cat:"Reconhecimento e Recompensa", label:"Falta de perspectiva de crescimento / desenvolvimento", ref:"COPSOQ III — D5.2" },
  { id:"f22", cat:"Reconhecimento e Recompensa", label:"Insegurança no emprego / ameaça de demissão", ref:"COPSOQ III — D5.3" },
  { id:"f23", cat:"Interface Trabalho-Vida Privada", label:"Violação do direito à desconexão digital", ref:"ISO 45003 / CLT art. 6º" },
  { id:"f24", cat:"Interface Trabalho-Vida Privada", label:"Jornadas atípicas / turnos noturnos prejudicando vida pessoal", ref:"NR-17 / eSocial S-2230" },
  { id:"f25", cat:"Interface Trabalho-Vida Privada", label:"Horas extras habituais e excessivas", ref:"CLT art. 59 / NR-17" },
  { id:"f26", cat:"Interface Trabalho-Vida Privada", label:"Dificuldade de conciliar trabalho e responsabilidades familiares", ref:"COPSOQ III — D6.2" },
  { id:"f27", cat:"Organização e Cultura", label:"Liderança autoritária / estilo gerencial opressivo", ref:"ISO 45003 — 6.2.1" },
  { id:"f28", cat:"Organização e Cultura", label:"Metas inatingíveis / sistema de pressão por resultados", ref:"NR-17 / COPSOQ III" },
  { id:"f29", cat:"Organização e Cultura", label:"Ausência de política de saúde mental / bem-estar", ref:"ISO 45003 — 5.2" },
  { id:"f30", cat:"Organização e Cultura", label:"Discriminação por gênero, raça, idade ou deficiência", ref:"Lei 9.029/95 / ISO 45003" },
  { id:"f31", cat:"Organização e Cultura", label:"Comunicação organizacional deficiente / desinformação", ref:"COPSOQ III — D7.1" },
  { id:"f32", cat:"Conteúdo e Significado do Trabalho", label:"Trabalho repetitivo / monótono sem variação de tarefas", ref:"NR-17 — 17.6" },
  { id:"f33", cat:"Conteúdo e Significado do Trabalho", label:"Falta de significado / propósito percebido no trabalho", ref:"COPSOQ III — D8.1" },
  { id:"f34", cat:"Conteúdo e Significado do Trabalho", label:"Exposição a conteúdo traumático / perturbador", ref:"COPSOQ III — D1.4" },
  { id:"f35", cat:"Conteúdo e Significado do Trabalho", label:"Trabalho emocional intenso sem suporte psicológico", ref:"ISO 45003 — 6.1.4" },
];

export const FREQ_OPT = ["Nunca","Raramente","Às vezes","Frequentemente","Sempre"];
export const SEV_OPT  = ["Insignificante","Menor","Moderado","Crítico","Catastrófico"];
export const FREQ_VAL = { "Nunca":0,"Raramente":1,"Às vezes":2,"Frequentemente":3,"Sempre":4 };
export const SEV_VAL  = { "Insignificante":0,"Menor":1,"Moderado":2,"Crítico":3,"Catastrófico":4 };

export const C = {
  navy:"#0d2a5e", navyMid:"#1652a1", blue:"#4a90d9", gray:"#64748b",
  border:"#e2e8f0", white:"#ffffff", bg:"#f8fafc",
  red:"#dc2626", amber:"#d97706", green:"#38b249",
  text:"#0f172a", muted:"#64748b",
};

export const PIE_COLORS = ["#1652a1","#38b249","#d97706","#dc2626","#7c3aed","#0f766e","#b45309"];

export const EMP_FORM_VAZIO = { razao:"", cnpj:"", cnae:"", endereco:"", responsavel:"", dataAvaliacao:"", grauRisco:"3" };

export const PERFIS = ["Admin", "SESMT", "Gestor"];

export const PERFIL_CORES = {
  Admin:   { color:"#991b1b", bg:"#fee2e2" },
  SESMT:   { color:"#1e40af", bg:"#dbeafe" },
  Gestor:  { color:"#166534", bg:"#dcfce7" },
  Usuário: { color:"#64748b", bg:"#f1f5f9" },
};
