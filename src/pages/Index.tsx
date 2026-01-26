import { useState } from 'react';
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
import { generateQuotePDF } from '@/utils/pdfGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ClientForm } from '@/components/quote/ClientForm';
import { ProductSelector } from '@/components/quote/ProductSelector';
import { QuoteCart } from '@/components/quote/QuoteCart';
import { PaymentForm } from '@/components/quote/PaymentForm';
import { ProductManager } from '@/components/quote/ProductManager';
import { QuoteHistory } from '@/components/quote/QuoteHistory';
import { FileText, History, Package, Download, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const { quotes, addQuote, deleteQuote, duplicateQuote } = useQuotes();

  const [activeTab, setActiveTab] = useState('quote');
  const [client, setClient] = useState<ClientData>(INITIAL_CLIENT);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [payment, setPayment] = useState<PaymentConditions>(INITIAL_PAYMENT);

  const handleAddItem = (item: QuoteItem) => {
    setItems([...items, item]);
    toast.success('Item adicionado ao orçamento');
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, quantity } : item)));
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

  const handleGenerateQuote = (clearAfterSave: boolean = false) => {
    if (!client.name) {
      toast.error('Preencha o nome do cliente');
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

    addQuote(quote);
    generateQuotePDF(quote);
    toast.success('Orçamento gerado e salvo com sucesso!');

    if (clearAfterSave) {
      setClient(INITIAL_CLIENT);
      setItems([]);
      setPayment(INITIAL_PAYMENT);
    }
  };

  const handleReset = () => {
    setClient(INITIAL_CLIENT);
    setItems([]);
    setPayment(INITIAL_PAYMENT);
    toast.success('Orçamento limpo');
  };

  const subtotal = calculateSubtotal();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="bg-card rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Sistema de Orçamentos - Estofados
          </h1>
          <p className="text-muted-foreground">
            Gestão completa de produtos com modulações e acabamentos
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-card rounded-lg shadow-lg overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3 h-auto p-0 bg-muted rounded-none">
              <TabsTrigger
                value="quote"
                className="py-4 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FileText className="h-4 w-4 mr-2" />
                Novo Orçamento
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="py-4 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <History className="h-4 w-4 mr-2" />
                Histórico
              </TabsTrigger>
              <TabsTrigger
                value="products"
                className="py-4 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Package className="h-4 w-4 mr-2" />
                Produtos
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent value="quote" className="mt-0">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <ClientForm client={client} onChange={setClient} />
                    <ProductSelector
                      products={products}
                      onAddItem={handleAddItem}
                    />
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <QuoteCart
                      items={items}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemoveItem={handleRemoveItem}
                    />
                    <PaymentForm
                      payment={payment}
                      onChange={setPayment}
                      subtotal={subtotal}
                    />

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={handleReset}
                          className="flex-1"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Limpar
                        </Button>
                        <Button
                          onClick={() => handleGenerateQuote(false)}
                          className="flex-1"
                          disabled={!client.name || items.length === 0}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Gerar Orçamento
                        </Button>
                      </div>
                      <Button
                        onClick={() => handleGenerateQuote(true)}
                        variant="secondary"
                        className="w-full"
                        disabled={!client.name || items.length === 0}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Gerar e Limpar Dados
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <QuoteHistory
                  quotes={quotes}
                  onDelete={deleteQuote}
                  onDuplicate={duplicateQuote}
                />
              </TabsContent>

              <TabsContent value="products" className="mt-0">
                <ProductManager
                  products={products}
                  onAdd={addProduct}
                  onUpdate={updateProduct}
                  onDelete={deleteProduct}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Index;
