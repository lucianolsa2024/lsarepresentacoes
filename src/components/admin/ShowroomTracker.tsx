import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useShowroomTracking, ShowroomItem } from '@/hooks/useShowroomTracking';
import { ShowroomImporter } from './ShowroomImporter';
import { Package, AlertTriangle, Eye, GraduationCap, DollarSign, Search, X } from 'lucide-react';

const urgenciaIcon = (u: string) => {
  if (u === 'critico' || u === 'vermelho') return '🔴';
  if (u === 'alerta' || u === 'amarelo') return '🟡';
  return '🟢';
};

const statusCls = (s: string) => {
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
  const [search, setSearch] = useState('');
  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [modalExposicao, setModalExposicao] = useState<ShowroomItem | null>(null);
  const [expStatus, setExpStatus] = useState('exposto');
  const [expObs, setExpObs] = useState('');

  const [modalTreino, setModalTreino] = useState<ShowroomItem | null>(null);
  const [treinoData, setTreinoData] = useState('');
  const [treinoObs, setTreinoObs] = useState('');

  const reps = useMemo(() => [...new Set(items.map(i => i.representante).filter(Boolean))].sort(), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (filtroRep !== 'all' && i.representante !== filtroRep) return false;
      if (filtroStatus !== 'all' && i.status_exposicao !== filtroStatus) return false;
      if (filtroUrgencia !== 'all' && i.urgencia !== filtroUrgencia) return false;
      if (dataIni && (!i.dt_faturamento || i.dt_faturamento < dataIni)) return false;
      if (dataFim && (!i.dt_faturamento || i.dt_faturamento > dataFim)) return false;
      if (q) {
        const hay = [
          i.cliente, i.representante, i.produto, i.cidade, i.nf_numero,
          i.segmento_cliente, i.status_exposicao, i.status_treinamento,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filtroRep, filtroStatus, filtroUrgencia, search, dataIni, dataFim]);

  const limparFiltros = () => {
    setFiltroRep('all'); setFiltroStatus('all'); setFiltroUrgencia('all');
    setSearch(''); setDataIni(''); setDataFim('');
  };

  const hasFilters = filtroRep !== 'all' || filtroStatus !== 'all' || filtroUrgencia !== 'all' || !!search || !!dataIni || !!dataFim;

  const kpis = useMemo(() => {
    const pendentes = items.filter(i => i.status_exposicao === 'pendente');
    const urgentes = items.filter(i => i.dias_desde_fat > 15 && i.status_exposicao === 'pendente');
    const treinPendentes = items.filter(i => i.status_exposicao === 'exposto' && i.status_treinamento === 'pendente');
    const valorTotal = items.reduce((s, i) => s + Number(i.valor || 0), 0);
    return { pendentes: pendentes.length, valorTotal, urgentes: urgentes.length, treinPendentes: treinPendentes.length };
  }, [items]);

  const handleConfirmarExposicao = () => {
    if (!modalExposicao) return;
    confirmarExposicao.mutate({
      id: modalExposicao.id,
      status_exposicao: expStatus,
      observacao: expObs,
      // If marking as "exposto", schedule training activity
      agendarTreinamento: expStatus === 'exposto',
      cliente: modalExposicao.cliente,
      produto: modalExposicao.produto,
      representante: modalExposicao.representante,
    });
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
    <div className="space-y-3">
      {/* Header row: KPIs + Import */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-3 flex-wrap flex-1">
          <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2">
            <Package className="h-5 w-5 text-primary" />
            <div><span className="text-lg font-bold">{kpis.pendentes}</span> <span className="text-xs text-muted-foreground">pendentes</span></div>
          </div>
          <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <div><span className="text-lg font-bold">R$ {kpis.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span> <span className="text-xs text-muted-foreground">total</span></div>
          </div>
          <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div><span className="text-lg font-bold">{kpis.urgentes}</span> <span className="text-xs text-muted-foreground">urgentes</span></div>
          </div>
          <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2">
            <GraduationCap className="h-5 w-5 text-amber-500" />
            <div><span className="text-lg font-bold">{kpis.treinPendentes}</span> <span className="text-xs text-muted-foreground">treinamentos</span></div>
          </div>
        </div>
        <ShowroomImporter />
      </div>

      {/* Filters inline */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-[340px]">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente, NF, produto, cidade..."
            className="h-8 text-xs pl-7"
          />
        </div>
        <Select value={filtroRep} onValueChange={setFiltroRep}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Representante" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos representantes</SelectItem>
            {reps.map(r => <SelectItem key={r} value={r!}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="exposto">Exposto</SelectItem>
            <SelectItem value="não exposto">Não exposto</SelectItem>
            <SelectItem value="substituído">Substituído</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroUrgencia} onValueChange={setFiltroUrgencia}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Urgência" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas urgências</SelectItem>
            <SelectItem value="critico">🔴 Crítico</SelectItem>
            <SelectItem value="alerta">🟡 Alerta</SelectItem>
            <SelectItem value="ok">🟢 OK</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">De</span>
          <Input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} className="h-8 text-xs w-[140px]" />
          <span className="text-[10px] text-muted-foreground">até</span>
          <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="h-8 text-xs w-[140px]" />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={limparFiltros}>
            <X className="h-3 w-3 mr-1" />Limpar
          </Button>
        )}
      </div>

      {/* Table full width with vertical scroll */}
      <div className="overflow-auto max-h-[calc(100vh-280px)] border rounded-md">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow className="text-xs">
              <TableHead className="w-8 px-2">Urg</TableHead>
              <TableHead className="px-2">NF</TableHead>
              <TableHead className="px-2">Dt Fat</TableHead>
              <TableHead className="px-2 w-10">Dias</TableHead>
              <TableHead className="px-2">Cliente</TableHead>
              <TableHead className="px-2">Cidade</TableHead>
              <TableHead className="px-2">Representante</TableHead>
              <TableHead className="px-2">Produto</TableHead>
              <TableHead className="px-2 text-right">Qtde</TableHead>
              <TableHead className="px-2 text-right">Valor</TableHead>
              <TableHead className="px-2">Exp.</TableHead>
              <TableHead className="px-2">Trein.</TableHead>
              <TableHead className="px-2">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-6 text-xs">Nenhum item encontrado</TableCell></TableRow>
            )}
            {filtered.map(item => (
              <TableRow key={item.id} className="text-xs">
                <TableCell className="px-2 text-sm">{urgenciaIcon(item.urgencia)}</TableCell>
                <TableCell className="px-2 font-mono">{item.nf_numero}</TableCell>
                <TableCell className="px-2">{item.dt_faturamento ? new Date(item.dt_faturamento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</TableCell>
                <TableCell className="px-2 font-bold">{item.dias_desde_fat}d</TableCell>
                <TableCell className="px-2 max-w-[100px] truncate">{item.cliente}</TableCell>
                <TableCell className="px-2">{item.cidade || '-'}</TableCell>
                <TableCell className="px-2">{item.representante || '-'}</TableCell>
                <TableCell className="px-2 max-w-[90px] truncate">{item.produto}</TableCell>
                <TableCell className="px-2 text-right">{item.quantidade}</TableCell>
                <TableCell className="px-2 text-right whitespace-nowrap">R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</TableCell>
                <TableCell className="px-2"><span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusCls(item.status_exposicao)}`}>{item.status_exposicao}</span></TableCell>
                <TableCell className="px-2"><span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusCls(item.status_treinamento)}`}>{item.status_treinamento}</span></TableCell>
                <TableCell className="px-2">
                  <div className="flex gap-1">
                    {item.status_exposicao === 'pendente' && (
                      <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => { setModalExposicao(item); setExpStatus('exposto'); }}>
                        <Eye className="h-3 w-3 mr-1" />Exp.
                      </Button>
                    )}
                    {item.status_exposicao === 'exposto' && item.status_treinamento === 'pendente' && (
                      <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => { setModalTreino(item); setTreinoData(new Date().toISOString().split('T')[0]); }}>
                        <GraduationCap className="h-3 w-3 mr-1" />Treinar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-[10px] text-muted-foreground mt-1">{filtered.length} de {items.length} itens</p>
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
              {expStatus === 'exposto' && (
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  ✅ Ao confirmar, uma atividade de treinamento será agendada automaticamente para o representante.
                </p>
              )}
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
