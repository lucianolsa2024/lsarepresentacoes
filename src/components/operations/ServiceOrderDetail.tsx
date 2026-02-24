import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Upload, Trash2, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceOrder, ServiceOrderPhoto, ChangeHistoryEntry } from '@/types/serviceOrder';
import { getStatusColor } from '@/types/serviceOrder';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ServiceOrder | null;
  photos: ServiceOrderPhoto[];
  onUploadPhoto: (file: File, type: 'recebimento' | 'liberacao') => Promise<boolean>;
  onDeletePhoto: (photoId: string) => Promise<boolean>;
  onUploadNf: (file: File) => Promise<string | null>;
}

export function ServiceOrderDetail({ open, onOpenChange, order, photos, onUploadPhoto, onDeletePhoto, onUploadNf }: Props) {
  const recRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);
  const nfRef = useRef<HTMLInputElement>(null);
  const [localPhotos, setLocalPhotos] = useState<ServiceOrderPhoto[]>([]);

  useEffect(() => { setLocalPhotos(photos); }, [photos]);

  if (!order) return null;

  const recPhotos = localPhotos.filter(p => p.photo_type === 'recebimento');
  const libPhotos = localPhotos.filter(p => p.photo_type === 'liberacao');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'recebimento' | 'liberacao') => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await onUploadPhoto(file, type);
    }
    e.target.value = '';
  };

  const handleNfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await onUploadNf(file);
    e.target.value = '';
  };

  const handleDeletePhoto = async (id: string) => {
    const ok = await onDeletePhoto(id);
    if (ok) setLocalPhotos(prev => prev.filter(p => p.id !== id));
  };

  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {order.os_number}
            <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div><span className="text-muted-foreground">Produto:</span> <strong>{order.product || '—'}</strong></div>
          <div><span className="text-muted-foreground">Responsável:</span> <strong>{order.responsible_type}</strong></div>
          <div><span className="text-muted-foreground">Nome:</span> <strong>{order.responsible_name || '—'}</strong></div>
          <div><span className="text-muted-foreground">NF Origem:</span> <strong>{order.origin_nf || '—'}</strong></div>
          <div><span className="text-muted-foreground">Previsão:</span> <strong>{formatDate(order.delivery_forecast)}</strong></div>
          <div><span className="text-muted-foreground">RT:</span> <strong>{order.has_rt ? `Sim (${order.rt_percentage}%)` : 'Não'}</strong></div>
        </div>

        <div className="text-sm"><span className="text-muted-foreground">Defeito:</span> {order.defect || '—'}</div>

        {/* Costs */}
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div><span className="text-muted-foreground">Mão de obra:</span><br /><strong>{formatBRL(order.labor_cost)}</strong></div>
          <div><span className="text-muted-foreground">Insumos:</span><br /><strong>{formatBRL(order.supplies_cost)}</strong></div>
          <div><span className="text-muted-foreground">Frete:</span><br /><strong>{formatBRL(order.freight_cost)}</strong></div>
          <div>
            <span className="text-muted-foreground">Resultado:</span><br />
            <strong className={cn(order.net_result >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatBRL(order.net_result)}
            </strong>
          </div>
        </div>

        {/* NF de insumos */}
        <Separator />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">NF de Insumos</h4>
            <Button size="sm" variant="outline" onClick={() => nfRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Upload PDF/XML
            </Button>
            <input ref={nfRef} type="file" accept=".pdf,.xml" className="hidden" onChange={handleNfUpload} />
          </div>
          {order.supplies_nf_url && (
            <a href={order.supplies_nf_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <FileText className="h-4 w-4" /> Ver NF
            </a>
          )}
          {order.supplies_nf_data && (
            <Card><CardContent className="p-3 text-xs">
              <p><strong>Fornecedor:</strong> {(order.supplies_nf_data as Record<string, unknown>).fornecedor as string}</p>
              <p><strong>Valor:</strong> {(order.supplies_nf_data as Record<string, unknown>).valor_total as string}</p>
            </CardContent></Card>
          )}
        </div>

        {/* Photos */}
        <Separator />
        <PhotoSection title="Fotos de Recebimento" photos={recPhotos} inputRef={recRef}
          onUpload={e => handleFileChange(e, 'recebimento')} onDelete={handleDeletePhoto} />

        <Separator />
        <PhotoSection title="Fotos de Liberação" photos={libPhotos} inputRef={libRef}
          onUpload={e => handleFileChange(e, 'liberacao')} onDelete={handleDeletePhoto} />

        {/* Bling fields */}
        {(order.exit_nf || order.boleto_info) && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">NF Saída:</span> {order.exit_nf || '—'}</div>
              <div><span className="text-muted-foreground">Boleto:</span> {order.boleto_info || '—'}</div>
            </div>
          </>
        )}

        {/* Change history */}
        {order.change_history.length > 0 && (
          <>
            <Separator />
            <h4 className="font-semibold text-sm">Histórico de Alterações</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {[...order.change_history].reverse().map((ch: ChangeHistoryEntry, i: number) => (
                <div key={i} className="text-xs border-b pb-1">
                  <span className="text-muted-foreground">
                    {new Date(ch.changed_at).toLocaleString('pt-BR')} — {ch.changed_by}
                  </span>
                  <br />
                  <strong>{ch.field}</strong>: {String(ch.old_value ?? '—')} → {String(ch.new_value ?? '—')}
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PhotoSection({ title, photos, inputRef, onUpload, onDelete }: {
  title: string;
  photos: ServiceOrderPhoto[];
  inputRef: React.RefObject<HTMLInputElement>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{title}</h4>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1" /> Adicionar
        </Button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
      </div>
      {photos.length === 0 ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Nenhuma foto</p>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map(p => (
            <div key={p.id} className="relative group">
              <img src={p.file_url} alt={p.file_name || 'foto'} className="w-full h-24 object-cover rounded-md" />
              <Button size="icon" variant="destructive"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onDelete(p.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
