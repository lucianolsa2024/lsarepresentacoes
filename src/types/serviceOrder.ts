export const SERVICE_TYPES = [
  'Troca de tecido',
  'Troca de capa',
  'Assistência fábrica',
  'Pintura',
] as const;

export interface ServiceOrder {
  id: string;
  os_number: string;
  product: string | null;
  responsible_type: string;
  responsible_name: string | null;
  has_rt: boolean;
  rt_percentage: number;
  origin_nf: string | null;
  defect: string | null;
  labor_cost: number;
  supplies_cost: number;
  freight_cost: number;
  net_result: number;
  delivery_forecast: string | null;
  status: string;
  exit_nf: string | null;
  boleto_info: string | null;
  supplies_nf_url: string | null;
  supplies_nf_data: Record<string, unknown> | null;
  client_id: string | null;
  owner_email: string | null;
  change_history: ChangeHistoryEntry[];
  service_types: string[];
  created_at: string;
  updated_at: string;
}

export interface ServiceOrderPhoto {
  id: string;
  service_order_id: string;
  photo_type: 'recebimento' | 'liberacao';
  file_url: string;
  file_name: string | null;
  created_at: string;
}

export interface ChangeHistoryEntry {
  field: string;
  old_value: unknown;
  new_value: unknown;
  changed_at: string;
  changed_by: string;
}

export interface ServiceOrderFormData {
  product: string;
  responsible_type: string;
  responsible_name: string;
  has_rt: boolean;
  rt_percentage: number;
  origin_nf: string;
  defect: string;
  labor_cost: number;
  supplies_cost: number;
  freight_cost: number;
  delivery_forecast: string;
  status: string;
  exit_nf: string;
  boleto_info: string;
  client_id: string;
  service_types: string[];
}

export const SERVICE_ORDER_STATUSES = [
  'Aguardando',
  'Em andamento',
  'Aguardando peças',
  'Concluído',
  'Entregue',
] as const;

export const RESPONSIBLE_TYPES = ['Fábrica', 'Consumidor', 'Lojista'] as const;

export function getStatusColor(status: string) {
  switch (status) {
    case 'Aguardando': return 'bg-yellow-100 text-yellow-800';
    case 'Em andamento': return 'bg-blue-100 text-blue-800';
    case 'Aguardando peças': return 'bg-orange-100 text-orange-800';
    case 'Concluído': return 'bg-green-100 text-green-800';
    case 'Entregue': return 'bg-emerald-100 text-emerald-800';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function calculateNetResult(
  laborCost: number,
  suppliesCost: number,
  freightCost: number,
  responsibleType: string,
  hasRt: boolean,
  rtPercentage: number
): number {
  const totalCosts = laborCost + suppliesCost + freightCost;
  if (responsibleType === 'Fábrica' && hasRt && rtPercentage > 0) {
    return -(totalCosts) * (1 - rtPercentage / 100);
  }
  return -totalCosts;
}
