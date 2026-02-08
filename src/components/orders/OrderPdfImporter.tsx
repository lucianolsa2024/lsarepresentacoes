import { useState, useRef } from 'react';
import { OrderFormData } from '@/types/order';
import { Client } from '@/hooks/useClients';
import { ClientData } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface Props {
  clients: Client[];
  onImport: (orders: { order: OrderFormData; clientId?: string | null }[]) => Promise<number>;
  onAddClient: (client: ClientData) => Promise<Client | null>;
  onComplete: () => void;
}

interface ExtractedData {
  cliente: {
    nomeFantasia: string;
    cnpj?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
  pedido: {
    numeroPedido: string;
    dataEmissao: string;
    representante?: string;
    condicaoPagamento?: string;
    previsaoFaturamento?: string;
    fornecedor?: string;
  };
  itens: {
    produto: string;
    descricaoCompleta?: string;
    dimensoes?: string;
    tecido?: string;
    tecidoFornecido?: string;
    quantidade: number;
    precoUnitario: number;
    precoTotal?: number;
  }[];
}

async function extractTextFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str)
      .join(' ');
    pages.push(text);
  }

  return pages.join('\n\n');
}

export function OrderPdfImporter({ clients, onImport, onAddClient, onComplete }: Props) {
  const [step, setStep] = useState<'upload' | 'extracting' | 'preview' | 'importing'>('upload');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStep('extracting');

    try {
      // Step 1: Extract text from PDF
      toast.info('Extraindo texto do PDF...');
      const pdfText = await extractTextFromPdf(file);

      if (!pdfText.trim()) {
        toast.error('Não foi possível extrair texto do PDF');
        setStep('upload');
        return;
      }

      // Step 2: Send text to AI for structured extraction
      toast.info('Analisando dados com IA...');
      const { data, error } = await supabase.functions.invoke('parse-order-pdf', {
        body: { pdfText },
      });

      if (error) {
        console.error('AI extraction error:', error);
        toast.error('Erro ao analisar PDF: ' + (error.message || 'Erro desconhecido'));
        setStep('upload');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setStep('upload');
        return;
      }

      setExtractedData(data as ExtractedData);
      setStep('preview');
      toast.success(`${data.itens?.length || 0} item(ns) encontrado(s) no PDF`);
    } catch (error) {
      console.error('PDF processing error:', error);
      toast.error('Erro ao processar o PDF');
      setStep('upload');
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    if (!extractedData) return;
    setStep('importing');

    try {
      const { cliente, pedido, itens } = extractedData;

      // Find or create client
      const clientName = cliente.nomeFantasia;
      let clientId: string | null = null;

      const existingClient = clients.find(
        c => c.company.toLowerCase() === clientName.toLowerCase()
      );

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const newClient = await onAddClient({
          name: '',
          company: clientName,
          document: cliente.cnpj || '',
          phone: cliente.telefone || '',
          email: cliente.email || '',
          isNewClient: true,
          address: {
            street: cliente.endereco || '',
            number: '',
            complement: '',
            neighborhood: '',
            city: cliente.cidade || '',
            state: cliente.estado || '',
            zipCode: cliente.cep || '',
          },
        });
        if (newClient) {
          clientId = newClient.id;
          toast.info(`Novo cliente "${clientName}" criado`);
        }
      }

      // Build order records from items
      const ordersToImport = itens.map(item => ({
        order: {
          issueDate: pedido.dataEmissao || new Date().toISOString().split('T')[0],
          clientName,
          supplier: pedido.fornecedor || 'CENTURY',
          representative: pedido.representante || '',
          orderNumber: pedido.numeroPedido || '',
          oc: '',
          product: item.produto || '',
          fabricProvided: item.tecidoFornecido === 'SIM' ? 'SIM' : 'NAO',
          fabric: item.tecido || '',
          dimensions: item.dimensoes || '',
          deliveryDate: pedido.previsaoFaturamento || '',
          quantity: item.quantidade || 1,
          price: item.precoTotal || item.precoUnitario * (item.quantidade || 1),
          orderType: 'ENCOMENDA' as string,
          paymentTerms: pedido.condicaoPagamento || '',
        } as OrderFormData,
        clientId,
      }));

      const count = await onImport(ordersToImport);
      toast.success(`${count} pedido(s) importado(s) do PDF com sucesso!`);
      setExtractedData(null);
      setStep('upload');
      onComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro na importação dos pedidos');
      setStep('preview');
    }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Importar Pedido via PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'upload' && (
          <>
            <p className="text-sm text-muted-foreground">
              Faça upload de um PDF de orçamento/pedido (ex: Century, SoHome). A IA irá extrair automaticamente os dados do cliente, itens, preços e condições de pagamento.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              onChange={handleFile}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Selecionar PDF
            </Button>
          </>
        )}

        {step === 'extracting' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Analisando <strong>{fileName}</strong> com IA...
            </p>
            <p className="text-xs text-muted-foreground">
              Isso pode levar alguns segundos
            </p>
          </div>
        )}

        {step === 'preview' && extractedData && (
          <div className="space-y-4">
            {/* Client Info */}
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <p className="text-sm font-medium">Cliente: {extractedData.cliente.nomeFantasia}</p>
              {extractedData.cliente.cnpj && (
                <p className="text-xs text-muted-foreground">CNPJ: {extractedData.cliente.cnpj}</p>
              )}
              {!clients.some(c => c.company.toLowerCase() === extractedData.cliente.nomeFantasia.toLowerCase()) && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  <span className="text-xs text-destructive">Novo cliente — será criado automaticamente</span>
                </div>
              )}
            </div>

            {/* Order Info */}
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <p className="text-sm font-medium">Pedido #{extractedData.pedido.numeroPedido}</p>
              <p className="text-xs text-muted-foreground">
                Data: {extractedData.pedido.dataEmissao} |
                Fornecedor: {extractedData.pedido.fornecedor || 'N/A'} |
                Representante: {extractedData.pedido.representante || 'N/A'}
              </p>
              {extractedData.pedido.condicaoPagamento && (
                <p className="text-xs text-muted-foreground">Pagamento: {extractedData.pedido.condicaoPagamento}</p>
              )}
            </div>

            {/* Items Table */}
            <div className="border rounded-lg overflow-auto max-h-[300px]">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Produto</th>
                    <th className="p-2 text-left">Dimensões</th>
                    <th className="p-2 text-left">Tecido</th>
                    <th className="p-2 text-right">Qtd</th>
                    <th className="p-2 text-right">Preço Unit.</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedData.itens.map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-medium">{item.produto}</td>
                      <td className="p-2">{item.dimensoes || '-'}</td>
                      <td className="p-2">{item.tecido || '-'}</td>
                      <td className="p-2 text-right">{item.quantidade}</td>
                      <td className="p-2 text-right">{formatCurrency(item.precoUnitario)}</td>
                      <td className="p-2 text-right">{formatCurrency(item.precoTotal || item.precoUnitario * item.quantidade)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleConfirmImport} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar e Importar {extractedData.itens.length} Item(ns)
              </Button>
              <Button variant="outline" onClick={() => { setExtractedData(null); setStep('upload'); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importando pedidos...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
