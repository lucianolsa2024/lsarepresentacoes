import { useState } from 'react';
import { OrderFormData, INITIAL_ORDER, ORDER_TYPES, SUPPLIERS } from '@/types/order';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { Client } from '@/hooks/useClients';
import { ClientData } from '@/types/quote';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  clients: Client[];
  onSave: (order: OrderFormData, clientId?: string | null) => Promise<void>;
  onAddClient: (client: ClientData) => Promise<Client | null>;
  initialData?: OrderFormData;
}

export function OrderForm({ clients, onSave, onAddClient, initialData }: Props) {
  const [form, setForm] = useState<OrderFormData>(initialData || INITIAL_ORDER);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { repNames, nameToEmail } = useRepresentatives();

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setSelectedClientId(clientId);
      setForm(prev => ({ ...prev, clientName: client.company }));
    }
  };

  const handleSubmit = async () => {
    if (!form.clientName.trim()) {
      toast.error('Informe o nome do cliente');
      return;
    }
    if (!form.product.trim()) {
      toast.error('Informe o produto');
      return;
    }

    setSaving(true);
    try {
      // If no client selected, try to find by name or create
      let clientId = selectedClientId;
      if (!clientId) {
        const existing = clients.find(c => c.company.toLowerCase() === form.clientName.toLowerCase());
        if (existing) {
          clientId = existing.id;
        } else {
          const repEmail = nameToEmail[(form.representative || '').toUpperCase().trim()] || undefined;
          const newClient = await onAddClient({
            name: '',
            company: form.clientName,
            document: '',
            phone: '',
            email: '',
            isNewClient: true,
            ownerEmail: repEmail,
            address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' },
          });
          clientId = newClient?.id || null;
        }
      }

      await onSave(form, clientId);
      setForm(INITIAL_ORDER);
      setSelectedClientId(null);
      toast.success('Pedido salvo com sucesso');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof OrderFormData, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo Pedido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Data de Emissão</Label>
            <Input type="date" value={form.issueDate} onChange={e => update('issueDate', e.target.value)} />
          </div>
          <div>
            <Label>Cliente</Label>
            <Select onValueChange={handleClientSelect} value={selectedClientId || undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cliente existente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="mt-2"
              placeholder="Ou digite o nome do cliente"
              value={form.clientName}
              onChange={e => { update('clientName', e.target.value); setSelectedClientId(null); }}
            />
          </div>
          <div>
            <Label>Fornecedor</Label>
            <Select value={form.supplier} onValueChange={v => update('supplier', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUPPLIERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Representante</Label>
            <Select value={form.representative} onValueChange={v => update('representative', v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {repNames.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nº Pedido</Label>
            <Input value={form.orderNumber} onChange={e => update('orderNumber', e.target.value)} />
          </div>
          <div>
            <Label>OC</Label>
            <Input value={form.oc} onChange={e => update('oc', e.target.value)} />
          </div>
          <div>
            <Label>Produto</Label>
            <Input value={form.product} onChange={e => update('product', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Tecido Fornecido</Label>
            <Select value={form.fabricProvided} onValueChange={v => update('fabricProvided', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NAO">NÃO</SelectItem>
                <SelectItem value="SIM">SIM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tecido</Label>
            <Input value={form.fabric} onChange={e => update('fabric', e.target.value)} />
          </div>
          <div>
            <Label>Dimensão</Label>
            <Input value={form.dimensions} onChange={e => update('dimensions', e.target.value)} />
          </div>
          <div>
            <Label>Data de Entrega</Label>
            <Input type="date" value={form.deliveryDate} onChange={e => update('deliveryDate', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Quantidade</Label>
            <Input type="number" min={1} value={form.quantity} onChange={e => update('quantity', parseInt(e.target.value) || 1)} />
          </div>
          <div>
            <Label>Preço (R$)</Label>
            <Input type="number" min={0} step={0.01} value={form.price} onChange={e => update('price', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <Label>Tipo de Pedido</Label>
            <Select value={form.orderType} onValueChange={v => update('orderType', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORDER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prazo de Pagamento</Label>
            <Input value={form.paymentTerms} onChange={e => update('paymentTerms', e.target.value)} placeholder="Ex: 30/60/90 DIAS" />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Pedido'}
        </Button>
      </CardContent>
    </Card>
  );
}
