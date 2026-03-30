import { useState, useMemo } from 'react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { clientDisplayName } from '@/utils/clientDisplayName';
import { Client, ClientCurve } from '@/hooks/useClients';
import { ClientData, ClientInfluencer, INITIAL_CLIENT } from '@/types/quote';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  TrendingUp,
  Globe,
  UserPlus,
  X,
} from 'lucide-react';
import { ClientMap } from './ClientMap';
import { toast } from 'sonner';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { useCepLookup } from '@/hooks/useCepLookup';
import { useClientSegments } from '@/hooks/useClientSegments';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ClientManagerProps {
  clients: Client[];
  loading: boolean;
  onAdd: (client: ClientData) => Promise<Client | null>;
  onUpdate: (id: string, client: ClientData) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onViewDetail?: (clientId: string) => void;
  lastContactByClient?: Record<string, string>;
}

export function ClientManager({
  clients,
  loading,
  onAdd,
  onUpdate,
  onDelete,
  onViewDetail,
  lastContactByClient = {},
}: ClientManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [repFilter, setRepFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [branchParentId, setBranchParentId] = useState<string | null>(null);
  const [newSegmentInput, setNewSegmentInput] = useState('');
  const { activeReps: representatives, emailToName } = useRepresentatives();
  const { lookupCep, loading: cepLoading } = useCepLookup();
  const { segments, addSegment } = useClientSegments();
  const isAdmin = useIsAdmin();

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
    setNewSegmentInput('');
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openNewBranchDialog = (parentClient: Client) => {
    resetForm();
    setBranchParentId(parentClient.id);
    setFormData({
      ...INITIAL_CLIENT,
      company: parentClient.company,
      ownerEmail: parentClient.ownerEmail,
      document: parentClient.document,
      parentClientId: parentClient.id,
      representativeEmails: parentClient.representativeEmails || [],
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      company: client.company,
      tradeName: client.tradeName || '',
      document: client.document,
      phone: client.phone,
      email: client.email,
      isNewClient: client.isNewClient,
      ownerEmail: client.ownerEmail,
      parentClientId: client.parentClientId,
      inscricaoEstadual: client.inscricaoEstadual || '',
      site: client.site || '',
      segment: client.segment || '',
      defaultPaymentTerms: client.defaultPaymentTerms || '',
      notes: client.notes || '',
      representativeEmails: client.representativeEmails || [],
      influencers: client.influencers || [],
      address: client.address,
      curve: client.curve,
    } as any);
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

    if (dataToSave.parentClientId) {
      const parent = clients.find(c => c.id === dataToSave.parentClientId);
      if (parent?.representativeEmails?.length) {
        dataToSave.representativeEmails = parent.representativeEmails;
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
    
    if (segmentFilter !== 'all') {
      result = result.filter(c => c.segment === segmentFilter);
    }

    if (repFilter !== 'all') {
      result = result.filter(c => 
        c.ownerEmail === repFilter || 
        (c.representativeEmails || []).includes(repFilter)
      );
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
  }, [parentClients, branchesByParent, searchQuery, segmentFilter, repFilter]);

  const updateField = (field: keyof ClientData, value: any) => {
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

  const toggleRep = (email: string) => {
    const current = formData.representativeEmails || [];
    if (current.includes(email)) {
      updateField('representativeEmails', current.filter(e => e !== email));
    } else {
      updateField('representativeEmails', [...current, email]);
    }
  };

  const addInfluencer = () => {
    const current = formData.influencers || [];
    updateField('influencers', [...current, { name: '', role: '', phone: '', email: '', notes: '' }]);
  };

  const updateInfluencer = (index: number, field: keyof ClientInfluencer, value: string) => {
    const current = [...(formData.influencers || [])];
    current[index] = { ...current[index], [field]: value };
    updateField('influencers', current);
  };

  const removeInfluencer = (index: number) => {
    const current = [...(formData.influencers || [])];
    current.splice(index, 1);
    updateField('influencers', current);
  };

  const handleAddSegment = async () => {
    if (!newSegmentInput.trim()) return;
    const result = await addSegment(newSegmentInput.trim());
    if (result) {
      updateField('segment', result.name);
      setNewSegmentInput('');
      toast.success('Segmento adicionado');
    } else {
      toast.error('Erro ao adicionar segmento');
    }
  };

  const isBranchMode = !!branchParentId;
  const parentForBranch = isBranchMode ? clients.find(c => c.id === branchParentId) : null;

  const getRepNames = (client: Client): string => {
    const emails = client.representativeEmails?.length 
      ? client.representativeEmails 
      : client.ownerEmail ? [client.ownerEmail] : [];
    return emails.map(e => emailToName[e] || e).join(', ');
  };

  const getCurveBadgeClass = (curve: ClientCurve): string => {
    const map: Record<ClientCurve, string> = {
      A: 'bg-green-800 text-white hover:bg-green-800',
      B: 'bg-blue-600 text-white hover:bg-blue-600',
      C: 'bg-yellow-500 text-white hover:bg-yellow-500',
      D: 'bg-gray-400 text-white hover:bg-gray-400',
    };
    return map[curve] || map.D;
  };

  // Unique segments from data
  const allSegments = useMemo(() => {
    const fromClients = new Set(clients.map(c => c.segment).filter(Boolean));
    const fromDb = new Set(segments.map(s => s.name));
    return Array.from(new Set([...fromClients, ...fromDb])).sort();
  }, [clients, segments]);

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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  <span>Filial vinculada à matriz <strong>{parentForBranch?.company}</strong>.</span>
                </div>
              )}

              <div className="space-y-5 py-4">
                {/* ===== DADOS CADASTRAIS ===== */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Dados Cadastrais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isBranchMode ? 'Nome da Filial *' : 'Razão Social *'}</Label>
                      <Input
                        value={formData.company}
                        onChange={(e) => updateField('company', e.target.value)}
                        placeholder={isBranchMode ? 'Ex: Loja Centro' : 'Razão social da empresa'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome Fantasia</Label>
                      <Input
                        value={formData.tradeName || ''}
                        onChange={(e) => updateField('tradeName', e.target.value)}
                        placeholder="Nome fantasia da empresa"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="space-y-2">
                      <Label>Nome do Contato</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="Nome do contato principal"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                    <div className="space-y-2">
                      <Label>CNPJ / CPF</Label>
                      <Input
                        value={formData.document}
                        onChange={(e) => updateField('document', e.target.value)}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Inscrição Estadual</Label>
                      <Input
                        value={formData.inscricaoEstadual || ''}
                        onChange={(e) => updateField('inscricaoEstadual', e.target.value)}
                        placeholder="Inscrição estadual"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1"><Phone className="h-3 w-3" />Telefone / WhatsApp</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="flex items-center gap-1"><Globe className="h-3 w-3" />Site</Label>
                      <Input
                        value={formData.site || ''}
                        onChange={(e) => updateField('site', e.target.value)}
                        placeholder="https://www.exemplo.com.br"
                      />
                    </div>
                  </div>
                </div>

                {/* ===== ENDEREÇO ===== */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Endereço
                  </h3>
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
                      <Label className="text-xs text-muted-foreground">Logradouro</Label>
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

                {/* ===== CLASSIFICAÇÃO COMERCIAL ===== */}
                {!isBranchMode && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Classificação Comercial</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Segmento</Label>
                        <Select
                          value={formData.segment || 'none'}
                          onValueChange={(v) => updateField('segment', v === 'none' ? '' : v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o segmento..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Não definido</SelectItem>
                            {allSegments.map(seg => (
                              <SelectItem key={seg} value={seg}>{seg}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2 mt-1">
                          <Input
                            placeholder="Novo segmento..."
                            value={newSegmentInput}
                            onChange={(e) => setNewSegmentInput(e.target.value)}
                            className="text-xs h-8"
                          />
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleAddSegment} disabled={!newSegmentInput.trim()}>
                            <Plus className="h-3 w-3 mr-1" /> Adicionar
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Condição de Pagamento Padrão</Label>
                        <Input
                          value={formData.defaultPaymentTerms || ''}
                          onChange={(e) => updateField('defaultPaymentTerms', e.target.value)}
                          placeholder="Ex: 30/60/90 DDL"
                        />
                      </div>
                    </div>

                    {/* Curva - manual override */}
                    {editingClient && (
                      <div className="mt-3 space-y-2">
                        <Label className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Curva do Cliente
                        </Label>
                        <div className="flex items-center gap-3">
                          <Select
                            value={(formData as any).curve || 'D'}
                            onValueChange={(v) => updateField('curve' as any, v)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A">Curva A</SelectItem>
                              <SelectItem value="B">Curva B</SelectItem>
                              <SelectItem value="C">Curva C</SelectItem>
                              <SelectItem value="D">Curva D</SelectItem>
                            </SelectContent>
                          </Select>
                          {editingClient.curve && (
                            <span className="text-xs text-muted-foreground">
                              Calculada: <Badge className={`text-xs ${getCurveBadgeClass(editingClient.curve)}`}>{editingClient.curve}</Badge>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ===== RESPONSÁVEIS ===== */}
                {!isBranchMode && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-1">
                      <UserCheck className="h-3 w-3" /> Responsáveis (Representantes)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {representatives.map(rep => {
                        const isSelected = (formData.representativeEmails || []).includes(rep.email);
                        return (
                          <label
                            key={rep.email}
                            className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                              isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleRep(rep.email)}
                            />
                            <span className="text-sm">{rep.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ===== INFLUENCIADORES ===== */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-1">
                    <Users className="h-3 w-3" /> Influenciadores
                  </h3>
                  {(formData.influencers || []).map((inf, idx) => (
                    <div key={idx} className="border rounded-md p-3 mb-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-muted-foreground">Influenciador {idx + 1}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeInfluencer(idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input placeholder="Nome" value={inf.name} onChange={(e) => updateInfluencer(idx, 'name', e.target.value)} />
                        <Input placeholder="Cargo" value={inf.role} onChange={(e) => updateInfluencer(idx, 'role', e.target.value)} />
                        <Input placeholder="Telefone / WhatsApp" value={inf.phone} onChange={(e) => updateInfluencer(idx, 'phone', e.target.value)} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input placeholder="E-mail" value={inf.email} onChange={(e) => updateInfluencer(idx, 'email', e.target.value)} />
                        <Input placeholder="Observação" value={inf.notes} onChange={(e) => updateInfluencer(idx, 'notes', e.target.value)} />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addInfluencer}>
                    <UserPlus className="h-3 w-3 mr-1" /> Adicionar Influenciador
                  </Button>
                </div>

                {/* ===== OBSERVAÇÕES ===== */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Observações</h3>
                  <Textarea
                    value={formData.notes || ''}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Anotações gerais sobre o cliente..."
                    rows={3}
                  />
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
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por empresa, nome, CNPJ ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Segmentos</SelectItem>
                  {allSegments.map(seg => (
                    <SelectItem key={seg} value={seg}>{seg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isAdmin && (
                <Select value={repFilter} onValueChange={setRepFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Representante" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Representantes</SelectItem>
                    {representatives.map(rep => (
                      <SelectItem key={rep.email} value={rep.email}>{rep.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              {filteredParentClients.length} cliente{filteredParentClients.length !== 1 ? 's' : ''}
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
                  <p>Nenhum cliente encontrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome / Razão Social</TableHead>
                      <TableHead>Segmento</TableHead>
                      <TableHead>Cond. Pagamento</TableHead>
                      <TableHead>Responsável(eis)</TableHead>
                      <TableHead>Último Contato</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParentClients.map((client) => {
                      const branches = branchesByParent[client.id] || [];
                      const lastContact = lastContactByClient?.[client.id];
                      return (
                        <>
                          <TableRow
                            key={client.id}
                            className="cursor-pointer hover:bg-accent/50"
                            onClick={() => onViewDetail?.(client.id)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                                <div>
                                  <span className="font-medium">{client.company}</span>
                                  {client.isNewClient && (
                                    <Badge variant="secondary" className="ml-2 text-xs">Novo</Badge>
                                  )}
                                  {branches.length > 0 && (
                                    <Badge variant="outline" className="ml-1 text-xs">{branches.length} filial{branches.length > 1 ? 'is' : ''}</Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {client.segment ? (
                                <Badge variant="outline" className="text-xs">{client.segment}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{client.defaultPaymentTerms || '—'}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{getRepNames(client) || '—'}</span>
                            </TableCell>
                            <TableCell>
                              {lastContact ? (
                                <span className="text-sm">{new Date(lastContact).toLocaleDateString('pt-BR')}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                                {onViewDetail && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onViewDetail(client.id)} title="Ver detalhes">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(client)} title="Editar">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openNewBranchDialog(client)} title="Adicionar filial">
                                  <GitBranch className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(client.id)} title="Excluir">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {/* Inline branch rows */}
                          {branches.map(branch => (
                            <TableRow
                              key={branch.id}
                              className="cursor-pointer hover:bg-accent/50 bg-muted/30"
                              onClick={() => onViewDetail?.(branch.id)}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2 pl-6">
                                  <GitBranch className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm">{branch.name || branch.company}</span>
                                  {branch.address.city && (
                                    <span className="text-xs text-muted-foreground">• {branch.address.city}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell />
                              <TableCell />
                              <TableCell />
                              <TableCell>
                                {lastContactByClient?.[branch.id] ? (
                                  <span className="text-sm">{new Date(lastContactByClient[branch.id]).toLocaleDateString('pt-BR')}</span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(branch)}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(branch.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
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
                  Atenção: este cliente possui {branchesByParent[deleteId].length} filial(is) que serão excluídas.
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
