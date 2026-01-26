// Fabric price tiers
export const FABRIC_TIERS = ['SEM TEC', 'FX B', 'FX C', 'FX D', 'FX E', 'FX F', 'FX G', 'FX H', 'FX I', 'FX J', 'FX 3D', 'FX COURO'] as const;
export type FabricTier = typeof FABRIC_TIERS[number];

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
  modulations: ProductModulation[];
  hasBase: boolean;
  availableBases: string[];
}

export interface QuoteItem {
  id: string;
  productId: string;
  productName: string;
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
}

export interface ClientData {
  name: string;
  company: string;
  document: string;
  phone: string;
  email: string;
  isNewClient: boolean;
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

export interface PaymentConditions {
  method: 'avista' | 'parcelado' | 'entrada_parcelas';
  installments: number;
  downPayment: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  deliveryDays: number;
  carrier: string;
  observations: string;
}

export interface Quote {
  id: string;
  createdAt: string;
  client: ClientData;
  items: QuoteItem[];
  payment: PaymentConditions;
  subtotal: number;
  discount: number;
  total: number;
}

export const INITIAL_CLIENT: ClientData = {
  name: '',
  company: '',
  document: '',
  phone: '',
  email: '',
  isNewClient: false,
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
  downPayment: 0,
  discountType: 'percentage',
  discountValue: 0,
  deliveryDays: 30,
  carrier: '',
  observations: '',
};
