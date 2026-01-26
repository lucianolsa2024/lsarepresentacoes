import { useState } from 'react';
import { Quote } from '@/types/quote';
import { generateQuotePDF } from '@/utils/pdfGenerator';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Search,
  Download,
  Copy,
  Trash2,
  Eye,
  FileText,
  Calendar,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

interface QuoteHistoryProps {
  quotes: Quote[];
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function QuoteHistory({
  quotes,
  onDelete,
  onDuplicate,
}: QuoteHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const filteredQuotes = quotes.filter((quote) => {
    const search = searchTerm.toLowerCase();
    return (
      quote.client.name.toLowerCase().includes(search) ||
      quote.client.company?.toLowerCase().includes(search) ||
      formatDate(quote.createdAt).includes(search)
    );
  });

  const handleDownload = (quote: Quote) => {
    generateQuotePDF(quote);
    toast.success('PDF gerado com sucesso');
  };

  const handleDuplicate = (id: string) => {
    onDuplicate(id);
    toast.success('Orçamento duplicado');
  };

  const confirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      toast.success('Orçamento excluído');
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Histórico de Orçamentos</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum orçamento salvo</p>
            <p className="text-sm">
              Os orçamentos gerados aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : filteredQuotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Nenhum orçamento encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQuotes.map((quote) => (
            <Card key={quote.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold truncate">
                        {quote.client.name}
                      </span>
                      {quote.client.company && (
                        <span className="text-sm text-muted-foreground truncate">
                          ({quote.client.company})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(quote.createdAt)}
                      </span>
                      <span>
                        {quote.items.length}{' '}
                        {quote.items.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">
                        {formatCurrency(quote.total)}
                      </div>
                      {quote.discount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Desc: {formatCurrency(quote.discount)}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedQuote(quote)}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(quote)}
                        title="Baixar PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicate(quote.id)}
                        title="Duplicar"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteId(quote.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quote Details Dialog */}
      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Orçamento</DialogTitle>
          </DialogHeader>

          {selectedQuote && (
            <div className="space-y-6">
              {/* Client Info */}
              <div>
                <h4 className="font-semibold mb-2">Cliente</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Nome:</strong> {selectedQuote.client.name}
                  </p>
                  {selectedQuote.client.company && (
                    <p>
                      <strong>Empresa:</strong> {selectedQuote.client.company}
                    </p>
                  )}
                  {selectedQuote.client.phone && (
                    <p>
                      <strong>Telefone:</strong> {selectedQuote.client.phone}
                    </p>
                  )}
                  {selectedQuote.client.email && (
                    <p>
                      <strong>Email:</strong> {selectedQuote.client.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold mb-2">Itens</h4>
                <div className="space-y-2">
                  {selectedQuote.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-muted/50 p-3 rounded-lg text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {index + 1}. {item.productName}
                          </p>
                          <p className="text-muted-foreground">
                            {item.modulation}
                            {item.base && ` | ${item.base}`} | {item.fabricDescription} ({item.fabricTier})
                          </p>
                        </div>
                        <div className="text-right">
                          <p>
                            {item.quantity}x {formatCurrency(item.price)}
                          </p>
                          <p className="font-semibold">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedQuote.subtotal)}</span>
                </div>
                {selectedQuote.discount > 0 && (
                  <div className="flex justify-between text-sm text-destructive mb-2">
                    <span>Desconto:</span>
                    <span>- {formatCurrency(selectedQuote.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedQuote.total)}</span>
                </div>
              </div>

              <Button
                onClick={() => handleDownload(selectedQuote)}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este orçamento? Esta ação não pode
              ser desfeita.
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
