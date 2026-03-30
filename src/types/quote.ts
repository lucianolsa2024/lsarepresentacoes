// Fabric price tiers for upholstered furniture
export const FABRIC_TIERS = ['SEM TEC', 'FORNECIDO', 'FX B', 'FX C', 'FX D', 'FX E', 'FX F', 'FX G', 'FX H', 'FX I', 'FX J', 'FX 3D', 'FX COURO'] as const;
export type FabricTier = typeof FABRIC_TIERS[number];

// Table finish tiers (mapped to existing price columns)
// These map to: FX B, FX C, FX D, FX E, FX F respectively
export const TABLE_TIERS = [
  { key: 'FX B' as FabricTier, label: 'Tampo: Vidro Fosco ou Clear / Corpo: Laca ou Lamina' },
  { key: 'FX C' as FabricTier, label: 'Tampo: Laca ou Lamina com ou sem Vidro Normal Pintado / Corpo: Laca ou Lamina' },
  { key: 'FX D' as FabricTier, label: 'Tampo: Mármore Especial / Corpo: Laca ou Lamina' },
  { key: 'FX E' as FabricTier, label: 'Tampo: Mármore Normal / Corpo: Laca ou Lamina' },
  { key: 'FX F' as FabricTier, label: 'Tampo ou Base em Recoro' },
] as const;

// Helper to check if a category is a table or buffet (no fabric)
export function isTableCategory(category: string): boolean {
  const lower = category.toLowerCase();
  return lower.includes('mesa') || lower.includes('buffet');
}

export interface ModulationSize {
  id: string;
  description: string;
  dimensions: string;
  length: string;
  depth: string;
  height: string;
  base: string; // Extracted from description (e.g., "FOSCA/METALIZADO", "MTX")
  fabricQuantity: number;
  prices: Record<FabricTier, number>;
}

export interface ProductModulation {
  id: string;
  name: string;
  description: string;
  sizes: ModulationSize[];
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  factory: string;
  modulations: ProductModulation[];
  hasBase: boolean;
  availableBases: string[];
  imageUrl?: string | null;
}

export interface QuoteItem {
  id: string;
  productId: string;
  productName: string;
  factory: string;
  modulation: string;
  modulationId: string;
  sizeId: string;
  sizeDescription: string;
  base: string;
  fabricTier: FabricTier;
  fabricDescription: string;
  price: number;
  quantity: number;
  observations: string;
  imageUrl?: string | null;
  itemDiscountValue?: number;
}

export type ClientType = 'lojista_alto' | 'lojista_medio' | 'corporativo' | 'escritorio_arquitetura';

export const CLIENT_TYPE_OPTIONS: { value: ClientType; label: string }[] = [
  { value: 'lojista_alto', label: 'Lojista Alto Padrão' },
  { value: 'lojista_medio', label: 'Lojista Médio Padrão' },
  { value: 'corporativo', label: 'Corporativo' },
  { value: 'escritorio_arquitetura', label: 'Escritório de Arquitetura' },
];

export interface ClientInfluencer {
  id?: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  notes: string;
}

export interface ClientData {
  name: string;
  company: string;
  tradeName?: string;
  document: string;
  phone: string;
  email: string;
  isNewClient: boolean;
  clientType?: ClientType;
  ownerEmail?: string;
  parentClientId?: string | null;
  inscricaoEstadual?: string;
  site?: string;
  segment?: string;
  defaultPaymentTerms?: string;
  notes?: string;
  representativeEmails?: string[];
  influencers?: ClientInfluencer[];
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export type FreightType = 'CIF' | 'FOB';

export type DiscountTier = 'diamante' | 'ouro' | 'prata' | 'bronze';

export const DISCOUNT_TIER_OPTIONS: { value: DiscountTier; label: string; prefix: string }[] = [
  { value: 'diamante', label: 'Diamante', prefix: 'D' },
  { value: 'ouro', label: 'Ouro', prefix: 'O' },
  { value: 'prata', label: 'Prata', prefix: 'P' },
  { value: 'bronze', label: 'Bronze', prefix: 'B' },
];

export interface PaymentConditions {
  method: 'avista' | 'parcelado' | 'entrada_parcelas';
  installments: number;
  installmentPlan: string;
  downPayment: number;
  discountTier?: DiscountTier;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  deliveryDays: number;
  carrier: string;
  freightType: FreightType;
  observations: string;
  representativeName: string;
  estimatedClosingDate: string;
  estimatedPrice: number;
}

export type QuoteStatus = 'orcamento' | 'pedido' | 'cancelado';

export const QUOTE_STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'pedido', label: 'Pedido' },
  { value: 'cancelado', label: 'Cancelado' },
];

export interface Quote {
  id: string;
  createdAt: string;
  client: ClientData;
  items: QuoteItem[];
  payment: PaymentConditions;
  subtotal: number;
  discount: number;
  total: number;
  status?: QuoteStatus;
  version?: number;
  parentQuoteId?: string | null;
}

export const INITIAL_CLIENT: ClientData = {
  name: '',
  company: '',
  document: '',
  phone: '',
  email: '',
  isNewClient: false,
  clientType: undefined,
  ownerEmail: undefined,
  inscricaoEstadual: '',
  site: '',
  segment: '',
  defaultPaymentTerms: '',
  notes: '',
  representativeEmails: [],
  influencers: [],
  address: {
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  },
};

export const INITIAL_PAYMENT: PaymentConditions = {
  method: 'avista',
  installments: 1,
  installmentPlan: '',
  downPayment: 0,
  discountType: 'percentage',
  discountValue: 0,
  deliveryDays: 30,
  carrier: '',
  freightType: 'CIF',
  observations: '',
  representativeName: '',
  estimatedClosingDate: '',
  estimatedPrice: 0,
};
