import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, RefreshCcw, Star, Users, AlertTriangle } from 'lucide-react';
import { useSellOutTracker, SellOutFilters } from '@/hooks/useSellOutTracker';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function SellOutTracker() {
  const [filters, setFilters] = useState<SellOutFilters>({ supplier: '', representative: '' });

  const {
    loading, suppliers, representatives,
    totalSellOut, taxaGiroMedia, topProdutoGiro, topClienteSellOut,
    rankingProdutos, showroomSemGiro, rankingClientes,
  } = useSellOutTracker(filters);

  const update = (key: keyof SellOutFilters, val: string) =>
    setFilters(prev => ({ ...prev, [key]: val }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-3">
        <Select value={filters.supplier || '_all'} onValueChange={v => update('supplier', v === '_all' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="Fornecedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os fornecedores</SelectItem>
            {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.representative || '_all'} onValueChange={v => update('representative', v === '_all' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="Representante" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os representantes</SelectItem>
            {representatives.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Total Sell-out
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(totalSellOut)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" /> Taxa de Giro Média
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{taxaGiroMedia.toFixed(1)}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" /> Maior Giro
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-lg font-semibold truncate">{topProdutoGiro}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Top Cliente
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-lg font-semibold truncate">{topClienteSellOut}</p></CardContent>
        </Card>
      </div>

      {/* Giro por Produto (vw_ranking_produtos) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Giro por Produto</CardTitle>
        </CardHeader>
        <CardContent>
          {rankingProdutos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponível.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Clientes vendendo</TableHead>
                  <TableHead className="text-right">Sell-out total</TableHead>
                  <TableHead className="text-center">Peças vendidas</TableHead>
                  <TableHead className="text-center">Clientes c/ showroom</TableHead>
                  <TableHead className="text-center">Taxa conversão %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingProdutos.slice(0, 30).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.product}</TableCell>
                    <TableCell className="text-center">{row.clientes_compradores}</TableCell>
                    <TableCell className="text-right">{fmt(Number(row.sellout_total) || 0)}</TableCell>
                    <TableCell className="text-center">{row.pecas_vendidas}</TableCell>
                    <TableCell className="text-center">{row.clientes_expondo}</TableCell>
                    <TableCell className="text-center">
                      <span className={
                        Number(row.taxa_conversao_pct) >= 70 ? 'text-green-600 font-medium' :
                        Number(row.taxa_conversao_pct) >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }>
                        {Number(row.taxa_conversao_pct).toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Produtos em Risco no Showroom (classificacao_giro = 'showroom_sem_giro') */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Produtos em Risco no Showroom
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showroomSemGiro.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto em risco identificado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Sell-in (exposto)</TableHead>
                  <TableHead className="text-right">Sell-out</TableHead>
                  <TableHead>Ação sugerida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {showroomSemGiro.slice(0, 30).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.client_name}</TableCell>
                    <TableCell>{row.product}</TableCell>
                    <TableCell className="text-right">{fmt(Number(row.sellin) || 0)}</TableCell>
                    <TableCell className="text-right text-red-600">R$ 0</TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="text-xs">Substituir ou treinar</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ranking de Clientes por Sell-out (vw_saude_carteira) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking de Clientes por Sell-out</CardTitle>
        </CardHeader>
        <CardContent>
          {rankingClientes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponível.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Representante</TableHead>
                  <TableHead className="text-right">Sell-out total</TableHead>
                  <TableHead className="text-right">Sell-out 90d</TableHead>
                  <TableHead className="text-center">Taxa de giro</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingClientes.slice(0, 30).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.client_name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.representative}</TableCell>
                    <TableCell className="text-right">{fmt(Number(row.sellout_total) || 0)}</TableCell>
                    <TableCell className="text-right">{fmt(Number(row.sellout_90d) || 0)}</TableCell>
                    <TableCell className="text-center">{Number(row.taxa_giro).toFixed(1)}%</TableCell>
                    <TableCell className="text-center text-lg">
                      {row.status_sellout === 'verde' ? '🟢' : row.status_sellout === 'amarelo' ? '🟡' : '🔴'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
