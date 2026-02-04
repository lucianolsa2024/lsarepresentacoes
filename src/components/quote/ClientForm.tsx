import { ClientData } from '@/types/quote';
import { Client } from '@/hooks/useClients';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { User, Building, Phone, Mail, MapPin, UserPlus, Save } from 'lucide-react';
import { ClientSelector } from './ClientSelector';

interface ClientFormProps {
  client: ClientData;
  onChange: (client: ClientData) => void;
  clients?: Client[];
  onSaveClient?: (client: ClientData) => Promise<Client | null>;
  selectedClientId?: string | null;
  onSelectClient?: (client: Client | null) => void;
}

export function ClientForm({ 
  client, 
  onChange, 
  clients = [], 
  onSaveClient,
  selectedClientId,
  onSelectClient 
}: ClientFormProps) {
  const updateField = (field: keyof ClientData, value: string | boolean) => {
    onChange({ ...client, [field]: value });
  };

  const updateAddress = (field: keyof ClientData['address'], value: string) => {
    onChange({
      ...client,
      address: { ...client.address, [field]: value },
    });
  };

  const handleSelectClient = (selectedClient: Client) => {
    onChange({
      name: selectedClient.name,
      company: selectedClient.company,
      document: selectedClient.document,
      phone: selectedClient.phone,
      email: selectedClient.email,
      isNewClient: selectedClient.isNewClient,
      address: selectedClient.address,
    });
    onSelectClient?.(selectedClient);
  };

  const handleCreateNew = () => {
    onSelectClient?.(null);
  };

  const handleSaveClient = async () => {
    if (!client.company) {
      return;
    }
    await onSaveClient?.(client);
  };

  const isClientSelected = !!selectedClientId;
  const hasClientData = !!client.company;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados do Cliente
          </CardTitle>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isNewClient"
              checked={client.isNewClient}
              onCheckedChange={(checked) => updateField('isNewClient', checked === true)}
            />
            <Label 
              htmlFor="isNewClient" 
              className="flex items-center gap-1 text-sm font-medium cursor-pointer"
            >
              <UserPlus className="h-4 w-4 text-primary" />
              Cliente Novo
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client Selection */}
        {clients.length > 0 && (
          <div className="flex gap-2">
            <div className="flex-1">
              <ClientSelector 
                clients={clients} 
                onSelect={handleSelectClient}
                onCreateNew={handleCreateNew}
              />
            </div>
            {hasClientData && !isClientSelected && onSaveClient && (
              <Button 
                variant="outline" 
                onClick={handleSaveClient}
                title="Salvar como novo cliente"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Cliente
              </Button>
            )}
          </div>
        )}

        {isClientSelected && (
          <div className="bg-primary/10 text-primary text-sm px-3 py-2 rounded-md flex items-center justify-between">
            <span>Cliente selecionado: {client.company}</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                onSelectClient?.(null);
              }}
            >
              Limpar seleção
            </Button>
          </div>
        )}

        {/* Personal Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company" className="flex items-center gap-1">
              <Building className="h-3 w-3" />
              Empresa *
            </Label>
            <Input
              id="company"
              placeholder="Nome da empresa"
              value={client.company}
              onChange={(e) => updateField('company', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Contato</Label>
            <Input
              id="name"
              placeholder="Nome do cliente"
              value={client.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="document">CPF / CNPJ</Label>
            <Input
              id="document"
              placeholder="000.000.000-00"
              value={client.document}
              onChange={(e) => updateField('document', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              Telefone
            </Label>
            <Input
              id="phone"
              placeholder="(00) 00000-0000"
              value={client.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              value={client.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </div>
        </div>

        {/* Address */}
        <div className="pt-2">
          <Label className="flex items-center gap-1 mb-3">
            <MapPin className="h-3 w-3" />
            Endereço
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="street" className="text-xs text-muted-foreground">
                Rua
              </Label>
              <Input
                id="street"
                placeholder="Rua / Avenida"
                value={client.address.street}
                onChange={(e) => updateAddress('street', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number" className="text-xs text-muted-foreground">
                Número
              </Label>
              <Input
                id="number"
                placeholder="Nº"
                value={client.address.number}
                onChange={(e) => updateAddress('number', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complement" className="text-xs text-muted-foreground">
                Complemento
              </Label>
              <Input
                id="complement"
                placeholder="Apto, sala..."
                value={client.address.complement}
                onChange={(e) => updateAddress('complement', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
            <div className="space-y-2">
              <Label htmlFor="neighborhood" className="text-xs text-muted-foreground">
                Bairro
              </Label>
              <Input
                id="neighborhood"
                placeholder="Bairro"
                value={client.address.neighborhood}
                onChange={(e) => updateAddress('neighborhood', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className="text-xs text-muted-foreground">
                Cidade
              </Label>
              <Input
                id="city"
                placeholder="Cidade"
                value={client.address.city}
                onChange={(e) => updateAddress('city', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-xs text-muted-foreground">
                Estado
              </Label>
              <Input
                id="state"
                placeholder="UF"
                value={client.address.state}
                onChange={(e) => updateAddress('state', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode" className="text-xs text-muted-foreground">
                CEP
              </Label>
              <Input
                id="zipCode"
                placeholder="00000-000"
                value={client.address.zipCode}
                onChange={(e) => updateAddress('zipCode', e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
