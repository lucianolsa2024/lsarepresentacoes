export type RouteStatus = 'planejada' | 'em_andamento' | 'concluida';
export type VisitStatus = 'pendente' | 'realizada' | 'cancelada';

// Simplified client type for route visits (DB format)
export interface RouteClient {
  id: string;
  name: string | null;
  company: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
}

export interface VisitRoute {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: RouteStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RouteVisit {
  id: string;
  route_id: string;
  client_id: string | null;
  visit_date: string;
  visit_order: number;
  status: VisitStatus;
  notes: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  created_at: string;
  // Joined client data (DB format)
  client?: RouteClient | null;
}

export interface RouteWithVisits extends VisitRoute {
  visits: RouteVisit[];
}

export interface CreateRouteInput {
  name: string;
  start_date: string;
  end_date: string;
  notes?: string;
}

export interface CreateVisitInput {
  route_id: string;
  client_id: string;
  visit_date: string;
  visit_order?: number;
  notes?: string;
}

export interface UpdateVisitInput {
  visit_date?: string;
  visit_order?: number;
  status?: VisitStatus;
  notes?: string;
  check_in_at?: string | null;
  check_out_at?: string | null;
}
