export interface ProductModulation {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: 'Sofás' | 'Poltronas' | 'Puffs' | 'Outros';
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
  fabric: string;
  price: number;
  quantity: number;
}

export interface ClientData {
  name: string;
  company: string;
  document: string; // CPF or CNPJ
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
