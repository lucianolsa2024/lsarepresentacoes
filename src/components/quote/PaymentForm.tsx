import { PaymentConditions, FreightType } from '@/types/quote';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCard, Percent, Calendar, User, Truck } from 'lucide-react';

const CARRIER_OPTIONS = [
  'A combinar',
  'Braspress',
  'Jamef',
  'TNT',
  'Jadlog',
  'Rodonaves',
  'Patrus',
  'Total Express',
  'Outro',
];

const INSTALLMENT_OPTIONS = [
  { value: '15', label: '15 dias', installments: 1 },
  { value: '30', label: '30 dias', installments: 1 },
  { value: '30/60', label: '30/60 dias', installments: 2 },
  { value: '30/60/90', label: '30/60/90 dias', installments: 3 },
  { value: '30/60/90/120', label: '30/60/90/120 dias', installments: 4 },
  { value: '30/60/90/120/150', label: '30/60/90/120/150 dias', installments: 5 },
  { value: '30/60/90/120/150/180', label: '30/60/90/120/150/180 dias', installments: 6 },
  { value: '30/60/90/120/150/180/210', label: '30/60/90/120/150/180/210 dias', installments: 7 },
];

interface PaymentFormProps {
  payment: PaymentConditions;
  onChange: (payment: PaymentConditions) => void;
  subtotal: number;
}

export function PaymentForm({ payment, onChange, subtotal }: PaymentFormProps) {
  const updateField = <K extends keyof PaymentConditions>(
    field: K,
    value: PaymentConditions[K]
  ) => {
    onChange({ ...payment, [field]: value });
  };

  const calculateDiscount = () => {
    if (payment.discountType === 'percentage') {
      return subtotal * (payment.discountValue / 100);
    }
    return payment.discountValue;
  };

  const calculateTotal = () => {
    return subtotal - calculateDiscount();
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getInstallmentValue = () => {
    const total = calculateTotal();
    if (payment.method === 'avista') return total;
    if (payment.method === 'parcelado') return total / payment.installments;
    if (payment.method === 'entrada_parcelas') {
      return (total - payment.downPayment) / payment.installments;
    }
    return total;
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Condições de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Method */}
        <div className="space-y-3">
          <Label>Forma de Pagamento</Label>
          <RadioGroup
            value={payment.method}
            onValueChange={(value) =>
              updateField('method', value as PaymentConditions['method'])
            }
            className="grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="avista" id="avista" />
              <Label htmlFor="avista" className="cursor-pointer">
                À Vista
              </Label>
            </div>
            <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="parcelado" id="parcelado" />
              <Label htmlFor="parcelado" className="cursor-pointer">
                Parcelado
              </Label>
            </div>
            <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="entrada_parcelas" id="entrada" />
              <Label htmlFor="entrada" className="cursor-pointer">
                Entrada + Parcelas
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Installments */}
        {(payment.method === 'parcelado' || payment.method === 'entrada_parcelas') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prazo de Pagamento</Label>
              <Select
                value={payment.installmentPlan}
                onValueChange={(value) => {
                  const option = INSTALLMENT_OPTIONS.find(o => o.value === value);
                  onChange({
                    ...payment,
                    installmentPlan: value,
                    installments: option?.installments || 1,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o prazo..." />
                </SelectTrigger>
                <SelectContent>
                  {INSTALLMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {payment.method === 'entrada_parcelas' && (
              <div className="space-y-2">
                <Label>Valor da Entrada</Label>
                <Input
                  type="number"
                  min={0}
                  value={payment.downPayment}
                  onChange={(e) =>
                    updateField('downPayment', parseFloat(e.target.value) || 0)
                  }
                  placeholder="R$ 0,00"
                />
              </div>
            )}
          </div>
        )}

        {/* Discount */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1">
            <Percent className="h-3 w-3" />
            Desconto
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              value={payment.discountType}
              onValueChange={(value) =>
                updateField('discountType', value as 'percentage' | 'fixed')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              value={payment.discountValue}
              onChange={(e) =>
                updateField('discountValue', parseFloat(e.target.value) || 0)
              }
              placeholder={payment.discountType === 'percentage' ? '0%' : 'R$ 0,00'}
            />
          </div>
        </div>

        {/* Representative Name */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <User className="h-3 w-3" />
            Nome do Representante
          </Label>
          <Input
            value={payment.representativeName}
            onChange={(e) => updateField('representativeName', e.target.value)}
            placeholder="Nome do representante comercial"
          />
        </div>

        {/* Delivery */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Prazo de Embarque (dias corridos)
          </Label>
          <Input
            type="number"
            min={1}
            value={payment.deliveryDays}
            onChange={(e) =>
              updateField('deliveryDays', parseInt(e.target.value) || 30)
            }
          />
        </div>

        {/* Carrier and Freight Type */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1">
            <Truck className="h-3 w-3" />
            Transporte
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs text-muted-foreground">Transportadora</Label>
              <Select
                value={payment.carrier || ''}
                onValueChange={(value) => updateField('carrier', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a transportadora..." />
                </SelectTrigger>
                <SelectContent>
                  {CARRIER_OPTIONS.map((carrier) => (
                    <SelectItem key={carrier} value={carrier}>
                      {carrier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tipo de Frete</Label>
              <Select
                value={payment.freightType || 'CIF'}
                onValueChange={(value) => updateField('freightType', value as FreightType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CIF">CIF (Pago)</SelectItem>
                  <SelectItem value="FOB">FOB (A pagar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Observations */}
        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea
            value={payment.observations}
            onChange={(e) => updateField('observations', e.target.value)}
            placeholder="Condições especiais, informações adicionais..."
            rows={3}
          />
        </div>

        {/* Summary */}
        {subtotal > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {payment.discountValue > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>
                  Desconto (
                  {payment.discountType === 'percentage'
                    ? `${payment.discountValue}%`
                    : formatCurrency(payment.discountValue)}
                  ):
                </span>
                <span>- {formatCurrency(calculateDiscount())}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total:</span>
              <span className="text-primary">{formatCurrency(calculateTotal())}</span>
            </div>
            {payment.method !== 'avista' && payment.installmentPlan && (
              <div className="text-sm text-muted-foreground text-right">
                {payment.method === 'entrada_parcelas' && payment.downPayment > 0 && (
                  <div>Entrada: {formatCurrency(payment.downPayment)}</div>
                )}
                <div>
                  {payment.installments > 1 
                    ? `${payment.installments}x de ${formatCurrency(getInstallmentValue())} (${payment.installmentPlan} dias)`
                    : `Pagamento em ${payment.installmentPlan} dias`
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
