export interface StoreChecklistData {
  // Header
  cliente: string;
  cidade: string;
  dataVisita: string;
  representante: string;

  // Performance
  fluxoLoja: 'alto' | 'medio' | 'baixo' | '';
  ticketMedio: 'subiu' | 'caiu' | 'estavel' | '';
  categoriaMaisVende: string;
  produtoTravado: string;

  // Showroom
  qtdProdutosShowroom: number | null;
  posicaoShowroom: 'quente' | 'fria' | '';
  produtoPrecisaAtualizacao: boolean | null;

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
}

export const EMPTY_STORE_CHECKLIST: StoreChecklistData = {
  cliente: '',
  cidade: '',
  dataVisita: new Date().toISOString().split('T')[0],
  representante: '',
  fluxoLoja: '',
  ticketMedio: '',
  categoriaMaisVende: '',
  produtoTravado: '',
  qtdProdutosShowroom: null,
  posicaoShowroom: '',
  produtoPrecisaAtualizacao: null,
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
};

export const CHECKLIST_SECTIONS = [
  {
    title: '📊 Performance da Loja',
    fields: ['fluxoLoja', 'ticketMedio', 'categoriaMaisVende', 'produtoTravado'] as const,
  },
  {
    title: '🏪 Showroom',
    fields: ['qtdProdutosShowroom', 'posicaoShowroom', 'produtoPrecisaAtualizacao'] as const,
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
];

export const FIELD_LABELS: Record<string, string> = {
  fluxoLoja: 'Fluxo da Loja',
  ticketMedio: 'Ticket Médio',
  categoriaMaisVende: 'Categoria que Mais Vende',
  produtoTravado: 'Produto Travado',
  qtdProdutosShowroom: 'Qtd Produtos em Showroom',
  posicaoShowroom: 'Posição do Showroom',
  produtoPrecisaAtualizacao: 'Produto Precisa Atualização?',
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
};
