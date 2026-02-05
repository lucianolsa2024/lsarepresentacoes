import { useState, useMemo } from 'react';
import { Plus, Map, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRoutes } from '@/hooks/useRoutes';
import { useClients } from '@/hooks/useClients';
import { RouteCard } from './RouteCard';
import { RouteForm } from './RouteForm';
import { RouteDetail } from './RouteDetail';
import { RouteWithVisits, RouteStatus, CreateRouteInput } from '@/types/route';
import { Skeleton } from '@/components/ui/skeleton';

interface RouteManagerProps {
  onCreateQuote?: (clientId: string) => void;
}

export function RouteManager({ onCreateQuote }: RouteManagerProps) {
  const { 
    routes, 
    loading, 
    addRoute, 
    updateRoute, 
    deleteRoute,
    addVisit,
    updateVisit,
    deleteVisit,
    checkIn,
    checkOut,
  } = useRoutes();
  const { clients } = useClients();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteWithVisits | null>(null);

  // Filter routes
  const filteredRoutes = useMemo(() => {
    return routes.filter(route => {
      const matchesSearch = !search || 
        route.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || route.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [routes, search, statusFilter]);

  const handleCreateRoute = async (data: CreateRouteInput) => {
    await addRoute(data);
  };

  const handleUpdateStatus = async (id: string, status: RouteStatus) => {
    await updateRoute(id, { status });
  };

  const handleDeleteRoute = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta rota?')) {
      await deleteRoute(id);
    }
  };

  const handleViewRoute = (route: RouteWithVisits) => {
    // Find the latest version from routes array
    const latestRoute = routes.find(r => r.id === route.id);
    setSelectedRoute(latestRoute || route);
  };

  // If viewing a route detail
  if (selectedRoute) {
    // Get the latest version of the route from the routes array
    const latestRoute = routes.find(r => r.id === selectedRoute.id);
    
    return (
      <RouteDetail
        route={latestRoute || selectedRoute}
        clients={clients}
        onBack={() => setSelectedRoute(null)}
        onAddVisit={addVisit}
        onUpdateVisit={updateVisit}
        onDeleteVisit={deleteVisit}
        onCheckIn={checkIn}
        onCheckOut={checkOut}
        onUpdateRoute={updateRoute}
        onCreateQuote={onCreateQuote}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Rotas de Visitas</h2>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Rota
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar rota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="planejada">Planejadas</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluídas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Routes Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[200px] rounded-lg" />
          ))}
        </div>
      ) : filteredRoutes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
          <Map className="h-16 w-16 mx-auto mb-4 opacity-50" />
          {search || statusFilter !== 'all' ? (
            <>
              <p className="text-lg font-medium">Nenhuma rota encontrada</p>
              <p className="text-sm">Tente ajustar os filtros</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium">Nenhuma rota cadastrada</p>
              <p className="text-sm mb-4">Crie sua primeira rota de visitas</p>
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Rota
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoutes.map(route => (
            <RouteCard
              key={route.id}
              route={route}
              onView={handleViewRoute}
              onDelete={handleDeleteRoute}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      )}

      {/* Create Route Form */}
      <RouteForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreateRoute}
      />
    </div>
  );
}
