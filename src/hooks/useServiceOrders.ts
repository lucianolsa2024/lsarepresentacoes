import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ServiceOrder, ServiceOrderFormData, ChangeHistoryEntry, ServiceOrderPhoto } from '@/types/serviceOrder';
import { calculateNetResult } from '@/types/serviceOrder';

export function useServiceOrders() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('service_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar ordens de serviço');
      console.error(error);
    } else {
      setOrders((data || []).map(row => ({
        ...row,
        change_history: (row.change_history as unknown as ChangeHistoryEntry[]) || [],
        supplies_nf_data: row.supplies_nf_data as Record<string, unknown> | null,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const createOrder = async (formData: ServiceOrderFormData): Promise<ServiceOrder | null> => {
    const userRes = await supabase.auth.getUser();
    const email = userRes.data.user?.email || null;

    const netResult = calculateNetResult(
      formData.labor_cost, formData.supplies_cost, formData.freight_cost,
      formData.responsible_type, formData.has_rt, formData.rt_percentage
    );

    const { data, error } = await supabase
      .from('service_orders')
      .insert({
        product: formData.product || null,
        responsible_type: formData.responsible_type,
        responsible_name: formData.responsible_name || null,
        has_rt: formData.has_rt,
        rt_percentage: formData.rt_percentage,
        origin_nf: formData.origin_nf || null,
        defect: formData.defect || null,
        labor_cost: formData.labor_cost,
        supplies_cost: formData.supplies_cost,
        freight_cost: formData.freight_cost,
        net_result: netResult,
        delivery_forecast: formData.delivery_forecast || null,
        status: formData.status,
        exit_nf: formData.exit_nf || null,
        boleto_info: formData.boleto_info || null,
        client_id: formData.client_id || null,
        owner_email: email,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar OS');
      console.error(error);
      return null;
    }

    toast.success(`OS ${data.os_number} criada com sucesso`);
    await fetchOrders();
    return data as unknown as ServiceOrder;
  };

  const updateOrder = async (id: string, updates: Partial<ServiceOrderFormData>, currentOrder: ServiceOrder): Promise<boolean> => {
    const userRes = await supabase.auth.getUser();
    const email = userRes.data.user?.email || 'unknown';

    // Build change history
    const changes: ChangeHistoryEntry[] = [];
    const fieldLabels: Record<string, string> = {
      product: 'Produto', responsible_type: 'Tipo Responsável', responsible_name: 'Responsável',
      has_rt: 'Indicação RT', rt_percentage: '% RT', origin_nf: 'NF Origem',
      defect: 'Defeito', labor_cost: 'Mão de obra', supplies_cost: 'Insumos',
      freight_cost: 'Frete', delivery_forecast: 'Previsão entrega', status: 'Status',
      exit_nf: 'NF Saída', boleto_info: 'Boleto',
    };

    for (const [key, newVal] of Object.entries(updates)) {
      const oldVal = (currentOrder as unknown as Record<string, unknown>)[key];
      if (String(oldVal ?? '') !== String(newVal ?? '')) {
        changes.push({
          field: fieldLabels[key] || key,
          old_value: oldVal,
          new_value: newVal,
          changed_at: new Date().toISOString(),
          changed_by: email,
        });
      }
    }

    const laborCost = updates.labor_cost ?? currentOrder.labor_cost;
    const suppliesCost = updates.supplies_cost ?? currentOrder.supplies_cost;
    const freightCost = updates.freight_cost ?? currentOrder.freight_cost;
    const responsibleType = updates.responsible_type ?? currentOrder.responsible_type;
    const hasRt = updates.has_rt ?? currentOrder.has_rt;
    const rtPercentage = updates.rt_percentage ?? currentOrder.rt_percentage;

    const netResult = calculateNetResult(laborCost, suppliesCost, freightCost, responsibleType, hasRt, rtPercentage);

    const newHistory = [...currentOrder.change_history, ...changes];

    const dbUpdates: Record<string, unknown> = {};
    if (updates.product !== undefined) dbUpdates.product = updates.product || null;
    if (updates.responsible_type !== undefined) dbUpdates.responsible_type = updates.responsible_type;
    if (updates.responsible_name !== undefined) dbUpdates.responsible_name = updates.responsible_name || null;
    if (updates.has_rt !== undefined) dbUpdates.has_rt = updates.has_rt;
    if (updates.rt_percentage !== undefined) dbUpdates.rt_percentage = updates.rt_percentage;
    if (updates.origin_nf !== undefined) dbUpdates.origin_nf = updates.origin_nf || null;
    if (updates.defect !== undefined) dbUpdates.defect = updates.defect || null;
    if (updates.labor_cost !== undefined) dbUpdates.labor_cost = updates.labor_cost;
    if (updates.supplies_cost !== undefined) dbUpdates.supplies_cost = updates.supplies_cost;
    if (updates.freight_cost !== undefined) dbUpdates.freight_cost = updates.freight_cost;
    if (updates.delivery_forecast !== undefined) dbUpdates.delivery_forecast = updates.delivery_forecast || null;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.exit_nf !== undefined) dbUpdates.exit_nf = updates.exit_nf || null;
    if (updates.boleto_info !== undefined) dbUpdates.boleto_info = updates.boleto_info || null;
    if (updates.client_id !== undefined) dbUpdates.client_id = updates.client_id || null;

    dbUpdates.net_result = netResult;
    dbUpdates.change_history = newHistory as unknown as Record<string, never>;

    const { error } = await supabase
      .from('service_orders')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar OS');
      console.error(error);
      return false;
    }

    toast.success('OS atualizada');
    await fetchOrders();
    return true;
  };

  const deleteOrder = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('service_orders').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir OS');
      return false;
    }
    toast.success('OS excluída');
    await fetchOrders();
    return true;
  };

  // Photos
  const fetchPhotos = async (serviceOrderId: string): Promise<ServiceOrderPhoto[]> => {
    const { data, error } = await supabase
      .from('service_order_photos')
      .select('*')
      .eq('service_order_id', serviceOrderId)
      .order('created_at', { ascending: true });

    if (error) { console.error(error); return []; }
    return (data || []) as unknown as ServiceOrderPhoto[];
  };

  const uploadPhoto = async (serviceOrderId: string, file: File, photoType: 'recebimento' | 'liberacao'): Promise<boolean> => {
    const filePath = `${serviceOrderId}/${photoType}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from('service-order-files')
      .upload(filePath, file);

    if (upErr) { toast.error('Erro no upload'); return false; }

    const { data: { publicUrl } } = supabase.storage
      .from('service-order-files')
      .getPublicUrl(filePath);

    const { error } = await supabase.from('service_order_photos').insert({
      service_order_id: serviceOrderId,
      photo_type: photoType,
      file_url: publicUrl,
      file_name: file.name,
    });

    if (error) { toast.error('Erro ao salvar foto'); return false; }
    toast.success('Foto enviada');
    return true;
  };

  const deletePhoto = async (photoId: string): Promise<boolean> => {
    const { error } = await supabase.from('service_order_photos').delete().eq('id', photoId);
    if (error) { toast.error('Erro ao excluir foto'); return false; }
    return true;
  };

  // NF upload
  const uploadSuppliesNf = async (orderId: string, file: File): Promise<string | null> => {
    const filePath = `${orderId}/nf/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('service-order-files').upload(filePath, file);
    if (error) { toast.error('Erro no upload da NF'); return null; }
    const { data: { publicUrl } } = supabase.storage.from('service-order-files').getPublicUrl(filePath);

    // Parse XML if applicable
    let nfData: Record<string, unknown> | null = null;
    if (file.name.toLowerCase().endsWith('.xml')) {
      try {
        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/xml');
        const emit = doc.querySelector('emit');
        const total = doc.querySelector('vNF') || doc.querySelector('vProd');
        nfData = {
          fornecedor: emit?.querySelector('xNome')?.textContent || '',
          cnpj: emit?.querySelector('CNPJ')?.textContent || '',
          valor_total: total?.textContent || '',
          itens: Array.from(doc.querySelectorAll('det')).map(det => ({
            descricao: det.querySelector('xProd')?.textContent || '',
            quantidade: det.querySelector('qCom')?.textContent || '',
            valor: det.querySelector('vProd')?.textContent || '',
          })),
        };
      } catch { /* parsing best-effort */ }
    }

    await supabase.from('service_orders').update({
      supplies_nf_url: publicUrl,
      supplies_nf_data: nfData as unknown as Record<string, never>,
    }).eq('id', orderId);

    toast.success('NF de insumos enviada');
    return publicUrl;
  };

  return {
    orders, loading, fetchOrders,
    createOrder, updateOrder, deleteOrder,
    fetchPhotos, uploadPhoto, deletePhoto,
    uploadSuppliesNf,
  };
}
