import { useMemo } from 'react';
import { Client } from '@/hooks/useClients';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink, Navigation } from 'lucide-react';
import { formatAddress, generateGoogleMapsUrl } from '@/utils/mapUtils';

interface ClientMapProps {
  clients: Client[];
}

export function ClientMap({ clients }: ClientMapProps) {
  const clientsWithAddress = useMemo(() => {
    return clients.filter(c => {
      const addr = c.address;
      return addr.city || addr.street;
    });
  }, [clients]);

  const clientsWithoutAddress = clients.length - clientsWithAddress.length;

  const groupedByCity = useMemo(() => {
    const groups: Record<string, Client[]> = {};
    clientsWithAddress.forEach(c => {
      const key = c.address.city
        ? `${c.address.city}${c.address.state ? ` - ${c.address.state}` : ''}`
        : 'Sem cidade';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [clientsWithAddress]);

  const openInMaps = (client: Client) => {
    const url = generateGoogleMapsUrl({
      street: client.address.street,
      number: client.address.number,
      neighborhood: client.address.neighborhood,
      city: client.address.city,
      state: client.address.state,
      zip_code: client.address.zipCode,
    });
    if (url) window.open(url, '_blank');
  };

  const openAllInMaps = () => {
    if (clientsWithAddress.length === 0) return;
    const addresses = clientsWithAddress.map(c =>
      formatAddress({
        street: c.address.street,
        number: c.address.number,
        neighborhood: c.address.neighborhood,
        city: c.address.city,
        state: c.address.state,
        zip_code: c.address.zipCode,
      })
    ).filter(a => a.length > 0);

    if (addresses.length > 0) {
      const waypoints = addresses.map(encodeURIComponent).join('/');
      window.open(`https://www.google.com/maps/dir/${waypoints}`, '_blank');
    }
  };

  if (clientsWithAddress.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum cliente com endereço cadastrado</p>
          <p className="text-sm">Cadastre endereços nos clientes para visualizar no mapa</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {clientsWithAddress.length} cliente(s) com endereço
          {clientsWithoutAddress > 0 && ` • ${clientsWithoutAddress} sem endereço`}
        </div>
        <Button variant="outline" size="sm" onClick={openAllInMaps}>
          <Navigation className="h-4 w-4 mr-2" />
          Abrir todos no Google Maps
        </Button>
      </div>

      <div className="space-y-4">
        {groupedByCity.map(([city, cityClients]) => (
          <Card key={city}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">{city}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {cityClients.length}
                </span>
              </div>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {cityClients.map(client => {
                  const addr = formatAddress({
                    street: client.address.street,
                    number: client.address.number,
                    neighborhood: client.address.neighborhood,
                    city: client.address.city,
                    state: client.address.state,
                    zip_code: client.address.zipCode,
                  });
                  return (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-2 rounded-md border bg-background hover:bg-accent/50 transition-colors cursor-pointer group"
                      onClick={() => openInMaps(client)}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{client.company}</p>
                        <p className="text-xs text-muted-foreground truncate">{addr}</p>
                      </div>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
