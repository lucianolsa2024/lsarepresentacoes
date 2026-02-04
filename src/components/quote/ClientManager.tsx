import { useState, useMemo } from 'react';
import { Client, useClients } from '@/hooks/useClients';
import { ClientData, INITIAL_CLIENT } from '@/types/quote';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  Users, 
  Building2, 
  Phone, 
  Mail,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';

interface ClientManagerProps {
  clients: Client[];
  loading: boolean;
  onAdd: (client: ClientData) => Promise<Client | null>;
  onUpdate: (id: string, client: ClientData) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function ClientManager({
  clients,
  loading,
  onAdd,
  onUpdate,
  onDelete,
}: ClientManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<ClientData>(INITIAL_CLIENT);

  const resetForm = () => {
    setFormData(INITIAL_CLIENT);
    setEditingClient(null);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      company: client.company,
      document: client.document,
      phone: client.phone,
      email: client.email,
      isNewClient: client.isNewClient,
      address: client.address,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.company) {
      toast.error('Informe o nome da empresa');
      return;
    }

    if (editingClient) {
      const success = await onUpdate(editingClient.id, formData);
      if (success) {
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const result = await onAdd(formData);
      if (result) {
        setIsDialogOpen(false);
        resetForm();
      }
    }
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await onDelete(deleteId);
      setDeleteId(null);
    }
  };

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.company.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query) ||
        c.document.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  const updateField = (field: keyof ClientData, value: string | boolean) => {
    setFormData({ ...formData, [field]: value });
  };

  const updateAddress = (field: keyof ClientData['address'], value: string) => {
    setFormData({
      ...formData,
      address: { ...formData.address, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Base de Clientes</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Empresa *</Label>
                    <Input
                      value={formData.company}
                      onChange={(e) => updateField('company', e.target.value)}
                      placeholder="Nome da empresa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do Contato</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Nome do contato"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>CPF / CNPJ</Label>
                    <Input
                      value={formData.document}
                      onChange={(e) => updateField('document', e.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Label className="flex items-center gap-1 mb-3">
                    <MapPin className="h-3 w-3" />
                    Endereço
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-xs text-muted-foreground">Rua</Label>
                      <Input
                        value={formData.address.street}
                        onChange={(e) => updateAddress('street', e.target.value)}
                        placeholder="Rua / Avenida"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Número</Label>
                      <Input
                        value={formData.address.number}
                        onChange={(e) => updateAddress('number', e.target.value)}
                        placeholder="Nº"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Complemento</Label>
                      <Input
                        value={formData.address.complement}
                        onChange={(e) => updateAddress('complement', e.target.value)}
                        placeholder="Apto, sala..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Bairro</Label>
                      <Input
                        value={formData.address.neighborhood}
                        onChange={(e) => updateAddress('neighborhood', e.target.value)}
                        placeholder="Bairro"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Cidade</Label>
                      <Input
                        value={formData.address.city}
                        onChange={(e) => updateAddress('city', e.target.value)}
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Estado</Label>
                      <Input
                        value={formData.address.state}
                        onChange={(e) => updateAddress('state', e.target.value)}
                        placeholder="UF"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">CEP</Label>
                      <Input
                        value={formData.address.zipCode}
                        onChange={(e) => updateAddress('zipCode', e.target.value)}
                        placeholder="00000-000"
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSubmit} className="w-full">
                  {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa, nome, CNPJ ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} cadastrado{filteredClients.length !== 1 ? 's' : ''}
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Carregando clientes...</p>
          </CardContent>
        </Card>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum cliente cadastrado</p>
            <p className="text-sm">Clique em "Novo Cliente" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold truncate">{client.company}</h3>
                      {client.name && (
                        <p className="text-sm text-muted-foreground truncate">
                          {client.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(client)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setDeleteId(client.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  {client.document && (
                    <p className="truncate">{client.document}</p>
                  )}
                  {client.phone && (
                    <p className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {client.phone}
                    </p>
                  )}
                  {client.email && (
                    <p className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" />
                      {client.email}
                    </p>
                  )}
                  {client.address.city && client.address.state && (
                    <p className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {client.address.city} - {client.address.state}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
