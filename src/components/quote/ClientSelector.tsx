import { useState, useMemo } from 'react';
import { Client } from '@/hooks/useClients';
import { ClientData } from '@/types/quote';
import { clientDisplayName } from '@/utils/clientDisplayName';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UserPlus, Users, Building2, Phone, Mail } from 'lucide-react';

interface ClientSelectorProps {
  clients: Client[];
  onSelect: (client: Client) => void;
  onCreateNew: () => void;
}

export function ClientSelector({ clients, onSelect, onCreateNew }: ClientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const query = search.toLowerCase();
    return clients.filter(
      c =>
        c.company.toLowerCase().includes(query) ||
        (c.tradeName || '').toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query) ||
        c.document.includes(query) ||
        c.email.toLowerCase().includes(query)
    );
  }, [clients, search]);

  const handleSelect = (client: Client) => {
    onSelect(client);
    setOpen(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Users className="h-4 w-4 mr-2" />
          Selecionar Cliente Cadastrado
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar Cliente</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por empresa, nome, CNPJ ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[400px] border rounded-md">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum cliente encontrado</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setOpen(false);
                    onCreateNew();
                  }}
                >
                  Cadastrar novo cliente
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleSelect(client)}
                    className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{client.company}</p>
                        {client.name && (
                          <p className="text-sm text-muted-foreground truncate">
                            {client.name}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          {client.document && (
                            <span>{client.document}</span>
                          )}
                          {client.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {client.phone}
                            </span>
                          )}
                          {client.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </span>
                          )}
                        </div>
                        {client.address.city && client.address.state && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {client.address.city} - {client.address.state}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-between items-center pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                onCreateNew();
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
