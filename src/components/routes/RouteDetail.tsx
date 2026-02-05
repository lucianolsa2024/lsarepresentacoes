import { useState, useMemo } from 'react';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Plus, Map, Calendar, Users, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RouteWithVisits, RouteStatus, CreateVisitInput } from '@/types/route';
import { VisitCard } from './VisitCard';
import { RouteClientSelector } from './RouteClientSelector';
import { RouteForm } from './RouteForm';
import { Client } from '@/hooks/useClients';
import { generateMultiPointRoute, formatAddress } from '@/utils/mapUtils';

interface RouteDetailProps {
  route: RouteWithVisits;
  clients: Client[];
  onBack: () => void;
  onAddVisit: (input: CreateVisitInput) => Promise<any>;
  onUpdateVisit: (id: string, updates: any) => Promise<boolean>;
  onDeleteVisit: (id: string) => Promise<boolean>;
  onCheckIn: (visitId: string) => Promise<boolean>;
  onCheckOut: (visitId: string) => Promise<boolean>;
  onUpdateRoute: (id: string, updates: any) => Promise<boolean>;
  onCreateQuote?: (clientId: string) => void;
}

const statusConfig: Record<RouteStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  planejada: { label: 'Planejada', variant: 'secondary' },
  em_andamento: { label: 'Em Andamento', variant: 'default' },
  concluida: { label: 'Concluída', variant: 'outline' },
};

export function RouteDetail({
  route,
  clients,
  onBack,
  onAddVisit,
  onUpdateVisit,
  onDeleteVisit,
  onCheckIn,
  onCheckOut,
  onUpdateRoute,
  onCreateQuote,
}: RouteDetailProps) {
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const startDate = new Date(route.start_date + 'T12:00:00');
  const endDate = new Date(route.end_date + 'T12:00:00');
  const status = statusConfig[route.status];

  // Get all days in the route period
  const routeDays = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [route.start_date, route.end_date]);

  // Group visits by date
  const visitsByDate = useMemo(() => {
    const groups: Record<string, typeof route.visits> = {};
    routeDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      groups[dateStr] = route.visits
        .filter(v => v.visit_date === dateStr)
        .sort((a, b) => a.visit_order - b.visit_order);
    });
    return groups;
  }, [route.visits, routeDays]);

  const existingClientIds = route.visits.map(v => v.client_id).filter(Boolean) as string[];

  const handleAddClients = async (clientIds: string[]) => {
    const date = selectedDate || route.start_date;
    const existingVisits = visitsByDate[date] || [];
    let order = existingVisits.length + 1;

    for (const clientId of clientIds) {
      await onAddVisit({
        route_id: route.id,
        client_id: clientId,
        visit_date: date,
        visit_order: order++,
      });
    }
    setSelectedDate(null);
  };

  const handleUpdateNotes = async (visitId: string, notes: string) => {
    return onUpdateVisit(visitId, { notes });
  };

  const handleOpenDayMaps = (dateStr: string) => {
    const dayVisits = visitsByDate[dateStr] || [];
    const addresses = dayVisits
      .filter(v => v.client)
      .map(v => formatAddress({
        street: v.client?.street,
        number: v.client?.number,
        city: v.client?.city,
        state: v.client?.state,
      }))
      .filter(addr => addr.length > 0);

    if (addresses.length > 0) {
      window.open(generateMultiPointRoute(addresses), '_blank');
    }
  };

  const handleEditRoute = async (data: any) => {
    await onUpdateRoute(route.id, data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{route.name}</h2>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(startDate, "dd/MM", { locale: ptBR })} - {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {route.visits.length} visita{route.visits.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditFormOpen(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button onClick={() => {
            setSelectedDate(null);
            setClientSelectorOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Cliente
          </Button>
        </div>
      </div>

      {route.notes && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">{route.notes}</p>
        </div>
      )}

      {/* Day tabs */}
      <Tabs defaultValue={route.start_date} className="w-full">
        <TabsList className="w-full flex overflow-x-auto">
          {routeDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayVisits = visitsByDate[dateStr] || [];
            return (
              <TabsTrigger key={dateStr} value={dateStr} className="flex-1 min-w-[100px]">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">
                    {format(day, 'EEE', { locale: ptBR })}
                  </div>
                  <div className="font-medium">{format(day, 'dd/MM')}</div>
                  {dayVisits.length > 0 && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {dayVisits.length}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {routeDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayVisits = visitsByDate[dateStr] || [];
          
          return (
            <TabsContent key={dateStr} value={dateStr} className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h3>
                <div className="flex gap-2">
                  {dayVisits.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => handleOpenDayMaps(dateStr)}>
                      <Map className="h-4 w-4 mr-2" />
                      Rota do Dia
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSelectedDate(dateStr);
                      setClientSelectorOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>

              {dayVisits.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma visita planejada para este dia</p>
                  <Button 
                    variant="link" 
                    onClick={() => {
                      setSelectedDate(dateStr);
                      setClientSelectorOpen(true);
                    }}
                  >
                    Adicionar clientes
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {dayVisits.map((visit, index) => (
                      <VisitCard
                        key={visit.id}
                        visit={visit}
                        order={index + 1}
                        onCheckIn={onCheckIn}
                        onCheckOut={onCheckOut}
                        onUpdateNotes={handleUpdateNotes}
                        onCreateQuote={onCreateQuote}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Client Selector Modal */}
      <RouteClientSelector
        open={clientSelectorOpen}
        onOpenChange={setClientSelectorOpen}
        clients={clients}
        existingClientIds={existingClientIds}
        onSelectClients={handleAddClients}
      />

      {/* Edit Route Form */}
      <RouteForm
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        onSubmit={handleEditRoute}
        initialData={{
          name: route.name,
          start_date: route.start_date,
          end_date: route.end_date,
          notes: route.notes || '',
        }}
        isEditing
      />
    </div>
  );
}
