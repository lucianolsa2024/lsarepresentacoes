import { useState, useCallback } from 'react';
import {
  ClientData,
  QuoteItem,
  PaymentConditions,
  Quote,
  INITIAL_CLIENT,
  INITIAL_PAYMENT,
} from '@/types/quote';
import { useProducts } from '@/hooks/useProducts';
import { useQuotes } from '@/hooks/useQuotes';
import { useClients, Client } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { useRDStation } from '@/hooks/useRDStation';
import { useActivities } from '@/hooks/useActivities';
import { useOrders } from '@/hooks/useOrders';
import { useSalesOpportunities } from '@/hooks/useSalesOpportunities';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ClientForm } from '@/components/quote/ClientForm';
import { ProductSelector } from '@/components/quote/ProductSelector';
import { QuoteCart } from '@/components/quote/QuoteCart';
import { PaymentForm } from '@/components/quote/PaymentForm';
import { ProductManager } from '@/components/quote/ProductManager';
import { QuoteHistory } from '@/components/quote/QuoteHistory';
import { QuoteDashboard } from '@/components/quote/QuoteDashboard';
import { ClientManager } from '@/components/quote/ClientManager';
import { ClientDetailPanel } from '@/components/quote/ClientDetailPanel';
import { RouteManager } from '@/components/routes/RouteManager';
import { ActivityManager } from '@/components/activities/ActivityManager';
import { OrderImporter } from '@/components/orders/OrderImporter';
import { OrderPdfImporter } from '@/components/orders/OrderPdfImporter';
import { SalesFunnelManager } from '@/components/sales/SalesFunnelManager';
import { OperationManager } from '@/components/operations/OperationManager';
import { FileText, History, Package, Download, RotateCcw, MessageCircle, LogOut, LayoutDashboard, Loader2, Users, Save, Map, ClipboardList, Briefcase, TrendingUp, Settings, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Order, OrderFormData } from '@/types/order';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const formatWhatsAppMessage = (quote: Quote) => {
  const items = quote.items
    .map((item) => `• ${item.productName} ${item.modulation} (${item.fabricTier}) - Qtd: ${item.quantity}`)
    .join('\n');
  
  const total = quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  return encodeURIComponent(
    `*Orçamento SoHome*\n\n` +
    `Cliente: ${quote.client.name}\n` +
    `${quote.client.company ? `Empresa: ${quote.client.company}\n` : ''}` +
    `\n*Itens:*\n${items}\n\n` +
    `*Total: ${total}*\n\n` +
    `Orçamento válido por 7 dias.`
  );
};

const Index = () => {
  const { products, addProduct, updateProduct, deleteProduct, refetch: refetchProducts } = useProducts();
  const { quotes, addQuote, updateQuote, deleteQuote, duplicateQuote } = useQuotes();
  const { clients, loading: clientsLoading, addClient, updateClient, deleteClient } = useClients();
  const { activities, addActivity } = useActivities();
  const { orders, addOrders } = useOrders();
  const { opportunities } = useSalesOpportunities();
  const { user, signOut } = useAuth();
  const { syncQuoteToRDStation, isSyncing } = useRDStation();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [comercialTab, setComercialTab] = useState('quote');
  const [client, setClient] = useState<ClientData>(INITIAL_CLIENT);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [payment, setPayment] = useState<PaymentConditions>(INITIAL_PAYMENT);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [clientDetailId, setClientDetailId] = useState<string | null>(null);

  const handleAddItem = (item: QuoteItem) => {
    setItems([...items, item]);
    toast.success('Item adicionado ao orçamento');
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, quantity } : item)));
  };

  const handleUpdateObservations = (id: string, observations: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, observations } : item)));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    toast.success('Item removido');
  };

  const calculateSubtotal = () => {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (payment.discountType === 'percentage') {
      return subtotal * (payment.discountValue / 100);
    }
    return payment.discountValue;
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const handleSelectClient = (selectedClient: Client | null) => {
    setSelectedClientId(selectedClient?.id || null);
  };

  const handleSaveClient = async (clientData: ClientData): Promise<Client | null> => {
    const result = await addClient(clientData);
    if (result) {
      setSelectedClientId(result.id);
    }
    return result;
  };

  const handleGenerateQuote = async (clearAfterSave: boolean = false) => {
    if (!client.company) {
      toast.error('Preencha o nome da empresa');
      return;
    }

    if (items.length === 0) {
      toast.error('Adicione pelo menos um item ao orçamento');
      return;
    }

    const quote: Quote = {
      id: editingQuoteId || crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      client,
      items,
      payment,
      subtotal: calculateSubtotal(),
      discount: calculateDiscount(),
      total: calculateTotal(),
    };

    if (editingQuoteId) {
      await updateQuote(editingQuoteId, quote);
      toast.success('Orçamento atualizado com sucesso!');
    } else {
      await addQuote(quote, selectedClientId || undefined);
      toast.success('Orçamento gerado e salvo com sucesso!');
    }
    
    syncQuoteToRDStation(quote);

    // Auto-create follow-up activity D+5 only if no pending one exists for this quote
    const existingFollowUp = activities.find(
      (a) => a.quote_id === quote.id && a.type === 'followup' && a.status !== 'concluida'
    );
    if (!existingFollowUp) {
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 5);
      const clientLabel = quote.client.company || quote.client.name;
      await addActivity({
        type: 'followup',
        title: `Follow-up orçamento #${quote.id.slice(0, 8).toUpperCase()} - ${clientLabel}`,
        description: `Lembrete automático de follow-up do orçamento #${quote.id.slice(0, 8).toUpperCase()} para ${clientLabel}. Total: R$ ${quote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        due_date: followUpDate.toISOString().split('T')[0],
        priority: 'media',
        client_id: selectedClientId || undefined,
        quote_id: quote.id,
      });
    }

    if (clearAfterSave) {
      handleReset();
    } else {
      setEditingQuoteId(null);
    }
  };

  const handleReset = () => {
    setClient(INITIAL_CLIENT);
    setSelectedClientId(null);
    setItems([]);
    setPayment(INITIAL_PAYMENT);
    setEditingQuoteId(null);
    toast.success('Orçamento limpo');
  };

  const handleEditQuote = (quote: Quote) => {
    setClient(quote.client);
    setItems(quote.items);
    setPayment(quote.payment);
    setEditingQuoteId(quote.id);
    setSelectedClientId(null);
    setActiveTab('comercial');
    setComercialTab('quote');
  };

  const handleSendWhatsApp = () => {
    if (!client.company) {
      toast.error('Preencha o nome da empresa');
      return;
    }

    if (items.length === 0) {
      toast.error('Adicione pelo menos um item ao orçamento');
      return;
    }

    const quote: Quote = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      client,
      items,
      payment,
      subtotal: calculateSubtotal(),
      discount: calculateDiscount(),
      total: calculateTotal(),
    };

    const phoneNumber = client.phone.replace(/\D/g, '');
    const message = formatWhatsAppMessage(quote);
    const whatsappUrl = phoneNumber 
      ? `https://wa.me/55${phoneNumber}?text=${message}`
      : `https://wa.me/?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handleNavigateToQuote = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      setClient({
        name: selectedClient.name,
        company: selectedClient.company,
        document: selectedClient.document,
        phone: selectedClient.phone,
        email: selectedClient.email,
        isNewClient: selectedClient.isNewClient,
        address: selectedClient.address,
      });
      setSelectedClientId(clientId);
      setActiveTab('comercial');
      setComercialTab('quote');
    }
  };

  const handleViewClientDetail = (clientId: string) => {
    setClientDetailId(clientId);
  };

  const subtotal = calculateSubtotal();
  const clientForDetail = clientDetailId ? clients.find(c => c.id === clientDetailId) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="max-w-7xl mx-auto p-2 sm:p-4 md:p-6">
        {/* Header */}
        <div className="bg-card rounded-lg shadow-lg p-3 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-3xl font-bold text-primary mb-0.5 sm:mb-2 truncate">
                Sistema LSA
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Gestão completa de produtos com modulações e acabamentos
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <span className="text-xs text-muted-foreground hidden md:block">
                {user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="h-8 px-2 sm:px-3">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-card rounded-lg shadow-lg overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 h-auto p-0 bg-muted rounded-none">
              <TabsTrigger
                value="dashboard"
                className="py-3 sm:py-4 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm"
              >
                <LayoutDashboard className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger
                value="comercial"
                className="py-3 sm:py-4 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm"
              >
                <Briefcase className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Comercial</span>
              </TabsTrigger>
              <TabsTrigger
                value="activities"
                className="py-3 sm:py-4 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm"
              >
                <ClipboardList className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Atividades</span>
              </TabsTrigger>
              <TabsTrigger
                value="funnels"
                className="py-3 sm:py-4 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm"
              >
                <TrendingUp className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Funis</span>
              </TabsTrigger>
              <TabsTrigger
                value="operations"
                className="py-3 sm:py-4 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm"
              >
                <Settings className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Operação</span>
              </TabsTrigger>
              <TabsTrigger
                value="products"
                className="py-3 sm:py-4 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm"
              >
                <Package className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Produtos</span>
              </TabsTrigger>
            </TabsList>

            <div className="p-2 sm:p-4 md:p-6">
              <TabsContent value="dashboard" className="mt-0">
                <QuoteDashboard 
                  quotes={quotes} 
                  activities={activities}
                  orders={orders}
                  onViewActivities={() => setActiveTab('activities')}
                />
              </TabsContent>

              {/* COMERCIAL - Sub-tabs */}
              <TabsContent value="comercial" className="mt-0">
                <Tabs value={comercialTab} onValueChange={setComercialTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="quote">
                      <FileText className="h-4 w-4 mr-2" />
                      {editingQuoteId ? 'Editar Orçamento' : 'Novo Orçamento'}
                    </TabsTrigger>
                    <TabsTrigger value="history">
                      <History className="h-4 w-4 mr-2" />
                      Histórico
                    </TabsTrigger>
                    <TabsTrigger value="clients">
                      <Users className="h-4 w-4 mr-2" />
                      Clientes
                    </TabsTrigger>
                    <TabsTrigger value="routes">
                      <Map className="h-4 w-4 mr-2" />
                      Rotas
                    </TabsTrigger>
                    <TabsTrigger value="import-excel">
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Excel
                    </TabsTrigger>
                    <TabsTrigger value="import-pdf">
                      <FileText className="h-4 w-4 mr-2" />
                      Importar PDF
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="quote" className="mt-0">
                    {editingQuoteId && (
                      <div className="mb-4 p-3 bg-warning/20 border border-warning rounded-lg flex items-center justify-between">
                        <span className="text-sm text-warning-foreground">
                          📝 Editando orçamento existente
                        </span>
                        <Button variant="ghost" size="sm" onClick={handleReset}>
                          Cancelar edição
                        </Button>
                      </div>
                    )}
                    <div className="grid lg:grid-cols-2 gap-6">
                      <div className="space-y-6">
                        <ClientForm 
                          client={client} 
                          onChange={setClient}
                          clients={clients}
                          onSaveClient={handleSaveClient}
                          selectedClientId={selectedClientId}
                          onSelectClient={handleSelectClient}
                        />
                        <ProductSelector
                          products={products}
                          onAddItem={handleAddItem}
                        />
                      </div>
                      <div className="space-y-6">
                        <QuoteCart
                          items={items}
                          onUpdateQuantity={handleUpdateQuantity}
                          onUpdateObservations={handleUpdateObservations}
                          onRemoveItem={handleRemoveItem}
                        />
                        <PaymentForm
                          payment={payment}
                          onChange={setPayment}
                          subtotal={subtotal}
                        />
                        <div className="flex flex-col gap-3">
                          <div className="flex gap-3">
                            <Button variant="outline" onClick={handleReset} className="flex-1">
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Limpar
                            </Button>
                            <Button
                              onClick={() => handleGenerateQuote(false)}
                              className="flex-1"
                              disabled={!client.company || items.length === 0 || isSyncing}
                            >
                              {isSyncing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : editingQuoteId ? (
                                <Save className="h-4 w-4 mr-2" />
                              ) : (
                                <Download className="h-4 w-4 mr-2" />
                              )}
                              {editingQuoteId ? 'Salvar Alterações' : 'Gerar Orçamento'}
                            </Button>
                          </div>
                          {!editingQuoteId && (
                            <div className="flex gap-3">
                              <Button
                                onClick={() => handleGenerateQuote(true)}
                                variant="secondary"
                                className="flex-1"
                                disabled={!client.company || items.length === 0 || isSyncing}
                              >
                                {isSyncing ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4 mr-2" />
                                )}
                                Gerar e Limpar
                              </Button>
                              <Button
                                onClick={handleSendWhatsApp}
                                className="flex-1 bg-whatsapp hover:bg-whatsapp/90 text-whatsapp-foreground border-whatsapp"
                                disabled={!client.company || items.length === 0}
                              >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                WhatsApp
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="mt-0">
                    <QuoteHistory
                      quotes={quotes}
                      activities={activities}
                      onDelete={deleteQuote}
                      onDuplicate={duplicateQuote}
                      onEdit={handleEditQuote}
                    />
                  </TabsContent>

                  <TabsContent value="clients" className="mt-0">
                    <ClientManager
                      clients={clients}
                      loading={clientsLoading}
                      onAdd={addClient}
                      onUpdate={updateClient}
                      onDelete={deleteClient}
                      onViewDetail={handleViewClientDetail}
                    />
                  </TabsContent>

                  <TabsContent value="routes" className="mt-0">
                    <RouteManager onCreateQuote={handleNavigateToQuote} />
                  </TabsContent>

                  <TabsContent value="import-excel" className="mt-0">
                    <OrderImporter
                      onImport={async (importedOrders) => {
                        if (importedOrders.length === 0) return 0;
                        
                        // Build all items into a SINGLE quote
                        const allItems: QuoteItem[] = importedOrders.map(item => ({
                          id: crypto.randomUUID(),
                          productId: '',
                          productName: item.order.product || 'Produto importado',
                          factory: item.order.supplier || '',
                          modulation: item.order.dimensions || '',
                          modulationId: '',
                          sizeId: '',
                          sizeDescription: item.order.dimensions || '',
                          base: '',
                          fabricTier: 'SEM TEC' as const,
                          fabricDescription: item.order.fabric || '',
                          price: item.order.price || 0,
                          quantity: item.order.quantity || 1,
                          observations: `Ref: ${item.order.orderNumber || '-'} | OC: ${item.order.oc || '-'}`,
                        }));

                        const subtotal = allItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
                        const first = importedOrders[0];
                        const clientName = first.order.clientName || 'Importação';

                        const quote: Quote = {
                          id: crypto.randomUUID(),
                          createdAt: first.order.issueDate ? new Date(first.order.issueDate).toISOString() : new Date().toISOString(),
                          client: {
                            name: '',
                            company: clientName,
                            document: '',
                            phone: '',
                            email: '',
                            isNewClient: false,
                            address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' },
                          },
                          items: allItems,
                          payment: { ...INITIAL_PAYMENT, representativeName: first.order.representative || '' },
                          subtotal,
                          discount: 0,
                          total: subtotal,
                        };

                        const result = await addQuote(quote, first.clientId || undefined);
                        if (result) {
                          toast.success(`Orçamento importado com ${allItems.length} itens`);
                          return 1;
                        }
                        return 0;
                      }}
                      clients={clients}
                      onAddClient={addClient}
                      onComplete={() => setComercialTab('history')}
                    />
                  </TabsContent>

                  <TabsContent value="import-pdf" className="mt-0">
                    <OrderPdfImporter
                      onImport={async (importedOrders) => {
                        if (importedOrders.length === 0) return 0;
                        
                        const allItems: QuoteItem[] = importedOrders.map(item => ({
                          id: crypto.randomUUID(),
                          productId: '',
                          productName: item.order.product || 'Produto importado',
                          factory: item.order.supplier || '',
                          modulation: item.order.dimensions || '',
                          modulationId: '',
                          sizeId: '',
                          sizeDescription: item.order.dimensions || '',
                          base: '',
                          fabricTier: 'SEM TEC' as const,
                          fabricDescription: item.order.fabric || '',
                          price: item.order.price || 0,
                          quantity: item.order.quantity || 1,
                          observations: `Ref: ${item.order.orderNumber || '-'} | OC: ${item.order.oc || '-'}`,
                        }));

                        const subtotal = allItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
                        const first = importedOrders[0];
                        const clientName = first.order.clientName || 'Importação';

                        const quote: Quote = {
                          id: crypto.randomUUID(),
                          createdAt: first.order.issueDate ? new Date(first.order.issueDate).toISOString() : new Date().toISOString(),
                          client: {
                            name: '',
                            company: clientName,
                            document: '',
                            phone: '',
                            email: '',
                            isNewClient: false,
                            address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' },
                          },
                          items: allItems,
                          payment: { ...INITIAL_PAYMENT, representativeName: first.order.representative || '' },
                          subtotal,
                          discount: 0,
                          total: subtotal,
                        };

                        const result = await addQuote(quote, first.clientId || undefined);
                        if (result) {
                          toast.success(`Orçamento importado com ${allItems.length} itens`);
                          return 1;
                        }
                        return 0;
                      }}
                      clients={clients}
                      onAddClient={addClient}
                      onComplete={() => setComercialTab('history')}
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="activities" className="mt-0">
                <ActivityManager onCreateQuote={handleNavigateToQuote} />
              </TabsContent>

              <TabsContent value="funnels" className="mt-0">
                <SalesFunnelManager />
              </TabsContent>

              <TabsContent value="operations" className="mt-0">
                <OperationManager />
              </TabsContent>

              <TabsContent value="products" className="mt-0">
                <ProductManager
                  products={products}
                  onAdd={addProduct}
                  onUpdate={updateProduct}
                  onDelete={deleteProduct}
                  onRefresh={refetchProducts}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Client Detail Dialog */}
      <Dialog open={!!clientDetailId} onOpenChange={(open) => { if (!open) setClientDetailId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{clientForDetail?.company || 'Cliente'}</DialogTitle>
          </DialogHeader>
          {clientDetailId && (
            <ClientDetailPanel
              clientId={clientDetailId}
              clientName={clientForDetail?.company || ''}
              activities={activities}
              opportunities={opportunities}
              orders={orders}
              onNewActivity={() => {
                setClientDetailId(null);
                setActiveTab('activities');
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
