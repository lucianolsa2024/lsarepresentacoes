import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, FileText, DollarSign, RefreshCw, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import {
  importarFaturadosExcel,
  agruparPorPedido,
  gerarParcelas,
  type ProcessamentoResult,
  type ParcelaComissao,
} from '@/lib/importarFaturados';

interface Props {
  onComplete?: () => void;
}

export function FaturadosImporter({ onComplete }: Props) {
  const [processing, setProcessing] = useState(false);
  const [rawDebug, setRawDebug] = useState('');
  const [result, setResult] = useState<ProcessamentoResult | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setProcessing(true);
    setResult(null);
    setRawDebug('');

    try {
      // 1. Debug: show raw columns
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', raw: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { raw: true, defval: null });
      const columns = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
      const firstRow = rawRows.length > 0 ? rawRows[0] : {};
      setRawDebug(
        `Colunas encontradas: ${JSON.stringify(columns)}\n\nPrimeira linha bruta: ${JSON.stringify(firstRow, null, 2)}`
      );

      // 2. Parse
      const parseResult = await importarFaturadosExcel(file);
      if (parseResult.erros.length > 0) {
        console.warn('[FaturadosImporter] Erros:', parseResult.erros);
      }

      // 3. Group
      const agrupados = agruparPorPedido(parseResult.linhas);

      // 4. Process each group
      let statusAtualizados = 0;
      let somenteComissao = 0;
      let parcelasCriadas = 0;
      let duplicatasIgnoradas = 0;
      let totalComissao = 0;

      // Load existing installments for dedup
      const { data: existingInstallments } = await supabase
        .from('commission_installments' as any)
        .select('numero_pedido, numero_nf, parcela_idx, status_parcela');

      const existingMap = new Map<string, string>();
      if (existingInstallments) {
        (existingInstallments as any[]).forEach((inst: any) => {
          existingMap.set(
            `${inst.numero_pedido}|${inst.numero_nf}|${inst.parcela_idx}`,
            inst.status_parcela
          );
        });
      }

      const toInsert: ParcelaComissao[] = [];
      const toUpdate: ParcelaComissao[] = [];

      for (const pedido of agrupados) {
        // Check if order exists in DB
        const { data: orderInDb } = await supabase
          .from('orders')
          .select('id')
          .eq('order_number', String(pedido.numero_pedido))
          .limit(1);

        const orderExists = orderInDb && orderInDb.length > 0;

        if (orderExists) {
          // Update status to faturado
          await supabase
            .from('orders')
            .update({
              status: 'faturado',
              nf_number: String(pedido.numero_nf),
            } as any)
            .eq('order_number', String(pedido.numero_pedido));
          statusAtualizados++;
        } else {
          somenteComissao++;
        }

        // Generate installments
        const parcelas = gerarParcelas(pedido);

        for (const p of parcelas) {
          const key = `${p.numero_pedido}|${p.numero_nf}|${p.parcela_idx}`;
          const existingStatus = existingMap.get(key);

          if (existingStatus === 'pago') {
            duplicatasIgnoradas++;
            continue;
          }

          if (existingStatus) {
            // Exists as pendente → update
            toUpdate.push(p);
          } else {
            // New → insert
            toInsert.push(p);
          }

          totalComissao += p.comissao_calculada;
        }
      }

      // Batch insert new installments
      const BATCH = 100;
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH);
        const { error } = await supabase
          .from('commission_installments' as any)
          .insert(batch);
        if (error) {
          console.error('Insert error:', error);
        } else {
          parcelasCriadas += batch.length;
        }
      }

      // Batch update existing pendente installments
      for (const p of toUpdate) {
        await supabase
          .from('commission_installments' as any)
          .update({
            valor_parcela: p.valor_parcela,
            taxa_comissao: p.taxa_comissao,
            comissao_calculada: p.comissao_calculada,
            vencimento: p.vencimento,
            total_parcelas: p.total_parcelas,
            dt_fat: p.dt_fat,
          })
          .eq('numero_pedido', p.numero_pedido)
          .eq('numero_nf', p.numero_nf)
          .eq('parcela_idx', p.parcela_idx);
        parcelasCriadas++;
      }

      setResult({
        linhasLidas: parseResult.totalLinhas,
        pedidosFaturados: agrupados.length,
        statusAtualizados,
        somenteComissao,
        parcelasCriadas,
        totalComissao,
        duplicatasIgnoradas,
      });

      toast.success('Relatório de faturados processado com sucesso!');
    } catch (err: any) {
      console.error('Error processing faturados:', err);
      toast.error(err.message || 'Erro ao processar relatório');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Relatório de Faturados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Importe o relatório de pedidos faturados do ERP. O sistema irá atualizar o status dos pedidos existentes
            e gerar as parcelas de comissão automaticamente.
          </p>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" disabled={processing}>
              <label className="cursor-pointer">
                {processing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {processing ? 'Processando...' : 'Selecionar arquivo Excel'}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={processing}
                />
              </label>
            </Button>
          </div>

          {rawDebug && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Debug — Colunas e primeira linha:</p>
              <Textarea value={rawDebug} readOnly rows={6} className="text-xs font-mono" />
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              Relatório de Faturados processado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>Linhas lidas:</span>
                <strong>{result.linhasLidas}</strong>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Pedidos faturados (agrupados):</span>
                <strong>{result.pedidosFaturados}</strong>
              </div>
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-blue-600" />
                <span>Status atualizados no banco:</span>
                <strong>{result.statusAtualizados}</strong>
                <span className="text-xs text-muted-foreground">(existiam na carteira)</span>
              </div>
              <div className="flex items-center gap-3">
                <ClipboardList className="h-4 w-4 text-orange-500" />
                <span>Somente comissão gerada:</span>
                <strong>{result.somenteComissao}</strong>
                <span className="text-xs text-muted-foreground">(não estavam na carteira)</span>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-primary" />
                <span>Parcelas de comissão criadas/atualizadas:</span>
                <strong>{result.parcelasCriadas}</strong>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span>Total de comissão calculada:</span>
                <strong className="text-green-700 dark:text-green-400">{formatCurrency(result.totalComissao)}</strong>
              </div>
              {result.duplicatasIgnoradas > 0 && (
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span>Duplicatas ignoradas (já pagas):</span>
                  <strong>{result.duplicatasIgnoradas}</strong>
                </div>
              )}
            </div>

            {onComplete && (
              <Button onClick={onComplete} variant="outline" className="mt-4">
                Voltar para lista
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
