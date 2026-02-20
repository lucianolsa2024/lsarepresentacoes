import { getAcabamentoCategories } from './acabamentos';

// Product categories
export const PRODUCT_CATEGORIES = [
  'Sofás',
  'Poltronas',
  'Cadeiras',
  'Mesas',
  'Buffets',
  'Puffs',
  'Banquetas',
  'Mesas Laterais',
  'Mesas de Centro',
  'Mesas de Cabeceira',
  'Tapetes',
  'Outros',
];

// Base/finish options - now from acabamentos 2026
export const BASE_OPTIONS = getAcabamentoCategories();

// Empty array - all products come from the database now
export const DEFAULT_PRODUCTS = [];
