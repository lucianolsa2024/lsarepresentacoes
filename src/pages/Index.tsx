import { useState, useCallback } from 'react';
import logoLsa from '@/assets/logo-lsa.jpg';
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
import { useIsRepresentative } from '@/hooks/useIsRepresentative';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useRDStation } from '@/hooks/useRDStation';
import { useActivities } from '@/hooks/useActivities';
import { useOrders } from '@/hooks/useOrders';
import { useSalesOpportunities } from '@/hooks/useSalesOpportunities';
import { getQuoteLabel } from '@/utils/quoteLabel';
import { upsertFollowUpForQuote } from '@/utils/upsertFollowUp';

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
import { QuoteExcelImporter } from '@/components/quote/QuoteExcelImporter';
import { SalesFunnelManager } from '@/components/sales/SalesFunnelManager';
import { AutomationManager } from '@/components/automations/AutomationManager';
import { OperationManager } from '@/components/operations/OperationManager';
import { ServiceOrderManager } from '@/components/operations/ServiceOrderManager';
import { RepHomeDashboard } from '@/components/dashboard/RepHomeDashboard';
import { MyOkrGoals } from '@/components/dashboard/MyOkrGoals';
import { DashboardExecutivo } from '@/components/dashboard/DashboardExecutivo';
import { MapaCarteira } from '@/components/portfolio/MapaCarteira';
import { FichaCliente } from '@/components/portfolio/FichaCliente';
import { RoteiroVisitas } from '@/components/portfolio/RoteiroVisitas';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { FinanceiroLSA } from '@/components/finance/FinanceiroLSA';
import { canAccessFinanceiroLSA } from '@/lib/access';
import { ActivityWidget } from '@/components/activities/ActivityWidget';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { AICopilot } from '@/components/AICopilot';
import { FileText, History, Package, Download, RotateCcw, MessageCircle, LogOut, LayoutDashboard, Loader2, Users, Save, Map, ClipboardList, Briefcase, TrendingUp, Settings, Upload, ShieldCheck, Wrench, Landmark, Zap, Calculator } from 'lucide-react';
import { PriceConsultation } from '@/components/PriceConsultation';
import { Link } from 'react-router-dom';
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
  const { quotes: allQuotes, addQuote, updateQuote, updateQuoteStatus, deleteQuote, duplicateQuote } = useQuotes();
  const { clients, loading: clientsLoading, addClient, updateClient, deleteClient } = useClients();
  const { activities, addActivity, updateActivity } = useActivities();
  const { orders, addOrders } = useOrders();
  const { opportunities, addOpportunity } = useSalesOpportunities();
  const { user, signOut } = useAuth();
  const isRep = useIsRepresentative();
  const isAdmin = useIsAdmin();
  const { syncQuoteToRDStation, isSyncing } = useRDStation();
  

  // RLS now handles filtering - reps only see their own quotes
  const quotes = allQuotes;

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
  const [showMapaCarteira, setShowMapaCarteira] = useState(false);
  const [mapaCarteiraFilters, setMapaCarteiraFilters] = useState<{ statusCompra?: string; segmento?: string } | undefined>();
  const [fichaClienteId, setFichaClienteId] = useState<string | null>(null);
  const [showRoteiro, setShowRoteiro] = useState(false);

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

  const handleUpdateItemDiscount = (id: string, discountValue: number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, itemDiscountValue: discountValue } : item)));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    toast.success('Item removido');
  };

  const calculateSubtotal = () => {
    return items.reduce((acc, item) => {
      const itemMult = 1 - (item.itemDiscountValue || 0) / 100;
      return acc + item.price * itemMult * item.quantity;
    }, 0);
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
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      client,
      items,
      payment,
      subtotal: calculateSubtotal(),
      discount: calculateDiscount(),
      total: calculateTotal(),
    };

    if (editingQuoteId) {
      // Versioning: find the original quote to determine version chain
      const originalQuote = quotes.find(q => q.id === editingQuoteId);
      const parentId = originalQuote?.parentQuoteId || editingQuoteId;
      // Count existing versions in this chain
      const existingVersions = quotes.filter(q => 
        q.id === parentId || q.parentQuoteId === parentId
      );
      const nextVersion = existingVersions.length + 1;
      
      quote.version = nextVersion;
      quote.parentQuoteId = parentId;
      quote.status = 'orcamento';
      
      const result = await addQuote(quote, selectedClientId || undefined, client.ownerEmail || user?.email || undefined, nextVersion, parentId);
      if (result) {
        toast.success(`Nova versão v${nextVersion} do orçamento salva!`);
        handleReset(true);
        setComercialTab('history');
      }
    } else {
      quote.version = 1;
      quote.status = 'orcamento';
      const result = await addQuote(quote, selectedClientId || undefined, client.ownerEmail || user?.email || undefined);
      if (!result) return;
      toast.success('Orçamento gerado e salvo com sucesso!');

      // Auto-create sales opportunity in funnel
      const funnelType = (client.clientType === 'corporativo' || client.clientType === 'escritorio_arquitetura')
        ? 'corporativo' : 'lojista';
      await addOpportunity({
        clientId: selectedClientId || null,
        title: `Orç. #${quote.id.slice(0, 8).toUpperCase()} - ${client.company}`,
        description: `Orçamento gerado automaticamente. ${quote.items.length} itens.`,
        funnelType,
        stage: 'proposta',
        value: quote.total,
        expectedCloseDate: payment.estimatedClosingDate || undefined,
        contactName: client.name || '',
        contactPhone: client.phone || '',
        contactEmail: client.email || '',
        ownerEmail: client.ownerEmail || user?.email || undefined,
      });
    }

    syncQuoteToRDStation(quote);

    // Auto-create or update follow-up activity D+5 — only 1 per quote chain
    await upsertFollowUpForQuote(quote, selectedClientId);

    if (clearAfterSave) {
      handleReset();
    }
  };

  const handleReset = (silent: boolean = false) => {
    setClient(INITIAL_CLIENT);
    setSelectedClientId(null);
    setItems([]);
    setPayment(INITIAL_PAYMENT);
    setEditingQuoteId(null);
    if (!silent) toast.success('Orçamento limpo');
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
  const showFinanceiroTab = canAccessFinanceiroLSA(user?.email, isAdmin);
  // Reps see "Relatórios" (subset of admin panel); admins see "Admin" (full panel)
  const showReportsTab = isRep === true || isAdmin;
  const tabsCountClass = (() => {
    // base tabs always visible: dashboard, activities, funnels, service-orders, operations, products = 6
    let total = 6;
    if (isRep !== false) total += 1; // comercial
    if (isAdmin) total += 1; // automations
    if (showReportsTab) total += 1; // admin/relatórios
    if (showFinanceiroTab) total += 1; // financeiro
    const map: Record<number, string> = {
      6: 'grid-cols-6', 7: 'grid-cols-7', 8: 'grid-cols-8', 9: 'grid-cols-9', 10: 'grid-cols-10', 11: 'grid-cols-11',
    };
    return map[total] || 'grid-cols-9';
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-2 sm:p-4 md:p-6">
        {/* Header */}
        <div className="bg-card rounded-lg shadow-lg p-3 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <img src={logoLsa} alt="LSA Representações" className="h-10 sm:h-14 w-auto" />
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
            <TabsList className={`hidden md:grid w-full ${tabsCountClass} h-auto p-0 bg-muted rounded-none`}>
              <TabsTrigger
                value="dashboard"
                className="py-2 sm:py-3 px-1 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[11px] sm:text-xs whitespace-nowrap"
              >
                <LayoutDashboard className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              {isRep !== false && (
              <TabsTrigger
                value="comercial"
                className="py-2 sm:py-3 px-1 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[11px] sm:text-xs whitespace-nowrap"
              >
                <Briefcase className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Comercial</span>
              </TabsTrigger>
              )}
              <TabsTrigger
                value="activities"
                className="py-2 sm:py-3 px-1 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[11px] sm:text-xs whitespace-nowrap"
              >
                <ClipboardList className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Atividades</span>
              </TabsTrigger>
              <TabsTrigger
                value="funnels"
                className="py-2 sm:py-3 px-1 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[11px] sm:text-xs whitespace-nowrap"
              >
                <TrendingUp className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Funis</span>
              </TabsTrigger>
              {isAdmin && (
              <TabsTrigger
                value="automations"
                className="py-2 sm:py-3 px-1 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[11px] sm:text-xs whitespace-nowrap"
              >
                <Zap className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Automações</span>
              </TabsTrigger>
              )}
              <TabsTrigger
                value="service-orders"
                className="py-2 sm:py-3 px-1 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[11px] sm:text-xs whitespace-nowrap"
              >
                <Wrench className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Ordens de Serviço</span>
              </TabsTrigger>
              <TabsTrigger
                value="operations"
                className="py-2 sm:py-3 px-1 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[11px] sm:text-xs whitespace-nowrap"
              >
                <Settings className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Operação</span>
              </TabsTrigger>
              <TabsTrigger
                value="products"
                className="py-2 sm:py-3 px-1 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[11px] sm:text-xs whitespace-nowrap"
              >
                <Package className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Produtos</span>
              </TabsTrigger>
              {showReportsTab && (
              <TabsTrigger
                value="admin"
                className="py-2 sm:py-3 px-1 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[11px] sm:text-xs whitespace-nowrap"
              >
                <ShieldCheck className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{isAdmin ? 'Admin' : 'Relatórios'}</span>
              </TabsTrigger>
              )}
              {showFinanceiroTab && (
              <TabsTrigger
                value="financeiro"
                className="py-2 sm:py-3 px-1 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[11px] sm:text-xs whitespace-nowrap"
              >
                <Landmark className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Financeiro</span>
              </TabsTrigger>
              )}
            </TabsList>

            <div className="p-2 sm:p-4 md:p-6">
              <TabsContent value="dashboard" className="mt-0">
                {isAdmin && fichaClienteId && (
                  <FichaCliente
                    clientId={fichaClienteId}
                    onBack={() => setFichaClienteId(null)}
                  />
                )}
                {isAdmin && !fichaClienteId && showMapaCarteira && !showRoteiro && (
                  <MapaCarteira
                    initialFilters={mapaCarteiraFilters}
                    onBack={() => setShowMapaCarteira(false)}
                    onViewClient={(clientId) => setFichaClienteId(clientId)}
                  />
                )}
                {isAdmin && !fichaClienteId && showRoteiro && (
                  <RoteiroVisitas
                    onBack={() => setShowRoteiro(false)}
                    onViewClient={(clientId) => setFichaClienteId(clientId)}
                  />
                )}
                {isRep === true && !fichaClienteId && !showMapaCarteira && !showRoteiro && (
                  <div className="mb-6 space-y-6">
                    <RepHomeDashboard />
                    <MyOkrGoals />
                  </div>
                )}
                {(isRep === true || isAdmin) && !fichaClienteId && !showMapaCarteira && !showRoteiro ? (
                  <QuoteDashboard 
                    quotes={quotes} 
                    activities={activities}
                    orders={orders}
                    onViewActivities={() => setActiveTab('activities')}
                  />
                ) : !isAdmin && !isRep ? (
                  /* Backoffice users: show only their activities widget */
                  <div className="space-y-6">
                    <ActivityWidget
                      activities={activities}
                      onViewAll={() => setActiveTab('activities')}
                      onActivityClick={(activity) => {
                        if (activity.quote_id) {
                          const quote = quotes.find(q => q.id === activity.quote_id);
                          if (quote) handleEditQuote(quote);
                        }
                      }}
                    />
                  </div>
                ) : null}
                {isAdmin && !fichaClienteId && !showMapaCarteira && !showRoteiro && (
                  <div className="mt-6">
                    <DashboardExecutivo
                      onNavigateToCarteira={(filters) => {
                        setMapaCarteiraFilters(filters);
                        setShowMapaCarteira(true);
                      }}
                      onNavigateToRoteiro={() => setShowRoteiro(true)}
                    />
                  </div>
                )}
              </TabsContent>

              {/* COMERCIAL - Sub-tabs */}
              <TabsContent value="comercial" className="mt-0">
                <Tabs value={comercialTab} onValueChange={setComercialTab}>
                  <div className="mb-4 -mx-4 sm:mx-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ overscrollBehaviorX: 'contain' }}>
                    <TabsList className="inline-flex w-max px-4 sm:px-0">
                      <TabsTrigger value="quote" className="whitespace-nowrap">
                        <FileText className="h-4 w-4 mr-2" />
                        {editingQuoteId ? 'Editar Orçamento' : 'Novo Orçamento'}
                      </TabsTrigger>
                      <TabsTrigger value="history" className="whitespace-nowrap">
                        <History className="h-4 w-4 mr-2" />
                        Histórico
                      </TabsTrigger>
                      <TabsTrigger value="clients" className="whitespace-nowrap">
                        <Users className="h-4 w-4 mr-2" />
                        Clientes
                      </TabsTrigger>
                      <TabsTrigger value="routes" className="whitespace-nowrap">
                        <Map className="h-4 w-4 mr-2" />
                        Rotas
                      </TabsTrigger>
                      <TabsTrigger value="import-excel" className="whitespace-nowrap">
                        <Upload className="h-4 w-4 mr-2" />
                        Importar Excel
                      </TabsTrigger>
                      <TabsTrigger value="import-pdf" className="whitespace-nowrap">
                        <FileText className="h-4 w-4 mr-2" />
                        Importar PDF
                      </TabsTrigger>
                      <TabsTrigger value="consulta-precos" asChild className="whitespace-nowrap">
                        <Link to="/comercial/consulta-precos">
                          <Calculator className="h-4 w-4 mr-2" />
                          Consulta de Preços
                        </Link>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="quote" className="mt-0">
                    {editingQuoteId && (
                      <div className="mb-4 p-3 bg-warning/20 border border-warning rounded-lg flex items-center justify-between">
                        <span className="text-sm text-warning-foreground">
                          📝 Editando orçamento existente
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => handleReset()}>
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
                          onUpdateItemDiscount={handleUpdateItemDiscount}
                          onRemoveItem={handleRemoveItem}
                          surchargeMultiplier={payment.discountType === 'percentage' && payment.discountValue < 0 ? 1 + Math.abs(payment.discountValue) / 100 : 1}
                        />
                        <PaymentForm
                          payment={payment}
                          onChange={setPayment}
                          subtotal={subtotal}
                        />
                        <div className="flex flex-col gap-3">
                          <div className="flex gap-3">
                            <Button variant="outline" onClick={() => handleReset()} className="flex-1">
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
                      onStatusChange={updateQuoteStatus}
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
                      lastContactByClient={(() => {
                        const map: Record<string, string> = {};
                        activities.forEach(a => {
                          if (a.client_id && (a.status === 'realizada' || a.status === 'concluida' || a.completed_at)) {
                            const date = a.completed_at || a.due_date;
                            if (!map[a.client_id] || date > map[a.client_id]) {
                              map[a.client_id] = date;
                            }
                          }
                        });
                        return map;
                      })()}
                    />
                  </TabsContent>

                  <TabsContent value="routes" className="mt-0">
                    <RouteManager onCreateQuote={handleNavigateToQuote} />
                  </TabsContent>

                  <TabsContent value="import-excel" className="mt-0">
                    <QuoteExcelImporter
                      clients={clients}
                      onAddClient={addClient}
                      onImportQuote={async ({ projectName: pName, clientId, clientCompany, items: quoteItems, subtotal, representativeName: repName }) => {
                        const quote: Quote = {
                          id: crypto.randomUUID(),
                          createdAt: new Date().toISOString(),
                          client: {
                            name: '',
                            company: clientCompany,
                            document: '',
                            phone: '',
                            email: '',
                            isNewClient: false,
                            address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' },
                          },
                          items: quoteItems,
                          payment: { ...INITIAL_PAYMENT, representativeName: repName, projectName: pName },
                          subtotal,
                          discount: 0,
                          total: subtotal,
                          version: 1,
                          status: 'orcamento',
                        };

                        const result = await addQuote(quote, clientId || undefined, user?.email || undefined);
                        if (!result) return false;

                        // Auto-create sales opportunity
                        const matchedClient = clientId ? clients.find(c => c.id === clientId) : null;
                        const funnelType = (matchedClient?.clientType === 'corporativo' || matchedClient?.clientType === 'escritorio_arquitetura')
                          ? 'corporativo' : 'lojista';
                        await addOpportunity({
                          clientId: clientId || null,
                          title: `Orç. #${quote.id.slice(0, 8).toUpperCase()} - ${clientCompany}`,
                          description: `Orçamento importado via Excel. ${quoteItems.length} itens.`,
                          funnelType,
                          stage: 'proposta',
                          value: subtotal,
                          contactName: '',
                          contactPhone: '',
                          contactEmail: '',
                          ownerEmail: user?.email || undefined,
                        });

                        // Auto-create or update follow-up D+5 — only 1 per quote chain
                        await upsertFollowUpForQuote(quote, clientId || null);

                        syncQuoteToRDStation(quote);
                        toast.success(`Orçamento importado com ${quoteItems.length} itens — Total: ${subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
                        setComercialTab('history');
                        return true;
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="import-pdf" className="mt-0">
                    <OrderPdfImporter
                      onImport={async (importedOrders) => {
                        if (importedOrders.length === 0) return 0;
                        
                        const allItems: QuoteItem[] = importedOrders.map(item => {
                          const orderAny = item.order as any;
                          return {
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
                            observations: orderAny.description || '',
                          };
                        });

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
                          version: 1,
                          status: 'orcamento',
                        };

                        const result = await addQuote(quote, first.clientId || undefined, user?.email || undefined);
                        if (!result) return 0;

                        // Auto-create sales opportunity
                        await addOpportunity({
                          clientId: first.clientId || null,
                          title: `Orç. #${quote.id.slice(0, 8).toUpperCase()} - ${clientName}`,
                          description: `Orçamento importado via PDF. ${allItems.length} itens.`,
                          funnelType: 'lojista',
                          stage: 'proposta',
                          value: subtotal,
                          contactName: '',
                          contactPhone: '',
                          contactEmail: '',
                          ownerEmail: user?.email || undefined,
                        });

                        // Auto-create or update follow-up D+5 — only 1 per quote chain
                        await upsertFollowUpForQuote(quote, first.clientId || null);

                        syncQuoteToRDStation(quote);
                        toast.success(`Orçamento importado com ${allItems.length} itens — Total: ${subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
                        return 1;
                      }}
                      clients={clients}
                      onAddClient={addClient}
                      onComplete={() => setComercialTab('history')}
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="activities" className="mt-0">
                <ActivityManager
                  onCreateQuote={handleNavigateToQuote}
                  onViewQuote={(quoteId) => {
                    const quote = quotes.find(q => q.id === quoteId);
                    if (quote) handleEditQuote(quote);
                  }}
                />
              </TabsContent>

              <TabsContent value="funnels" className="mt-0">
                <SalesFunnelManager />
              </TabsContent>

              {isAdmin && (
                <TabsContent value="automations" className="mt-0">
                  <AutomationManager />
                </TabsContent>
              )}

              <TabsContent value="service-orders" className="mt-0">
                <ServiceOrderManager />
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

              {showReportsTab && (
                <TabsContent value="admin" className="mt-0">
                  <AdminPanel isAdmin={isAdmin} />
                </TabsContent>
              )}
              {showFinanceiroTab && (
                <TabsContent value="financeiro" className="mt-0">
                  <FinanceiroLSA />
                </TabsContent>
              )}
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
              client={clientForDetail}
              activities={activities}
              opportunities={opportunities}
              orders={orders}
              quotes={allQuotes}
              onNewActivity={() => {
                setClientDetailId(null);
                setActiveTab('activities');
              }}
              onActivityClick={(activity) => {
                setClientDetailId(null);
                setActiveTab('activities');
                // Small delay to let ActivityManager mount, then open edit
                setTimeout(() => {
                  const event = new CustomEvent('edit-activity', { detail: activity });
                  window.dispatchEvent(event);
                }, 300);
              }}
              onOpportunityClick={(opp) => {
                setClientDetailId(null);
                setActiveTab('funnel');
                // Small delay to let SalesFunnelManager mount, then open edit
                setTimeout(() => {
                  const event = new CustomEvent('edit-opportunity', { detail: opp });
                  window.dispatchEvent(event);
                }, 300);
              }}
              onQuoteClick={(quote) => {
                setClientDetailId(null);
                handleEditQuote(quote);
              }}
              onOpenChecklist={(activity) => {
                setClientDetailId(null);
                setActiveTab('activities');
                // Small delay to let ActivityManager mount, then trigger checklist
                setTimeout(() => {
                  const event = new CustomEvent('open-checklist', { detail: activity });
                  window.dispatchEvent(event);
                }, 300);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isRep={isRep}
        isAdmin={isAdmin}
      />
    <AICopilot
      activeTab={activeTab}
      clients={clients}
      activities={activities}
      quotes={quotes}
      opportunities={opportunities}
      orders={orders}
      products={products}
      userEmail={user?.email}
    />
    </div>
  );
};

export default Index;
