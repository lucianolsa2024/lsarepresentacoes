import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const TABLES = [
  'finance_companies',
  'finance_categories',
  'finance_cost_centers',
  'finance_bank_accounts',
  'finance_bank_transactions',
  'finance_entries',
  'finance_reconciliations',
  'finance_documents',
] as const;

export function BackupSettings() {
  const [exporting, setExporting] = useState(false);

  const exportAll = async () => {
    setExporting(true);
    try {
      const dump: Record<string, unknown[]> = {};
      for (const t of TABLES) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from(t as any).select('*') as any);
        if (error) throw error;
        dump[t] = data ?? [];
      }
      const payload = {
        exported_at: new Date().toISOString(),
        tables: dump,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-financeiro-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup gerado com sucesso');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar backup');
    }
    setExporting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Backup e exportação</CardTitle>
        <p className="text-sm text-muted-foreground">
          Exporte uma cópia completa dos dados financeiros em formato JSON.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={exportAll} disabled={exporting} className="gap-1.5">
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Exportar tudo (JSON)
        </Button>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            Os dados ficam armazenados de forma segura na infraestrutura da Lovable Cloud, com
            backup automático contínuo gerenciado pela plataforma. Esta exportação local serve como
            cópia adicional para arquivamento ou auditoria externa.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
