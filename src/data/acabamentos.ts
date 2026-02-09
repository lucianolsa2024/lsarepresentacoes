// Coleção de Acabamentos 2026

export interface AcabamentoOption {
  name: string;
}

export interface AcabamentoCategory {
  category: string;
  description?: string;
  options: AcabamentoOption[];
}

export const ACABAMENTOS: AcabamentoCategory[] = [
  {
    category: 'VERNIZ',
    options: [
      { name: 'AREIA' },
      { name: 'CACAU' },
      { name: 'CAJU' },
      { name: 'EBANIZADO' },
      { name: 'JEQUITIBA NATURAL' },
      { name: 'MASCAVO' },
      { name: 'NOZES' },
      { name: 'TAUARI NATURAL' },
    ],
  },
  {
    category: 'PINTURA MTX',
    options: [
      { name: 'CINZA' },
      { name: 'CONHAQUE' },
      { name: 'GRAFITE' },
      { name: 'MARROM' },
      { name: 'PRETO' },
    ],
  },
  {
    category: 'LACA METALIZADA',
    description: 'Cor de acabamento para madeira, lâminas laqueadas, aço carbono, vidro fosco, vidro transparente',
    options: [
      { name: 'BRONZE' },
      { name: 'CAPPUCCINO' },
      { name: 'CHAMPAGNE' },
      { name: 'CHUMBO' },
      { name: 'CONHAQUE' },
      { name: 'DOURADO' },
      { name: 'GOLDEN' },
      { name: 'GRAPHITE' },
      { name: 'PLATINUM' },
      { name: 'PRETO' },
      { name: 'TITANIUM' },
    ],
  },
  {
    category: 'LACA FOSCA',
    description: 'Cor de acabamento para madeira, lâminas laqueadas, aço carbono, vidro fosco, vidro transparente',
    options: [
      { name: 'BRANCO' },
      { name: 'DOVE BEIGE' },
      { name: 'FEND' },
      { name: 'GREIGE' },
      { name: 'MOON' },
      { name: 'PRETO' },
    ],
  },
  {
    category: 'LAMINADO',
    options: [
      { name: 'CARVALHO AMERICANO' },
      { name: 'EBONY MACASSAR' },
      { name: 'EBONY PRETO' },
      { name: 'FREIJÓ' },
      { name: 'GREY' },
      { name: 'ITALIAN ELM' },
      { name: 'NATURAL' },
      { name: 'NOGUEIRA AMERICANO' },
      { name: 'PAU FERRO' },
      { name: 'WALNUT' },
      { name: 'WENGUE' },
    ],
  },
  {
    category: 'MÁRMORE',
    options: [
      { name: 'BRONZE ARMANI' },
      { name: 'GRIGIO' },
      { name: 'NERO' },
      { name: 'NEW ROME' },
      { name: 'NUVOLATO' },
      { name: 'TAJ MAHAL' },
      { name: 'TRAVERTINO' },
      { name: 'VERDE GUATEMALA' },
    ],
  },
  {
    category: 'MÁRMORE LEVIGADO',
    options: [
      { name: 'GRIGIO' },
      { name: 'NEW ROME' },
      { name: 'NUVOLATO' },
      { name: 'TAJ MAHAL' },
      { name: 'VERDE GUATEMALA' },
    ],
  },
  {
    category: 'VIDRO',
    options: [
      { name: 'BRONZE' },
      { name: 'EXTRA CLEAR' },
      { name: 'FUMÊ' },
      { name: 'FOSCO' },
      { name: 'INCOLOR' },
    ],
  },
  {
    category: 'VIDRO TEXTURIZADO',
    options: [
      { name: 'ÂMBAR' },
      { name: 'EXTRA CLEAR' },
      { name: 'FUMÊ' },
      { name: 'INCOLOR' },
    ],
  },
  {
    category: 'CERÂMICA',
    options: [
      { name: 'AREIA' },
      { name: 'BASALTO' },
      { name: 'ESMALTADO WHITE' },
    ],
  },
  {
    category: 'PALHA VIENA',
    options: [
      { name: 'CASTANHO' },
      { name: 'NATURAL' },
      { name: 'PRETO' },
    ],
  },
  {
    category: 'CORDÃO COURO',
    options: [
      { name: 'BEGE' },
      { name: 'CAFÉ' },
      { name: 'OFF-WHITE' },
      { name: 'PRETO' },
      { name: 'TERRACOTA' },
    ],
  },
  {
    category: 'ESPELHO',
    options: [
      { name: 'BRONZE' },
      { name: 'SILVER' },
      { name: 'GREY' },
    ],
  },
];

// Flatten all acabamento options into a simple list of "CATEGORY - NAME"
export function getAllAcabamentos(): string[] {
  return ACABAMENTOS.flatMap(cat =>
    cat.options.map(opt => `${cat.category} - ${opt.name}`)
  );
}

// Get acabamento categories as simple string list (for BASE_OPTIONS replacement)
export function getAcabamentoCategories(): string[] {
  return ACABAMENTOS.map(cat => cat.category);
}

// Get options for a specific category
export function getAcabamentosByCategory(category: string): string[] {
  const cat = ACABAMENTOS.find(c => c.category === category);
  return cat ? cat.options.map(o => o.name) : [];
}
