import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Save } from 'lucide-react';
import {
  StoreChecklistData,
  EMPTY_STORE_CHECKLIST,
  CHECKLIST_SECTIONS,
  FIELD_LABELS,
} from '@/types/storeChecklist';

interface StoreChecklistFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: StoreChecklistData) => Promise<void>;
  initialData?: Partial<StoreChecklistData>;
  clientName?: string;
  clientCity?: string;
  readOnly?: boolean;
}

export function StoreChecklistForm({
  open,
  onOpenChange,
  onSave,
  initialData,
  clientName,
  clientCity,
  readOnly = false,
}: StoreChecklistFormProps) {
  const [data, setData] = useState<StoreChecklistData>(EMPTY_STORE_CHECKLIST);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setData({
        ...EMPTY_STORE_CHECKLIST,
        ...initialData,
        cliente: clientName || initialData?.cliente || '',
        cidade: clientCity || initialData?.cidade || '',
      });
    }
  }, [open, initialData, clientName, clientCity]);

  const update = <K extends keyof StoreChecklistData>(key: K, value: StoreChecklistData[K]) => {
    if (readOnly) return;
    setData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const BooleanField = ({ field }: { field: keyof StoreChecklistData }) => (
    <RadioGroup
      value={data[field] === true ? 'sim' : data[field] === false ? 'nao' : ''}
      onValueChange={(v) => update(field, v === 'sim' ? true : false)}
      className="flex gap-4"
      disabled={readOnly}
    >
      <div className="flex items-center gap-2">
        <RadioGroupItem value="sim" id={`${field}-sim`} />
        <Label htmlFor={`${field}-sim`} className="text-sm">Sim</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="nao" id={`${field}-nao`} />
        <Label htmlFor={`${field}-nao`} className="text-sm">Não</Label>
      </div>
    </RadioGroup>
  );

  const renderField = (field: string) => {
    const label = FIELD_LABELS[field] || field;

    switch (field) {
      case 'fluxoLoja':
        return (
          <div className="space-y-1.5" key={field}>
            <Label className="text-sm font-medium">{label}</Label>
            <Select value={data.fluxoLoja} onValueChange={(v) => update('fluxoLoja', v as StoreChecklistData['fluxoLoja'])} disabled={readOnly}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alto">Alto</SelectItem>
                <SelectItem value="medio">Médio</SelectItem>
                <SelectItem value="baixo">Baixo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'ticketMedio':
        return (
          <div className="space-y-1.5" key={field}>
            <Label className="text-sm font-medium">{label}</Label>
            <Select value={data.ticketMedio} onValueChange={(v) => update('ticketMedio', v as StoreChecklistData['ticketMedio'])} disabled={readOnly}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="subiu">Subiu</SelectItem>
                <SelectItem value="caiu">Caiu</SelectItem>
                <SelectItem value="estavel">Estável</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'posicaoShowroom':
        return (
          <div className="space-y-1.5" key={field}>
            <Label className="text-sm font-medium">{label}</Label>
            <Select value={data.posicaoShowroom} onValueChange={(v) => update('posicaoShowroom', v as StoreChecklistData['posicaoShowroom'])} disabled={readOnly}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quente">Quente</SelectItem>
                <SelectItem value="fria">Fria</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'humorLojista':
        return (
          <div className="space-y-1.5" key={field}>
            <Label className="text-sm font-medium">{label}</Label>
            <Select value={data.humorLojista} onValueChange={(v) => update('humorLojista', v as StoreChecklistData['humorLojista'])} disabled={readOnly}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="positivo">😊 Positivo</SelectItem>
                <SelectItem value="neutro">😐 Neutro</SelectItem>
                <SelectItem value="negativo">😟 Negativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'scoreLoja':
        return (
          <div className="space-y-1.5" key={field}>
            <Label className="text-sm font-medium">{label}</Label>
            <Select value={data.scoreLoja} onValueChange={(v) => update('scoreLoja', v as StoreChecklistData['scoreLoja'])} disabled={readOnly}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">🟢 A - Excelente</SelectItem>
                <SelectItem value="B">🟡 B - Regular</SelectItem>
                <SelectItem value="C">🔴 C - Fraco</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'qtdProdutosShowroom':
        return (
          <div className="space-y-1.5" key={field}>
            <Label className="text-sm font-medium">{label}</Label>
            <Input
              type="number"
              value={data.qtdProdutosShowroom ?? ''}
              onChange={(e) => update('qtdProdutosShowroom', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Quantidade"
              readOnly={readOnly}
            />
          </div>
        );
      case 'produtoPrecisaAtualizacao':
      case 'lojistaEntendeuMargem':
      case 'comparouConcorrentes':
      case 'dandoDesconto':
        return (
          <div className="space-y-1.5" key={field}>
            <Label className="text-sm font-medium">{label}</Label>
            <BooleanField field={field} />
          </div>
        );
      case 'dataProximoFollowup':
        return (
          <div className="space-y-1.5" key={field}>
            <Label className="text-sm font-medium">{label}</Label>
            <Input
              type="date"
              value={data.dataProximoFollowup}
              onChange={(e) => update('dataProximoFollowup', e.target.value)}
              readOnly={readOnly}
            />
          </div>
        );
      case 'observacoes':
        return (
          <div className="space-y-1.5" key={field}>
            <Label className="text-sm font-medium">{label}</Label>
            <Textarea
              value={data.observacoes}
              onChange={(e) => update('observacoes', e.target.value)}
              placeholder="Observações gerais..."
              rows={3}
              readOnly={readOnly}
            />
          </div>
        );
      default:
        return (
          <div className="space-y-1.5" key={field}>
            <Label className="text-sm font-medium">{label}</Label>
            <Input
              value={(data as unknown as Record<string, unknown>)[field] as string || ''}
              onChange={(e) => update(field as keyof StoreChecklistData, e.target.value)}
              placeholder={label}
              readOnly={readOnly}
            />
          </div>
        );
    }
  };

  const scoreColor = data.scoreLoja === 'A' ? 'bg-primary' : data.scoreLoja === 'B' ? 'bg-accent' : data.scoreLoja === 'C' ? 'bg-destructive' : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-teal-600" />
            Checklist de Visita Comercial
            {data.scoreLoja && (
              <Badge className={`${scoreColor} text-white`}>
                Score {data.scoreLoja}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] px-6 pb-6">
          <div className="space-y-6 pt-4">
            {/* Header fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Cliente</Label>
                <Input value={data.cliente} onChange={(e) => update('cliente', e.target.value)} readOnly={readOnly || !!clientName} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Cidade</Label>
                <Input value={data.cidade} onChange={(e) => update('cidade', e.target.value)} readOnly={readOnly || !!clientCity} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Data da Visita</Label>
                <Input type="date" value={data.dataVisita} onChange={(e) => update('dataVisita', e.target.value)} readOnly={readOnly} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Representante</Label>
                <Input value={data.representante} onChange={(e) => update('representante', e.target.value)} readOnly={readOnly} />
              </div>
            </div>

            {CHECKLIST_SECTIONS.map((section, idx) => (
              <div key={idx}>
                <Separator className="my-2" />
                <h3 className="text-sm font-semibold mb-3">{section.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.fields.map((field) => renderField(field))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {!readOnly && (
          <div className="flex justify-end gap-2 p-6 pt-0 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Salvando...' : 'Salvar Checklist'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
