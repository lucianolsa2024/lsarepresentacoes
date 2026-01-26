import { Product } from '@/types/quote';

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'sofa-retratil',
    name: 'Sofá Retrátil',
    description: 'Sofá com assento retrátil para maior conforto',
    category: 'Sofás',
    modulations: [
      { name: '2,00m', price: 2500 },
      { name: '2,20m', price: 2700 },
      { name: '2,50m', price: 2900 },
      { name: '2,80m', price: 3200 },
    ],
    hasBase: true,
    availableBases: ['Madeira natural', 'Madeira escura', 'Pés palito'],
  },
  {
    id: 'sofa-canto',
    name: 'Sofá de Canto',
    description: 'Sofá em L ideal para salas amplas',
    category: 'Sofás',
    modulations: [
      { name: '3 lugares + chaise', price: 3500 },
      { name: '4 lugares + chaise', price: 4200 },
      { name: '5 lugares + chaise', price: 4800 },
    ],
    hasBase: true,
    availableBases: ['Madeira natural', 'Madeira escura', 'Pés palito', 'Sem pés'],
  },
  {
    id: 'poltrona',
    name: 'Poltrona',
    description: 'Poltrona confortável para decoração',
    category: 'Poltronas',
    modulations: [
      { name: 'Individual', price: 1200 },
      { name: 'Com puff', price: 1500 },
    ],
    hasBase: false,
    availableBases: [],
  },
];

export const PRODUCT_CATEGORIES = ['Sofás', 'Poltronas', 'Puffs', 'Outros'] as const;

export const BASE_OPTIONS = [
  'Madeira natural',
  'Madeira escura',
  'Pés palito',
  'Sem pés',
  'Inox',
  'Cromado',
];
