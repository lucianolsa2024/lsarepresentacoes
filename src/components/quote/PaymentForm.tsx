import { PaymentConditions, FreightType, DiscountTier, DISCOUNT_TIER_OPTIONS } from '@/types/quote';
import { useRepresentatives } from '@/hooks/useRepresentatives';
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
import { CreditCard, Percent, Calendar, User, Truck, CalendarCheck, DollarSign, Shield, AlertTriangle } from 'lucide-react';
import { useDiscountPolicies } from '@/hooks/useDiscountPolicies';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const CARRIER_OPTIONS = [
  'VIPEX',
  'SEGATTO',
  '__other__',
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
  { value: '30/60/90/120/150/180/210/240', label: '30/60/90/120/150/180/210/240 dias', installments: 8 },
  { value: '30/60/90/120/150/180/210/240/270', label: '30/60/90/120/150/180/210/240/270 dias', installments: 9 },
  { value: '30/60/90/120/150/180/210/240/270/300', label: '30/60/90/120/150/180/210/240/270/300 dias', installments: 10 },
  { value: '30/60/90/120/150/180/210/240/270/300/330', label: '30/60/90/120/150/180/210/240/270/300/330 dias', installments: 11 },
];

interface PaymentFormProps {
  payment: PaymentConditions;
  onChange: (payment: PaymentConditions) => void;
  subtotal: number;
}

function RepresentativeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { activeReps } = useRepresentatives();
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        <User className="h-3 w-3" />
        Nome do Representante
      </Label>
      <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? '' : v)}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione o representante..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Selecione...</SelectItem>
          {activeReps.map((r) => (
            <SelectItem key={r.email} value={r.name}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PaymentForm({ payment, onChange, subtotal }: PaymentFormProps) {
  const { getPoliciesForTier, findPolicy, getMaxDiscount } = useDiscountPolicies();
  const [maxDiscount, setMaxDiscount] = useState<number | null>(null);
  const [policyCode, setPolicyCode] = useState<string>('');

  const updateField = <K extends keyof PaymentConditions>(
    field: K,
    value: PaymentConditions[K]
  ) => {
    onChange({ ...payment, [field]: value });
  };

  // Resolve the applicable installment plan for discount lookup
  const getEffectiveInstallmentPlan = (): string => {
    if (payment.method === 'avista') return '15';
    return payment.installmentPlan || '30';
  };

  // Update max discount whenever tier or installment plan changes
  useEffect(() => {
    if (!payment.discountTier) {
      setMaxDiscount(null);
      setPolicyCode('');
      return;
    }

    const plan = getEffectiveInstallmentPlan();
    const policy = findPolicy(payment.discountTier, plan);
    if (policy) {
      setMaxDiscount(policy.discountPct);
      setPolicyCode(policy.code);
    } else {
      setMaxDiscount(null);
      setPolicyCode('');
    }
  }, [payment.discountTier, payment.installmentPlan, payment.method]);

  // Validate discount when it changes
  useEffect(() => {
    if (maxDiscount === null || payment.discountType !== 'percentage') return;
    // For positive maxDiscount: user can't go above it
    // For negative maxDiscount (surcharge): user can't go above it either (value should be <= maxDiscount)
    if (maxDiscount >= 0 && payment.discountValue > maxDiscount) {
      toast.error(`Desconto máximo para ${policyCode}: ${maxDiscount}%. Valor ajustado.`);
      onChange({ ...payment, discountValue: maxDiscount });
    } else if (maxDiscount < 0 && payment.discountValue > maxDiscount) {
      // Surcharge: the value must be at most maxDiscount (which is negative)
      toast.error(`Para o código ${policyCode}, o acréscimo obrigatório é de ${Math.abs(maxDiscount)}%. Valor ajustado.`);
      onChange({ ...payment, discountValue: maxDiscount });
    }
  }, [payment.discountValue, maxDiscount, payment.discountType]);

  const handleDiscountChange = (value: number) => {
    if (payment.discountType === 'percentage' && maxDiscount !== null) {
      if (maxDiscount >= 0 && value > maxDiscount) {
        toast.error(`Desconto máximo permitido para código ${policyCode}: ${maxDiscount}%`);
        updateField('discountValue', maxDiscount);
        return;
      }
      if (maxDiscount < 0 && value > maxDiscount) {
        toast.error(`Acréscimo obrigatório de ${Math.abs(maxDiscount)}% para código ${policyCode}`);
        updateField('discountValue', maxDiscount);
        return;
      }
    }
    updateField('discountValue', value);
  };

  const handleTierChange = (tier: DiscountTier) => {
    const plan = getEffectiveInstallmentPlan();
    const policy = findPolicy(tier, plan);

    // Auto-set discount to max allowed
    const newDiscount = policy ? policy.discountPct : 0;
    onChange({
      ...payment,
      discountTier: tier,
      discountType: 'percentage',
      discountValue: newDiscount,
    });
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

  // Get available payment terms for the selected tier
  const tierPolicies = payment.discountTier ? getPoliciesForTier(payment.discountTier) : [];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Condições de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Discount Tier Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Faixa de Desconto
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DISCOUNT_TIER_OPTIONS.map((tier) => (
              <button
                key={tier.value}
                type="button"
                onClick={() => handleTierChange(tier.value)}
                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                  payment.discountTier === tier.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
          {policyCode && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Código: {policyCode}
              </Badge>
              {maxDiscount !== null && (
                <Badge variant={maxDiscount >= 0 ? 'default' : 'destructive'} className="text-xs">
                  {maxDiscount >= 0 ? `Desconto máx: ${maxDiscount}%` : `Acréscimo: ${Math.abs(maxDiscount)}%`}
                </Badge>
              )}
            </div>
          )}
        </div>

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
                  const newPayment = {
                    ...payment,
                    installmentPlan: value,
                    installments: option?.installments || 1,
                  };
                  // Recalculate discount for new plan if tier is set
                  if (payment.discountTier) {
                    const policy = findPolicy(payment.discountTier, value);
                    if (policy) {
                      newPayment.discountValue = policy.discountPct;
                      newPayment.discountType = 'percentage';
                    }
                  }
                  onChange(newPayment);
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

        {/* Discount / Surcharge */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1">
            <Percent className="h-3 w-3" />
            Desconto / Acréscimo
          </Label>
          {maxDiscount !== null && payment.discountType === 'percentage' && (
            <div className={`flex items-center gap-2 text-xs p-2 rounded ${
              maxDiscount >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
            }`}>
              <AlertTriangle className="h-3 w-3" />
              {maxDiscount >= 0
                ? `Desconto máximo permitido: ${maxDiscount}% (código ${policyCode})`
                : `Acréscimo obrigatório: ${Math.abs(maxDiscount)}% (código ${policyCode})`
              }
            </div>
          )}
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
              value={payment.discountValue}
              onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
              placeholder={payment.discountType === 'percentage' ? '0%' : 'R$ 0,00'}
            />
          </div>
        </div>

        {/* Representative Name */}
        <RepresentativeSelector
          value={payment.representativeName}
          onChange={(v) => updateField('representativeName', v)}
        />

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

        {/* Project Name */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            🏗️ Obra / Empreendimento
          </Label>
          <Input
            value={payment.projectName || ''}
            onChange={(e) => updateField('projectName', e.target.value)}
            placeholder="Ex: Hotel Marina, Ed. Aurora, Projeto Plaenge..."
          />
        </div>

        {/* Estimated Closing Date */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <CalendarCheck className="h-3 w-3" />
            Data Estimada de Fechamento
          </Label>
          <Input
            type="date"
            value={payment.estimatedClosingDate}
            onChange={(e) => updateField('estimatedClosingDate', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Esta data será usada para criar lembrete e calcular previsão de entrega
          </p>
        </div>

        {/* Estimated Price */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Preço Estimado
          </Label>
          <Input
            type="number"
            min={0}
            value={payment.estimatedPrice || ''}
            onChange={(e) => updateField('estimatedPrice', parseFloat(e.target.value) || 0)}
            placeholder="R$ 0,00"
          />
          <p className="text-xs text-muted-foreground">
            Valor estimado para previsão de receita (não afeta o cálculo do orçamento)
          </p>
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
              {payment.carrier && !CARRIER_OPTIONS.includes(payment.carrier) && payment.carrier !== '__other__' ? (
                <div className="flex gap-2">
                  <Input
                    value={payment.carrier}
                    onChange={(e) => updateField('carrier', e.target.value)}
                    placeholder="Nome da transportadora..."
                  />
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
                    onClick={() => updateField('carrier', '')}
                  >
                    Voltar
                  </button>
                </div>
              ) : (
                <Select
                  value={CARRIER_OPTIONS.includes(payment.carrier || '') ? payment.carrier || '' : ''}
                  onValueChange={(value) => {
                    if (value === '__other__') {
                      updateField('carrier', ' ');
                      setTimeout(() => updateField('carrier', ''), 0);
                      updateField('carrier', '');
                    } else {
                      updateField('carrier', value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a transportadora..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIER_OPTIONS.filter(c => c !== '__other__').map((carrier) => (
                      <SelectItem key={carrier} value={carrier}>
                        {carrier}
                      </SelectItem>
                    ))}
                    <SelectItem value="__other__">Outra (cadastrar)</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {payment.carrier === '' && (
                <Input
                  autoFocus
                  value=""
                  onChange={(e) => updateField('carrier', e.target.value)}
                  placeholder="Digite o nome da transportadora..."
                  className="mt-1"
                />
              )}
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
            {payment.discountValue < 0 && payment.discountType === 'percentage' ? (
              <>
                {/* Negative discount (surcharge): show adjusted subtotal only, surcharge is baked into item prices */}
                <div className="text-xs text-muted-foreground">
                  Acréscimo de {Math.abs(payment.discountValue)}% embutido nos preços dos produtos{policyCode && ` [${policyCode}]`}
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {payment.discountValue !== 0 && (
                  <div className={`flex justify-between text-sm text-destructive`}>
                    <span>
                      Desconto (
                      {payment.discountType === 'percentage'
                        ? `${Math.abs(payment.discountValue)}%`
                        : formatCurrency(Math.abs(payment.discountValue))}
                      ){policyCode && ` [${policyCode}]`}:
                    </span>
                    <span>- {formatCurrency(Math.abs(calculateDiscount()))}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                </div>
              </>
            )}
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
