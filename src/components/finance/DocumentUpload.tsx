import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Trash2,
  Sparkles,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useFinanceEntries, type EntryType } from '@/hooks/useFinanceEntries';

type DocStatus = 'uploading' | 'processing' | 'extracted' | 'confirmed' | 'error';

interface FinanceDocument {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  file_hash: string | null;
  status: DocStatus;
  ocr_confidence: 'alta' | 'media' | 'baixa' | null;
  extracted_data: ExtractedData | null;
  error_message: string | null;
  entry_id: string | null;
  created_at: string;
}

interface ExtractedData {
  document_type?: string;
  counterparty?: string | null;
  document_number?: string | null;
  amount?: number | null;
  issue_date?: string | null;
  due_date?: string | null;
  description?: string | null;
  entry_type?: EntryType;
  suggested_category?: string | null;
  boleto_line?: string | null;
  confidence?: 'alta' | 'media' | 'baixa';
  notes?: string | null;
}

const fmtBRL = (v: number | null | undefined) =>
  typeof v === 'number'
    ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const STATUS_LABEL: Record<DocStatus, { label: string; className: string; icon: typeof Loader2 }> = {
  uploading: { label: 'Enviando', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: Loader2 },
  processing: { label: 'Processando IA', className: 'bg-amber-100 text-amber-700 border-amber-200', icon: Sparkles },
  extracted: { label: 'Extraído', className: 'bg-purple-100 text-purple-700 border-purple-200', icon: Eye },
  confirmed: { label: 'Lançado', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  error: { label: 'Erro', className: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
};

const CONFIDENCE_BADGE: Record<string, string> = {
  alta: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  media: 'bg-amber-100 text-amber-700 border-amber-200',
  baixa: 'bg-red-100 text-red-700 border-red-200',
};

export function DocumentUpload() {
  const { companies, categories, createEntry } = useFinanceEntries();
  const [docs, setDocs] = useState<FinanceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [reviewDoc, setReviewDoc] = useState<FinanceDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('finance_documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      toast.error('Erro ao carregar documentos');
    } else {
      setDocs((data ?? []) as FinanceDocument[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  // Realtime para atualizar status
  useEffect(() => {
    const channel = supabase
      .channel('finance_documents_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_documents' }, () => {
        loadDocs();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDocs]);

  const triggerExtract = useCallback(async (documentId: string, storagePath: string, mimeType: string) => {
    const { error } = await supabase.functions.invoke('extract-finance-document', {
      body: { document_id: documentId, storage_path: storagePath, mime_type: mimeType },
    });
    if (error) {
      toast.error('Falha ao processar documento com IA');
    }
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      for (const file of arr) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name}: excede 20MB`);
          continue;
        }
        const validType =
          file.type === 'application/pdf' ||
          file.type.startsWith('image/');
        if (!validType) {
          toast.error(`${file.name}: tipo não suportado (use PDF ou imagem)`);
          continue;
        }

        try {
          // Hash p/ deduplicação
          const hash = await sha256Hex(file);
          const { data: existing } = await supabase
            .from('finance_documents')
            .select('id, file_name, status')
            .eq('file_hash', hash)
            .maybeSingle();
          if (existing) {
            toast.warning(`Documento já processado: ${existing.file_name}`);
            continue;
          }

          const tmpKey = `${Date.now()}-${file.name}`;
          setUploadProgress((p) => ({ ...p, [tmpKey]: 10 }));

          const ext = file.name.split('.').pop() || 'bin';
          const storagePath = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;

          const { error: upErr } = await supabase.storage
            .from('finance-documents')
            .upload(storagePath, file, { contentType: file.type, upsert: false });
          if (upErr) throw upErr;

          setUploadProgress((p) => ({ ...p, [tmpKey]: 70 }));

          const { data: inserted, error: insErr } = await supabase
            .from('finance_documents')
            .insert({
              file_name: file.name,
              storage_path: storagePath,
              mime_type: file.type,
              file_size: file.size,
              file_hash: hash,
              status: 'processing',
            })
            .select('*')
            .single();
          if (insErr || !inserted) throw insErr ?? new Error('insert falhou');

          setUploadProgress((p) => ({ ...p, [tmpKey]: 100 }));
          setTimeout(() => {
            setUploadProgress((p) => {
              const { [tmpKey]: _drop, ...rest } = p;
              return rest;
            });
          }, 800);

          await loadDocs();
          // dispara IA em background
          triggerExtract(inserted.id, storagePath, file.type);
          toast.success(`${file.name} enviado — IA processando…`);
        } catch (err) {
          console.error(err);
          toast.error(`Falha no upload de ${file.name}`);
        }
      }
    },
    [loadDocs, triggerExtract],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const reprocess = useCallback(
    async (doc: FinanceDocument) => {
      await supabase
        .from('finance_documents')
        .update({ status: 'processing', error_message: null })
        .eq('id', doc.id);
      await loadDocs();
      triggerExtract(doc.id, doc.storage_path, doc.mime_type);
      toast.info('Reprocessando…');
    },
    [loadDocs, triggerExtract],
  );

  const downloadDoc = useCallback(async (doc: FinanceDocument) => {
    const { data, error } = await supabase.storage
      .from('finance-documents')
      .createSignedUrl(doc.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast.error('Falha ao gerar link');
      return;
    }
    window.open(data.signedUrl, '_blank');
  }, []);

  const removeDoc = useCallback(
    async (doc: FinanceDocument) => {
      if (!confirm(`Excluir "${doc.file_name}"?`)) return;
      await supabase.storage.from('finance-documents').remove([doc.storage_path]);
      await supabase.from('finance_documents').delete().eq('id', doc.id);
      toast.success('Documento removido');
      loadDocs();
    },
    [loadDocs],
  );

  const openReview = useCallback(async (doc: FinanceDocument) => {
    const { data } = await supabase.storage
      .from('finance-documents')
      .createSignedUrl(doc.storage_path, 600);
    setPreviewUrl(data?.signedUrl ?? null);
    setReviewDoc(doc);
  }, []);

  const stats = useMemo(() => {
    const total = docs.length;
    const processing = docs.filter((d) => d.status === 'processing' || d.status === 'uploading').length;
    const pending = docs.filter((d) => d.status === 'extracted').length;
    const errors = docs.filter((d) => d.status === 'error').length;
    return { total, processing, pending, errors };
  }, [docs]);

  return (
    <div className="space-y-4">
      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Em processamento" value={stats.processing} accent="text-amber-600" />
        <StatCard label="Aguardando revisão" value={stats.pending} accent="text-purple-600" />
        <StatCard label="Erros" value={stats.errors} accent="text-red-600" />
      </div>

      {/* Drop zone */}
      <Card>
        <CardContent className="p-4">
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border bg-muted/20 hover:bg-muted/40',
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Arraste arquivos aqui ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground">
                PDFs e imagens (JPG, PNG) · até 20MB · IA extrai dados automaticamente
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {Object.keys(uploadProgress).length > 0 && (
            <div className="mt-4 space-y-2">
              {Object.entries(uploadProgress).map(([k, v]) => (
                <div key={k} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate text-muted-foreground">{k.split('-').slice(1).join('-')}</span>
                    <span className="font-medium">{v}%</span>
                  </div>
                  <Progress value={v} className="h-1.5" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Histórico de documentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : docs.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhum documento enviado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto" style={{ overscrollBehaviorX: 'contain' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead>Fornecedor / Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((d) => {
                    const StatusIcon = STATUS_LABEL[d.status]?.icon ?? Loader2;
                    const ext = d.extracted_data;
                    return (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {d.mime_type.startsWith('image/') ? (
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{d.file_name}</p>
                              <p className="text-xs text-muted-foreground">{fmtSize(d.file_size)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {fmtDateTime(d.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('gap-1', STATUS_LABEL[d.status]?.className)}>
                            <StatusIcon className={cn('h-3 w-3', d.status === 'processing' && 'animate-pulse')} />
                            {STATUS_LABEL[d.status]?.label}
                          </Badge>
                          {d.status === 'error' && d.error_message && (
                            <p className="mt-1 max-w-[220px] truncate text-xs text-red-600" title={d.error_message}>
                              {d.error_message}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {d.ocr_confidence ? (
                            <Badge variant="outline" className={CONFIDENCE_BADGE[d.ocr_confidence]}>
                              {d.ocr_confidence}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {ext ? (
                            <div className="text-xs">
                              <p className="font-medium">{ext.counterparty ?? '—'}</p>
                              <p className="text-muted-foreground">{fmtBRL(ext.amount)}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {d.status === 'extracted' && (
                              <Button size="sm" variant="default" onClick={() => openReview(d)} className="h-8">
                                Revisar
                              </Button>
                            )}
                            {d.status === 'confirmed' && (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> OK
                              </Badge>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => downloadDoc(d)}
                              title="Baixar"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => reprocess(d)}
                              title="Reprocessar"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeDoc(d)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de revisão */}
      <ReviewDialog
        doc={reviewDoc}
        previewUrl={previewUrl}
        companies={companies}
        categories={categories}
        onClose={() => {
          setReviewDoc(null);
          setPreviewUrl(null);
        }}
        onConfirm={async (input, docId) => {
          const ok = await createEntry(input);
          if (ok) {
            await supabase.from('finance_documents').update({ status: 'confirmed' }).eq('id', docId);
            setReviewDoc(null);
            setPreviewUrl(null);
            loadDocs();
          }
        }}
      />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-2xl font-bold', accent ?? 'text-foreground')}>{value}</p>
      </CardContent>
    </Card>
  );
}

interface ReviewDialogProps {
  doc: FinanceDocument | null;
  previewUrl: string | null;
  companies: ReturnType<typeof useFinanceEntries>['companies'];
  categories: ReturnType<typeof useFinanceEntries>['categories'];
  onClose: () => void;
  onConfirm: (
    input: Parameters<ReturnType<typeof useFinanceEntries>['createEntry']>[0],
    docId: string,
  ) => Promise<void>;
}

function ReviewDialog({ doc, previewUrl, companies, categories, onClose, onConfirm }: ReviewDialogProps) {
  const ext = doc?.extracted_data;
  const [form, setForm] = useState({
    entry_type: 'a_pagar' as EntryType,
    description: '',
    amount: 0,
    due_date: '',
    counterparty: '',
    document: '',
    category_id: '',
    company_id: '',
    notes: '',
  });

  useEffect(() => {
    if (!doc || !ext) return;
    // pré-preenche campos
    const desc = ext.description || `${ext.document_type ?? 'Documento'} ${ext.document_number ?? ''}`.trim();
    // tenta sugerir categoria pelo nome
    let suggestedCatId = '';
    if (ext.suggested_category) {
      const found = categories.find(
        (c) => c.name.toLowerCase() === ext.suggested_category!.toLowerCase(),
      );
      if (found) suggestedCatId = found.id;
    }
    setForm({
      entry_type: ext.entry_type ?? 'a_pagar',
      description: desc || doc.file_name,
      amount: ext.amount ?? 0,
      due_date: ext.due_date ?? ext.issue_date ?? new Date().toISOString().slice(0, 10),
      counterparty: ext.counterparty ?? '',
      document: ext.document_number ?? '',
      category_id: suggestedCatId,
      company_id: '',
      notes: ext.notes ?? '',
    });
  }, [doc, ext, categories]);

  if (!doc) return null;

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            Revisar dados extraídos
            {ext?.confidence && (
              <Badge variant="outline" className={CONFIDENCE_BADGE[ext.confidence]}>
                Confiança: {ext.confidence}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid max-h-[65vh] gap-4 overflow-y-auto md:grid-cols-2">
          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Documento original</Label>
            <div className="overflow-hidden rounded-lg border bg-muted/30">
              {previewUrl ? (
                doc.mime_type.startsWith('image/') ? (
                  <img src={previewUrl} alt={doc.file_name} className="w-full object-contain" />
                ) : (
                  <iframe src={previewUrl} className="h-[60vh] w-full" title={doc.file_name} />
                )
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando preview…
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.entry_type} onValueChange={(v) => setForm((f) => ({ ...f, entry_type: v as EntryType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_pagar">A Pagar</SelectItem>
                    <SelectItem value="a_receber">A Receber</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Descrição *</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Documento (NF/Boleto)</Label>
                <Input
                  value={form.document}
                  onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>{form.entry_type === 'a_pagar' ? 'Fornecedor' : 'Cliente'}</Label>
              <Input
                value={form.counterparty}
                onChange={(e) => setForm((f) => ({ ...f, counterparty: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={form.category_id || 'none'}
                  onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhuma —</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {ext?.suggested_category && (
                  <p className="mt-1 text-xs text-purple-600">
                    Sugestão IA: {ext.suggested_category}
                  </p>
                )}
              </div>
              <div>
                <Label>Empresa</Label>
                <Select
                  value={form.company_id || 'none'}
                  onValueChange={(v) => setForm((f) => ({ ...f, company_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhuma —</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() =>
              onConfirm(
                {
                  entry_type: form.entry_type,
                  description: form.description,
                  amount: form.amount,
                  due_date: form.due_date,
                  counterparty: form.counterparty || null,
                  document: form.document || null,
                  category_id: form.category_id || null,
                  company_id: form.company_id || null,
                  notes: form.notes || null,
                },
                doc.id,
              )
            }
            disabled={!form.description || !form.amount || !form.due_date}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Confirmar e criar lançamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
