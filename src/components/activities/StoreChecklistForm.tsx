import { useState, useEffect, useMemo, useRef } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ClipboardCheck, Save, Search, X, AlertTriangle, Camera, Trash2, Loader2 } from 'lucide-react';
import {
  StoreChecklistData,
  EMPTY_STORE_CHECKLIST,
  EMPTY_QTD_POR_CATEGORIA,
  CHECKLIST_SECTIONS,
  FIELD_LABELS,
  PRODUCT_CATEGORIES,
  computeCategoryTotals,
  type ProductCategoryKey,
} from '@/types/storeChecklist';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [productSearch, setProductSearch] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { products } = useProducts();

  useEffect(() => {
    if (open) {
      setData({
        ...EMPTY_STORE_CHECKLIST,
        ...initialData,
        produtosExpostos: initialData?.produtosExpostos || [],
        cliente: clientName || initialData?.cliente || '',
        cidade: clientCity || initialData?.cidade || '',
      });
      setProductSearch('');
    }
  }, [open, initialData, clientName, clientCity]);

  const update = <K extends keyof StoreChecklistData>(key: K, value: StoreChecklistData[K]) => {
    if (readOnly) return;
    setData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (data.qtdProdutosNossos == null || data.qtdProdutosConcorrentes == null) {
      toast.error('Preencha a quantidade de produtos nossos e concorrentes');
      return;
    }
    setSaving(true);
    try {
      await onSave(data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 20);
    const s = productSearch.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s)
    ).slice(0, 20);
  }, [products, productSearch]);

  const toggleProduct = (productName: string) => {
    if (readOnly) return;
    setData(prev => ({
      ...prev,
      produtosExpostos: prev.produtosExpostos.includes(productName)
        ? prev.produtosExpostos.filter(p => p !== productName)
        : [...prev.produtosExpostos, productName],
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} excede 5MB`);
          continue;
        }
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { error } = await supabase.storage
          .from('checklist-photos')
          .upload(fileName, file);
        if (error) {
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }
        const { data: urlData } = supabase.storage
          .from('checklist-photos')
          .getPublicUrl(fileName);
        newUrls.push(urlData.publicUrl);
      }
      if (newUrls.length > 0) {
        setData(prev => ({ ...prev, fotos: [...prev.fotos, ...newUrls] }));
        toast.success(`${newUrls.length} foto(s) adicionada(s)`);
      }
    } catch {
      toast.error('Erro ao enviar fotos');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (url: string) => {
    if (readOnly) return;
    setData(prev => ({ ...prev, fotos: prev.fotos.filter(f => f !== url) }));
  };

  const shareNosso = useMemo(() => {
    const nossos = data.qtdProdutosNossos || 0;
    const concorrentes = data.qtdProdutosConcorrentes || 0;
    const total = nossos + concorrentes;
    if (total === 0) return null;
    return Math.round((nossos / total) * 100);
  }, [data.qtdProdutosNossos, data.qtdProdutosConcorrentes]);

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

    // Fotos field
    if (field === 'fotos') {
      return (
        <div className="space-y-2 col-span-full" key={field}>
          <Label className="text-sm font-medium">📸 Fotos / Evidências</Label>
          {/* Photo grid */}
          {data.fotos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {data.fotos.map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-md overflow-hidden border">
                  <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Upload button */}
          {!readOnly && (
            <div className="flex gap-2 flex-wrap">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 mr-1" />
                )}
                Tirar Foto
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 mr-1" />
                )}
                Galeria
              </Button>
            </div>
          )}
          {data.fotos.length === 0 && readOnly && (
            <p className="text-sm text-muted-foreground">Nenhuma foto registrada</p>
          )}
        </div>
      );
    }

    // Special handling for new fields
    if (field === 'produtosExpostos') {
      return (
        <div className="space-y-2 col-span-full" key={field}>
          <Label className="text-sm font-medium">{label}</Label>
          {/* Selected products */}
          {data.produtosExpostos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {data.produtosExpostos.map(name => (
                <Badge key={name} variant="secondary" className="gap-1">
                  {name}
                  {!readOnly && (
                    <X className="h-3 w-3 cursor-pointer" onClick={() => toggleProduct(name)} />
                  )}
                </Badge>
              ))}
            </div>
          )}
          {/* Product search */}
          {!readOnly && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Buscar produto..."
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-32 border rounded-md">
                {filteredProducts.map(p => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={data.produtosExpostos.includes(p.name)}
                      onCheckedChange={() => toggleProduct(p.name)}
                    />
                    <span>{p.name}</span>
                    <span className="text-muted-foreground text-xs">({p.code})</span>
                  </label>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">Nenhum produto encontrado</p>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      );
    }

    if (field === 'qtdProdutosNossos' || field === 'qtdProdutosConcorrentes') {
      const isRequired = true;
      const isEmpty = data[field] == null;
      return (
        <div className="space-y-1.5" key={field}>
          <Label className="text-sm font-medium">
            {label} <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            value={data[field] ?? ''}
            onChange={(e) => update(field, e.target.value ? parseInt(e.target.value) : null)}
            placeholder="Quantidade (obrigatório)"
            readOnly={readOnly}
            className={isEmpty && !readOnly ? 'border-destructive' : ''}
          />
          {field === 'qtdProdutosConcorrentes' && shareNosso !== null && (
            <p className="text-xs font-medium text-primary">
              📊 Share nosso: {shareNosso}%
            </p>
          )}
        </div>
      );
    }

    if (field === 'assistenciaIdentificada') {
      return (
        <div className="space-y-1.5 col-span-full" key={field}>
          <Label className="text-sm font-medium">{label}</Label>
          <BooleanField field={field} />
          {data.assistenciaIdentificada === true && (
            <div className="mt-2 p-3 border rounded-md bg-muted/50 space-y-3">
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Um card de assistência será criado automaticamente ao salvar</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{FIELD_LABELS['assistenciaProduto']}</Label>
                <Input
                  value={data.assistenciaProduto}
                  onChange={(e) => update('assistenciaProduto', e.target.value)}
                  placeholder="Nome/modelo do produto"
                  readOnly={readOnly}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{FIELD_LABELS['assistenciaDefeito']}</Label>
                <Input
                  value={data.assistenciaDefeito}
                  onChange={(e) => update('assistenciaDefeito', e.target.value)}
                  placeholder="Descreva o defeito"
                  readOnly={readOnly}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{FIELD_LABELS['assistenciaDescricao']}</Label>
                <Textarea
                  value={data.assistenciaDescricao}
                  onChange={(e) => update('assistenciaDescricao', e.target.value)}
                  placeholder="Detalhes adicionais..."
                  rows={2}
                  readOnly={readOnly}
                />
              </div>
            </div>
          )}
        </div>
      );
    }

    // Skip sub-fields of assistance (rendered inline above)
    if (field === 'assistenciaProduto' || field === 'assistenciaDefeito' || field === 'assistenciaDescricao') {
      return null;
    }

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
      case 'acoesAndamento':
      case 'necessidadeAtualizacao':
      case 'concorrentesExpostos':
        return (
          <div className={`space-y-1.5 ${field === 'acoesAndamento' || field === 'concorrentesExpostos' ? 'col-span-full' : ''}`} key={field}>
            <Label className="text-sm font-medium">{label}</Label>
            <Textarea
              value={(data as unknown as Record<string, string>)[field] || ''}
              onChange={(e) => update(field as keyof StoreChecklistData, e.target.value)}
              placeholder={label}
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
            {shareNosso !== null && (
              <Badge variant="outline">Share {shareNosso}%</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] px-6 pb-6">
          <div className="space-y-6 pt-4">
            {/* Header fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
