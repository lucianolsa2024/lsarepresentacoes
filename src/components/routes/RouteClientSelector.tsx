import { useState, useMemo } from 'react';
import { Search, Plus, MapPin, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Client } from '@/hooks/useClients';

interface RouteClientSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  existingClientIds: string[];
  onSelectClients: (clientIds: string[]) => void;
}

export function RouteClientSelector({
  open,
  onOpenChange,
  clients,
  existingClientIds,
  onSelectClients,
}: RouteClientSelectorProps) {
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Get unique cities
  const cities = useMemo(() => {
    const citySet = new Set(clients.map(c => c.address.city).filter(Boolean));
    return Array.from(citySet).sort();
  }, [clients]);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Exclude already added clients
      if (existingClientIds.includes(client.id)) return false;

      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || 
        client.company.toLowerCase().includes(searchLower) ||
        client.name.toLowerCase().includes(searchLower) ||
        client.address.city.toLowerCase().includes(searchLower);

      // City filter
      const matchesCity = cityFilter === 'all' || client.address.city === cityFilter;

      return matchesSearch && matchesCity;
    });
  }, [clients, existingClientIds, search, cityFilter]);

  // Group by city
  const groupedClients = useMemo(() => {
    const groups: Record<string, Client[]> = {};
    filteredClients.forEach(client => {
      const city = client.address.city || 'Sem cidade';
      if (!groups[city]) groups[city] = [];
      groups[city].push(client);
    });
    return groups;
  }, [filteredClients]);

  const toggleClient = (clientId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    onSelectClients(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSearch('');
    setCityFilter('all');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearch('');
    setCityFilter('all');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Clientes à Rota</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as cidades</SelectItem>
              {cities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">
              {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Limpar seleção
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1 pr-4 max-h-[400px]">
          {Object.keys(groupedClients).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search || cityFilter !== 'all' 
                ? 'Nenhum cliente encontrado com esses filtros'
                : 'Todos os clientes já foram adicionados à rota'}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedClients).map(([city, cityClients]) => (
                <div key={city}>
                  <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background py-1">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{city}</span>
                    <Badge variant="outline" className="text-xs">
                      {cityClients.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 pl-6">
                    {cityClients.map(client => (
                      <div
                        key={client.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedIds.has(client.id) 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleClient(client.id)}
                      >
                        <Checkbox
                          checked={selectedIds.has(client.id)}
                          onCheckedChange={() => toggleClient(client.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{client.company}</p>
                          {client.name && (
                            <p className="text-sm text-muted-foreground truncate">{client.name}</p>
                          )}
                          {client.address.street && (
                            <p className="text-xs text-muted-foreground truncate">
                              {client.address.street}, {client.address.number} - {client.address.neighborhood}
                            </p>
                          )}
                        </div>
                        {selectedIds.has(client.id) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
