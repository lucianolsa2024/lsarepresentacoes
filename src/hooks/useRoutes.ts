import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  VisitRoute,
  RouteVisit,
  RouteWithVisits,
  CreateRouteInput,
  CreateVisitInput,
  UpdateVisitInput,
  RouteStatus,
  VisitStatus,
} from '@/types/route';

// Type for raw client data from DB
interface DbClient {
  id: string;
  name: string | null;
  company: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  is_new_client: boolean | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  created_at: string;
  updated_at: string;
}

export function useRoutes() {
  const { user } = useAuth();
  const userEmail = user?.email;
  const [routes, setRoutes] = useState<RouteWithVisits[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoutes = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch routes
      const { data: routesData, error: routesError } = await supabase
        .from('visit_routes')
        .select('*')
        .order('start_date', { ascending: false });

      if (routesError) throw routesError;

      // Fetch all visits with client data
      const { data: visitsData, error: visitsError } = await supabase
        .from('route_visits')
        .select('*')
        .order('visit_date', { ascending: true })
        .order('visit_order', { ascending: true });

      if (visitsError) throw visitsError;

      // Fetch clients for the visits
      const clientIds = [...new Set(visitsData?.map(v => v.client_id).filter(Boolean) || [])];
      let clientsMap: Record<string, DbClient> = {};
      
      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('*')
          .in('id', clientIds);

        if (clientsError) throw clientsError;
        
        clientsMap = (clientsData || []).reduce((acc, client) => {
          acc[client.id] = client;
          return acc;
        }, {} as Record<string, DbClient>);
      }

      // Combine data
      const routesWithVisits: RouteWithVisits[] = (routesData || []).map(route => ({
        ...route,
        status: route.status as RouteStatus,
        visits: (visitsData || [])
          .filter(v => v.route_id === route.id)
          .map(v => ({
            ...v,
            status: v.status as VisitStatus,
            client: v.client_id ? clientsMap[v.client_id] : null,
          })) as RouteVisit[],
      }));

      setRoutes(routesWithVisits);
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast.error('Erro ao carregar rotas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const addRoute = async (input: CreateRouteInput): Promise<VisitRoute | null> => {
    try {
      const { data, error } = await supabase
        .from('visit_routes')
        .insert({
          name: input.name,
          start_date: input.start_date,
          end_date: input.end_date,
          notes: input.notes || null,
          owner_email: userEmail || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      
      const result: VisitRoute = {
        ...data,
        status: data.status as RouteStatus,
      };
      
      await fetchRoutes();
      toast.success('Rota criada com sucesso!');
      return result;
    } catch (error) {
      console.error('Error creating route:', error);
      toast.error('Erro ao criar rota');
      return null;
    }
  };

  const updateRoute = async (id: string, updates: Partial<CreateRouteInput & { status: RouteStatus }>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('visit_routes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      await fetchRoutes();
      toast.success('Rota atualizada!');
      return true;
    } catch (error) {
      console.error('Error updating route:', error);
      toast.error('Erro ao atualizar rota');
      return false;
    }
  };

  const deleteRoute = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('visit_routes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchRoutes();
      toast.success('Rota excluída!');
      return true;
    } catch (error) {
      console.error('Error deleting route:', error);
      toast.error('Erro ao excluir rota');
      return false;
    }
  };

  const addVisit = async (input: CreateVisitInput): Promise<RouteVisit | null> => {
    try {
      const { data, error } = await supabase
        .from('route_visits')
        .insert({
          route_id: input.route_id,
          client_id: input.client_id,
          visit_date: input.visit_date,
          visit_order: input.visit_order || 1,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchRoutes();
      toast.success('Visita adicionada!');
      return data as RouteVisit;
    } catch (error) {
      console.error('Error adding visit:', error);
      toast.error('Erro ao adicionar visita');
      return null;
    }
  };

  const updateVisit = async (id: string, updates: UpdateVisitInput): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('route_visits')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      await fetchRoutes();
      return true;
    } catch (error) {
      console.error('Error updating visit:', error);
      toast.error('Erro ao atualizar visita');
      return false;
    }
  };

  const deleteVisit = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('route_visits')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchRoutes();
      toast.success('Visita removida!');
      return true;
    } catch (error) {
      console.error('Error deleting visit:', error);
      toast.error('Erro ao remover visita');
      return false;
    }
  };

  const checkIn = async (visitId: string): Promise<boolean> => {
    return updateVisit(visitId, { 
      check_in_at: new Date().toISOString(),
      status: 'realizada' 
    });
  };

  const checkOut = async (visitId: string): Promise<boolean> => {
    return updateVisit(visitId, { 
      check_out_at: new Date().toISOString() 
    });
  };

  return {
    routes,
    loading,
    refetch: fetchRoutes,
    addRoute,
    updateRoute,
    deleteRoute,
    addVisit,
    updateVisit,
    deleteVisit,
    checkIn,
    checkOut,
  };
}
