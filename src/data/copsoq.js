/**
 * COPSOQ II-Br — Três versões validadas para uso no Brasil
 * Base: Valente et al. (2013), Cadernos de Saúde Pública; Pejtersen et al. (2010)
 * Adaptado para o contexto normativo NR-01 / GRO / PGR
 *
 * Escala de resposta padrão (5 pontos Likert → 0-100):
 *   Nunca/Quase nunca = 0 | Raramente = 25 | Às vezes = 50
 *   Frequentemente = 75 | Sempre = 100
 *
 * favoravel: true  → alta resposta = condição positiva → risco = 100 − score
 * favoravel: false → alta resposta = condição negativa → risco = score direto
 *
 * Classificação NR-01 / GRO:
 *   0–33  → Verde  (Favorável)       — condição saudável
 *   34–66 → Amarelo (Intermediário)  — atenção/monitoramento
 *   67–100 → Vermelho (Desfavorável) — intervenção imediata
 */

export const ESCALA = [
  "Nunca/Quase nunca",
  "Raramente",
  "Às vezes",
  "Frequentemente",
  "Sempre",
];

export const ESCALA_VALORES = {
  "Nunca/Quase nunca": 0,
  "Raramente": 25,
  "Às vezes": 50,
  "Frequentemente": 75,
  "Sempre": 100,
};

export function calcularRiscoScore(respostas, dimensoesConfig) {
  let start = 0;
  return dimensoesConfig.map((dim) => {
    const indices = Array.from({ length: dim.count }, (_, i) => start + i);
    start += dim.count;

    let soma = 0;
    let cont = 0;
    respostas.forEach((r) => {
      if (!r.respostas) return;
      indices.forEach((idx) => {
        const v = r.respostas[idx];
        if (v !== undefined && ESCALA_VALORES[v] !== undefined) {
          soma += ESCALA_VALORES[v];
          cont++;
        }
      });
    });

    const rawScore = cont > 0 ? Math.round(soma / cont) : null;
    const risco = rawScore === null
      ? null
      : dim.favoravel ? 100 - rawScore : rawScore;

    return { nome: dim.nome, risco, rawScore, cont, favoravel: dim.favoravel };
  });
}

export function classificar(risco) {
  if (risco === null) return { label: "Sem dados", cor: "#94a3b8", nivel: "sem_dados", bg: "#f1f5f9" };
  if (risco <= 33) return { label: "Favorável", cor: "#16a34a", nivel: "verde", bg: "#dcfce7" };
  if (risco <= 66) return { label: "Intermediário", cor: "#d97706", nivel: "amarelo", bg: "#fef3c7" };
  return { label: "Desfavorável", cor: "#dc2626", nivel: "vermelho", bg: "#fee2e2" };
}

// ─── RECOMENDAÇÕES POR DIMENSÃO ────────────────────────────────────────────
export const RECOMENDACOES = {
  "Demandas Quantitativas": "Revisar a distribuição de tarefas e prioridades. Implementar gestão de capacidade e garantir pausas regulares conforme NR-17.",
  "Demandas Emocionais": "Oferecer suporte psicológico aos trabalhadores em contato com situações de sofrimento. Implementar rodízio de funções e supervisão de apoio.",
  "Influência no Trabalho": "Ampliar a autonomia dos trabalhadores, criar canais de participação nas decisões operacionais e reduzir o microgerenciamento.",
  "Possibilidades de Desenvolvimento": "Elaborar Planos de Desenvolvimento Individual (PDI), promover capacitações e criar desafios de crescimento profissional.",
  "Significado do Trabalho": "Comunicar claramente o impacto do trabalho de cada colaborador. Promover reconhecimento e propósito nas atividades.",
  "Previsibilidade": "Estabelecer comunicação regular sobre mudanças organizacionais, metas e decisões estratégicas com antecedência.",
  "Suporte Social de Colegas": "Fomentar o trabalho em equipe, realizar atividades de integração e criar uma cultura de colaboração e solidariedade.",
  "Suporte Social de Superiores": "Capacitar lideranças em gestão humanizada, feedback construtivo, escuta ativa e reconhecimento profissional.",
  "Qualidade da Liderança": "Investir em desenvolvimento de liderança. Avaliar competências de gestão e promover cultura de liderança servidora.",
  "Insegurança no Emprego": "Comunicar estratégias organizacionais com transparência. Criar planos de carreira e reduzir incertezas sobre o futuro do emprego.",
  "Saúde e Bem-estar Geral": "Implementar Programa de Promoção da Saúde Mental. Monitorar absenteísmo, presenteísmo e indicadores de bem-estar.",
  "Ritmo de Trabalho": "Revisar metas de produção e prazos. Implementar pausas obrigatórias e distribuir melhor a carga ao longo do turno.",
  "Demandas Cognitivas": "Avaliar complexidade das tarefas e adequar às competências. Implementar ferramentas de apoio à decisão e rotinas de gestão do conhecimento.",
  "Demandas para Esconder Emoções": "Promover ambiente psicologicamente seguro. Oferecer espaços de escuta e reduzir exigências de performance emocional forçada.",
  "Conflito de Papel": "Clarificar responsabilidades e hierarquia de prioridades. Resolver contradições entre demandas de diferentes setores/gestores.",
  "Clareza de Papel": "Formalizar descrições de cargo, metas e indicadores de desempenho. Realizar reuniões periódicas de alinhamento.",
  "Comprometimento Organizacional": "Investigar causas do baixo engajamento. Realizar pesquisas de clima e atuar nos fatores identificados como críticos.",
  "Feedback no Trabalho": "Implementar cultura de feedback contínuo. Criar momentos formais de reconhecimento e avaliação de desempenho.",
  "Burnout / Esgotamento Mental": "ATENÇÃO: risco de afastamentos por saúde mental. Acionar SESMT, PCMSO e implementar intervenções imediatas — reduzir carga, oferecer suporte psicológico e revisar processos.",
  "Estresse": "Mapear estressores específicos por setor. Implementar técnicas de gestão do estresse, pausas programadas e suporte psicológico.",
  "Interface Trabalho-Família": "Avaliar políticas de horas extras e disponibilidade fora do horário. Promover equilíbrio vida-trabalho com flexibilidade quando possível.",
  "Comunidade Social no Trabalho": "Fortalecer cultura organizacional positiva. Promover iniciativas de integração, cooperação e pertencimento.",
  "Comportamentos Ofensivos": "URGENTE: Investigar ocorrências específicas. Aplicar política de tolerância zero, acionar comissão de ética, implementar canal de denúncias anônimas e capacitar lideranças.",
  "Sintomas Depressivos": "CRÍTICO: Encaminhar para avaliação médica e psicológica conforme PCMSO. Acionar suporte de saúde mental e revisar condições de trabalho do grupo afetado.",
  "Satisfação com Condições de Trabalho": "Identificar aspectos específicos insatisfatórios. Atuar em remuneração, ambiente físico, ergonomia e desenvolvimento profissional.",
  "Confiança e Justiça Organizacional": "Revisar processos de promoção, remuneração e reconhecimento. Promover transparência nas decisões e tratamento equitativo.",
  "Exigências Físicas": "Realizar análise ergonômica do trabalho (AET). Adequar postos de trabalho, implementar equipamentos auxiliares e rotação de tarefas.",
  "Autonomia e Autoeficácia": "Fortalecer capacitação técnica e senso de competência. Delegar responsabilidades progressivamente e criar redes de suporte entre pares.",
  "Comportamentos de Segurança Organizacional": "Estruturar políticas formais de saúde mental, canais de denúncia e programas de prevenção de riscos psicossociais integrados ao PGR.",
};

// ─── VERSÃO CURTA (40 itens, 11 dimensões) ────────────────────────────────
export const COPSOQ_CURTA = {
  id: "curta",
  nome: "COPSOQ II-Br — Versão Curta",
  totalItens: 40,
  uso: "Triagem corporativa ágil — GRO inicial, empresas de menor porte",
  tempo: "15–20 min",
  dimensoes: [
    {
      nome: "Demandas Quantitativas",
      favoravel: false,
      itens: [
        "Seu trabalho exige que você trabalhe muito rapidamente?",
        "Você tem que fazer mais trabalho do que consegue dar conta?",
        "Você tem que trabalhar com prazos muito apertados?",
        "Sua carga de trabalho se acumula dificultando o cumprimento dos prazos?",
      ],
    },
    {
      nome: "Demandas Emocionais",
      favoravel: false,
      itens: [
        "Seu trabalho envolve situações emocionalmente perturbadoras?",
        "Seu trabalho exige que você lide com problemas pessoais de outras pessoas?",
        "Seu trabalho exige que você esconda seus sentimentos?",
      ],
    },
    {
      nome: "Influência no Trabalho",
      favoravel: true,
      itens: [
        "Você tem grande influência sobre as decisões relativas ao seu trabalho?",
        "Você pode influenciar a quantidade de trabalho que lhe é designada?",
        "Você tem liberdade para decidir como realizar o seu trabalho?",
        "Você pode influenciar o ritmo de trabalho?",
      ],
    },
    {
      nome: "Possibilidades de Desenvolvimento",
      favoravel: true,
      itens: [
        "Seu trabalho requer que você tome iniciativa?",
        "Seu trabalho lhe dá oportunidades de aprender coisas novas?",
        "Você pode usar suas habilidades e conhecimentos no trabalho?",
        "Seu trabalho é variado e diversificado?",
      ],
    },
    {
      nome: "Significado do Trabalho",
      favoravel: true,
      itens: [
        "Seu trabalho tem sentido e significado para você?",
        "Você sente que o seu trabalho é importante?",
        "Você se sente motivado(a) e envolvido(a) com o seu trabalho?",
      ],
    },
    {
      nome: "Previsibilidade",
      favoravel: true,
      itens: [
        "No seu trabalho, você é informado(a) com antecedência sobre decisões e mudanças importantes?",
        "Você recebe todas as informações de que precisa para realizar bem o seu trabalho?",
      ],
    },
    {
      nome: "Suporte Social de Colegas",
      favoravel: true,
      itens: [
        "Seus colegas de trabalho estão dispostos a ouvir seus problemas relacionados ao trabalho?",
        "Seus colegas de trabalho colaboram com você?",
        "Seus colegas de trabalho são amigáveis para com você?",
      ],
    },
    {
      nome: "Suporte Social de Superiores",
      favoravel: true,
      itens: [
        "Seu superior imediato reconhece o bom trabalho que você realiza?",
        "Seu superior lhe oferece ajuda e apoio quando você precisa?",
        "Seu superior é acessível quando você precisa conversar?",
      ],
    },
    {
      nome: "Qualidade da Liderança",
      favoravel: true,
      itens: [
        "Seu superior planeja e organiza o trabalho de forma eficiente?",
        "Seu superior resolve conflitos de forma justa?",
        "Seu superior comunica informações importantes de forma clara?",
        "Seu superior distribui o trabalho de forma equitativa entre os trabalhadores?",
      ],
    },
    {
      nome: "Insegurança no Emprego",
      favoravel: false,
      itens: [
        "Você está preocupado(a) com a possibilidade de ser demitido(a)?",
        "Você está preocupado(a) com o futuro do seu emprego?",
        "Você está preocupado(a) com a possibilidade de ser transferido(a) contra a sua vontade?",
        "Você está preocupado(a) com mudanças indesejadas nas suas condições de trabalho?",
      ],
    },
    {
      nome: "Saúde e Bem-estar Geral",
      favoravel: true,
      itens: [
        "Em geral, como você avalia a sua saúde?",
        "Você tem energia suficiente para suas atividades cotidianas?",
        "Você tem se sentido bem-disposto(a) e de bom humor ultimamente?",
        "Você se sente satisfeito(a) com o seu trabalho no geral?",
        "Você consegue equilibrar bem o trabalho com a sua vida pessoal?",
        "Você consegue se desligar do trabalho quando está fora do horário de expediente?",
      ],
    },
  ],
};

// ─── VERSÃO MÉDIA (87 itens, 23 dimensões) ────────────────────────────────
export const COPSOQ_MEDIA = {
  id: "media",
  nome: "COPSOQ II-Br — Versão Média",
  totalItens: 87,
  uso: "Diagnóstico aprofundado para PGR — empresas de médio e grande porte",
  tempo: "30–40 min",
  dimensoes: [
    // ── Dimensões da Versão Curta (mantidas) ───────────────────────────
    ...COPSOQ_CURTA.dimensoes,
    // ── Dimensões adicionais ────────────────────────────────────────────
    {
      nome: "Ritmo de Trabalho",
      favoravel: false,
      itens: [
        "O seu ritmo de trabalho é intenso e acelerado durante todo o dia?",
        "Você trabalha sob pressão de tempo de forma constante?",
        "Com que frequência você não dispõe de pausas suficientes durante o trabalho?",
      ],
    },
    {
      nome: "Demandas Cognitivas",
      favoravel: false,
      itens: [
        "Seu trabalho exige que você tome decisões complexas?",
        "Seu trabalho exige que você memorize grandes quantidades de informação?",
        "Seu trabalho exige um alto nível de concentração por longos períodos?",
        "Seu trabalho exige que você resolva problemas complexos de forma constante?",
      ],
    },
    {
      nome: "Demandas para Esconder Emoções",
      favoravel: false,
      itens: [
        "Você precisa manter uma aparência positiva no trabalho, mesmo quando não está se sentindo bem?",
        "Seu trabalho exige que você seja amigável com todos, independente do seu estado emocional?",
        "Com que frequência você tem que esconder seus sentimentos para parecer profissional?",
      ],
    },
    {
      nome: "Conflito de Papel",
      favoravel: false,
      itens: [
        "Você recebe solicitações conflitantes de diferentes pessoas no trabalho?",
        "Às vezes você precisa fazer coisas que vão contra suas convicções éticas ou profissionais?",
        "Você realiza tarefas que parecem desnecessárias ou sem sentido?",
        "Você é solicitado a realizar tarefas sem os recursos ou informações necessários?",
      ],
    },
    {
      nome: "Clareza de Papel",
      favoravel: true,
      itens: [
        "Você sabe exatamente quais são as suas responsabilidades no trabalho?",
        "Você sabe exatamente o que é esperado de você no trabalho?",
        "Você tem objetivos e metas de trabalho claramente definidos?",
        "Você sabe com antecedência os resultados esperados do seu trabalho?",
      ],
    },
    {
      nome: "Comprometimento Organizacional",
      favoravel: true,
      itens: [
        "Você se sente parte integrante desta empresa?",
        "Você recomendaria esta empresa como um bom lugar para trabalhar?",
        "Você tem orgulho de fazer parte desta empresa?",
      ],
    },
    {
      nome: "Feedback no Trabalho",
      favoravel: true,
      itens: [
        "Você recebe feedback claro sobre a qualidade do seu trabalho?",
        "Você sabe quando está desempenhando o seu trabalho de forma satisfatória?",
        "Seus esforços e contribuições no trabalho são reconhecidos?",
      ],
    },
    {
      nome: "Burnout / Esgotamento Mental",
      favoravel: false,
      itens: [
        "Com que frequência você se sente emocionalmente esgotado(a) pelo seu trabalho?",
        "Com que frequência você se sente exausto(a) ao final de um dia de trabalho?",
        "Com que frequência você acorda sem disposição para enfrentar mais um dia de trabalho?",
        "Com que frequência você sente que não aguenta mais o volume de trabalho?",
        "Com que frequência você se sente completamente sem energia após o trabalho?",
      ],
    },
    {
      nome: "Estresse",
      favoravel: false,
      itens: [
        "Com que frequência você se sente tenso(a) ou irritado(a) no trabalho?",
        "Com que frequência você sente que o estresse do trabalho afeta a sua saúde?",
        "Com que frequência você tem dificuldade de concentração por causa do estresse?",
        "Com que frequência você se sente sobrecarregado(a) pelas demandas do trabalho?",
      ],
    },
    {
      nome: "Interface Trabalho-Família",
      favoravel: false,
      itens: [
        "Com que frequência o trabalho interfere em suas responsabilidades familiares ou pessoais?",
        "Com que frequência você pensa em problemas do trabalho quando está fora do expediente?",
        "Com que frequência o trabalho lhe impede de dedicar tempo a atividades de lazer ou descanso?",
      ],
    },
    {
      nome: "Comunidade Social no Trabalho",
      favoravel: true,
      itens: [
        "Existe um bom ambiente social e de convivência no seu local de trabalho?",
        "Seus colegas de trabalho se ajudam mutuamente?",
        "No seu trabalho, existe um bom espírito de equipe e cooperação?",
      ],
    },
    {
      nome: "Comportamentos Ofensivos",
      favoravel: false,
      itens: [
        "Você é exposto(a) a comentários, piadas ou atitudes humilhantes no trabalho?",
        "Você é exposto(a) a situações de assédio moral (pressão, isolamento, humilhação)?",
        "Você é exposto(a) a agressões verbais ou conflitos hostis no trabalho?",
        "Você é exposto(a) a ameaças físicas ou comportamentos violentos no trabalho?",
        "Você sofre ou já sofreu discriminação por sexo, idade, origem étnica ou outra característica?",
        "Você é exposto(a) a comportamentos de assédio sexual no trabalho?",
        "Com que frequência situações de desrespeito são normalizadas no seu ambiente de trabalho?",
        "Com que frequência você presencia colegas sendo tratados de forma desrespeitosa?",
      ],
    },
  ],
};

// ─── VERSÃO LONGA (128 itens, 28 dimensões) ───────────────────────────────
export const COPSOQ_LONGA = {
  id: "longa",
  nome: "COPSOQ II-Br — Versão Longa",
  totalItens: 128,
  uso: "Pesquisa científica, perícia, validação clínica e nexo causal",
  tempo: "45–60 min",
  dimensoes: [
    // ── Todas as dimensões da Versão Média ──────────────────────────────
    ...COPSOQ_MEDIA.dimensoes,
    // ── Dimensões adicionais da Versão Longa ────────────────────────────
    {
      nome: "Sintomas Depressivos",
      favoravel: false,
      itens: [
        "Com que frequência você se sentiu triste ou sem esperança ultimamente?",
        "Com que frequência você perdeu o interesse nas atividades que normalmente gosta?",
        "Com que frequência você se sentiu sem energia ou fatigado(a) sem motivo aparente?",
        "Com que frequência você teve dificuldade para dormir ou dormiu em excesso?",
        "Com que frequência você teve pensamentos negativos ou de autodepreciação?",
        "Com que frequência você teve dificuldade de concentração ou de tomar decisões simples?",
      ],
    },
    {
      nome: "Satisfação com Condições de Trabalho",
      favoravel: true,
      itens: [
        "Quão satisfeito(a) você está com as suas perspectivas de carreira e desenvolvimento?",
        "Quão satisfeito(a) você está com o ambiente físico do trabalho?",
        "Quão satisfeito(a) você está com a forma como suas habilidades são utilizadas?",
        "Quão satisfeito(a) você está com o seu salário e benefícios?",
        "Quão satisfeito(a) você está com a cultura e os valores desta empresa?",
        "Quão satisfeito(a) você está com a forma como a empresa gerencia o seu trabalho?",
        "Quão satisfeito(a) você está com o equilíbrio promovido entre trabalho e vida pessoal?",
      ],
    },
    {
      nome: "Confiança e Justiça Organizacional",
      favoravel: true,
      itens: [
        "Esta empresa trata seus trabalhadores de forma justa e equitativa?",
        "As oportunidades de crescimento são distribuídas de forma justa nesta empresa?",
        "Você confia na gestão e nas decisões da empresa?",
        "Você sente que a empresa se preocupa genuinamente com o bem-estar dos trabalhadores?",
        "Você acredita que as decisões da empresa são tomadas de forma transparente?",
        "As promoções e reconhecimentos são distribuídos com justiça?",
        "Você se sente tratado(a) com respeito e dignidade pela empresa?",
        "A empresa cumpre suas promessas e compromissos com os trabalhadores?",
      ],
    },
    {
      nome: "Exigências Físicas",
      favoravel: false,
      itens: [
        "Seu trabalho exige levantamento ou transporte de cargas pesadas?",
        "Seu trabalho envolve posturas físicas desconfortáveis ou fatigantes?",
        "Seu trabalho exige movimentos repetitivos por longos períodos?",
        "Seu trabalho envolve exposição a condições físicas adversas (calor, frio, ruído, vibração)?",
        "Seu trabalho causa dores físicas ou desconforto frequente?",
      ],
    },
    {
      nome: "Autonomia e Autoeficácia",
      favoravel: true,
      itens: [
        "Você se sente capaz de lidar com os desafios do seu trabalho?",
        "Você tem as competências necessárias para realizar bem o seu trabalho?",
        "Você sente que tem controle sobre a qualidade do seu próprio trabalho?",
        "Você sente que pode propor e implementar melhorias no seu trabalho?",
        "Quando surgem problemas, você consegue encontrar soluções eficazes?",
        "Você acredita que pode fazer diferença positiva no seu ambiente de trabalho?",
      ],
    },
    {
      nome: "Comportamentos de Segurança Organizacional",
      favoravel: true,
      itens: [
        "A empresa tem políticas claras de prevenção ao assédio e discriminação?",
        "Você se sente seguro(a) para relatar problemas de saúde mental ao trabalho?",
        "A empresa oferece suporte psicológico ou emocional quando necessário?",
        "Existem canais efetivos para reportar problemas relacionados ao trabalho?",
        "A empresa realiza pesquisas de clima ou bem-estar com os trabalhadores?",
        "Você recebe treinamentos sobre saúde mental e gestão do estresse?",
        "A empresa promove uma cultura de equilíbrio saudável entre trabalho e vida pessoal?",
        "As lideranças dão exemplo de comportamentos saudáveis no trabalho?",
        "A empresa avalia periodicamente os riscos psicossociais no ambiente de trabalho?",
      ],
    },
  ],
};

// ─── MAPA DE VERSÕES ────────────────────────────────────────────────────────
export const COPSOQ_VERSOES = {
  curta: COPSOQ_CURTA,
  media: COPSOQ_MEDIA,
  longa: COPSOQ_LONGA,
};

export function versaoPorTipo(tipo) {
  if (!tipo) return null;
  const t = tipo.toLowerCase();
  if (t.includes("longa")) return COPSOQ_LONGA;
  if (t.includes("média") || t.includes("media")) return COPSOQ_MEDIA;
  if (t.includes("curta")) return COPSOQ_CURTA;
  return null;
}

export function buildDimensoesConfig(versao) {
  return versao.dimensoes.map((d) => ({
    nome: d.nome,
    count: d.itens.length,
    favoravel: d.favoravel,
  }));
}

export function buildItensFlat(versao) {
  return versao.dimensoes.flatMap((d) => d.itens);
}
