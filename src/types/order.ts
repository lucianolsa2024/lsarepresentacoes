export interface Order {
  id: string;
  clientId: string | null;
  issueDate: string;
  clientName: string;
  supplier: string;
  representative: string;
  orderNumber: string;
  oc: string;
  product: string;
  fabricProvided: string;
  fabric: string;
  dimensions: string;
  deliveryDate: string | null;
  quantity: number;
  price: number;
  orderType: string;
  paymentTerms: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderFormData {
  issueDate: string;
  clientName: string;
  supplier: string;
  representative: string;
  orderNumber: string;
  oc: string;
  product: string;
  fabricProvided: string;
  fabric: string;
  dimensions: string;
  deliveryDate: string;
  quantity: number;
  price: number;
  orderType: string;
  paymentTerms: string;
}

export const INITIAL_ORDER: OrderFormData = {
  issueDate: new Date().toISOString().split('T')[0],
  clientName: '',
  supplier: 'CENTURY',
  representative: '',
  orderNumber: '',
  oc: '',
  product: '',
  fabricProvided: 'NAO',
  fabric: '',
  dimensions: '',
  deliveryDate: '',
  quantity: 1,
  price: 0,
  orderType: 'ENCOMENDA',
  paymentTerms: '30 DIAS',
};

export const ORDER_TYPES = ['ENCOMENDA', 'PRONTA ENTREGA', 'REPOSIÇÃO'] as const;

export const SUPPLIERS = ['CENTURY', 'SOHOME'] as const;

export const REPRESENTATIVES = [
  'LUCIANO ABREU',
  'MARCIA MORELLI',
  'LUCIANO MORETTI',
  'JULIANA CECCONI',
] as const;
