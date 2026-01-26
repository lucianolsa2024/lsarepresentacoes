// Fabric price tiers
export const FABRIC_TIERS = ['FX B', 'FX C', 'FX D', 'FX E', 'FX F', 'FX G', 'FX H', 'FX I', 'FX J'] as const;
export type FabricTier = typeof FABRIC_TIERS[number];

export interface ProductModulation {
  name: string;
  description: string;
  dimensions: string;
  prices: Record<FabricTier, number>;
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
  base: string;
  fabricTier: FabricTier;
  fabricDescription: string;
  price: number;
  quantity: number;
}

export interface ClientData {
  name: string;
  company: string;
  document: string;
  phone: string;
  email: string;
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
  observations: '',
};
