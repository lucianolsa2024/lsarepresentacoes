import { useState, useEffect, useCallback } from 'react';
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
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const orderToDb = (order: OrderFormData, clientId?: string | null) => ({
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
});

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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

  const addOrder = async (order: OrderFormData, clientId?: string | null): Promise<Order | null> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert(orderToDb(order, clientId))
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

  const addOrders = async (ordersData: { order: OrderFormData; clientId?: string | null }[]): Promise<number> => {
    try {
      const rows = ordersData.map(d => orderToDb(d.order, d.clientId));
      const { data, error } = await supabase
        .from('orders')
        .insert(rows)
        .select();

      if (error) throw error;
      const newOrders = (data || []).map(dbToOrder);
      setOrders(prev => [...newOrders, ...prev]);
      return newOrders.length;
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

  return {
    orders,
    loading,
    addOrder,
    addOrders,
    updateOrder,
    deleteOrder,
    getOrdersByClient,
    refetch: fetchOrders,
  };
}
