import { useState, useMemo } from 'react';
import { Client, ClientCurve } from '@/hooks/useClients';
import { ClientData, INITIAL_CLIENT } from '@/types/quote';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  Users, 
  Building2, 
  Phone, 
  Mail,
  MapPin,
  Eye,
  List,
  Map,
  UserCheck,
  GitBranch,
} from 'lucide-react';
import { ClientMap } from './ClientMap';
import { toast } from 'sonner';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { useCepLookup } from '@/hooks/useCepLookup';

interface ClientManagerProps {
  clients: Client[];
  loading: boolean;
  onAdd: (client: ClientData) => Promise<Client | null>;
  onUpdate: (id: string, client: ClientData) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onViewDetail?: (clientId: string) => void;
}

export function ClientManager({
  clients,
  loading,
  onAdd,
  onUpdate,
  onDelete,
  onViewDetail,
}: ClientManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [curveFilter, setCurveFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [branchParentId, setBranchParentId] = useState<string | null>(null);
  const { activeReps: representatives, emailToName } = useRepresentatives();
  const { lookupCep, loading: cepLoading } = useCepLookup();

  const [formData, setFormData] = useState<ClientData>(INITIAL_CLIENT);

  // Group clients into parent (matriz) and branches (filiais)
  const { parentClients, branchesByParent } = useMemo(() => {
    const branchesByParent: Record<string, Client[]> = {};
    const parentClients: Client[] = [];

    clients.forEach(c => {
      if (c.parentClientId) {
        if (!branchesByParent[c.parentClientId]) branchesByParent[c.parentClientId] = [];
        branchesByParent[c.parentClientId].push(c);
      } else {
        parentClients.push(c);
      }
    });

    return { parentClients, branchesByParent };
  }, [clients]);

  const resetForm = () => {
    setFormData(INITIAL_CLIENT);
    setEditingClient(null);
    setBranchParentId(null);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openNewBranchDialog = (parentClient: Client) => {
    resetForm();
    setBranchParentId(parentClient.id);
    // Pre-fill company name with parent's name
    setFormData({
      ...INITIAL_CLIENT,
      company: parentClient.company,
      ownerEmail: parentClient.ownerEmail,
      document: parentClient.document,
      parentClientId: parentClient.id,
    });
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
      ownerEmail: client.ownerEmail,
      parentClientId: client.parentClientId,
      address: client.address,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.company) {
      toast.error('Informe o nome da empresa');
      return;
    }

    const dataToSave = {
      ...formData,
      parentClientId: branchParentId || formData.parentClientId || null,
    };

    // For branches, inherit ownerEmail from parent
    if (dataToSave.parentClientId) {
      const parent = clients.find(c => c.id === dataToSave.parentClientId);
      if (parent?.ownerEmail) {
        dataToSave.ownerEmail = parent.ownerEmail;
      }
    }

    if (editingClient) {
      const success = await onUpdate(editingClient.id, dataToSave);
      if (success) {
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const result = await onAdd(dataToSave);
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

  const filteredParentClients = useMemo(() => {
    let result = parentClients;
    
    // Filter by curve
    if (curveFilter !== 'all') {
      result = result.filter(c => (c.curve || 'D') === curveFilter);
    }
    
    if (!searchQuery.trim()) return result;
    const query = searchQuery.toLowerCase();
    return result.filter((c) => {
      const matchesParent =
        c.company.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query) ||
        c.document.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query);
      const branches = branchesByParent[c.id] || [];
      const matchesBranch = branches.some(b =>
        b.company.toLowerCase().includes(query) ||
        b.name.toLowerCase().includes(query) ||
        b.address.city.toLowerCase().includes(query)
      );
      return matchesParent || matchesBranch;
    });
  }, [parentClients, branchesByParent, searchQuery, curveFilter]);

  const updateField = (field: keyof ClientData, value: string | boolean) => {
    setFormData({ ...formData, [field]: value });
  };

  const updateAddress = (field: keyof ClientData['address'], value: string) => {
    setFormData({
      ...formData,
      address: { ...formData.address, [field]: value },
    });
  };

  const handleCepBlur = async () => {
    const result = await lookupCep(formData.address.zipCode);
    if (result) {
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, ...result, number: prev.address.number },
      }));
    }
  };

  const isBranchMode = !!branchParentId;
  const parentForBranch = isBranchMode ? clients.find(c => c.id === branchParentId) : null;

  const renderClientCard = (client: Client, isBranch = false) => {
    const branches = branchesByParent[client.id] || [];

    return (
      <Card key={client.id} className={`hover:shadow-md transition-shadow ${isBranch ? 'border-l-4 border-l-primary/30' : ''}`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div
              className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
              onClick={() => onViewDetail?.(client.id)}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${isBranch ? 'bg-accent' : 'bg-primary/10'}`}>
                {isBranch ? (
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Building2 className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{client.company}</h3>
                  {!isBranch && branches.length > 0 && (
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      {branches.length} filial{branches.length > 1 ? 'is' : ''}
                    </Badge>
                  )}
                  {isBranch && (
                    <Badge variant="outline" className="text-xs flex-shrink-0">Filial</Badge>
                  )}
                </div>
                {client.name && (
                  <p className="text-sm text-muted-foreground truncate">{client.name}</p>
                )}
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {onViewDetail && (
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onViewDetail(client.id); }} title="Ver histórico">
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditDialog(client); }}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(client.id); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            {client.document && <p className="truncate">{client.document}</p>}
            {client.phone && (
              <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</p>
            )}
            {client.email && (
              <p className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{client.email}</p>
            )}
            {client.address.city && client.address.state && (
              <p className="flex items-center gap-1"><MapPin className="h-3 w-3" />{client.address.city} - {client.address.state}</p>
            )}
            {client.ownerEmail && (
              <p className="flex items-center gap-1 text-primary"><UserCheck className="h-3 w-3" />{emailToName[client.ownerEmail] || client.ownerEmail}</p>
            )}
          </div>

          {/* Branch action + branch list for parent clients */}
          {!isBranch && (
            <div className="mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={(e) => { e.stopPropagation(); openNewBranchDialog(client); }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar Filial
              </Button>

              {branches.length > 0 && (
                <div className="mt-2 space-y-2 pl-4 border-l-2 border-muted">
                  {branches.map(branch => (
                    <div
                      key={branch.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => onViewDetail?.(branch.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <GitBranch className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{branch.name || 'Filial'}</span>
                          {branch.address.city && (
                            <span className="text-xs text-muted-foreground">• {branch.address.city}{branch.address.state ? ` - ${branch.address.state}` : ''}</span>
                          )}
                        </div>
                        {branch.address.street && (
                          <p className="text-xs text-muted-foreground truncate ml-4.5">
                            {branch.address.street}{branch.address.number ? `, ${branch.address.number}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditDialog(branch); }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(branch.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Base de Clientes</h2>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingClient
                    ? 'Editar Cliente'
                    : isBranchMode
                    ? `Nova Filial de ${parentForBranch?.company || ''}`
                    : 'Novo Cliente'}
                </DialogTitle>
              </DialogHeader>

              {isBranchMode && (
                <div className="bg-primary/10 text-primary text-sm px-3 py-2 rounded-md flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  <span>Esta filial ficará vinculada à matriz <strong>{parentForBranch?.company}</strong>. O responsável será herdado automaticamente.</span>
                </div>
              )}

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isBranchMode ? 'Nome da Filial / Unidade *' : 'Empresa *'}</Label>
                    <Input
                      value={formData.company}
                      onChange={(e) => updateField('company', e.target.value)}
                      placeholder={isBranchMode ? 'Ex: Loeil - Unidade Centro' : 'Nome da empresa'}
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

                {/* Responsável - hidden for branches */}
                {!isBranchMode && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      Responsável
                    </Label>
                    <Select
                      value={formData.ownerEmail || 'none'}
                      onValueChange={(v) => updateField('ownerEmail', v === 'none' ? undefined as any : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não definido</SelectItem>
                        {representatives.map(r => (
                          <SelectItem key={r.email} value={r.email}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="pt-2">
                  <Label className="flex items-center gap-1 mb-3">
                    <MapPin className="h-3 w-3" />
                    Endereço {isBranchMode && <span className="text-xs text-muted-foreground">(desta unidade)</span>}
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">CEP</Label>
                      <div className="relative">
                        <Input
                          value={formData.address.zipCode}
                          onChange={(e) => updateAddress('zipCode', e.target.value)}
                          onBlur={handleCepBlur}
                          placeholder="00000-000"
                          className={cepLoading ? 'pr-8' : ''}
                        />
                        {cepLoading && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Complemento</Label>
                      <Input
                        value={formData.address.complement}
                        onChange={(e) => updateAddress('complement', e.target.value)}
                        placeholder="Apto, sala..."
                      />
                    </div>
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
                  </div>
                </div>

                <Button onClick={handleSubmit} className="w-full">
                  {editingClient ? 'Salvar Alterações' : isBranchMode ? 'Cadastrar Filial' : 'Cadastrar Cliente'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="map">
            <Map className="h-4 w-4 mr-2" />
            Mapa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <div className="space-y-4">
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
              {parentClients.length} empresa{parentClients.length !== 1 ? 's' : ''}
              {Object.values(branchesByParent).flat().length > 0 && (
                <> • {Object.values(branchesByParent).flat().length} filial{Object.values(branchesByParent).flat().length !== 1 ? 'is' : ''}</>
              )}
            </div>

            {loading ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>Carregando clientes...</p>
                </CardContent>
              </Card>
            ) : filteredParentClients.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum cliente cadastrado</p>
                  <p className="text-sm">Clique em "Novo Cliente" para começar</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredParentClients.map((client) => renderClientCard(client))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <ClientMap clients={clients} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
              {deleteId && branchesByParent[deleteId]?.length > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Atenção: este cliente possui {branchesByParent[deleteId].length} filial(is) que ficarão desvinculadas.
                </span>
              )}
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
