import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Map, Calendar, Users, Eye, Trash2, Play, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RouteWithVisits, RouteStatus } from '@/types/route';
import { generateMultiPointRoute, formatAddress } from '@/utils/mapUtils';
import { generateRouteCalendarUrl } from '@/utils/outlookCalendar';

interface RouteCardProps {
  route: RouteWithVisits;
  onView: (route: RouteWithVisits) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: RouteStatus) => void;
}

const statusConfig: Record<RouteStatus, { label: string; variant: 'default' | 'secondary' | 'outline'; icon: React.ReactNode }> = {
  planejada: { label: 'Planejada', variant: 'secondary', icon: <Calendar className="h-3 w-3" /> },
  em_andamento: { label: 'Em Andamento', variant: 'default', icon: <Play className="h-3 w-3" /> },
  concluida: { label: 'Concluída', variant: 'outline', icon: <CheckCircle className="h-3 w-3" /> },
};

export function RouteCard({ route, onView, onDelete, onUpdateStatus }: RouteCardProps) {
  const startDate = new Date(route.start_date + 'T12:00:00');
  const endDate = new Date(route.end_date + 'T12:00:00');
  const status = statusConfig[route.status];

  const handleOpenMaps = () => {
    const addresses = route.visits
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

  const handleOpenOutlook = () => {
    const url = generateRouteCalendarUrl(route);
    window.open(url, '_blank');
  };

  // Group visits by city
  const citiesSet = new Set(route.visits.map(v => v.client?.city).filter(Boolean));
  const cities = Array.from(citiesSet).slice(0, 3);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{route.name}</CardTitle>
          </div>
          <Badge variant={status.variant} className="flex items-center gap-1">
            {status.icon}
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {format(startDate, "dd/MM", { locale: ptBR })} - {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{route.visits.length} cliente{route.visits.length !== 1 ? 's' : ''}</span>
        </div>

        {cities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cities.map(city => (
              <Badge key={city} variant="outline" className="text-xs">
                {city}
              </Badge>
            ))}
            {citiesSet.size > 3 && (
              <Badge variant="outline" className="text-xs">
                +{citiesSet.size - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onView(route)}>
            <Eye className="h-4 w-4 mr-1" />
            Ver
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenOutlook} title="Adicionar ao Outlook">
            <Calendar className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenMaps} title="Abrir no Maps" disabled={route.visits.length === 0}>
            <Map className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onDelete(route.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {route.status === 'planejada' && (
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full"
            onClick={() => onUpdateStatus(route.id, 'em_andamento')}
          >
            <Play className="h-4 w-4 mr-2" />
            Iniciar Rota
          </Button>
        )}

        {route.status === 'em_andamento' && (
          <Button 
            variant="default" 
            size="sm" 
            className="w-full"
            onClick={() => onUpdateStatus(route.id, 'concluida')}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Concluir Rota
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
