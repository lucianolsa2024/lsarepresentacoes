import { FabricTier } from '@/types/quote';

export interface Fabric {
  code: string;
  tier: FabricTier;
  notes?: string;
}

// Fabric collection 2026 - atualizado em 30/04/2026
// Fonte: COLEÇÃO DE TECIDOS 2026 - SOHOME
export const FABRICS: Fabric[] = [
  // FORNECIDO - Tecido fornecido pelo cliente
  { code: 'FORNECIDO', tier: 'FORNECIDO' },

  // FX B
  { code: 'B2206', tier: 'FX B' },
  { code: 'B2262', tier: 'FX B' },
  { code: 'B2266', tier: 'FX B' },
  { code: 'B2268', tier: 'FX B' },
  { code: 'B2269', tier: 'FX B' },
  { code: 'B2270', tier: 'FX B' },
  { code: 'B2286', tier: 'FX B' },
  { code: 'B2287', tier: 'FX B' },
  { code: 'B2288', tier: 'FX B' },
  { code: 'B2289', tier: 'FX B' },
  { code: 'B2306', tier: 'FX B' },
  { code: 'B2307', tier: 'FX B' },
  { code: 'B2309', tier: 'FX B' },
  { code: 'B2310', tier: 'FX B' },
  { code: 'B2311', tier: 'FX B' },
  { code: 'B2312', tier: 'FX B' },
  { code: 'B2313', tier: 'FX B' },
  { code: 'B2315', tier: 'FX B' },
  { code: 'B2325', tier: 'FX B' },
  { code: 'B2326', tier: 'FX B' },

  // FX C
  { code: 'C3149', tier: 'FX C' },
  { code: 'C3150', tier: 'FX C' },
  { code: 'C3154', tier: 'FX C' },
  { code: 'C3180', tier: 'FX C', notes: 'REF. ANTIGA E5159' },
  { code: 'C3181', tier: 'FX C', notes: 'REF. ANTIGA E5157' },
  { code: 'C3182', tier: 'FX C', notes: 'REF. ANTIGA E5158' },
  { code: 'C3183', tier: 'FX C' },
  { code: 'C3191', tier: 'FX C' },
  { code: 'C3192', tier: 'FX C' },
  { code: 'C3193', tier: 'FX C' },
  { code: 'C3194', tier: 'FX C' },
  { code: 'C3195', tier: 'FX C' },
  { code: 'C3196', tier: 'FX C' },
  { code: 'C3201', tier: 'FX C' },
  { code: 'C3202', tier: 'FX C' },
  { code: 'C3203', tier: 'FX C' },
  { code: 'C3204', tier: 'FX C' },
  { code: 'C3205', tier: 'FX C' },
  { code: 'C3206', tier: 'FX C' },
  { code: 'C3207', tier: 'FX C' },
  { code: 'C3208', tier: 'FX C' },
  { code: 'C3209', tier: 'FX C' },
  { code: 'C3210', tier: 'FX C' },

  // FX C - CAPA
  { code: 'C3083', tier: 'FX C', notes: 'CAPA' },
  { code: 'C3085', tier: 'FX C', notes: 'CAPA' },

  // FX D
  { code: 'D4116', tier: 'FX D' },
  { code: 'D4117', tier: 'FX D' },
  { code: 'D4119', tier: 'FX D' },
  { code: 'D4120', tier: 'FX D' },
  { code: 'D4121', tier: 'FX D' },
  { code: 'D4122', tier: 'FX D' },
  { code: 'D4222', tier: 'FX D' },
  { code: 'D4223', tier: 'FX D' },
  { code: 'D4224', tier: 'FX D' },
  { code: 'D4235', tier: 'FX D' },
  { code: 'D4236', tier: 'FX D' },
  { code: 'D4237', tier: 'FX D' },
  { code: 'D4238', tier: 'FX D' },
  { code: 'D4262', tier: 'FX D', notes: 'REF. ANTIGA E5170' },
  { code: 'D4263', tier: 'FX D', notes: 'REF. ANTIGA E5172' },
  { code: 'D4264', tier: 'FX D', notes: 'REF. ANTIGA E5169' },
  { code: 'D4265', tier: 'FX D', notes: 'REF. ANTIGA E5171' },
  { code: 'D4266', tier: 'FX D' },
  { code: 'D4267', tier: 'FX D' },
  { code: 'D4268', tier: 'FX D' },
  { code: 'D4269', tier: 'FX D' },
  { code: 'D4270', tier: 'FX D', notes: 'REF. ANTIGA E5159' },
  { code: 'D4271', tier: 'FX D', notes: 'REF. ANTIGA E5157' },
  { code: 'D4272', tier: 'FX D', notes: 'REF. ANTIGA E5158' },

  // FX E
  { code: 'E5133', tier: 'FX E' },
  { code: 'E5134', tier: 'FX E' },
  { code: 'E5135', tier: 'FX E' },
  { code: 'E5136', tier: 'FX E' },
  { code: 'E5139', tier: 'FX E' },
  { code: 'E5154', tier: 'FX E' },
  { code: 'E5155', tier: 'FX E' },
  { code: 'E5156', tier: 'FX E' },
  { code: 'E5160', tier: 'FX E' },
  { code: 'E5161', tier: 'FX E' },
  { code: 'E5162', tier: 'FX E' },
  { code: 'E5163', tier: 'FX E' },
  { code: 'E5166', tier: 'FX E' },
  { code: 'E5167', tier: 'FX E' },
  { code: 'E5168', tier: 'FX E' },
  { code: 'E5173', tier: 'FX E' },
  { code: 'E5174', tier: 'FX E' },
  { code: 'E5175', tier: 'FX E' },
  { code: 'E5176', tier: 'FX E' },
  { code: 'E5177', tier: 'FX E' },
  { code: 'E5178', tier: 'FX E' },
  { code: 'E5179', tier: 'FX E' },
  { code: 'E5180', tier: 'FX E' },
  { code: 'E5181', tier: 'FX E' },
  { code: 'E5182', tier: 'FX E' },
  { code: 'E5183', tier: 'FX E' },
  { code: 'E5184', tier: 'FX E' },
  { code: 'E5185', tier: 'FX E' },
  { code: 'E5186', tier: 'FX E' },

  // FX F
  { code: 'F6211', tier: 'FX F' },
  { code: 'F6212', tier: 'FX F' },
  { code: 'F6213', tier: 'FX F' },
  { code: 'F6230', tier: 'FX F' },
  { code: 'F6231', tier: 'FX F' },
  { code: 'F6232', tier: 'FX F' },
  { code: 'F6245', tier: 'FX F' },
  { code: 'F6246', tier: 'FX F' },
  { code: 'F6248', tier: 'FX F' },
  { code: 'F6252', tier: 'FX F' },
  { code: 'F6253', tier: 'FX F' },
  { code: 'F6255', tier: 'FX F' },
  { code: 'F6259', tier: 'FX F' },
  { code: 'F6261', tier: 'FX F' },
  { code: 'F6263', tier: 'FX F' },
  { code: 'F6264', tier: 'FX F' },

  // FX F - CAPA
  { code: 'F6258', tier: 'FX F', notes: 'CAPA' },
  { code: 'F6260', tier: 'FX F', notes: 'CAPA' },
  { code: 'F6262', tier: 'FX F', notes: 'CAPA' },

  // FX G
  { code: 'G7085', tier: 'FX G' },
  { code: 'G7090', tier: 'FX G' },
  { code: 'G7125', tier: 'FX G' },
  { code: 'G7126', tier: 'FX G' },
  { code: 'G7135', tier: 'FX G' },
  { code: 'G7136', tier: 'FX G' },
  { code: 'G7137', tier: 'FX G' },
  { code: 'G7138', tier: 'FX G' },
  { code: 'G7139', tier: 'FX G' },
  { code: 'G7141', tier: 'FX G' },
  { code: 'G7142', tier: 'FX G' },
  { code: 'G7143', tier: 'FX G' },
  { code: 'G7148', tier: 'FX G' },
  { code: 'G7149', tier: 'FX G' },
  { code: 'G7150', tier: 'FX G' },
  { code: 'G7151', tier: 'FX G' },
  { code: 'G7152', tier: 'FX G' },
  { code: 'G7153', tier: 'FX G' },
  { code: 'G7154', tier: 'FX G' },

  // FX H
  { code: 'H8078', tier: 'FX H' },
  { code: 'H8109', tier: 'FX H' },
  { code: 'H8113', tier: 'FX H' },
  { code: 'H8116', tier: 'FX H' },
  { code: 'H8117', tier: 'FX H' },
  { code: 'H8118', tier: 'FX H' },
  { code: 'H8119', tier: 'FX H' },
  { code: 'H8120', tier: 'FX H' },
  { code: 'H8122', tier: 'FX H' },

  // FX I
  { code: 'I9101', tier: 'FX I' },
  { code: 'I9106', tier: 'FX I' },
  { code: 'I9107', tier: 'FX I' },
  { code: 'I9108', tier: 'FX I' },
  { code: 'I9109', tier: 'FX I' },
  { code: 'I9110', tier: 'FX I' },

  // FX J
  { code: 'J10008', tier: 'FX J' },
  { code: 'J10009', tier: 'FX J' },
  { code: 'J10010', tier: 'FX J' },
  { code: 'J10011', tier: 'FX J' },
  { code: 'J10012', tier: 'FX J' },
  { code: 'J10014', tier: 'FX J' },
  { code: 'J10015', tier: 'FX J' },
  { code: 'J10016', tier: 'FX J' },
  { code: 'J10017', tier: 'FX J' },
  { code: 'J10018', tier: 'FX J' },
  { code: 'J10019', tier: 'FX J' },
  { code: 'J10020', tier: 'FX J' },
  { code: 'J10021', tier: 'FX J' },
  { code: 'J10022', tier: 'FX J' },
  { code: 'J10023', tier: 'FX J' },
  { code: 'J10024', tier: 'FX J' },

  // FX COURO
  { code: 'CAMURÇA COR WHISKY', tier: 'FX COURO' },
  { code: 'CAMURÇA COR MUSGO', tier: 'FX COURO' },
  { code: 'CAMURÇA COR CANELA', tier: 'FX COURO' },
  { code: 'CAMURÇA COR MOUSE', tier: 'FX COURO' },
  { code: 'NATURAL COR NOZES', tier: 'FX COURO' },
  { code: 'NATURAL COR AVELÃ', tier: 'FX COURO' },
  { code: 'NATURAL COR GRIGIO', tier: 'FX COURO' },
  { code: 'SHERWOOD COR PEROLA', tier: 'FX COURO' },
  { code: 'SHERWOOD COR CARAMELO', tier: 'FX COURO' },
];

// Helper function to get fabrics by tier
export function getFabricsByTier(tier: FabricTier): Fabric[] {
  return FABRICS.filter(f => f.tier === tier);
}

// Helper function to search fabrics
export function searchFabrics(query: string, tier?: FabricTier): Fabric[] {
  const normalizedQuery = query.toLowerCase().trim();

  return FABRICS.filter(f => {
    const matchesTier = !tier || f.tier === tier;
    const matchesQuery = !normalizedQuery ||
      f.code.toLowerCase().includes(normalizedQuery) ||
      (f.notes && f.notes.toLowerCase().includes(normalizedQuery));

    return matchesTier && matchesQuery;
  });
}
