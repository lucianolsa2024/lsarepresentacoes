import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { SERVICE_ORDER_STATUSES, RESPONSIBLE_TYPES, SERVICE_TYPES, calculateNetResult } from '@/types/serviceOrder';
import type { ServiceOrder, ServiceOrderFormData } from '@/types/serviceOrder';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ServiceOrderFormData) => Promise<void>;
  order?: ServiceOrder | null;
  clients: { id: string; company: string }[];
}

export function ServiceOrderForm({ open, onOpenChange, onSubmit, order, clients }: Props) {
  const [product, setProduct] = useState('');
  const [responsibleType, setResponsibleType] = useState('Fábrica');
  const [responsibleName, setResponsibleName] = useState('');
  const [hasRt, setHasRt] = useState(false);
  const [rtPercentage, setRtPercentage] = useState(0);
  const [originNf, setOriginNf] = useState('');
  const [defect, setDefect] = useState('');
  const [laborCost, setLaborCost] = useState(0);
  const [suppliesCost, setSuppliesCost] = useState(0);
  const [freightCost, setFreightCost] = useState(0);
  const [deliveryForecast, setDeliveryForecast] = useState<Date | undefined>();
  const [status, setStatus] = useState('Aguardando');
  const [exitNf, setExitNf] = useState('');
  const [boletoInfo, setBoletoInfo] = useState('');
  const [clientId, setClientId] = useState('');
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    if (order) {
      setProduct(order.product || '');
      setResponsibleType(order.responsible_type);
      setResponsibleName(order.responsible_name || '');
      setHasRt(order.has_rt);
      setRtPercentage(order.rt_percentage);
      setOriginNf(order.origin_nf || '');
      setDefect(order.defect || '');
      setLaborCost(order.labor_cost);
      setSuppliesCost(order.supplies_cost);
      setFreightCost(order.freight_cost);
      setDeliveryForecast(order.delivery_forecast ? new Date(order.delivery_forecast + 'T12:00:00') : undefined);
      setStatus(order.status);
      setExitNf(order.exit_nf || '');
      setBoletoInfo(order.boleto_info || '');
      setClientId(order.client_id || '');
      setServiceTypes(order.service_types || []);
    } else {
      setProduct(''); setResponsibleType('Fábrica'); setResponsibleName('');
      setHasRt(false); setRtPercentage(0); setOriginNf(''); setDefect('');
      setLaborCost(0); setSuppliesCost(0); setFreightCost(0);
      setDeliveryForecast(undefined); setStatus('Aguardando');
      setExitNf(''); setBoletoInfo(''); setClientId('');
      setServiceTypes([]);
    }
  };

  const toggleServiceType = (type: string) => {
    setServiceTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const netResult = useMemo(() =>
    calculateNetResult(laborCost, suppliesCost, freightCost, responsibleType, hasRt, rtPercentage),
    [laborCost, suppliesCost, freightCost, responsibleType, hasRt, rtPercentage]
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit({
      product, responsible_type: responsibleType, responsible_name: responsibleName,
      has_rt: hasRt, rt_percentage: rtPercentage, origin_nf: originNf,
      defect, labor_cost: laborCost, supplies_cost: suppliesCost,
      freight_cost: freightCost,
      delivery_forecast: deliveryForecast ? format(deliveryForecast, 'yyyy-MM-dd') : '',
      status, exit_nf: exitNf, boleto_info: boletoInfo, client_id: clientId,
      service_types: serviceTypes,
    });
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? `Editar ${order.os_number}` : 'Nova Ordem de Serviço'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Client */}
          <div>
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Types - multi-select checkboxes */}
          <div>
            <Label>Tipo de Serviço</Label>
            <div className="flex flex-wrap gap-3 mt-1">
              {SERVICE_TYPES.map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={serviceTypes.includes(type)}
                    onCheckedChange={() => toggleServiceType(type)}
                  />
                  <span className="text-sm">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Responsible type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Responsável</Label>
              <Select value={responsibleType} onValueChange={setResponsibleType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESPONSIBLE_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome do responsável</Label>
              <Input value={responsibleName} onChange={e => setResponsibleName(e.target.value)} />
            </div>
          </div>

          {/* RT */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Indicação RT</Label>
              <Switch checked={hasRt} onCheckedChange={setHasRt} />
            </div>
            {hasRt && (
              <div className="flex items-center gap-2">
                <Label>% RT</Label>
                <Input type="number" className="w-24" value={rtPercentage}
                  onChange={e => setRtPercentage(Number(e.target.value))} />
              </div>
            )}
          </div>

          {/* Product + NF */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Produto</Label>
              <Input value={product} onChange={e => setProduct(e.target.value)} />
            </div>
            <div>
              <Label>NF de origem</Label>
              <Input value={originNf} onChange={e => setOriginNf(e.target.value)} />
            </div>
          </div>

          {/* Defect */}
          <div>
            <Label>Defeito relatado</Label>
            <Textarea value={defect} onChange={e => setDefect(e.target.value)} />
          </div>

          {/* Costs */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Mão de obra (R$)</Label>
              <Input type="number" value={laborCost} onChange={e => setLaborCost(Number(e.target.value))} />
            </div>
            <div>
              <Label>Insumos (R$)</Label>
              <Input type="number" value={suppliesCost} onChange={e => setSuppliesCost(Number(e.target.value))} />
            </div>
            <div>
              <Label>Frete (R$)</Label>
              <Input type="number" value={freightCost} onChange={e => setFreightCost(Number(e.target.value))} />
            </div>
          </div>

          {/* Net result preview */}
          <div className="p-3 rounded-md bg-muted">
            <span className="text-sm font-medium">Resultado líquido: </span>
            <span className={cn("font-bold", netResult >= 0 ? 'text-green-600' : 'text-red-600')}>
              {netResult.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          {/* Delivery + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Previsão de entrega</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !deliveryForecast && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deliveryForecast ? format(deliveryForecast, 'dd/MM/yyyy') : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={deliveryForecast} onSelect={setDeliveryForecast}
                    className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_ORDER_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Future Bling fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>NF de saída <span className="text-xs text-muted-foreground">(futuro Bling)</span></Label>
              <Input value={exitNf} onChange={e => setExitNf(e.target.value)} />
            </div>
            <div>
              <Label>Boleto <span className="text-xs text-muted-foreground">(futuro Bling)</span></Label>
              <Input value={boletoInfo} onChange={e => setBoletoInfo(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Salvando...' : order ? 'Salvar alterações' : 'Criar OS'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
