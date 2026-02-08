import { useState, useRef } from 'react';
import { OrderFormData } from '@/types/order';
import { Client } from '@/hooks/useClients';
import { ClientData } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Loader2, CheckCircle, AlertCircle, X, Files } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface Props {
  clients: Client[];
  onImport: (orders: { order: OrderFormData; clientId?: string | null }[]) => Promise<number>;
  onAddClient: (client: ClientData) => Promise<Client | null>;
  onComplete: () => void;
}

interface ExtractedData {
  fileName: string;
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
    pages.push(content.items.map((item: any) => item.str).join(' '));
  }
  return pages.join('\n\n');
}

export function OrderPdfImporter({ clients, onImport, onAddClient, onComplete }: Props) {
  const [step, setStep] = useState<'upload' | 'extracting' | 'preview' | 'importing'>('upload');
  const [extractedList, setExtractedList] = useState<ExtractedData[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentFile: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      toast.error('Nenhum arquivo PDF selecionado');
      return;
    }

    setStep('extracting');
    setProgress({ current: 0, total: pdfFiles.length, currentFile: '' });
    const results: ExtractedData[] = [];

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      setProgress({ current: i + 1, total: pdfFiles.length, currentFile: file.name });

      try {
        const pdfText = await extractTextFromPdf(file);
        if (!pdfText.trim()) {
          toast.error(`Não foi possível extrair texto de: ${file.name}`);
          continue;
        }

        const { data, error } = await supabase.functions.invoke('parse-order-pdf', {
          body: { pdfText },
        });

        if (error || data?.error) {
          toast.error(`Erro ao analisar ${file.name}: ${error?.message || data?.error || 'Erro'}`);
          continue;
        }

        results.push({ ...data, fileName: file.name } as ExtractedData);
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        toast.error(`Erro ao processar ${file.name}`);
      }
    }

    if (results.length > 0) {
      setExtractedList(results);
      setStep('preview');
      const totalItems = results.reduce((s, r) => s + r.itens.length, 0);
      toast.success(`${results.length} PDF(s) analisado(s) — ${totalItems} item(ns) encontrado(s)`);
    } else {
      toast.error('Nenhum PDF foi processado com sucesso');
      setStep('upload');
    }

    if (fileRef.current) fileRef.current.value = '';
  };

  const removeExtracted = (index: number) => {
    setExtractedList(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setStep('upload');
      return next;
    });
  };

  const handleConfirmImport = async () => {
    if (extractedList.length === 0) return;
    setStep('importing');

    try {
      const clientMap = new Map<string, string>();
      clients.forEach(c => clientMap.set(c.company.toLowerCase(), c.id));

      const allOrders: { order: OrderFormData; clientId: string | null }[] = [];

      for (const extracted of extractedList) {
        const { cliente, pedido, itens } = extracted;
        const clientName = cliente.nomeFantasia;
        let clientId = clientMap.get(clientName.toLowerCase()) || null;

        if (!clientId) {
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
            clientMap.set(clientName.toLowerCase(), newClient.id);
            toast.info(`Novo cliente "${clientName}" criado`);
          }
        }

        for (const item of itens) {
          allOrders.push({
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
              orderType: 'ENCOMENDA',
              paymentTerms: pedido.condicaoPagamento || '',
            },
            clientId,
          });
        }
      }

      const count = await onImport(allOrders);
      toast.success(`${count} pedido(s) importado(s) de ${extractedList.length} PDF(s)!`);
      setExtractedList([]);
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

  const totalItems = extractedList.reduce((s, r) => s + r.itens.length, 0);
  const totalValue = extractedList.reduce(
    (s, r) => s + r.itens.reduce((si, item) => si + (item.precoTotal || item.precoUnitario * item.quantidade), 0),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Importar Pedidos via PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'upload' && (
          <>
            <p className="text-sm text-muted-foreground">
              Selecione um ou mais PDFs de orçamentos/pedidos (ex: Century, SoHome). A IA irá extrair automaticamente os dados de cada arquivo.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFiles}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Selecionar PDF(s)
            </Button>
          </>
        )}

        {step === 'extracting' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">
              Processando PDF {progress.current} de {progress.total}
            </p>
            <p className="text-xs text-muted-foreground">{progress.currentFile}</p>
            <div className="w-full max-w-xs bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {step === 'preview' && extractedList.length > 0 && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-3 bg-muted rounded-lg flex items-center gap-4">
              <Files className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{extractedList.length} PDF(s) processado(s)</p>
                <p className="text-xs text-muted-foreground">
                  {totalItems} item(ns) | Total: {formatCurrency(totalValue)}
                </p>
              </div>
            </div>

            {/* Per-PDF cards */}
            <div className="space-y-3 max-h-[400px] overflow-auto">
              {extractedList.map((extracted, idx) => {
                const pdfTotal = extracted.itens.reduce(
                  (s, item) => s + (item.precoTotal || item.precoUnitario * item.quantidade), 0
                );
                const isNewClient = !clients.some(
                  c => c.company.toLowerCase() === extracted.cliente.nomeFantasia.toLowerCase()
                );

                return (
                  <div key={idx} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            Pedido #{extracted.pedido.numeroPedido}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {extracted.fileName}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Cliente: {extracted.cliente.nomeFantasia}
                          {isNewClient && (
                            <span className="ml-2 text-destructive">(novo)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {extracted.itens.length} item(ns) | {formatCurrency(pdfTotal)} |
                          {extracted.pedido.fornecedor || 'N/A'}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeExtracted(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Compact items list */}
                    <div className="border rounded overflow-auto max-h-[150px]">
                      <table className="w-full text-xs">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="p-1.5 text-left">Produto</th>
                            <th className="p-1.5 text-left">Tecido</th>
                            <th className="p-1.5 text-right">Qtd</th>
                            <th className="p-1.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {extracted.itens.map((item, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-1.5">{item.produto}</td>
                              <td className="p-1.5">{item.tecido || '-'}</td>
                              <td className="p-1.5 text-right">{item.quantidade}</td>
                              <td className="p-1.5 text-right">
                                {formatCurrency(item.precoTotal || item.precoUnitario * item.quantidade)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleConfirmImport} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Importar Todos ({totalItems} itens de {extractedList.length} PDFs)
              </Button>
              <Button variant="outline" onClick={() => { setExtractedList([]); setStep('upload'); }}>
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
