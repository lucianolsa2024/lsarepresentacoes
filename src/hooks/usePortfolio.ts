import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Client, ClientCurve } from './useClients';

export type PortfolioStatus = 'prospeccao' | 'onboarding' | 'em_dia' | 'atencao' | 'atrasado' | 'inativo';

export interface PortfolioCurve {
  clientId: string;
  curve: 'A' | 'B' | 'C';
  revenue3m: number;
}

export interface StoreTraining {
  id: string;
  clientId: string;
  trainingDate: string;
  trainerEmail: string;
  collection: string;
  observations: string;
  participants: string[];
  createdAt: string;
}

export interface NpsResponse {
  id: string;
  clientId: string;
  trainingId: string | null;
  consultantName: string;
  trainerEmail: string | null;
  scores: number[];
  average: number;
  comment: string;
  responseDate: string;
  createdAt: string;
}

export interface PortfolioClient {
  client: Client;
  computedStatus: PortfolioStatus;
  curve: 'A' | 'B' | 'C' | null;
  daysSinceLastVisit: number | null;
  nextVisitDue: string | null;
  lastTrainingDate: string | null;
  npsAverage: number | null;
  lastVisitDate: string | null;
}

const CURVE_MAX_DAYS: Record<string, number> = { A: 20, B: 35, C: 50 };

function computeStatus(
  manualStatus: string | null,
  daysSinceLastVisit: number | null,
  curve: 'A' | 'B' | 'C' | null,
  daysSinceLastPurchase: number | null,
): PortfolioStatus {
  const ms = manualStatus as PortfolioStatus;
  if (ms === 'prospeccao' || ms === 'onboarding') return ms;
  if (daysSinceLastPurchase !== null && daysSinceLastPurchase > 90) return 'inativo';
  if (!curve || daysSinceLastVisit === null) return ms || 'em_dia';
  const maxDays = CURVE_MAX_DAYS[curve] || 50;
  if (daysSinceLastVisit > maxDays) return 'atrasado';
  if (daysSinceLastVisit >= maxDays - 5) return 'atencao';
  return 'em_dia';
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function usePortfolio() {
  const [trainings, setTrainings] = useState<StoreTraining[]>([]);
  const [npsResponses, setNpsResponses] = useState<NpsResponse[]>([]);
  const [lastVisits, setLastVisits] = useState<Record<string, string>>({});
  const [lastPurchases, setLastPurchases] = useState<Record<string, number>>({});
  const [curves, setCurves] = useState<Record<string, 'A' | 'B' | 'C'>>({});
  const [loading, setLoading] = useState(true);

  const fetchPortfolioData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch last visits (realized activities of type visita), trainings, NPS, order stats in parallel
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const startDate3m = threeMonthsAgo.toISOString().split('T')[0];

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const startDate90d = ninetyDaysAgo.toISOString().split('T')[0];

      const [visitsRes, trainingsRes, participantsRes, npsRes, ordersRes] = await Promise.all([
        supabase
          .from('activities')
          .select('client_id, due_date')
          .eq('type', 'visita')
          .in('status', ['realizada', 'concluida'])
          .not('client_id', 'is', null)
          .order('due_date', { ascending: false }),
        supabase
          .from('store_trainings' as any)
          .select('*')
          .order('training_date', { ascending: false }),
        supabase
          .from('training_participants' as any)
          .select('*'),
        supabase
          .from('nps_responses' as any)
          .select('*')
          .order('response_date', { ascending: false }),
        supabase
          .from('orders')
          .select('client_id, price, quantity, issue_date')
          .gte('issue_date', startDate3m)
          .not('client_id', 'is', null),
      ]);

      // Last visit per client
      const visitMap: Record<string, string> = {};
      ((visitsRes.data || []) as any[]).forEach((v: any) => {
        if (v.client_id && !visitMap[v.client_id]) {
          visitMap[v.client_id] = v.due_date;
        }
      });
      setLastVisits(visitMap);

      // Last purchase - days since
      const lastPurchaseMap: Record<string, string> = {};
      // Need all orders to find last purchase
      const { data: allOrders } = await supabase
        .from('orders')
        .select('client_id, issue_date')
        .not('client_id', 'is', null)
        .order('issue_date', { ascending: false });
      
      ((allOrders || []) as any[]).forEach((o: any) => {
        if (o.client_id && !lastPurchaseMap[o.client_id]) {
          lastPurchaseMap[o.client_id] = o.issue_date;
        }
      });

      const now = new Date();
      const purchaseDays: Record<string, number> = {};
      Object.entries(lastPurchaseMap).forEach(([cid, date]) => {
        purchaseDays[cid] = Math.floor((now.getTime() - new Date(date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
      });
      setLastPurchases(purchaseDays);

      // Curve calculation (last 3 months)
      const revenueMap: Record<string, number> = {};
      ((ordersRes.data || []) as any[]).forEach((o: any) => {
        if (!o.client_id) return;
        revenueMap[o.client_id] = (revenueMap[o.client_id] || 0) + (o.price || 0) * (o.quantity || 1);
      });

      const sorted = Object.entries(revenueMap)
        .filter(([, rev]) => rev > 0)
        .sort((a, b) => b[1] - a[1]);

      const total = sorted.length;
      const curveMap: Record<string, 'A' | 'B' | 'C'> = {};
      sorted.forEach(([cid], idx) => {
        const pct = (idx + 1) / total;
        if (pct <= 0.2) curveMap[cid] = 'A';
        else if (pct <= 0.5) curveMap[cid] = 'B';
        else curveMap[cid] = 'C';
      });
      setCurves(curveMap);

      // Trainings
      const participantsByTraining: Record<string, string[]> = {};
      ((participantsRes.data || []) as any[]).forEach((p: any) => {
        if (!participantsByTraining[p.training_id]) participantsByTraining[p.training_id] = [];
        participantsByTraining[p.training_id].push(p.consultant_name);
      });

      setTrainings(
        ((trainingsRes.data || []) as any[]).map((t: any) => ({
          id: t.id,
          clientId: t.client_id,
          trainingDate: t.training_date,
          trainerEmail: t.trainer_email,
          collection: t.collection || '',
          observations: t.observations || '',
          participants: participantsByTraining[t.id] || [],
          createdAt: t.created_at,
        }))
      );

      // NPS
      setNpsResponses(
        ((npsRes.data || []) as any[]).map((n: any) => {
          const scores = [n.score_1, n.score_2, n.score_3, n.score_4, n.score_5];
          return {
            id: n.id,
            clientId: n.client_id,
            trainingId: n.training_id,
            consultantName: n.consultant_name,
            trainerEmail: n.trainer_email,
            scores,
            average: scores.reduce((a: number, b: number) => a + b, 0) / 5,
            comment: n.comment || '',
            responseDate: n.response_date,
            createdAt: n.created_at,
          };
        })
      );
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      toast.error('Erro ao carregar dados da carteira');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  const buildPortfolioClients = useCallback((clients: Client[]): PortfolioClient[] => {
    const now = new Date();
    // Only include lojista clients in the portfolio
    const lojistas = clients.filter(c => {
      const ct = c.clientType;
      return !ct || ct === 'lojista_alto' || ct === 'lojista_medio';
    });
    return lojistas.map(client => {
      const lastVisitStr = lastVisits[client.id];
      const daysSinceLastVisit = lastVisitStr
        ? Math.floor((now.getTime() - new Date(lastVisitStr + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const curve = curves[client.id] || null;
      const daysSinceLastPurchase = lastPurchases[client.id] ?? null;
      const manualStatus = client.portfolioStatus;
      const computedSt = computeStatus(manualStatus, daysSinceLastVisit, curve, daysSinceLastPurchase);

      const maxDays = curve ? CURVE_MAX_DAYS[curve] : 50;
      const nextVisitDue = lastVisitStr ? addDays(new Date(lastVisitStr + 'T00:00:00'), maxDays) : null;

      // Last training for this client
      const clientTrainings = trainings.filter(t => t.clientId === client.id);
      const lastTrainingDate = clientTrainings.length > 0 ? clientTrainings[0].trainingDate : null;

      // NPS average
      const clientNps = npsResponses.filter(n => n.clientId === client.id);
      const npsAverage = clientNps.length > 0
        ? clientNps.reduce((sum, n) => sum + n.average, 0) / clientNps.length
        : null;

      return {
        client,
        computedStatus: computedSt,
        curve,
        daysSinceLastVisit,
        nextVisitDue,
        lastTrainingDate,
        npsAverage,
        lastVisitDate: lastVisitStr || null,
      };
    });
  }, [lastVisits, curves, lastPurchases, trainings, npsResponses]);

  const addTraining = async (data: {
    clientId: string;
    trainingDate: string;
    trainerEmail: string;
    collection: string;
    observations: string;
    participants: string[];
  }): Promise<{ success: boolean; npsToken?: string }> => {
    try {
      const { data: result, error } = await supabase
        .from('store_trainings' as any)
        .insert({
          client_id: data.clientId,
          training_date: data.trainingDate,
          trainer_email: data.trainerEmail,
          collection: data.collection || null,
          observations: data.observations || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (data.participants.length > 0) {
        await supabase.from('training_participants' as any).insert(
          data.participants.map(name => ({
            training_id: (result as any).id,
            consultant_name: name,
          })) as any
        );
      }

      toast.success('Treinamento registrado');
      await fetchPortfolioData();
      return { success: true, npsToken: (result as any).nps_token };
    } catch (error) {
      console.error('Error adding training:', error);
      toast.error('Erro ao registrar treinamento');
      return { success: false };
    }
  };

  const addNpsResponse = async (data: {
    clientId: string;
    trainingId?: string;
    consultantName: string;
    trainerEmail?: string;
    scores: number[];
    comment?: string;
    responseDate: string;
  }): Promise<boolean> => {
    try {
      const { error } = await supabase.from('nps_responses' as any).insert({
        client_id: data.clientId,
        training_id: data.trainingId || null,
        consultant_name: data.consultantName,
        trainer_email: data.trainerEmail || null,
        score_1: data.scores[0] || 0,
        score_2: data.scores[1] || 0,
        score_3: data.scores[2] || 0,
        score_4: data.scores[3] || 0,
        score_5: data.scores[4] || 0,
        comment: data.comment || null,
        response_date: data.responseDate,
      } as any);

      if (error) throw error;
      toast.success('Resposta NPS registrada');
      await fetchPortfolioData();
      return true;
    } catch (error) {
      console.error('Error adding NPS:', error);
      toast.error('Erro ao registrar NPS');
      return false;
    }
  };

  const updatePortfolioStatus = async (clientId: string, status: PortfolioStatus): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ portfolio_status: status } as any)
        .eq('id', clientId);

      if (error) throw error;
      toast.success('Status atualizado');
      return true;
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
      return false;
    }
  };

  const getClientTrainings = (clientId: string) => trainings.filter(t => t.clientId === clientId);
  const getClientNps = (clientId: string) => npsResponses.filter(n => n.clientId === clientId);

  return {
    loading,
    buildPortfolioClients,
    addTraining,
    addNpsResponse,
    updatePortfolioStatus,
    getClientTrainings,
    getClientNps,
    curves,
    refetch: fetchPortfolioData,
  };
}
