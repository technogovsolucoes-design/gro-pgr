/**
 * Geradores de XML eSocial SST
 * S-2240 v04.00.00 — Condições Ambientais do Trabalho
 * S-2220 v04.00.00 — Monitoramento da Saúde do Trabalhador
 */

// Fator de risco (label do sistema) → código eSocial + metadados
export const MAPA_AGENTES = {
  "Calor":                        { cod: "09.001", unMed: "°C (IBUTG)",  tecMed: "IBUTG" },
  "Frio":                         { cod: "09.003" },
  "Ruído":                        { cod: "05.001", unMed: "dB(A)",       tecMed: "Dosimetria" },
  "Ruído de Impacto":             { cod: "05.002", unMed: "dB(C)" },
  "Vibração de Corpo Inteiro":    { cod: "06.001", unMed: "m/s²" },
  "Vibração de Mãos e Braços":    { cod: "06.002", unMed: "m/s²" },
  "Radiação Solar":               { cod: "03.007" },
  "Radiação Ionizante":           { cod: "03.001" },
  "Radiação não Ionizante":       { cod: "03.002" },
  "Pressão Hiperbárica":          { cod: "08.001" },
  "Poeiras Minerais":             { cod: "02.001" },
  "Poeira de Sílica":             { cod: "02.001" },
  "Amianto":                      { cod: "02.002" },
  "Benzeno":                      { cod: "01.018" },
  "Chumbo":                       { cod: "01.001" },
  "Mercúrio":                     { cod: "01.012" },
  "Agentes Químicos":             { cod: "01.999" },
  "Agentes Biológicos":           { cod: "04.001" },
  "Bactérias":                    { cod: "04.001" },
  "Vírus":                        { cod: "04.002" },
  "Fungos":                       { cod: "04.003" },
};

export const CATS_S2240 = ["Físico", "Químico", "Biológico"];

export const TIPOS_ASO_MAP = {
  "Admissional":         "0",
  "Periódico":           "1",
  "Retorno ao Trabalho": "2",
  "Mudança de Função":   "3",
  "Demissional":         "9",
};

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmt14(cnpj) {
  return (cnpj || "").replace(/\D/g, "").padStart(14, "0").slice(0, 14);
}

function fmt11(cpf) {
  return (cpf || "").replace(/\D/g, "").padStart(11, "0").slice(0, 11);
}

function toISO(d) {
  if (!d) return "";
  if (d?.seconds) return new Date(d.seconds * 1000).toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  return d;
}

export function gerarIdEvento(cnpjEmpresa) {
  const c   = fmt14(cnpjEmpresa);
  const now = new Date();
  const pad = (n, l) => String(n).padStart(l, "0");
  const ts  = `${now.getFullYear()}${pad(now.getMonth()+1,2)}${pad(now.getDate(),2)}${pad(now.getHours(),2)}${pad(now.getMinutes(),2)}${pad(now.getSeconds(),2)}`;
  const rnd = pad(Math.floor(Math.random() * 9999), 4);
  return `e${c}${ts}${rnd}`;
}

function perApur() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * S-2240 — Condições Ambientais do Trabalho — Agentes Nocivos
 * @param {Object} p
 * @param {Object} p.empresa     { cnpj, razao }
 * @param {Object} p.funcionario { cpf, matricula, nome }
 * @param {Object} p.setor       { nome }
 * @param {Array}  p.agentes     [{ nome, codEsocial?, intensidade?, unidade?, tecMed?, limTol?, epcEficaz, epiEficaz, causaAposent? }]
 * @param {string} p.tpAmb       "1"=produção "2"=homologação
 * @param {string} p.dtIni       YYYY-MM-DD (início da condição)
 */
export function gerarS2240({ empresa, funcionario, setor, agentes = [], tpAmb = "2", dtIni }) {
  const id       = gerarIdEvento(empresa.cnpj);
  const cnpjNum  = fmt14(empresa.cnpj);
  const cpfNum   = fmt11(funcionario.cpf);
  const dtInicio = dtIni || new Date().toISOString().slice(0, 10);

  const agentesXml = agentes
    .map(a => {
      const cfg = MAPA_AGENTES[a.nome] || {};
      const cod = a.codEsocial || cfg.cod || "";
      if (!cod) return "";
      return `
          <agente>
            <codAgente>${cod}</codAgente>
            <dscAgente>${esc(a.nome)}</dscAgente>
            ${a.intensidade ? `<intesidade>${esc(String(a.intensidade))}</intesidade>` : ""}
            ${(a.unidade || cfg.unMed) ? `<unMed>${esc(a.unidade || cfg.unMed)}</unMed>` : ""}
            ${(a.tecMed || cfg.tecMed) ? `<tecMed>${esc(a.tecMed || cfg.tecMed)}</tecMed>` : ""}
            ${a.limTol ? `<limTol>${esc(a.limTol)}</limTol>` : ""}
            <epcEficaz>${a.epcEficaz ? "S" : "N"}</epcEficaz>
            <epiEficaz>${a.epiEficaz ? "S" : "N"}</epiEficaz>
            <causaAposent>${a.causaAposent ? "S" : "N"}</causaAposent>
          </agente>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtCondicaoAmbienteTrabalho/v04_00_00">
  <evtCondicaoAmbienteTrabalho Id="${id}">
    <ideEvento>
      <indRetif>1</indRetif>
      <perApur>${perApur()}</perApur>
      <tpAmb>${tpAmb}</tpAmb>
      <procEmi>1</procEmi>
      <verProc>1.0.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjNum}</nrInsc>
    </ideEmpregador>
    <ideVinculo>
      <cpfTrab>${cpfNum}</cpfTrab>
      ${funcionario.matricula ? `<matricula>${esc(funcionario.matricula)}</matricula>` : ""}
    </ideVinculo>
    <infoAmb>
      <localAmb>1</localAmb>
      <dscSetor>${esc(setor?.nome || "Geral")}</dscSetor>
      <tpAmb>1</tpAmb>
      <dtIniCondicao>${dtInicio}</dtIniCondicao>
      ${agentesXml ? `<agentesNocivos>${agentesXml}
      </agentesNocivos>` : ""}
    </infoAmb>
  </evtCondicaoAmbienteTrabalho>
</eSocial>`;
}

/**
 * S-2220 — Monitoramento da Saúde do Trabalhador (ASO)
 */
export function gerarS2220({ empresa, funcionario, exame, tpAmb = "2" }) {
  const id      = gerarIdEvento(empresa.cnpj);
  const cnpjNum = fmt14(empresa.cnpj);
  const cpfNum  = fmt11(funcionario.cpf);
  const dtAso   = toISO(exame.data);
  const tpAso   = TIPOS_ASO_MAP[exame.tipo] ?? "1";
  const result  = /inapto/i.test(exame.resultado || "") ? "1" : "0";

  return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtMonitorSaude/v04_00_00">
  <evtMonitorSaude Id="${id}">
    <ideEvento>
      <indRetif>1</indRetif>
      <tpAmb>${tpAmb}</tpAmb>
      <procEmi>1</procEmi>
      <verProc>1.0.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjNum}</nrInsc>
    </ideEmpregador>
    <ideVinculo>
      <cpfTrab>${cpfNum}</cpfTrab>
      ${funcionario.matricula ? `<matricula>${esc(funcionario.matricula)}</matricula>` : ""}
    </ideVinculo>
    <exMedOcup>
      <dtAso>${dtAso}</dtAso>
      <tpAso>${tpAso}</tpAso>
      <medico>
        <nmMed>${esc(exame.medicoNome || "A INFORMAR")}</nmMed>
        <nrCRM>${esc(exame.medicoCrm  || "000000")}</nrCRM>
        <ufCRM>${esc(exame.medicoUf   || "SP")}</ufCRM>
      </medico>
      <respMonit>
        <nmMed>${esc(exame.respNome || exame.medicoNome || "A INFORMAR")}</nmMed>
        <nrCRM>${esc(exame.respCrm  || exame.medicoCrm  || "000000")}</nrCRM>
        <ufCRM>${esc(exame.respUf   || exame.medicoUf   || "SP")}</ufCRM>
      </respMonit>
      <resultado>${result}</resultado>
    </exMedOcup>
  </evtMonitorSaude>
</eSocial>`;
}
