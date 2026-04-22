import { Badge } from '@/components/ui/badge';
import type { EntryStatus } from '@/hooks/useFinanceEntries';

const MAP: Record<EntryStatus, { label: string; className: string }> = {
  pendente: {
    label: 'Pendente',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
  },
  pago: {
    label: 'Pago',
    className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  },
  vencido: {
    label: 'Vencido',
    className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  },
  cancelado: {
    label: 'Cancelado',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export function EntryStatusBadge({ status, dueDate }: { status: EntryStatus; dueDate?: string }) {
  // Recalcula visualmente para "vencido" se status pendente e venc < hoje
  let effective: EntryStatus = status;
  if (status === 'pendente' && dueDate) {
    const today = new Date().toISOString().slice(0, 10);
    if (dueDate < today) effective = 'vencido';
  }
  const m = MAP[effective];
  return <Badge variant="outline" className={m.className}>{m.label}</Badge>;
}
