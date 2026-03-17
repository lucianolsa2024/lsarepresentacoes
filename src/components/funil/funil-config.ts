/**
 * FUNIL CORPORATIVO — Configuração de Fases e Checklists
 * Público-alvo: Incorporadoras, Construtoras e Escritórios de Arquitetura
 * ─────────────────────────────────────────────────────────────────
 */

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type FaseId =
  | "prospeccao"
  | "qualificacao"
  | "elaboracao_proposta"
  | "proposta_enviada"
  | "negociacao"
  | "fechado_ganho"
  | "fechado_perdido";

export type TipoResposta = "boolean" | "select" | "text";

export interface AtividadeAutomatica {
  titulo:     string;
  prazo_dias: number;
  prioridade: "alta" | "media" | "baixa";
}

export interface Pergunta {
  id:           string;
  texto:        string;
  tipo:         TipoResposta;
  opcoes?:      string[];
  obrigatoria:  boolean;
  bloqueia_se:  "nao" | "sim" | null;
  atividade_se_nao?:   AtividadeAutomatica;
  atividade_se_sim?:   AtividadeAutomatica;
  atividade_por_opcao?: Record<string, AtividadeAutomatica>;
  dica?:        string;
  para_tipo?:   ("incorporadora" | "construtora" | "arquitetura")[];  // null = todos
}

export interface Transicao {
  de:                     FaseId;
  para:                   FaseId;
  titulo:                 string;
  descricao:              string;
  minimo_para_avancar:    number;
  perguntas:              Pergunta[];
}

export interface Fase {
  id:    FaseId;
  nome:  string;
  cor:   string;
  ordem: number;
}

// ── Fases do Funil ────────────────────────────────────────────────────────────

export const FASES: Fase[] = [
  { id: "prospeccao",          nome: "Prospecção",             cor: "#3b82f6", ordem: 1 },
  { id: "qualificacao",        nome: "Qualificação",           cor: "#a855f7", ordem: 2 },
  { id: "elaboracao_proposta", nome: "Elaboração de Proposta", cor: "#14b8a6", ordem: 3 },
  { id: "proposta_enviada",    nome: "Proposta Enviada",       cor: "#eab308", ordem: 4 },
  { id: "negociacao",          nome: "Negociação",             cor: "#f97316", ordem: 5 },
  { id: "fechado_ganho",       nome: "Fechado — Ganho",        cor: "#22c55e", ordem: 6 },
  { id: "fechado_perdido",     nome: "Fechado — Perdido",      cor: "#ef4444", ordem: 7 },
];

// ── Checklists de Transição ───────────────────────────────────────────────────

export const TRANSICOES: Transicao[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Prospecção → Qualificação
  // ══════════════════════════════════════════════════════════════════════════
  {
    de:    "prospeccao",
    para:  "qualificacao",
    titulo: "Qualificar o lead",
    descricao: "Confirme que o lead tem projeto real e perfil para avançar.",
    minimo_para_avancar: 3,
    perguntas: [
      {
        id:          "tipo_cliente",
        texto:       "Tipo de cliente",
        tipo:        "select",
        opcoes:      ["Incorporadora", "Construtora", "Escritório de Arquitetura", "Outro corporativo"],
        obrigatoria: true,
        bloqueia_se: null,
        dica:        "Define o perfil de abordagem e as perguntas mais relevantes.",
      },
      {
        id:          "linkedin_pesquisado",
        texto:       "Empresa e contato pesquisados no LinkedIn?",
        tipo:        "boolean",
        obrigatoria: false,
        bloqueia_se: null,
        atividade_se_nao: {
          titulo:     "Pesquisar empresa e contato no LinkedIn antes do primeiro contato",
          prazo_dias: 1,
          prioridade: "media",
        },
        dica: "Verifique: cargo atual, projetos recentes, conexões em comum, atividade e tamanho da empresa.",
      },
      {
        id:          "linkedin_url",
        texto:       "URL do perfil LinkedIn do contato",
        tipo:        "text",
        obrigatoria: false,
        bloqueia_se: null,
        dica:        "Cole o link do perfil. Ex: linkedin.com/in/nome-sobrenome",
      },
      {
        id:          "contato_identificado",
        texto:       "Contato responsável identificado (nome e cargo)?",
        tipo:        "boolean",
        obrigatoria: true,
        bloqueia_se: "nao",
        atividade_se_nao: {
          titulo:     "Identificar contato responsável pelo projeto",
          prazo_dias: 2,
          prioridade: "alta",
        },
      },
      {
        id:          "projeto_real",
        texto:       "Existe projeto real em andamento ou lançamento previsto?",
        tipo:        "boolean",
        obrigatoria: true,
        bloqueia_se: "nao",
        dica:        "Lead sem projeto concreto não deve avançar — cria alerta para retomar no futuro.",
        atividade_se_nao: {
          titulo:     "Agendar contato de retomada em 60 dias (projeto futuro)",
          prazo_dias: 60,
          prioridade: "baixa",
        },
      },
      {
        id:          "tipo_empreendimento",
        texto:       "Tipo de empreendimento / projeto",
        tipo:        "select",
        opcoes:      ["Residencial", "Comercial / Corporativo", "Hotel / Pousada / Hospitalidade", "Hospitalar / Clínica", "Misto"],
        obrigatoria: true,
        bloqueia_se: null,
        dica:        "Influencia especificação técnica, prazo e proposta.",
      },
      {
        id:          "volume_estimado",
        texto:       "Volume estimado do projeto",
        tipo:        "select",
        opcoes:      ["Pequeno (até 20 unidades / peças)", "Médio (20–100 unidades / peças)", "Grande (100+ unidades / peças)", "Projeto único de alto padrão"],
        obrigatoria: false,
        bloqueia_se: null,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Qualificação → Elaboração de Proposta
  // ══════════════════════════════════════════════════════════════════════════
  {
    de:    "qualificacao",
    para:  "elaboracao_proposta",
    titulo: "Preparar proposta técnica",
    descricao: "Certifique-se de ter todas as informações para montar uma proposta precisa para este tipo de cliente.",
    minimo_para_avancar: 4,
    perguntas: [
      {
        id:          "decisor_identificado",
        texto:       "O decisor de compra foi identificado?",
        tipo:        "boolean",
        obrigatoria: true,
        bloqueia_se: "nao",
        atividade_se_nao: {
          titulo:     "Identificar decisor de compra / aprovação do fornecedor",
          prazo_dias: 2,
          prioridade: "alta",
        },
        dica: "Incorporadora: diretoria de suprimentos. Construtora: engenheiro/comprador. Arquitetura: o próprio arquiteto.",
      },
      {
        id:          "escopo_definido",
        texto:       "Escopo definido (ambientes, peças e quantidades levantados)?",
        tipo:        "boolean",
        obrigatoria: true,
        bloqueia_se: "nao",
        atividade_se_nao: {
          titulo:     "Agendar visita técnica para levantamento de escopo",
          prazo_dias: 3,
          prioridade: "alta",
        },
      },
      {
        id:          "memorial_existente",
        texto:       "Existe memorial descritivo ou especificação técnica de estofamento?",
        tipo:        "boolean",
        obrigatoria: false,
        bloqueia_se: null,
        atividade_se_nao: {
          titulo:     "Oferecer apoio técnico para elaborar especificação do memorial",
          prazo_dias: 5,
          prioridade: "media",
        },
        dica: "Muito comum em incorporadoras e quando especificado por arquiteto.",
      },
      {
        id:          "prazo_obra",
        texto:       "Prazo de entrega da obra ou do projeto está definido?",
        tipo:        "boolean",
        obrigatoria: true,
        bloqueia_se: null,
        atividade_se_nao: {
          titulo:     "Confirmar cronograma da obra / projeto com responsável",
          prazo_dias: 4,
          prioridade: "media",
        },
        dica: "Essencial para alinhar prazo de produção e entrega.",
      },
      {
        id:          "budget_levantado",
        texto:       "Budget por unidade ou total foi levantado com o cliente?",
        tipo:        "select",
        opcoes:      ["Sim, confirmado", "Referência aproximada", "Não informado"],
        obrigatoria: false,
        bloqueia_se: null,
        atividade_por_opcao: {
          "Não informado": {
            titulo:     "Qualificar budget com decisor antes de montar proposta",
            prazo_dias: 2,
            prioridade: "alta",
          },
        },
      },
      {
        id:          "rt_apresentada",
        texto:       "RT (Reserva Técnica) foi apresentada e discutida?",
        tipo:        "boolean",
        obrigatoria: false,
        bloqueia_se: null,
        atividade_se_nao: {
          titulo:     "Apresentar proposta de RT ao arquiteto / responsável",
          prazo_dias: 3,
          prioridade: "alta",
        },
        dica:        "Aplicável principalmente para escritórios de arquitetura.",
        para_tipo:   ["arquitetura"],
      },
      {
        id:          "amostras_solicitadas",
        texto:       "Amostras físicas de tecido / material foram solicitadas ou apresentadas?",
        tipo:        "boolean",
        obrigatoria: false,
        bloqueia_se: null,
        atividade_se_nao: {
          titulo:     "Enviar book de amostras físicas ao cliente / arquiteto",
          prazo_dias: 3,
          prioridade: "media",
        },
        dica: "Projetos de alto padrão normalmente exigem aprovação de amostra antes da proposta.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Elaboração de Proposta → Proposta Enviada
  // ══════════════════════════════════════════════════════════════════════════
  {
    de:    "elaboracao_proposta",
    para:  "proposta_enviada",
    titulo: "Enviar proposta técnica e comercial",
    descricao: "A proposta deve estar completa tecnicamente, aprovada internamente e enviada ao decisor.",
    minimo_para_avancar: 4,
    perguntas: [
      {
        id:          "proposta_tecnica_ok",
        texto:       "Proposta técnica elaborada (memorial de materiais, especificações, quantidades)?",
        tipo:        "boolean",
        obrigatoria: true,
        bloqueia_se: "nao",
      },
      {
        id:          "amostras_aprovadas",
        texto:       "Amostras de material / tecido aprovadas pelo cliente ou arquiteto?",
        tipo:        "boolean",
        obrigatoria: false,
        bloqueia_se: null,
        atividade_se_nao: {
          titulo:     "Enviar e aprovar amostras físicas antes da assinatura",
          prazo_dias: 5,
          prioridade: "media",
        },
        dica: "Aprovação de amostra evita revisão de proposta após envio.",
      },
      {
        id:          "aprovacao_interna",
        texto:       "Margem, condições e prazo de entrega aprovados internamente?",
        tipo:        "boolean",
        obrigatoria: true,
        bloqueia_se: "nao",
        dica:        "Verificar alçada — especialmente em projetos grandes ou com RT embutida.",
      },
      {
        id:          "proposta_enviada_decisor",
        texto:       "Proposta enviada diretamente ao decisor de compra?",
        tipo:        "boolean",
        obrigatoria: true,
        bloqueia_se: "nao",
        atividade_se_sim: {
          titulo:     "Follow-up da proposta técnica e comercial",
          prazo_dias: 2,
          prioridade: "alta",
        },
      },
      {
        id:          "apresentacao_agendada",
        texto:       "Apresentação técnica presencial ou por vídeo foi agendada?",
        tipo:        "boolean",
        obrigatoria: false,
        bloqueia_se: null,
        atividade_se_nao: {
          titulo:     "Agendar apresentação técnica da proposta com decisores",
          prazo_dias: 3,
          prioridade: "media",
        },
        dica: "Importante para projetos acima de R$ 50k ou com múltiplos decisores.",
      },
      {
        id:          "followup_agendado",
        texto:       "Data de follow-up definida e registrada?",
        tipo:        "boolean",
        obrigatoria: true,
        bloqueia_se: "nao",
        atividade_se_nao: {
          titulo:     "Definir e registrar data de follow-up com o cliente",
          prazo_dias: 1,
          prioridade: "alta",
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Proposta Enviada → Negociação
  // ══════════════════════════════════════════════════════════════════════════
  {
    de:    "proposta_enviada",
    para:  "negociacao",
    titulo: "Iniciar negociação",
    descricao: "O cliente analisou a proposta e está pronto para negociar condições.",
    minimo_para_avancar: 2,
    perguntas: [
      {
        id:          "recebimento_confirmado",
        texto:       "Cliente confirmou o recebimento e analisou a proposta?",
        tipo:        "boolean",
        obrigatoria: true,
        bloqueia_se: "nao",
        atividade_se_nao: {
          titulo:     "Ligar para confirmar recebimento e análise da proposta",
          prazo_dias: 1,
          prioridade: "alta",
        },
      },
      {
        id:          "feedback_proposta",
        texto:       "Qual o feedback da proposta técnica e comercial?",
        tipo:        "select",
        opcoes:      ["Positivo — quer avançar", "Ajuste na especificação técnica", "Ajuste de preço / condições", "Sem retorno ainda"],
        obrigatoria: true,
        bloqueia_se: null,
        atividade_por_opcao: {
          "Ajuste na especificação técnica": {
            titulo:     "Revisar memorial técnico conforme solicitação do cliente",
            prazo_dias: 2,
            prioridade: "alta",
          },
          "Ajuste de preço / condições": {
            titulo:     "Apresentar alternativas de custo-benefício ao cliente",
            prazo_dias: 2,
            prioridade: "alta",
          },
          "Sem retorno ainda": {
            titulo:     "Contato urgente para retomada do processo",
            prazo_dias: 1,
            prioridade: "alta",
          },
        },
      },
      {
        id:          "cronograma_alinhado",
        texto:       "Cronograma de entrega foi alinhado com as fases da obra / projeto?",
        tipo:        "boolean",
        obrigatoria: false,
        bloqueia_se: null,
        atividade_se_nao: {
          titulo:     "Alinhar cronograma de entrega parcelada com responsável da obra",
          prazo_dias: 3,
          prioridade: "media",
        },
        dica: "Incorporadoras e construtoras normalmente precisam de entrega por fases.",
      },
      {
        id:          "aprovacao_comite",
        texto:       "É necessário aprovação de comitê ou diretoria do cliente?",
        tipo:        "boolean",
        obrigatoria: false,
        bloqueia_se: null,
        atividade_se_sim: {
          titulo:     "Acompanhar processo de aprovação interna do cliente",
          prazo_dias: 5,
          prioridade: "media",
        },
        dica: "Comum em incorporadoras e construtoras de médio e grande porte.",
        para_tipo:   ["incorporadora", "construtora"],
      },
      {
        id:          "especificado_memorial",
        texto:       "Produto foi inserido no memorial descritivo ou especificação do projeto?",
        tipo:        "boolean",
        obrigatoria: false,
        bloqueia_se: null,
        atividade_se_nao: {
          titulo:     "Solicitar inclusão no memorial descritivo do empreendimento",
          prazo_dias: 5,
          prioridade: "alta",
        },
        dica: "Quando especificado no memorial, reduz risco de troca por concorrente.",
        para_tipo:   ["incorporadora", "arquitetura"],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Negociação → Fechado (Ganho)
  // ══════════════════════════════════════════════════════════════════════════
  {
    de:    "negociacao",
    para:  "fechado_ganho",
    titulo: "Fechar venda",
    descricao: "Confirme todas as condições técnicas e comerciais antes de formalizar.",
    minimo_para_avancar: 4,
    perguntas: [
      {
        id:          "condicoes_acordadas",
        texto:       "Condições finais acordadas (preço, prazo de entrega, forma de pagamento)?",
        tipo:        "boolean",
        obrigatoria: true,
        bloqueia_se: "nao",
      },
      {
        id:          "pedido_assinado",
        texto:       "Pedido formal ou contrato assinado pelo cliente?",
        tipo:        "boolean",
        obrigatoria: true,
        bloqueia_se: "nao",
        atividade_se_nao: {
          titulo:     "Enviar minuta do contrato / pedido formal para assinatura",
          prazo_dias: 1,
          prioridade: "alta",
        },
      },
      {
        id:          "cronograma_fases_obra",
        texto:       "Cronograma de entrega por fase da obra / projeto definido?",
        tipo:        "boolean",
        obrigatoria: true,
        bloqueia_se: "nao",
        atividade_se_nao: {
          titulo:     "Definir cronograma de entregas parciais alinhado à obra",
          prazo_dias: 2,
          prioridade: "alta",
        },
        dica: "Projetos grandes normalmente têm entrega parcelada por bloco ou andar.",
      },
      {
        id:          "os_gerada",
        texto:       "Ordem de Serviço gerada no sistema?",
        tipo:        "boolean",
        obrigatoria: true,
        bloqueia_se: "nao",
        atividade_se_nao: {
          titulo:     "Gerar OS no sistema para início da produção",
          prazo_dias: 1,
          prioridade: "alta",
        },
      },
      {
        id:          "amostra_producao_aprovada",
        texto:       "Amostra de produção (piloto) aprovada pelo cliente ou arquiteto?",
        tipo:        "boolean",
        obrigatoria: false,
        bloqueia_se: null,
        atividade_se_nao: {
          titulo:     "Enviar amostra piloto de produção para aprovação final",
          prazo_dias: 5,
          prioridade: "media",
        },
        dica: "Recomendado para projetos de alto padrão e grandes volumes.",
      },
      {
        id:          "entrada_recebida",
        texto:       "Sinal / entrada recebida (se aplicável)?",
        tipo:        "boolean",
        obrigatoria: false,
        bloqueia_se: null,
        atividade_se_nao: {
          titulo:     "Confirmar recebimento do sinal com financeiro",
          prazo_dias: 2,
          prioridade: "media",
        },
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getTransicao(de: FaseId, para: FaseId): Transicao | null {
  return TRANSICOES.find(t => t.de === de && t.para === para) ?? null;
}

export function getProximaFase(faseAtual: FaseId): FaseId | null {
  const ordem = FASES.find(f => f.id === faseAtual)?.ordem;
  if (!ordem) return null;
  return FASES.find(f => f.ordem === ordem + 1 && f.id !== "fechado_perdido")?.id ?? null;
}

export function calcularPrazo(diasUteis: number): string {
  const hoje = new Date();
  let adicionados = 0;
  while (adicionados < diasUteis) {
    hoje.setDate(hoje.getDate() + 1);
    const dia = hoje.getDay();
    if (dia !== 0 && dia !== 6) adicionados++;
  }
  return hoje.toISOString().split("T")[0];
}
