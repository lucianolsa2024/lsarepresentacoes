import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderFormData } from '@/types/order';
import { toast } from 'sonner';

const dbToOrder = (row: any): Order => ({
  id: row.id,
  clientId: row.client_id,
  issueDate: row.issue_date,
  clientName: row.client_name,
  supplier: row.supplier || '',
  representative: row.representative || '',
  orderNumber: row.order_number || '',
  oc: row.oc || '',
  product: row.product || '',
  fabricProvided: row.fabric_provided || 'NAO',
  fabric: row.fabric || '',
  dimensions: row.dimensions || '',
  deliveryDate: row.delivery_date,
  quantity: row.quantity || 1,
  price: row.price || 0,
  orderType: row.order_type || 'ENCOMENDA',
  paymentTerms: row.payment_terms || '',
  pdfUrl: row.pdf_url || null,
  rescheduleDate: row.reschedule_date || null,
  rescheduleHistory: Array.isArray(row.reschedule_history) ? row.reschedule_history : [],
  fabricArrivalDate: row.fabric_arrival_date || null,
  ownerEmail: row.owner_email || null,
  status: row.status || 'pendente',
  nfNumber: row.nf_number || null,
  nfPdfUrl: row.nf_pdf_url || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const orderToDb = (order: OrderFormData, clientId?: string | null, pdfUrl?: string | null, ownerEmail?: string | null) => ({
  client_id: clientId || null,
  issue_date: order.issueDate,
  client_name: order.clientName,
  supplier: order.supplier || null,
  representative: order.representative || null,
  order_number: order.orderNumber || null,
  oc: order.oc || null,
  product: order.product || null,
  fabric_provided: order.fabricProvided || 'NAO',
  fabric: order.fabric || null,
  dimensions: order.dimensions || null,
  delivery_date: order.deliveryDate || null,
  quantity: order.quantity || 1,
  price: order.price || 0,
  order_type: order.orderType || 'ENCOMENDA',
  payment_terms: order.paymentTerms || null,
  pdf_url: pdfUrl || null,
  owner_email: ownerEmail || null,
});

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const repMapRef = useRef<Record<string, string>>({});

  const loadRepMap = useCallback(async () => {
    if (Object.keys(repMapRef.current).length > 0) return;
    const { data } = await supabase.from('representatives_map' as any).select('representative_name, email');
    if (data) {
      const map: Record<string, string> = {};
      (data as any[]).forEach((r: any) => { map[r.representative_name.toUpperCase().trim()] = r.email; });
      repMapRef.current = map;
    }
  }, []);

  const resolveOwnerEmail = async (representative: string): Promise<string | null> => {
    await loadRepMap();
    const key = (representative || '').toUpperCase().trim();
    if (repMapRef.current[key]) return repMapRef.current[key];
    // fallback: use logged-in user email
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email || null;
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('issue_date', { ascending: false });

      if (error) throw error;
      setOrders((data || []).map(dbToOrder));
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const addOrder = async (order: OrderFormData, clientId?: string | null, pdfUrl?: string | null): Promise<Order | null> => {
    try {
      const ownerEmail = await resolveOwnerEmail(order.representative);
      const { data, error } = await supabase
        .from('orders')
        .insert(orderToDb(order, clientId, pdfUrl, ownerEmail))
        .select()
        .single();

      if (error) throw error;
      const newOrder = dbToOrder(data);
      setOrders(prev => [newOrder, ...prev]);
      return newOrder;
    } catch (error) {
      console.error('Error adding order:', error);
      toast.error('Erro ao adicionar pedido');
      return null;
    }
  };

  const addOrders = async (ordersData: { order: OrderFormData; clientId?: string | null; pdfUrl?: string | null; nfNumber?: string | null; status?: string }[]): Promise<number> => {
    try {
      await loadRepMap();
      const allRows = await Promise.all(ordersData.map(async d => {
        const ownerEmail = await resolveOwnerEmail(d.order.representative);
        const row = orderToDb(d.order, d.clientId, d.pdfUrl, ownerEmail);
        return {
          ...row,
          ...(d.nfNumber ? { nf_number: d.nfNumber } : {}),
          ...(d.status ? { status: d.status } : {}),
        };
      }));

      // Process in batches of 100 to avoid timeouts
      const BATCH_SIZE = 100;
      let totalImported = 0;
      const allNewOrders: Order[] = [];

      for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
        const batch = allRows.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from('orders')
          .insert(batch)
          .select();

        if (error) throw error;
        const newOrders = (data || []).map(dbToOrder);
        allNewOrders.push(...newOrders);
        totalImported += newOrders.length;
      }

      setOrders(prev => [...allNewOrders, ...prev]);
      return totalImported;
    } catch (error) {
      console.error('Error bulk adding orders:', error);
      toast.error('Erro ao importar pedidos');
      return 0;
    }
  };

  const updateOrder = async (id: string, order: OrderFormData, clientId?: string | null): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('orders')
        .update(orderToDb(order, clientId))
        .eq('id', id);

      if (error) throw error;
      await fetchOrders();
      toast.success('Pedido atualizado');
      return true;
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Erro ao atualizar pedido');
      return false;
    }
  };

  const deleteOrder = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setOrders(prev => prev.filter(o => o.id !== id));
      toast.success('Pedido excluído');
      return true;
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Erro ao excluir pedido');
      return false;
    }
  };

  const getOrdersByClient = (clientName: string): Order[] => {
    return orders.filter(o => o.clientName.toLowerCase() === clientName.toLowerCase());
  };

  const deleteAllOrders = async (): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
      if (error) throw error;
      setOrders([]);
      toast.success('Todos os pedidos foram excluídos');
      return true;
    } catch (error) {
      console.error('Error deleting all orders:', error);
      toast.error('Erro ao excluir pedidos');
      return false;
    }
  };

  const updateOrderNf = async (id: string, nfNumber: string, nfPdfUrl: string | null, status: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ nf_number: nfNumber || null, nf_pdf_url: nfPdfUrl || null, status } as any)
        .eq('id', id);
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === id ? { ...o, nfNumber, nfPdfUrl, status } : o));
      toast.success('NF atualizada');
      return true;
    } catch (error) {
      console.error('Error updating NF:', error);
      toast.error('Erro ao atualizar NF');
      return false;
    }
  };

  return {
    orders,
    loading,
    addOrder,
    addOrders,
    updateOrder,
    deleteOrder,
    deleteAllOrders,
    updateOrderNf,
    getOrdersByClient,
    refetch: fetchOrders,
  };
}
