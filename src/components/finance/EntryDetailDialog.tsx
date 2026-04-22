import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, ExternalLink, History, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { FinanceEntry, FinanceCategory, FinanceCompany } from '@/hooks/useFinanceEntries';
import { EntryStatusBadge } from './EntryStatusBadge';

interface AuditLogRow {
  id: string;
  action: string;
  created_at: string;
  user_email: string | null;
  payload: Record<string, unknown> | null;
}

interface DocRow {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  status: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: FinanceEntry | null;
  companies: FinanceCompany[];
  categories: FinanceCategory[];
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const ACTION_LABEL: Record<string, string> = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  other: 'Evento',
};

export function EntryDetailDialog({ open, onOpenChange, entry, companies, categories }: Props) {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !entry) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [logsRes, docsRes] = await Promise.all([
        supabase
          .from('finance_audit_log')
          .select('id, action, created_at, user_email, payload')
          .eq('table_name', 'finance_entries')
          .eq('record_id', entry.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('finance_documents')
          .select('id, file_name, storage_path, mime_type, status, created_at')
          .eq('entry_id', entry.id)
          .order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      setLogs((logsRes.data ?? []) as AuditLogRow[]);
      setDocs((docsRes.data ?? []) as DocRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, entry]);

  if (!entry) return null;

  const company = entry.company_id ? companies.find((c) => c.id === entry.company_id) : null;
  const category = entry.category_id ? categories.find((c) => c.id === entry.category_id) : null;

  const openDoc = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('finance-documents')
      .createSignedUrl(path, 60 * 5);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <span className="truncate">{entry.description}</span>
            <EntryStatusBadge status={entry.status} dueDate={entry.due_date} />
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 py-2">
            {/* Resumo */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Tipo" value={entry.entry_type === 'a_pagar' ? 'A pagar' : 'A receber'} />
              <Field label="Valor" value={fmtBRL(Number(entry.amount))} mono />
              <Field label="Vencimento" value={fmtDate(entry.due_date)} />
              <Field label="Pagamento" value={fmtDate(entry.paid_date)} />
              <Field
                label={entry.entry_type === 'a_pagar' ? 'Pagador / Empresa' : 'Recebedor / Empresa'}
                value={company?.name ?? '—'}
              />
              <Field
                label={entry.entry_type === 'a_pagar' ? 'Fornecedor' : 'Cliente'}
                value={entry.counterparty ?? '—'}
              />
              <Field label="Categoria" value={category?.name ?? '—'} />
              <Field label="Forma de pagamento" value={entry.payment_method ?? '—'} />
              <Field label="Centro de custo" value={entry.cost_center ?? '—'} />
              <Field label="Documento / NF" value={entry.document ?? '—'} />
              {entry.installment_total > 1 && (
                <Field
                  label="Parcela"
                  value={`${entry.installment_index}/${entry.installment_total}`}
                />
              )}
              {entry.recurrence_rule && (
                <Field label="Recorrência" value={entry.recurrence_rule} />
              )}
            </div>

            {entry.notes && (
              <>
                <Separator />
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Observações</div>
                  <p className="text-sm whitespace-pre-wrap">{entry.notes}</p>
                </div>
              </>
            )}

            {/* Documentos / NF */}
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Documento / Nota Fiscal</h4>
              </div>
              {loading && docs.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
                </div>
              ) : docs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum documento anexado a este lançamento.
                  {entry.document && (
                    <> Referência informada: <span className="font-medium text-foreground">{entry.document}</span></>
                  )}
                </p>
              ) : (
                <ul className="space-y-2">
                  {docs.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border p-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{d.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.mime_type} · {fmtDateTime(d.created_at)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 shrink-0"
                        onClick={() => openDoc(d.storage_path)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Abrir
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Histórico */}
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Histórico</h4>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
                </div>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem registros de alteração.</p>
              ) : (
                <ol className="relative border-l border-border ml-2 space-y-3">
                  {logs.map((l) => (
                    <li key={l.id} className="ml-4">
                      <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {ACTION_LABEL[l.action] ?? l.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {fmtDateTime(l.created_at)}
                        </span>
                        {l.user_email && (
                          <span className="text-xs text-muted-foreground">· {l.user_email}</span>
                        )}
                      </div>
                      {l.payload && Object.keys(l.payload).length > 0 && (
                        <pre className="mt-1 text-[11px] bg-muted/40 rounded p-2 overflow-x-auto max-h-32">
                          {JSON.stringify(l.payload, null, 2)}
                        </pre>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm ${mono ? 'font-mono' : 'font-medium'}`}>{value}</div>
    </div>
  );
}
