import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useShowroomTracking, ShowroomItem } from '@/hooks/useShowroomTracking';
import { ShowroomImporter } from './ShowroomImporter';
import { Package, AlertTriangle, Eye, GraduationCap, DollarSign } from 'lucide-react';

const urgenciaIcon = (u: string) => {
  if (u === 'critico' || u === 'vermelho') return '🔴';
  if (u === 'alerta' || u === 'amarelo') return '🟡';
  return '🟢';
};

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    pendente: 'bg-yellow-100 text-yellow-800',
    exposto: 'bg-green-100 text-green-800',
    'não exposto': 'bg-red-100 text-red-800',
    substituído: 'bg-blue-100 text-blue-800',
    realizado: 'bg-green-100 text-green-800',
  };
  return map[s] || 'bg-muted text-muted-foreground';
};

export function ShowroomTracker() {
  const { items, resumoRep, isLoading, confirmarExposicao, marcarTreinamento } = useShowroomTracking();

  const [filtroRep, setFiltroRep] = useState('all');
  const [filtroStatus, setFiltroStatus] = useState('all');
  const [filtroUrgencia, setFiltroUrgencia] = useState('all');
  const [filtroSegmento, setFiltroSegmento] = useState('all');

  const [modalExposicao, setModalExposicao] = useState<ShowroomItem | null>(null);
  const [expStatus, setExpStatus] = useState('exposto');
  const [expObs, setExpObs] = useState('');

  const [modalTreino, setModalTreino] = useState<ShowroomItem | null>(null);
  const [treinoData, setTreinoData] = useState('');
  const [treinoObs, setTreinoObs] = useState('');

  const reps = useMemo(() => [...new Set(items.map(i => i.representante).filter(Boolean))].sort(), [items]);
  const segmentos = useMemo(() => [...new Set(items.map(i => i.segmento_cliente).filter(Boolean))].sort(), [items]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (filtroRep !== 'all' && i.representante !== filtroRep) return false;
      if (filtroStatus !== 'all' && i.status_exposicao !== filtroStatus) return false;
      if (filtroUrgencia !== 'all' && i.urgencia !== filtroUrgencia) return false;
      if (filtroSegmento !== 'all' && i.segmento_cliente !== filtroSegmento) return false;
      return true;
    });
  }, [items, filtroRep, filtroStatus, filtroUrgencia, filtroSegmento]);

  const kpis = useMemo(() => {
    const pendentes = items.filter(i => i.status_exposicao === 'pendente');
    const urgentes = items.filter(i => i.dias_desde_fat > 15 && i.status_exposicao === 'pendente');
    const treinPendentes = items.filter(i => i.status_exposicao === 'exposto' && i.status_treinamento === 'pendente');
    const valorTotal = items.reduce((s, i) => s + Number(i.valor || 0), 0);
    return { pendentes: pendentes.length, valorTotal, urgentes: urgentes.length, treinPendentes: treinPendentes.length };
  }, [items]);

  const handleConfirmarExposicao = () => {
    if (!modalExposicao) return;
    confirmarExposicao.mutate({ id: modalExposicao.id, status_exposicao: expStatus, observacao: expObs });
    setModalExposicao(null);
    setExpObs('');
  };

  const handleMarcarTreinamento = () => {
    if (!modalTreino || !treinoData) return;
    marcarTreinamento.mutate({ id: modalTreino.id, data_treinamento: treinoData, obs_treinamento: treinoObs });
    setModalTreino(null);
    setTreinoObs('');
    setTreinoData('');
  };

  if (isLoading) return <p className="text-muted-foreground p-4">Carregando...</p>;

  return (
    <div className="space-y-6">
      {/* Import button */}
      <div className="flex justify-end">
        <ShowroomImporter />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <div><p className="text-2xl font-bold">{kpis.pendentes}</p><p className="text-xs text-muted-foreground">Pendentes de exposição</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-primary" />
          <div><p className="text-2xl font-bold">R$ {kpis.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p><p className="text-xs text-muted-foreground">Valor em acompanhamento</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div><p className="text-2xl font-bold">{kpis.urgentes}</p><p className="text-xs text-muted-foreground">Urgentes (+15 dias)</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-amber-500" />
          <div><p className="text-2xl font-bold">{kpis.treinPendentes}</p><p className="text-xs text-muted-foreground">Treinamentos pendentes</p></div>
        </CardContent></Card>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={filtroRep} onValueChange={setFiltroRep}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Representante" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos representantes</SelectItem>
                {reps.map(r => <SelectItem key={r} value={r!}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="exposto">Exposto</SelectItem>
                <SelectItem value="não exposto">Não exposto</SelectItem>
                <SelectItem value="substituído">Substituído</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroUrgencia} onValueChange={setFiltroUrgencia}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Urgência" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas urgências</SelectItem>
                <SelectItem value="critico">🔴 Crítico</SelectItem>
                <SelectItem value="alerta">🟡 Alerta</SelectItem>
                <SelectItem value="ok">🟢 OK</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroSegmento} onValueChange={setFiltroSegmento}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Segmento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos segmentos</SelectItem>
                {segmentos.map(s => <SelectItem key={s} value={s!}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Urg.</TableHead>
                    <TableHead>NF</TableHead>
                    <TableHead>Dt Fat</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Representante</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtde</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Exposição</TableHead>
                    <TableHead>Treinamento</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-8">Nenhum item encontrado</TableCell></TableRow>
                  )}
                  {filtered.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="text-lg">{urgenciaIcon(item.urgencia)}</TableCell>
                      <TableCell className="font-mono text-xs">{item.nf_numero}</TableCell>
                      <TableCell className="text-xs">{item.dt_faturamento ? new Date(item.dt_faturamento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</TableCell>
                      <TableCell className="font-bold">{item.dias_desde_fat}d</TableCell>
                      <TableCell className="font-medium max-w-[140px] truncate">{item.cliente}</TableCell>
                      <TableCell className="text-xs">{item.cidade || '-'}</TableCell>
                      <TableCell className="text-xs">{item.representante || '-'}</TableCell>
                      <TableCell className="max-w-[120px] truncate">{item.produto}</TableCell>
                      <TableCell className="text-right">{item.quantidade}</TableCell>
                      <TableCell className="text-right">R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(item.status_exposicao)}`}>{item.status_exposicao}</span></TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(item.status_treinamento)}`}>{item.status_treinamento}</span></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.status_exposicao === 'pendente' && (
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setModalExposicao(item); setExpStatus('exposto'); }}>
                              <Eye className="h-3 w-3 mr-1" />Exposição
                            </Button>
                          )}
                          {item.status_exposicao === 'exposto' && item.status_treinamento === 'pendente' && (
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setModalTreino(item); setTreinoData(new Date().toISOString().split('T')[0]); }}>
                              <GraduationCap className="h-3 w-3 mr-1" />Treinar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">{filtered.length} itens exibidos de {items.length} total</p>
        </div>

        {/* Sidebar - Resumo por representante */}
        <div className="w-full lg:w-72 space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Resumo por Representante</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {resumoRep.length === 0 && <p className="text-xs text-muted-foreground">Sem dados</p>}
              {resumoRep.map((r, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-1">
                  <p className="font-medium text-sm truncate">{r.representante}</p>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Expostos: {r.expostos}/{r.total_itens}</span>
                    <span className="font-semibold">{Number(r.taxa_exposicao || 0).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-primary rounded-full h-1.5" style={{ width: `${Math.min(Number(r.taxa_exposicao || 0), 100)}%` }} />
                  </div>
                  {Number(r.urgentes) > 0 && (
                    <p className="text-xs text-destructive">🔴 {r.urgentes} urgente(s)</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Exposição */}
      <Dialog open={!!modalExposicao} onOpenChange={() => setModalExposicao(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exposição</DialogTitle></DialogHeader>
          {modalExposicao && (
            <div className="space-y-4">
              <p className="text-sm"><strong>{modalExposicao.produto}</strong> — {modalExposicao.cliente}</p>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={expStatus} onValueChange={setExpStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exposto">Exposto</SelectItem>
                    <SelectItem value="não exposto">Não exposto</SelectItem>
                    <SelectItem value="substituído">Substituído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Observação</label>
                <Textarea value={expObs} onChange={e => setExpObs(e.target.value)} placeholder="Observações..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalExposicao(null)}>Cancelar</Button>
            <Button onClick={handleConfirmarExposicao} disabled={confirmarExposicao.isPending}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Treinamento */}
      <Dialog open={!!modalTreino} onOpenChange={() => setModalTreino(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar Treinamento</DialogTitle></DialogHeader>
          {modalTreino && (
            <div className="space-y-4">
              <p className="text-sm"><strong>{modalTreino.produto}</strong> — {modalTreino.cliente}</p>
              <div>
                <label className="text-sm font-medium">Data do treinamento</label>
                <Input type="date" value={treinoData} onChange={e => setTreinoData(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Observação</label>
                <Textarea value={treinoObs} onChange={e => setTreinoObs(e.target.value)} placeholder="Observações..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalTreino(null)}>Cancelar</Button>
            <Button onClick={handleMarcarTreinamento} disabled={marcarTreinamento.isPending || !treinoData}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
