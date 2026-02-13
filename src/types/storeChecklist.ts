export interface StoreChecklistData {
  // Header
  cliente: string;
  cidade: string;
  dataVisita: string;
  representante: string;

  // Produtos Expostos
  produtosExpostos: string[]; // product names from DB
  concorrentesExpostos: string;
  qtdProdutosNossos: number | null;
  qtdProdutosConcorrentes: number | null;
  necessidadeAtualizacao: string;

  // Ações
  acoesAndamento: string;

  // Performance
  fluxoLoja: 'alto' | 'medio' | 'baixo' | '';
  ticketMedio: 'subiu' | 'caiu' | 'estavel' | '';
  categoriaMaisVende: string;
  produtoTravado: string;

  // Comercial
  lojistaEntendeuMargem: boolean | null;
  comparouConcorrentes: boolean | null;
  dandoDesconto: boolean | null;
  vendedorPrefereProduto: string;
  jaPerdeVendaMotivo: string;
  clienteComparaComMarca: string;

  // Oportunidade
  oportunidadeIdentificada: string;
  concorrenteGanhandoEspaco: string;
  humorLojista: 'positivo' | 'neutro' | 'negativo' | '';

  // Próximos passos
  existeProjetoAndamento: string;
  chanceExpandirShowroom: string;
  proximoPasso: string;
  dataProximoFollowup: string;
  scoreLoja: 'A' | 'B' | 'C' | '';
  observacoes: string;

  // Assistência
  assistenciaIdentificada: boolean | null;
  assistenciaProduto: string;
  assistenciaDefeito: string;
  assistenciaDescricao: string;
}

export const EMPTY_STORE_CHECKLIST: StoreChecklistData = {
  cliente: '',
  cidade: '',
  dataVisita: new Date().toISOString().split('T')[0],
  representante: '',
  produtosExpostos: [],
  concorrentesExpostos: '',
  qtdProdutosNossos: null,
  qtdProdutosConcorrentes: null,
  necessidadeAtualizacao: '',
  acoesAndamento: '',
  fluxoLoja: '',
  ticketMedio: '',
  categoriaMaisVende: '',
  produtoTravado: '',
  lojistaEntendeuMargem: null,
  comparouConcorrentes: null,
  dandoDesconto: null,
  vendedorPrefereProduto: '',
  jaPerdeVendaMotivo: '',
  clienteComparaComMarca: '',
  oportunidadeIdentificada: '',
  concorrenteGanhandoEspaco: '',
  humorLojista: '',
  existeProjetoAndamento: '',
  chanceExpandirShowroom: '',
  proximoPasso: '',
  dataProximoFollowup: '',
  scoreLoja: '',
  observacoes: '',
  assistenciaIdentificada: null,
  assistenciaProduto: '',
  assistenciaDefeito: '',
  assistenciaDescricao: '',
};

export const CHECKLIST_SECTIONS = [
  {
    title: '🛋️ Produtos Expostos & Share',
    fields: ['produtosExpostos', 'concorrentesExpostos', 'qtdProdutosNossos', 'qtdProdutosConcorrentes', 'necessidadeAtualizacao'] as const,
  },
  {
    title: '📋 Ações em Andamento / Futuras',
    fields: ['acoesAndamento'] as const,
  },
  {
    title: '📊 Performance da Loja',
    fields: ['fluxoLoja', 'ticketMedio', 'categoriaMaisVende', 'produtoTravado'] as const,
  },
  {
    title: '💼 Comercial',
    fields: ['lojistaEntendeuMargem', 'comparouConcorrentes', 'dandoDesconto', 'vendedorPrefereProduto', 'jaPerdeVendaMotivo', 'clienteComparaComMarca'] as const,
  },
  {
    title: '🎯 Oportunidades',
    fields: ['oportunidadeIdentificada', 'concorrenteGanhandoEspaco', 'humorLojista'] as const,
  },
  {
    title: '📋 Próximos Passos',
    fields: ['existeProjetoAndamento', 'chanceExpandirShowroom', 'proximoPasso', 'dataProximoFollowup', 'scoreLoja', 'observacoes'] as const,
  },
  {
    title: '🔧 Assistência Técnica',
    fields: ['assistenciaIdentificada', 'assistenciaProduto', 'assistenciaDefeito', 'assistenciaDescricao'] as const,
  },
];

export const FIELD_LABELS: Record<string, string> = {
  produtosExpostos: 'Produtos Expostos (nossos)',
  concorrentesExpostos: 'Concorrentes Expostos',
  qtdProdutosNossos: 'Qtd Produtos Nossos',
  qtdProdutosConcorrentes: 'Qtd Produtos Concorrentes',
  necessidadeAtualizacao: 'Necessidade de Atualização',
  acoesAndamento: 'Ações em Andamento / Futuras',
  fluxoLoja: 'Fluxo da Loja',
  ticketMedio: 'Ticket Médio',
  categoriaMaisVende: 'Categoria que Mais Vende',
  produtoTravado: 'Produto Travado',
  lojistaEntendeuMargem: 'Lojista Entendeu Nova Margem?',
  comparouConcorrentes: 'Comparou com Concorrentes?',
  dandoDesconto: 'Está Dando Desconto ao Cliente?',
  vendedorPrefereProduto: 'Vendedor Prefere Qual Produto?',
  jaPerdeVendaMotivo: 'Já Perdeu Venda? Motivo',
  clienteComparaComMarca: 'Cliente Compara com Qual Marca?',
  oportunidadeIdentificada: 'Oportunidade Identificada',
  concorrenteGanhandoEspaco: 'Concorrente Ganhando Espaço?',
  humorLojista: 'Humor do Lojista',
  existeProjetoAndamento: 'Existe Projeto em Andamento?',
  chanceExpandirShowroom: 'Chance de Expandir Showroom?',
  proximoPasso: 'Próximo Passo',
  dataProximoFollowup: 'Data do Próximo Follow-up',
  scoreLoja: 'Score da Loja',
  observacoes: 'Observações',
  assistenciaIdentificada: 'Assistência Identificada?',
  assistenciaProduto: 'Produto com Defeito',
  assistenciaDefeito: 'Defeito Identificado',
  assistenciaDescricao: 'Detalhes da Assistência',
};
